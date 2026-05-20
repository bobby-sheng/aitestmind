"""
mitmproxy API 服务器
提供 HTTP API 接口与 Next.js 应用集成
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import signal
import os
import sys
import json
import time
import threading
from typing import Optional

# 导入 mitmproxy recorder
from mitmproxy_recorder import get_recorder, HARRecorderAddon

app = Flask(__name__)
CORS(app)  # 允许跨域

# 全局变量
mitm_process: Optional[subprocess.Popen] = None
mitm_port = 8899
api_port = 8900


@app.route('/api/mitm/start', methods=['POST'])
def start_mitm():
    """启动 mitmproxy 服务器"""
    global mitm_process
    
    try:
        data = request.get_json() or {}
        port = data.get('port', mitm_port)
        
        # 检查是否已经在运行
        if mitm_process and mitm_process.poll() is None:
            # 返回当前会话信息，而不是错误
            recorder = get_recorder()
            session = recorder.get_session_info() if recorder else None
            
            return jsonify({
                'success': True,
                'already_running': True,
                'port': port,
                'session': session,
                'message': 'mitmproxy 已经在运行，已恢复现有会话',
                'certificate_path': os.path.expanduser('~/.mitmproxy/mitmproxy-ca-cert.pem')
            })
        
        # 启动 mitmproxy
        cmd = [
            'mitmdump',
            '-s', 'mitmproxy_recorder.py',
            '--listen-port', str(port),
            '--set', 'stream_large_bodies=1',  # 流式处理大文件
            '--set', 'block_global=false',  # 不阻止全局请求
        ]
        
        mitm_process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        # 等待启动
        time.sleep(2)
        
        # 检查是否启动成功
        if mitm_process.poll() is not None:
            return jsonify({
                'success': False,
                'error': 'mitmproxy 启动失败'
            }), 500
        
        recorder = get_recorder()
        session = recorder.get_session_info() if recorder else None
        
        return jsonify({
            'success': True,
            'port': port,
            'session': session,
            'message': 'mitmproxy 已启动',
            'certificate_path': os.path.expanduser('~/.mitmproxy/mitmproxy-ca-cert.pem'),
            'instructions': {
                'proxy': f'配置浏览器代理: localhost:{port}',
                'certificate': '安装证书以拦截 HTTPS: ~/.mitmproxy/mitmproxy-ca-cert.pem'
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/mitm/stop', methods=['POST'])
def stop_mitm():
    """停止 mitmproxy 服务器"""
    global mitm_process
    
    try:
        if not mitm_process or mitm_process.poll() is not None:
            return jsonify({
                'success': False,
                'error': 'mitmproxy 未运行'
            }), 400
        
        # 获取录制数据
        recorder = get_recorder()
        har_data = recorder.get_har_data() if recorder else None
        summaries = _convert_to_summaries(har_data) if har_data else []
        session = recorder.get_session_info() if recorder else None
        
        # 停止 mitmproxy
        mitm_process.send_signal(signal.SIGINT)
        mitm_process.wait(timeout=5)
        mitm_process = None
        
        return jsonify({
            'success': True,
            'harData': har_data,
            'summaries': summaries,
            'session': session,
            'totalRequests': len(summaries),
            'message': 'mitmproxy 已停止'
        })
    
    except subprocess.TimeoutExpired:
        mitm_process.kill()
        mitm_process = None
        return jsonify({
            'success': True,
            'message': 'mitmproxy 已强制停止'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/mitm/status', methods=['GET'])
def get_status():
    """获取 mitmproxy 状态"""
    try:
        if not mitm_process or mitm_process.poll() is not None:
            return jsonify({
                'success': False,
                'session': None,
                'summaries': [],
                'totalRequests': 0
            })
        
        # 💾 从临时文件读取数据（跨进程通信）
        temp_file = os.path.join(os.path.dirname(__file__), 'mitm_capture_temp.json')
        if os.path.exists(temp_file):
            try:
                with open(temp_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return jsonify({
                        'success': True,
                        'session': data.get('session'),
                        'summaries': _convert_to_summaries(data.get('har_data')),
                        'totalRequests': data.get('total_requests', 0)
                    })
            except Exception as e:
                print(f"读取临时文件失败: {str(e)}")
        
        # 降级方案：使用内存中的 recorder（可能为空）
        recorder = get_recorder()
        if not recorder:
            return jsonify({
                'success': True,
                'session': None,
                'summaries': [],
                'totalRequests': 0
            })
        
        har_data = recorder.get_har_data()
        summaries = _convert_to_summaries(har_data)
        session = recorder.get_session_info()
        
        return jsonify({
            'success': True,
            'session': session,
            'summaries': summaries,
            'totalRequests': len(summaries)
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/mitm/pause', methods=['POST'])
def pause_recording():
    """暂停录制"""
    try:
        recorder = get_recorder()
        if not recorder:
            return jsonify({
                'success': False,
                'error': 'Recorder 未初始化'
            }), 500
        
        recorder.pause_recording()
        session = recorder.get_session_info()
        
        return jsonify({
            'success': True,
            'session': session,
            'message': '录制已暂停'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/mitm/resume', methods=['POST'])
def resume_recording():
    """继续录制"""
    try:
        recorder = get_recorder()
        if not recorder:
            return jsonify({
                'success': False,
                'error': 'Recorder 未初始化'
            }), 500
        
        recorder.resume_recording()
        session = recorder.get_session_info()
        
        return jsonify({
            'success': True,
            'session': session,
            'message': '录制已继续'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/mitm/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'healthy',
        'mitm_running': mitm_process is not None and mitm_process.poll() is None
    })


def _convert_to_summaries(har_data):
    """将 HAR 数据转换为请求摘要列表"""
    if not har_data or 'log' not in har_data:
        return []
    
    summaries = []
    for idx, entry in enumerate(har_data['log']['entries']):
        try:
            request = entry['request']
            response = entry['response']
            
            # 解析 URL
            from urllib.parse import urlparse, parse_qs
            parsed = urlparse(request['url'])
            
            # 安全获取嵌套字段
            post_data = request.get('postData') or {}
            content = response.get('content') or {}
            
            # 解析请求体和请求体类型
            request_body = None
            request_mime_type = None
            
            if isinstance(post_data, dict):
                request_mime_type = post_data.get('mimeType')
                mime_lower = (request_mime_type or '').lower()
                
                if 'application/json' in mime_lower:
                    # JSON 格式：尝试解析 text 为 JSON 对象
                    text = post_data.get('text')
                    if text:
                        try:
                            import json
                            request_body = json.loads(text)
                        except:
                            request_body = text
                elif 'multipart/form-data' in mime_lower or 'application/x-www-form-urlencoded' in mime_lower:
                    # form-data 或 urlencoded 格式：从 params 或 text 解析
                    params = post_data.get('params')
                    if params and len(params) > 0:
                        request_body = {p['name']: p.get('value', '') for p in params}
                    else:
                        text = post_data.get('text')
                        if text:
                            try:
                                from urllib.parse import parse_qs
                                parsed_params = parse_qs(text, keep_blank_values=True)
                                request_body = {k: v[0] if len(v) == 1 else v for k, v in parsed_params.items()}
                            except:
                                request_body = text
                else:
                    # 其他格式：保留原始 text
                    request_body = post_data.get('text')
            
            # 生成唯一 ID（使用时间戳 + URL hash）
            import hashlib
            unique_str = f"{entry.get('startedDateTime', '')}_{request.get('url', '')}_{idx}"
            unique_id = hashlib.md5(unique_str.encode()).hexdigest()[:12]
            
            summary = {
                'id': f"req_{unique_id}",
                'method': request.get('method', 'GET'),
                'url': request.get('url', ''),
                'path': parsed.path + ('?' + parsed.query if parsed.query else ''),
                'status': response.get('status', 0),
                'statusText': response.get('statusText', ''),
                'resourceType': entry.get('_resourceType', 'other'),
                'time': entry.get('time', 0),
                'size': response.get('bodySize', 0),
                'startedDateTime': entry.get('startedDateTime', ''),
                'headers': {h['name']: h['value'] for h in request.get('headers', [])},
                'queryParams': {q['name']: q['value'] for q in request.get('queryString', [])},
                'requestBody': request_body,
                'requestMimeType': request_mime_type,
                'responseBody': content.get('text') if isinstance(content, dict) else None,
                'mimeType': content.get('mimeType', 'application/octet-stream') if isinstance(content, dict) else 'application/octet-stream'
            }
            summaries.append(summary)
        except Exception as e:
            print(f"转换摘要失败: {str(e)}")
            continue
    
    return summaries


def cleanup():
    """清理资源"""
    global mitm_process
    if mitm_process and mitm_process.poll() is None:
        mitm_process.send_signal(signal.SIGINT)
        mitm_process.wait(timeout=5)


if __name__ == '__main__':
    import atexit
    import logging
    atexit.register(cleanup)
    
    # 关闭 werkzeug 的访问日志（减少噪音）
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.WARNING)  # 只显示警告和错误
    
    print("=" * 60)
    print("🚀 mitmproxy API 服务器启动")
    print(f"📡 API 地址: http://localhost:{api_port}")
    print("=" * 60)
    print("\n可用的 API 端点:")
    print(f"  POST   /api/mitm/start   - 启动 mitmproxy")
    print(f"  POST   /api/mitm/stop    - 停止 mitmproxy")
    print(f"  GET    /api/mitm/status  - 获取状态")
    print(f"  POST   /api/mitm/pause   - 暂停录制")
    print(f"  POST   /api/mitm/resume  - 继续录制")
    print(f"  GET    /api/mitm/health  - 健康检查")
    print("=" * 60)
    print("\n💡 提示: 访问日志已关闭，终端只显示重要信息")
    print("=" * 60)
    
    try:
        app.run(host='0.0.0.0', port=api_port, debug=False)
    except KeyboardInterrupt:
        cleanup()
        print("\n👋 服务器已停止")

