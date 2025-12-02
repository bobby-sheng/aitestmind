"""
运行时函数 - 在请求执行时动态生成值

支持的语法：${{函数名(参数)}}
示例：
  - ${{random(8)}} → 生成8位随机数字
  - ${{timestamp()}} → 获取当前时间戳
  - "名称${{random()}}" → 拼接字符串，如 "名称87188172"
"""

import re
import uuid
import random
import string
import hashlib
import base64
from datetime import datetime
from urllib.parse import quote
from typing import Any, Callable, Dict


class RuntimeFunctions:
    """运行时函数执行器"""
    
    def __init__(self):
        # 注册所有可用的函数
        self.functions: Dict[str, Callable] = {
            # 随机值类
            'random': self.random_number,
            'randomInt': self.random_int,
            'uuid': self.generate_uuid,
            'randomString': self.random_string,
            'randomEmail': self.random_email,
            'randomPhone': self.random_phone,
            
            # 时间日期类
            'timestamp': self.timestamp,
            'timestampMs': self.timestamp_ms,
            'datetime': self.datetime_now,
            'date': self.date_now,
            'time': self.time_now,
            
            # 编码解码类
            'base64Encode': self.base64_encode,
            'base64Decode': self.base64_decode,
            'urlEncode': self.url_encode,
            'md5': self.md5_hash,
            
            # 数据生成类
            'guid': self.generate_uuid,  # guid 等同于 uuid
            'randomBoolean': self.random_boolean,
            'randomFloat': self.random_float,
        }
    
    # ========== 随机值类 ==========
    
    def random_number(self, length: int = 8) -> str:
        """生成指定长度的随机数字字符串"""
        return ''.join(random.choices(string.digits, k=int(length)))
    
    def random_int(self, min_val: int = 0, max_val: int = 1000) -> int:
        """生成指定范围内的随机整数"""
        return random.randint(int(min_val), int(max_val))
    
    def generate_uuid(self) -> str:
        """生成 UUID v4"""
        return str(uuid.uuid4())
    
    def random_string(self, length: int = 10) -> str:
        """生成指定长度的随机字符串（字母+数字）"""
        chars = string.ascii_letters + string.digits
        return ''.join(random.choices(chars, k=int(length)))
    
    def random_email(self) -> str:
        """生成随机邮箱地址"""
        username = self.random_string(8)
        return f"{username}@example.com"
    
    def random_phone(self) -> str:
        """生成随机中国手机号"""
        prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
                   '150', '151', '152', '153', '155', '156', '157', '158', '159',
                   '180', '181', '182', '183', '184', '185', '186', '187', '188', '189']
        prefix = random.choice(prefixes)
        suffix = self.random_number(8)
        return f"{prefix}{suffix}"
    
    # ========== 时间日期类 ==========
    
    def timestamp(self) -> int:
        """获取当前时间戳（秒）"""
        return int(datetime.now().timestamp())
    
    def timestamp_ms(self) -> int:
        """获取当前时间戳（毫秒）"""
        return int(datetime.now().timestamp() * 1000)
    
    def datetime_now(self, format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
        """
        获取当前日期时间
        
        Args:
            format_str: 日期格式，支持 Python strftime 格式和部分前端格式
        """
        # 转换前端格式到 Python 格式
        format_str = format_str.replace('YYYY', '%Y').replace('MM', '%m').replace('DD', '%d')
        format_str = format_str.replace('HH', '%H').replace('mm', '%M').replace('ss', '%S')
        return datetime.now().strftime(format_str)
    
    def date_now(self) -> str:
        """获取当前日期（YYYY-MM-DD）"""
        return datetime.now().strftime("%Y-%m-%d")
    
    def time_now(self) -> str:
        """获取当前时间（HH:mm:ss）"""
        return datetime.now().strftime("%H:%M:%S")
    
    # ========== 编码解码类 ==========
    
    def base64_encode(self, text: str) -> str:
        """Base64 编码"""
        return base64.b64encode(text.encode()).decode()
    
    def base64_decode(self, text: str) -> str:
        """Base64 解码"""
        return base64.b64decode(text.encode()).decode()
    
    def url_encode(self, text: str) -> str:
        """URL 编码"""
        return quote(text)
    
    def md5_hash(self, text: str) -> str:
        """MD5 哈希"""
        return hashlib.md5(text.encode()).hexdigest()
    
    # ========== 数据生成类 ==========
    
    def random_boolean(self) -> bool:
        """生成随机布尔值"""
        return random.choice([True, False])
    
    def random_float(self, min_val: float = 0, max_val: float = 1, decimals: int = 2) -> float:
        """生成指定范围内的随机浮点数"""
        value = random.uniform(float(min_val), float(max_val))
        return round(value, int(decimals))
    
    # ========== 核心执行方法 ==========
    
    def execute(self, func_name: str, *args) -> Any:
        """
        执行函数
        
        Args:
            func_name: 函数名
            *args: 函数参数
            
        Returns:
            函数执行结果
        """
        if func_name not in self.functions:
            raise ValueError(f"未知的运行时函数: {func_name}")
        
        try:
            func = self.functions[func_name]
            result = func(*args)
            print(f"[运行时函数] {func_name}({', '.join(map(str, args))}) → {result}")
            return result
        except Exception as e:
            print(f"[运行时函数] 执行失败: {func_name}({args}), 错误: {e}")
            raise


# 全局实例
_runtime_functions = RuntimeFunctions()


def resolve_runtime_functions(value: Any) -> Any:
    """
    解析值中的运行时函数
    
    支持的格式：
    1. 纯函数：${{random()}} → 替换为函数返回值
    2. 字符串拼接：\"名称${{random()}}\" → \"名称87188172\"
    3. 多个函数：\"${{uuid()}}_${{timestamp()}}\" → \"550e8400-e29b-41d4-a716-446655440000_1700000000\"
    
    Args:
        value: 要解析的值（可能包含函数调用）
        
    Returns:
        解析后的值
    """
    # 如果不是字符串，直接返回
    if not isinstance(value, str):
        return value
    
    # 正则表达式匹配 ${{函数名(参数)}}
    # 支持：
    # - ${{random()}}
    # - ${{random(8)}}
    # - ${{randomInt(1, 100)}}
    # - ${{datetime("YYYY-MM-DD")}}
    pattern = r'\$\{\{(\w+)\((.*?)\)\}\}'
    
    def replace_function(match):
        """替换单个函数调用"""
        func_name = match.group(1)
        params_str = match.group(2).strip()
        
        # 解析参数
        args = []
        if params_str:
            # 简单的参数解析（支持字符串、数字）
            # 处理引号内的字符串和普通数字
            import ast
            try:
                # 尝试用 ast.literal_eval 安全解析参数
                # 将参数字符串包装为元组进行解析
                params_tuple = f"({params_str},)"
                args = list(ast.literal_eval(params_tuple))
            except (ValueError, SyntaxError) as e:
                print(f"[运行时函数] 参数解析失败: {params_str}, 错误: {e}")
                # 如果解析失败，尝试简单分割
                args = [p.strip().strip('"\'') for p in params_str.split(',')]
        
        # 执行函数
        try:
            result = _runtime_functions.execute(func_name, *args)
            return str(result)
        except Exception as e:
            print(f"[运行时函数] 执行失败: {func_name}, 错误: {e}")
            return match.group(0)  # 保持原样
    
    # 检查是否整个值都是一个函数调用
    full_match = re.fullmatch(pattern, value)
    if full_match:
        # 纯函数调用，返回原始类型（不转换为字符串）
        func_name = full_match.group(1)
        params_str = full_match.group(2).strip()
        
        args = []
        if params_str:
            import ast
            try:
                params_tuple = f"({params_str},)"
                args = list(ast.literal_eval(params_tuple))
            except (ValueError, SyntaxError):
                args = [p.strip().strip('"\'') for p in params_str.split(',')]
        
        try:
            result = _runtime_functions.execute(func_name, *args)
            return result  # 保持原始类型
        except Exception as e:
            print(f"[运行时函数] 执行失败: {func_name}, 错误: {e}")
            return value
    
    # 字符串拼接模式，替换所有函数调用
    resolved = re.sub(pattern, replace_function, value)
    return resolved


def resolve_value_with_functions(value: Any) -> Any:
    """
    递归解析值中的运行时函数（支持嵌套结构）
    
    Args:
        value: 要解析的值（可能是字符串、字典、列表等）
        
    Returns:
        解析后的值
    """
    if isinstance(value, str):
        return resolve_runtime_functions(value)
    elif isinstance(value, dict):
        return {k: resolve_value_with_functions(v) for k, v in value.items()}
    elif isinstance(value, list):
        return [resolve_value_with_functions(item) for item in value]
    else:
        return value

