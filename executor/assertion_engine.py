"""
断言引擎 - 负责执行测试断言
"""
from typing import Any, Dict, List, Optional
from models import Assertion, AssertionOperator, ExpectedType
from variable_manager import VariableManager
import json


class AssertionResult:
    """断言结果"""
    
    def __init__(self, assertion: Assertion, success: bool, 
                 actual_value: Any = None, message: str = "", 
                 resolved_expected: Any = None):
        self.assertion = assertion
        self.success = success
        self.actual_value = actual_value
        self.message = message
        self.field = assertion.field
        self.operator = assertion.operator
        # 使用解析后的期望值（如果提供），否则使用原始值
        self.expected = resolved_expected if resolved_expected is not None else assertion.expected
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'field': self.field,
            'operator': self.operator.value,
            'expected': self.expected,
            'actual': self.actual_value,
            'success': self.success,
            'message': self.message
        }


class AssertionEngine:
    """断言引擎"""
    
    def __init__(self, variable_manager: VariableManager):
        """
        初始化断言引擎
        
        Args:
            variable_manager: 变量管理器实例
        """
        self.variable_manager = variable_manager
    
    def _resolve_expected_variables(self, expected: str) -> Any:
        """
        解析期望值中的变量引用
        
        支持的格式：
        - ${step_1.response.data} - 完整变量引用，会被替换为实际值
        - 纯文本 - 不包含变量引用，直接返回
        
        Args:
            expected: 期望值字符串
            
        Returns:
            解析后的值（可能是任意类型）
        """
        import re
        
        # 检查是否是完整的变量引用（整个字符串就是一个变量）
        # 格式：${step_xxx.response.xxx} 或 $(step_xxx.response.xxx)
        full_var_pattern = r'^\$[\{\(](.+?)[\}\)]$'
        match = re.match(full_var_pattern, expected)
        
        if match:
            # 整个字符串就是一个变量引用，直接解析并返回值（保持原始类型）
            variable_path = match.group(1)
            print(f"[断言引擎] 检测到完整变量引用: {variable_path}")
            
            resolved_value = self.variable_manager.resolve_variable_path(variable_path)
            print(f"[断言引擎] 变量解析结果: {resolved_value} (类型: {type(resolved_value)})")
            
            return resolved_value
        
        # 检查是否包含部分变量引用（需要替换为字符串）
        # 格式：prefix ${var1} middle ${var2} suffix
        partial_var_pattern = r'\$[\{\(](.+?)[\}\)]'
        
        if re.search(partial_var_pattern, expected):
            # 包含变量引用，进行替换
            print(f"[断言引擎] 检测到部分变量引用，进行字符串替换")
            
            def replace_var(match):
                variable_path = match.group(1)
                value = self.variable_manager.resolve_variable_path(variable_path)
                return str(value) if value is not None else ''
            
            resolved = re.sub(partial_var_pattern, replace_var, expected)
            print(f"[断言引擎] 字符串替换结果: {resolved}")
            return resolved
        
        # 没有变量引用，直接返回原值
        return expected
    
    def _build_assertion_context(self, response_data: Any, field_path: str) -> Any:
        """
        构建断言上下文，根据响应体类型和字段路径决定如何组织数据
        
        Args:
            response_data: 原始响应数据（包含 status, headers, body）
            field_path: 断言字段路径
            
        Returns:
            构建好的断言上下文
        """
        import re
        
        # 如果 response_data 不是字典（可能已经是处理过的数据），直接返回
        if not isinstance(response_data, dict):
            return response_data
        
        # 构建基础上下文
        assertion_context = {
            'status': response_data.get('status'),
            'headers': response_data.get('headers', {})
        }
        
        body = response_data.get('body')
        
        if isinstance(body, dict):
            # 如果 body 是字典，将其字段合并到根层级
            assertion_context.update(body)
            assertion_context['body'] = body
            print(f"[断言上下文] body 是字典，已合并到上下文")
        elif isinstance(body, list):
            # 如果 body 是数组
            assertion_context['body'] = body
            
            # 检查字段路径是否直接访问数组（如 "0.field", "[0].field"）
            if re.match(r'^[\[\d]', field_path):
                # 字段路径直接访问数组索引，返回数组本身作为上下文
                print(f"[断言上下文] body 是数组且字段路径直接访问数组，返回数组作为上下文")
                return body
            else:
                print(f"[断言上下文] body 是数组，但字段路径不是直接访问，需要用 'body' 前缀")
        else:
            assertion_context['body'] = body
            print(f"[断言上下文] body 类型: {type(body)}")
        
        return assertion_context
    
    def _convert_expected_value(self, expected: Any, expected_type: ExpectedType) -> Any:
        """
        根据指定的类型转换期望值
        
        Args:
            expected: 原始期望值
            expected_type: 目标类型
            
        Returns:
            转换后的期望值
        """
        if expected_type == ExpectedType.AUTO:
            # 自动推断：尝试智能转换
            if isinstance(expected, str):
                # 尝试转换为数字
                try:
                    if '.' in expected:
                        return float(expected)
                    return int(expected)
                except ValueError:
                    pass
                
                # 尝试转换为布尔值
                if expected.lower() in ('true', 'false'):
                    return expected.lower() == 'true'
                
                # 尝试解析为 JSON（对象或数组）
                try:
                    return json.loads(expected)
                except (json.JSONDecodeError, ValueError):
                    pass
            
            # 保持原值
            return expected
        
        elif expected_type == ExpectedType.STRING:
            return str(expected)
        
        elif expected_type == ExpectedType.NUMBER:
            try:
                if isinstance(expected, str) and '.' in expected:
                    return float(expected)
                return int(expected) if isinstance(expected, str) else expected
            except (ValueError, TypeError):
                print(f"[断言引擎] 无法将 {expected} 转换为数字，保持原值")
                return expected
        
        elif expected_type == ExpectedType.BOOLEAN:
            if isinstance(expected, str):
                return expected.lower() in ('true', '1', 'yes')
            return bool(expected)
        
        elif expected_type == ExpectedType.OBJECT:
            if isinstance(expected, str):
                try:
                    return json.loads(expected)
                except json.JSONDecodeError:
                    print(f"[断言引擎] 无法将 {expected} 解析为对象")
                    return expected
            return expected
        
        elif expected_type == ExpectedType.ARRAY:
            if isinstance(expected, str):
                try:
                    return json.loads(expected)
                except json.JSONDecodeError:
                    print(f"[断言引擎] 无法将 {expected} 解析为数组")
                    return expected
            return expected
        
        return expected
    
    def execute_assertions(
        self, 
        assertions: List[Assertion], 
        response_data: Any,
        stop_on_failure: bool = True
    ) -> List[AssertionResult]:
        """
        执行一组断言
        
        Args:
            assertions: 断言列表
            response_data: 响应数据
            stop_on_failure: 是否在第一个失败时停止（默认 True）
            
        Returns:
            断言结果列表
        """
        results = []
        
        for idx, assertion in enumerate(assertions):
            print(f"[断言引擎] 执行断言 {idx + 1}/{len(assertions)}")
            result = self.execute_assertion(assertion, response_data)
            results.append(result)
            
            # 如果失败且策略是停止，则不再执行后续断言
            if not result.success and stop_on_failure:
                print(f"[断言引擎] 断言失败，策略为停止执行，跳过剩余 {len(assertions) - idx - 1} 个断言")
                break
        
        return results
    
    def execute_assertion(
        self, 
        assertion: Assertion, 
        response_data: Any
    ) -> AssertionResult:
        """
        执行单个断言
        
        Args:
            assertion: 断言配置
            response_data: 响应数据
            
        Returns:
            断言结果
        """
        try:
            print(f"[断言引擎] 字段路径: {assertion.field}")
            print(f"[断言引擎] 响应数据类型: {type(response_data)}")
            
            # 提取实际值
            # 如果字段路径是变量引用（如 step_xxx.response.xxx），使用变量路径解析
            # 这种情况用于独立断言节点，可以引用任何步骤的数据
            if assertion.field.startswith('step_'):
                print(f"[断言引擎] 检测到变量引用路径（独立断言节点），使用 resolve_variable_path")
                actual_value = self.variable_manager.resolve_variable_path(assertion.field)
            else:
                # 否则，从当前响应数据中提取（如 message、data.token、status）
                # 这种情况用于API节点内的断言，只访问当前节点的响应
                print(f"[断言引擎] 使用 extract_from_response 从当前响应提取（API节点内断言）")
                
                # 🔧 修复：构建断言上下文，正确处理数组响应
                assertion_context = self._build_assertion_context(response_data, assertion.field)
                
                actual_value = self.variable_manager.extract_from_response(
                    assertion_context, 
                    assertion.field
                )
            
            print(f"[断言引擎] 提取到的实际值: {actual_value} (类型: {type(actual_value)})")
            
            # 🔧 解析期望值中的变量引用
            expected_value = assertion.expected
            print(f"[断言引擎] 原始期望值: {expected_value}")
            
            # 如果期望值是字符串且包含变量引用，先解析变量
            if isinstance(expected_value, str):
                resolved_expected = self._resolve_expected_variables(expected_value)
                print(f"[断言引擎] 变量解析后的期望值: {resolved_expected} (类型: {type(resolved_expected)})")
                expected_value = resolved_expected
            
            # 转换期望值类型
            expected_value = self._convert_expected_value(
                expected_value,
                assertion.expectedType
            )
            print(f"[断言引擎] 类型转换后的期望值: {expected_value} (类型: {type(expected_value)})")
            
            # 执行断言比较
            success, message = self._compare(
                actual_value,
                assertion.operator,
                expected_value
            )
            
            return AssertionResult(
                assertion=assertion,
                success=success,
                actual_value=actual_value,
                message=message,
                resolved_expected=expected_value  # 传入解析后的期望值
            )
        
        except Exception as e:
            print(f"[断言引擎] 断言执行异常: {str(e)}")
            import traceback
            traceback.print_exc()
            return AssertionResult(
                assertion=assertion,
                success=False,
                actual_value=None,
                message=f"断言执行失败: {str(e)}"
            )
    
    def _compare(
        self, 
        actual: Any, 
        operator: AssertionOperator, 
        expected: Any
    ) -> tuple[bool, str]:
        """
        执行断言比较
        
        Args:
            actual: 实际值
            operator: 操作符
            expected: 期望值
            
        Returns:
            (是否成功, 消息)
        """
        try:
            if operator == AssertionOperator.EQUALS:
                success = actual == expected
                message = f"期望 {actual} == {expected}"
            
            elif operator == AssertionOperator.NOT_EQUALS:
                success = actual != expected
                message = f"期望 {actual} != {expected}"
            
            elif operator == AssertionOperator.CONTAINS:
                if isinstance(actual, str):
                    success = str(expected) in actual
                elif isinstance(actual, (list, tuple)):
                    success = expected in actual
                elif isinstance(actual, dict):
                    success = expected in actual.values()
                else:
                    success = False
                message = f"期望 {actual} 包含 {expected}"
            
            elif operator == AssertionOperator.NOT_CONTAINS:
                if isinstance(actual, str):
                    success = str(expected) not in actual
                elif isinstance(actual, (list, tuple)):
                    success = expected not in actual
                elif isinstance(actual, dict):
                    success = expected not in actual.values()
                else:
                    success = True
                message = f"期望 {actual} 不包含 {expected}"
            
            elif operator == AssertionOperator.GREATER_THAN:
                success = float(actual) > float(expected)
                message = f"期望 {actual} > {expected}"
            
            elif operator == AssertionOperator.LESS_THAN:
                success = float(actual) < float(expected)
                message = f"期望 {actual} < {expected}"
            
            elif operator == AssertionOperator.EXISTS:
                success = actual is not None
                message = f"期望字段存在，实际: {actual is not None}"
            
            elif operator == AssertionOperator.NOT_EXISTS:
                success = actual is None
                message = f"期望字段不存在，实际: {actual is None}"
            
            else:
                success = False
                message = f"未知的断言操作符: {operator}"
            
            return success, message
        
        except Exception as e:
            return False, f"断言比较失败: {str(e)}"
    
    def all_passed(self, results: List[AssertionResult]) -> bool:
        """检查所有断言是否都通过"""
        return all(result.success for result in results)

