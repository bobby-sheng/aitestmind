"""
等待处理器 - 负责处理等待逻辑
"""
import asyncio
from typing import Any, Optional, Dict
from models import WaitConfig, WaitType
from variable_manager import VariableManager


class WaitHandler:
    """等待处理器"""
    
    def __init__(self, variable_manager: VariableManager):
        """
        初始化等待处理器
        
        Args:
            variable_manager: 变量管理器实例
        """
        self.variable_manager = variable_manager
    
    async def wait(self, config: WaitConfig) -> tuple[bool, Optional[str]]:
        """
        执行等待
        
        Args:
            config: 等待配置
            
        Returns:
            (是否成功, 错误信息)
        """
        if config.type == WaitType.TIME:
            success = await self._wait_time(config.value or 0)
            return (success, None)
        
        elif config.type == WaitType.CONDITION:
            max_timeout = config.timeout or 30000
            check_interval = config.checkInterval or 2000
            return await self._wait_condition(config, max_timeout, check_interval)
        
        return (True, None)
    
    async def _wait_time(self, milliseconds: int) -> bool:
        """
        等待指定时间（分段等待，定期输出进度）
        
        Args:
            milliseconds: 等待时间（毫秒）
            
        Returns:
            True（总是成功）
        """
        if milliseconds <= 0:
            return True
        
        total_seconds = milliseconds / 1000.0
        print(f"[时间等待] 开始等待 {milliseconds}ms ({total_seconds:.1f}秒)")
        
        # 如果等待时间超过10秒，分段等待并输出进度
        if milliseconds > 10000:
            progress_interval = 5000  # 每5秒输出一次进度
            elapsed = 0
            
            while elapsed < milliseconds:
                wait_chunk = min(progress_interval, milliseconds - elapsed)
                await asyncio.sleep(wait_chunk / 1000.0)
                elapsed += wait_chunk
                
                progress_pct = (elapsed / milliseconds) * 100
                remaining = (milliseconds - elapsed) / 1000.0
                print(f"[时间等待] 进度: {progress_pct:.0f}% ({elapsed/1000:.1f}s/{total_seconds:.1f}s), 剩余: {remaining:.1f}秒")
        else:
            # 短时间等待，直接等待
            await asyncio.sleep(total_seconds)
            print(f"[时间等待] 完成等待 {total_seconds:.1f}秒")
        
        print(f"[时间等待] ✅ 等待完成")
        return True
    
    async def _wait_condition(
        self, 
        config: WaitConfig, 
        max_timeout: int,
        check_interval: int
    ) -> tuple[bool, Optional[str]]:
        """
        等待条件满足
        
        Args:
            config: 等待配置
            max_timeout: 最大超时时间（毫秒）
            check_interval: 检查间隔（毫秒）
            
        Returns:
            (条件是否在超时前满足, 错误信息)
        """
        if not config.condition:
            return (True, None)
        
        condition = config.condition
        start_time = asyncio.get_event_loop().time()
        check_count = 0
        last_actual_value = None
        
        print(f"[等待条件] 开始等待条件满足")
        print(f"[等待条件] 最大超时: {max_timeout}ms ({max_timeout/1000:.1f}秒)")
        print(f"[等待条件] 检查间隔: {check_interval}ms ({check_interval/1000:.1f}秒)")
        print(f"[等待条件] 条件: {condition.variable} {condition.operator} {condition.expected}")
        
        while True:
            check_count += 1
            # 检查是否超时
            elapsed = (asyncio.get_event_loop().time() - start_time) * 1000
            if elapsed >= max_timeout:
                print(f"[等待条件] ❌ 超时！已检查 {check_count} 次，耗时 {elapsed:.0f}ms")
                print(f"[等待条件] 条件未满足: {condition.variable} {condition.operator} {condition.expected}")
                
                # 构建详细的错误信息
                operator_map = {
                    "equals": "等于",
                    "notEquals": "不等于",
                    "exists": "存在"
                }
                operator_text = operator_map.get(condition.operator, condition.operator)
                
                error_msg = (
                    f"等待条件超时（{max_timeout}ms）\n"
                    f"条件: {condition.variable} {operator_text} {condition.expected}\n"
                    f"最后实际值: {last_actual_value}\n"
                    f"已检查: {check_count} 次"
                )
                return (False, error_msg)
            
            # 检查条件
            print(f"\n[等待条件] 第 {check_count} 次检查 (已耗时 {elapsed:.0f}ms):")
            check_result, actual_value = self._check_condition(condition)
            last_actual_value = actual_value
            
            if check_result:
                print(f"[等待条件] ✅ 条件满足！检查了 {check_count} 次，耗时 {elapsed:.0f}ms")
                return (True, None)
            
            # 等待一段时间后再检查
            await asyncio.sleep(check_interval / 1000.0)
    
    def _check_condition(self, condition: Any) -> tuple[bool, Any]:
        """
        检查条件是否满足
        
        Args:
            condition: 条件配置
            
        Returns:
            (条件是否满足, 实际值)
        """
        try:
            # 获取变量值
            actual = self.variable_manager.resolve_variable_path(
                condition.variable
            )
            
            print(f"[等待条件检查] 变量: {condition.variable}")
            print(f"[等待条件检查] 实际值: {actual} (类型: {type(actual).__name__})")
            print(f"[等待条件检查] 期望值: {condition.expected} (类型: {type(condition.expected).__name__})")
            print(f"[等待条件检查] 操作符: {condition.operator}")
            
            # 根据操作符检查条件
            if condition.operator == "equals":
                result = actual == condition.expected
                print(f"[等待条件检查] 比较结果: {result}")
                return (result, actual)
            
            elif condition.operator == "notEquals":
                result = actual != condition.expected
                print(f"[等待条件检查] 比较结果: {result}")
                return (result, actual)
            
            elif condition.operator == "exists":
                result = actual is not None
                print(f"[等待条件检查] 存在性检查结果: {result}")
                return (result, actual)
            
            return (False, actual)
        
        except Exception as e:
            print(f"[等待条件检查] 检查条件失败: {e}")
            import traceback
            traceback.print_exc()
            return (False, None)
    
    async def wait_with_context(
        self, 
        config: WaitConfig,
        context: Dict[str, Any]
    ) -> tuple[bool, Optional[str]]:
        """
        使用提供的上下文执行等待（与断言相同的方式）
        
        Args:
            config: 等待配置
            context: 响应上下文（与断言上下文相同，字段已展平到根层级）
            
        Returns:
            (是否成功, 错误信息)
        """
        if config.type == WaitType.TIME:
            # 复用_wait_time方法，它已经包含了进度输出
            success = await self._wait_time(config.value or 0)
            return (success, None)
        
        elif config.type == WaitType.CONDITION:
            max_timeout = config.timeout or 30000
            check_interval = config.checkInterval or 2000
            return await self._wait_condition_with_context(
                config, context, max_timeout, check_interval
            )
        
        return (True, None)
    
    async def _wait_condition_with_context(
        self, 
        config: WaitConfig, 
        context: Dict[str, Any],
        max_timeout: int,
        check_interval: int
    ) -> tuple[bool, Optional[str]]:
        """
        使用上下文等待条件满足
        
        Args:
            config: 等待配置
            context: 响应上下文
            max_timeout: 最大超时时间（毫秒）
            check_interval: 检查间隔（毫秒）
            
        Returns:
            (条件是否在超时前满足, 错误信息)
        """
        if not config.condition:
            return (True, None)
        
        condition = config.condition
        start_time = asyncio.get_event_loop().time()
        check_count = 0
        last_actual_value = None
        
        print(f"[等待条件-上下文模式] 开始等待条件满足")
        print(f"[等待条件-上下文模式] 最大超时: {max_timeout}ms ({max_timeout/1000:.1f}秒)")
        print(f"[等待条件-上下文模式] 检查间隔: {check_interval}ms ({check_interval/1000:.1f}秒)")
        print(f"[等待条件-上下文模式] 条件: {condition.variable} {condition.operator} {condition.expected}")
        print(f"[等待条件-上下文模式] 上下文内容: {context}")
        
        while True:
            check_count += 1
            # 检查是否超时
            elapsed = (asyncio.get_event_loop().time() - start_time) * 1000
            if elapsed >= max_timeout:
                print(f"[等待条件-上下文模式] ❌ 超时！已检查 {check_count} 次，耗时 {elapsed:.0f}ms")
                
                # 构建详细的错误信息
                operator_map = {
                    "equals": "等于",
                    "notEquals": "不等于",
                    "exists": "存在"
                }
                operator_text = operator_map.get(condition.operator, condition.operator)
                
                error_msg = (
                    f"等待条件超时（{max_timeout}ms）\n"
                    f"条件: {condition.variable} {operator_text} {condition.expected}\n"
                    f"最后实际值: {last_actual_value}\n"
                    f"已检查: {check_count} 次"
                )
                return (False, error_msg)
            
            # 检查条件
            print(f"\n[等待条件-上下文模式] 第 {check_count} 次检查 (已耗时 {elapsed:.0f}ms):")
            check_result, actual_value = self._check_condition_with_context(condition, context)
            last_actual_value = actual_value
            
            if check_result:
                print(f"[等待条件-上下文模式] ✅ 条件满足！检查了 {check_count} 次，耗时 {elapsed:.0f}ms")
                return (True, None)
            
            # 等待一段时间后再检查
            await asyncio.sleep(check_interval / 1000.0)
    
    def _check_condition_with_context(
        self, 
        condition: Any,
        context: Dict[str, Any]
    ) -> tuple[bool, Any]:
        """
        使用上下文检查条件是否满足（与断言相同的方式）
        
        Args:
            condition: 条件配置
            context: 响应上下文
            
        Returns:
            (条件是否满足, 实际值)
        """
        try:
            # 直接从上下文中提取值（与断言引擎相同的方式）
            field_path = condition.variable
            
            print(f"[等待条件检查-上下文] 字段路径: {field_path}")
            print(f"[等待条件检查-上下文] 上下文keys: {list(context.keys())}")
            
            # 使用 extract_from_response 方法（与断言引擎相同）
            actual = self.variable_manager.extract_from_response(context, field_path)
            
            print(f"[等待条件检查-上下文] 实际值: {actual} (类型: {type(actual).__name__})")
            print(f"[等待条件检查-上下文] 期望值: {condition.expected} (类型: {type(condition.expected).__name__})")
            print(f"[等待条件检查-上下文] 操作符: {condition.operator}")
            
            # 根据操作符检查条件
            if condition.operator == "equals":
                result = actual == condition.expected
                print(f"[等待条件检查-上下文] 比较结果: {result}")
                return (result, actual)
            
            elif condition.operator == "notEquals":
                result = actual != condition.expected
                print(f"[等待条件检查-上下文] 比较结果: {result}")
                return (result, actual)
            
            elif condition.operator == "exists":
                result = actual is not None
                print(f"[等待条件检查-上下文] 存在性检查结果: {result}")
                return (result, actual)
            
            return (False, actual)
        
        except Exception as e:
            print(f"[等待条件检查-上下文] 检查条件失败: {e}")
            import traceback
            traceback.print_exc()
            return (False, None)

