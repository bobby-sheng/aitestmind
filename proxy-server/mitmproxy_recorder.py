"""
mitmproxy 代理录制器
支持 HTTP/HTTPS 完整拦截，生成 HAR 数据
"""

import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Optional
from mitmproxy import http, ctx
from mitmproxy.tools.main import mitmdump
import threading
import queue
import sys
import os

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 添加父目录到 Python 路径，以便导入 executor 模块
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class HARRecorderAddon:
    """mitmproxy 插件：捕获请求并生成 HAR 数据"""
    
    def __init__(self):
        self.har_entries: List[Dict] = []
        self.is_recording = True
        self.is_paused = False
        self.session_id = f"mitm_session_{int(time.time())}"
        self.start_time = datetime.utcnow().isoformat() + 'Z'
        self.request_timings: Dict[str, float] = {}
        
        # 使用队列进行线程安全的数据传递
        self.data_queue = queue.Queue()
        
        logger.info(f"🚀 HAR Recorder 已启动 - Session: {self.session_id}")
    
    def request(self, flow: http.HTTPFlow) -> None:
        """请求开始时记录时间"""
        # 检查暂停/继续状态
        self._check_pause_resume()
        
        if not self.is_recording or self.is_paused:
            return
            
        # 记录请求开始时间
        request_id = f"{flow.request.host}{flow.request.path}_{id(flow)}"
        self.request_timings[request_id] = time.time()
    
    def response(self, flow: http.HTTPFlow) -> None:
        """响应返回时构建 HAR Entry"""
        # 检查暂停/继续状态
        self._check_pause_resume()
        
        if not self.is_recording or self.is_paused:
            return
        
        # 检查是否需要清理数据
        self._check_and_clear()
        
        try:
            request_id = f"{flow.request.host}{flow.request.path}_{id(flow)}"
            start_time = self.request_timings.get(request_id, time.time())
            duration = (time.time() - start_time) * 1000  # 转换为毫秒
            
            # 构建 HAR Entry
            har_entry = self._build_har_entry(flow, start_time, duration)
            self.har_entries.append(har_entry)
            
            # 放入队列供外部获取
            self.data_queue.put({
                'type': 'new-request',
                'data': har_entry,
                'session_id': self.session_id,
                'total_requests': len(self.har_entries)
            })
            
            # 💾 实时写入临时文件供 Next.js 读取（跨进程通信）
            try:
                temp_file = os.path.join(os.path.dirname(__file__), 'mitm_capture_temp.json')
                with open(temp_file, 'w', encoding='utf-8') as f:
                    json.dump({
                        'session': self.get_session_info(),
                        'har_data': self.get_har_data(),
                        'total_requests': len(self.har_entries)
                    }, f, ensure_ascii=False)
            except Exception as e:
                logger.error(f"💾 写入临时文件失败: {str(e)}")
            
            # 清理已处理的请求时间记录
            if request_id in self.request_timings:
                del self.request_timings[request_id]
            
            logger.info(f"✅ 捕获请求: {flow.request.method} {flow.request.pretty_url} - {flow.response.status_code}")
        
        except Exception as e:
            logger.error(f"❌ 处理响应失败: {str(e)}")
    
    def error(self, flow: http.HTTPFlow) -> None:
        """请求失败时记录"""
        if not self.is_recording or self.is_paused:
            return
        
        try:
            request_id = f"{flow.request.host}{flow.request.path}_{id(flow)}"
            start_time = self.request_timings.get(request_id, time.time())
            duration = (time.time() - start_time) * 1000
            
            # 构建失败的 HAR Entry
            har_entry = self._build_failed_har_entry(flow, start_time, duration)
            self.har_entries.append(har_entry)
            
            logger.warning(f"⚠️ 请求失败: {flow.request.method} {flow.request.pretty_url}")
        
        except Exception as e:
            logger.error(f"❌ 处理错误失败: {str(e)}")
    
    def _build_har_entry(self, flow: http.HTTPFlow, start_time: float, duration: float) -> Dict:
        """构建 HAR Entry 数据结构"""
        request = flow.request
        response = flow.response
        
        # 构建请求 URL
        url = request.pretty_url
        
        # 请求头
        request_headers = [
            {"name": k, "value": v}
            for k, v in request.headers.items()
        ]
        
        # 响应头
        response_headers = [
            {"name": k, "value": v}
            for k, v in response.headers.items()
        ]
        
        # 查询参数
        query_string = [
            {"name": k, "value": v}
            for k, v in request.query.items()
        ]
        
        # 请求体
        post_data = None
        if request.content:
            try:
                content_type = request.headers.get('content-type', '')
                post_data = {
                    "mimeType": content_type,
                    "text": request.content.decode('utf-8', errors='ignore')
                }
            except:
                post_data = {
                    "mimeType": "application/octet-stream",
                    "text": "[Binary Data]"
                }
        
        # 响应内容
        response_content = {
            "size": len(response.content) if response.content else 0,
            "mimeType": response.headers.get('content-type', 'application/octet-stream')
        }
        
        # 只保存文本类型的响应内容
        if response.content and self._is_text_content(response.headers.get('content-type', '')):
            try:
                response_content["text"] = response.content.decode('utf-8', errors='ignore')
            except:
                response_content["text"] = "[Unable to decode]"
        
        # 构建 HAR Entry
        return {
            "startedDateTime": datetime.fromtimestamp(start_time).isoformat() + 'Z',
            "time": duration,
            "request": {
                "method": request.method,
                "url": url,
                "httpVersion": request.http_version,
                "cookies": [],
                "headers": request_headers,
                "queryString": query_string,
                "postData": post_data,
                "headersSize": -1,
                "bodySize": len(request.content) if request.content else 0
            },
            "response": {
                "status": response.status_code,
                "statusText": response.reason,
                "httpVersion": response.http_version,
                "cookies": [],
                "headers": response_headers,
                "content": response_content,
                "redirectURL": "",
                "headersSize": -1,
                "bodySize": len(response.content) if response.content else 0
            },
            "cache": {},
            "timings": {
                "blocked": -1,
                "dns": -1,
                "connect": -1,
                "send": 0,
                "wait": duration,
                "receive": 0,
                "ssl": -1
            },
            "_resourceType": self._get_resource_type(url, response.headers.get('content-type', ''))
        }
    
    def _build_failed_har_entry(self, flow: http.HTTPFlow, start_time: float, duration: float) -> Dict:
        """构建失败请求的 HAR Entry"""
        request = flow.request
        
        return {
            "startedDateTime": datetime.fromtimestamp(start_time).isoformat() + 'Z',
            "time": duration,
            "request": {
                "method": request.method,
                "url": request.pretty_url,
                "httpVersion": request.http_version,
                "cookies": [],
                "headers": [{"name": k, "value": v} for k, v in request.headers.items()],
                "queryString": [{"name": k, "value": v} for k, v in request.query.items()],
                "postData": None,
                "headersSize": -1,
                "bodySize": 0
            },
            "response": {
                "status": 0,
                "statusText": str(flow.error) if flow.error else "Unknown Error",
                "httpVersion": "HTTP/1.1",
                "cookies": [],
                "headers": [],
                "content": {
                    "size": 0,
                    "mimeType": "text/plain"
                },
                "redirectURL": "",
                "headersSize": -1,
                "bodySize": -1,
                "_error": str(flow.error) if flow.error else "Unknown Error"
            },
            "cache": {},
            "timings": {
                "blocked": -1,
                "dns": -1,
                "connect": -1,
                "send": 0,
                "wait": duration,
                "receive": 0,
                "ssl": -1
            }
        }
    
    def _check_and_clear(self) -> None:
        """检查清理标记文件，如果存在则清空数据"""
        clear_marker = os.path.join(os.path.dirname(__file__), 'mitm_clear_marker.txt')
        
        if os.path.exists(clear_marker):
            try:
                # 清空内存中的数据
                self.har_entries = []
                self.request_timings = {}
                
                # 删除标记文件
                os.remove(clear_marker)
                
                logger.info("🗑️ 已清空 mitmproxy 内存数据")
            except Exception as e:
                logger.error(f"清理数据时出错: {str(e)}")
    
    def _check_pause_resume(self) -> None:
        """检查暂停/继续标记文件"""
        pause_marker = os.path.join(os.path.dirname(__file__), 'mitm_pause_marker.txt')
        resume_marker = os.path.join(os.path.dirname(__file__), 'mitm_resume_marker.txt')
        
        # 检查暂停标记
        if os.path.exists(pause_marker):
            if not self.is_paused:
                self.is_paused = True
                logger.info("⏸️ 录制已暂停")
            try:
                os.remove(pause_marker)
            except:
                pass
        
        # 检查继续标记
        if os.path.exists(resume_marker):
            if self.is_paused:
                self.is_paused = False
                logger.info("▶️ 录制已继续")
            try:
                os.remove(resume_marker)
            except:
                pass
    
    def _is_text_content(self, content_type: str) -> bool:
        """判断是否为文本内容"""
        text_types = [
            'json', 'xml', 'javascript', 'text', 'html', 
            'css', 'csv', 'yaml', 'yml'
        ]
        return any(t in content_type.lower() for t in text_types)
    
    def _get_resource_type(self, url: str, content_type: str) -> str:
        """判断资源类型"""
        if 'json' in content_type:
            return 'xhr'
        elif 'javascript' in content_type:
            return 'script'
        elif 'css' in content_type:
            return 'stylesheet'
        elif 'image' in content_type:
            return 'image'
        elif 'font' in content_type:
            return 'font'
        elif 'html' in content_type:
            return 'document'
        else:
            return 'other'
    
    def pause_recording(self):
        """暂停录制"""
        self.is_paused = True
        logger.info("⏸️ 录制已暂停")
    
    def resume_recording(self):
        """继续录制"""
        self.is_paused = False
        logger.info("▶️ 录制已继续")
    
    def get_har_data(self) -> Dict:
        """获取完整的 HAR 数据"""
        return {
            "log": {
                "version": "1.2",
                "creator": {
                    "name": "AI Test Handle - mitmproxy Recorder",
                    "version": "1.0.0"
                },
                "browser": {
                    "name": "mitmproxy",
                    "version": "1.0.0"
                },
                "entries": self.har_entries
            }
        }
    
    def get_session_info(self) -> Dict:
        """获取会话信息"""
        return {
            "id": self.session_id,
            "url": "mitmproxy Server",
            "startTime": self.start_time,
            "status": "paused" if self.is_paused else "recording",
            "capturedRequests": len(self.har_entries),
            "isPaused": self.is_paused
        }


# 全局录制器实例
recorder_addon = None


def get_recorder() -> Optional[HARRecorderAddon]:
    """获取录制器实例"""
    return recorder_addon


def create_recorder() -> HARRecorderAddon:
    """创建录制器实例"""
    global recorder_addon
    recorder_addon = HARRecorderAddon()
    return recorder_addon


# mitmproxy 插件入口
addons = [
    create_recorder()
]


if __name__ == "__main__":
    """
    启动 mitmproxy
    
    使用方法:
    python mitmproxy_recorder.py --listen-port 8899
    """
    print("🚀 启动 mitmproxy 代理服务器...")
    print("📡 配置浏览器代理: localhost:8899")
    print("🔒 HTTPS 证书: ~/.mitmproxy/mitmproxy-ca-cert.pem")
    print("=" * 60)

