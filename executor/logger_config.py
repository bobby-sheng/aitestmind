"""
FastAPI 日志配置

功能：
- 控制台输出（带颜色）
- 文件记录（按天分割）
- 执行流程追踪
- 数据流信息记录
- 错误详细追踪
"""

import os
import sys
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any


# ANSI 颜色代码
class Colors:
    """控制台颜色"""
    RESET = '\033[0m'
    
    # 日志级别颜色
    DEBUG = '\033[35m'      # 紫色
    INFO = '\033[36m'       # 青色
    SUCCESS = '\033[32m'    # 绿色
    WARNING = '\033[33m'    # 黄色
    ERROR = '\033[31m'      # 红色
    CRITICAL = '\033[41m'   # 红色背景
    
    # 功能颜色
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    
    # 执行流程颜色
    FLOW = '\033[34m'       # 蓝色
    DATA = '\033[36m'       # 青色
    HTTP = '\033[35m'       # 紫色
    DB = '\033[33m'         # 黄色


class ColoredFormatter(logging.Formatter):
    """带颜色的日志格式化器（控制台）"""
    
    FORMATS = {
        logging.DEBUG: Colors.DEBUG,
        logging.INFO: Colors.INFO,
        logging.WARNING: Colors.WARNING,
        logging.ERROR: Colors.ERROR,
        logging.CRITICAL: Colors.CRITICAL,
    }
    
    def format(self, record):
        # 获取颜色
        log_color = self.FORMATS.get(record.levelno, Colors.RESET)
        
        # 格式化时间
        time_str = datetime.fromtimestamp(record.created).strftime('%H:%M:%S.%f')[:-3]
        
        # 构建消息
        level_str = f"{log_color}[{record.levelname}]{Colors.RESET}"
        module_str = f"{Colors.BOLD}[{record.name}]{Colors.RESET}"
        
        # 检查是否有特殊标记
        message = record.getMessage()
        if hasattr(record, 'flow'):
            message = f"{Colors.FLOW}[FLOW]{Colors.RESET} {message}"
        elif hasattr(record, 'data'):
            message = f"{Colors.DATA}[DATA]{Colors.RESET} {message}"
        elif hasattr(record, 'http'):
            message = f"{Colors.HTTP}[HTTP]{Colors.RESET} {message}"
        elif hasattr(record, 'db'):
            message = f"{Colors.DB}[DB]{Colors.RESET} {message}"
        
        formatted = f"[{time_str}] {level_str} {module_str} {message}"
        
        # 添加异常信息
        if record.exc_info:
            formatted += f"\n{self.formatException(record.exc_info)}"
        
        return formatted


class FileFormatter(logging.Formatter):
    """文件日志格式化器（无颜色）"""
    
    def format(self, record):
        # 格式化时间
        time_str = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]
        
        # 构建消息
        message = record.getMessage()
        
        # 添加标记
        if hasattr(record, 'flow'):
            message = f"[FLOW] {message}"
        elif hasattr(record, 'data'):
            message = f"[DATA] {message}"
        elif hasattr(record, 'http'):
            message = f"[HTTP] {message}"
        elif hasattr(record, 'db'):
            message = f"[DB] {message}"
        
        formatted = f"[{time_str}] [{record.levelname}] [{record.name}] {message}"
        
        # 添加异常信息
        if record.exc_info:
            formatted += f"\n{self.formatException(record.exc_info)}"
        
        return formatted


class DailyRotatingFileHandler(logging.Handler):
    """按天滚动的文件处理器"""
    
    def __init__(self, log_dir: str, filename_prefix: str):
        super().__init__()
        self.log_dir = Path(log_dir)
        self.filename_prefix = filename_prefix
        self.current_date = datetime.now().date()
        self.file_handler: Optional[logging.FileHandler] = None
        
        # 确保日志目录存在
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        # 初始化文件处理器
        self._rotate()
    
    def _rotate(self):
        """切换日志文件"""
        # 关闭旧文件
        if self.file_handler:
            self.file_handler.close()
        
        # 创建新文件
        date_str = self.current_date.strftime('%Y-%m-%d')
        filename = f"{date_str}-{self.filename_prefix}.log"
        filepath = self.log_dir / filename
        
        # 创建新的文件处理器
        self.file_handler = logging.FileHandler(filepath, mode='a', encoding='utf-8')
        self.file_handler.setFormatter(FileFormatter())
    
    def emit(self, record):
        """写入日志"""
        # 检查是否需要切换文件（跨天）
        current_date = datetime.now().date()
        if current_date != self.current_date:
            self.current_date = current_date
            self._rotate()
        
        # 写入日志
        if self.file_handler:
            self.file_handler.emit(record)


class ExecutorLogger:
    """执行器日志器"""
    
    def __init__(self, name: str = 'executor'):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.DEBUG)
        
        # 避免重复添加处理器
        if not self.logger.handlers:
            self._setup_handlers()
    
    def _setup_handlers(self):
        """设置处理器"""
        log_dir = Path(__file__).parent.parent / 'logs'
        
        # 控制台处理器
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(ColoredFormatter())
        self.logger.addHandler(console_handler)
        
        # 文件处理器
        file_handler = DailyRotatingFileHandler(str(log_dir), 'executor')
        file_handler.setLevel(logging.DEBUG)
        self.logger.addHandler(file_handler)
    
    # ==================== 通用日志方法 ====================
    
    def debug(self, message: str, **kwargs):
        """调试日志"""
        self._log(logging.DEBUG, message, kwargs)
    
    def info(self, message: str, **kwargs):
        """信息日志"""
        self._log(logging.INFO, message, kwargs)
    
    def success(self, message: str, **kwargs):
        """成功日志"""
        self._log(logging.INFO, f"✅ {message}", kwargs)
    
    def warning(self, message: str, **kwargs):
        """警告日志"""
        self._log(logging.WARNING, message, kwargs)
    
    def error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """错误日志"""
        self._log(logging.ERROR, f"❌ {message}", kwargs, exc_info=error)
    
    def critical(self, message: str, error: Optional[Exception] = None, **kwargs):
        """严重错误日志"""
        self._log(logging.CRITICAL, message, kwargs, exc_info=error)
    
    def _log(self, level: int, message: str, extras: Dict[str, Any], exc_info=None):
        """内部日志方法"""
        # 创建额外信息
        extra_dict = {}
        if extras:
            # 将数据添加到消息中
            if 'data' in extras and extras['data']:
                message += f"\n  Data: {self._format_data(extras['data'])}"
        
        # 记录日志
        self.logger.log(level, message, extra=extra_dict, exc_info=exc_info)
    
    def _format_data(self, data: Any) -> str:
        """格式化数据"""
        if isinstance(data, dict):
            items = []
            for key, value in data.items():
                if isinstance(value, (dict, list)):
                    items.append(f"{key}=<{type(value).__name__}>")
                else:
                    items.append(f"{key}={value}")
            return "{" + ", ".join(items) + "}"
        return str(data)
    
    # ==================== 专用日志方法 ====================
    
    def flow(self, message: str, **kwargs):
        """执行流程日志"""
        kwargs['flow'] = True
        self._log(logging.INFO, f"🔄 {message}", kwargs)
    
    def data_flow(self, message: str, data: Any = None, **kwargs):
        """数据流日志"""
        kwargs['data'] = True
        if data:
            kwargs['data'] = data
        self._log(logging.INFO, f"📊 {message}", kwargs)
    
    def http_request(self, method: str, url: str, **kwargs):
        """HTTP 请求日志"""
        kwargs['http'] = True
        self._log(logging.INFO, f"🌐 {method} {url}", kwargs)
    
    def http_response(self, status: int, duration: float, **kwargs):
        """HTTP 响应日志"""
        kwargs['http'] = True
        emoji = "✅" if status < 400 else "❌"
        self._log(logging.INFO, f"{emoji} Response {status} ({duration:.0f}ms)", kwargs)
    
    def db_operation(self, operation: str, table: str, **kwargs):
        """数据库操作日志"""
        kwargs['db'] = True
        self._log(logging.INFO, f"💾 {operation} {table}", kwargs)
    
    def execution_start(self, name: str, execution_id: str, **kwargs):
        """执行开始"""
        self.flow(f"{'='*60}")
        self.flow(f"🚀 开始执行: {name}")
        self.flow(f"   执行 ID: {execution_id}")
        self.flow(f"{'='*60}")
    
    def execution_end(self, name: str, success: bool, duration: float, **kwargs):
        """执行结束"""
        emoji = "✅" if success else "❌"
        status = "成功" if success else "失败"
        self.flow(f"{'='*60}")
        self.flow(f"{emoji} 执行{status}: {name}")
        self.flow(f"   耗时: {duration:.2f}s")
        self.flow(f"{'='*60}")
    
    def step_start(self, step_name: str, step_number: int, total_steps: int):
        """步骤开始"""
        self.flow(f"\n▶️  步骤 {step_number}/{total_steps}: {step_name}")
    
    def step_end(self, step_name: str, success: bool, duration: float):
        """步骤结束"""
        emoji = "✅" if success else "❌"
        status = "成功" if success else "失败"
        self.info(f"   {emoji} {step_name} - {status} ({duration:.0f}ms)")
    
    def assertion_result(self, assertion_type: str, success: bool, details: str = ""):
        """断言结果"""
        emoji = "✅" if success else "❌"
        msg = f"   断言 [{assertion_type}]: {emoji}"
        if details:
            msg += f" - {details}"
        self.info(msg)
    
    def variable_extracted(self, var_name: str, var_value: Any, source: str):
        """变量提取"""
        self.data_flow(f"   📝 提取变量: {var_name} = {var_value} (来源: {source})")
    
    def variable_replaced(self, original: str, replaced: str, var_count: int):
        """变量替换"""
        if var_count > 0:
            self.data_flow(f"   🔄 替换变量 ({var_count} 个)")


# 创建全局日志实例
executor_logger = ExecutorLogger('executor')
database_logger = ExecutorLogger('database')
scheduler_logger = ExecutorLogger('scheduler')


def get_logger(name: str = 'executor') -> ExecutorLogger:
    """获取日志实例"""
    if name == 'database':
        return database_logger
    elif name == 'scheduler':
        return scheduler_logger
    else:
        return executor_logger

