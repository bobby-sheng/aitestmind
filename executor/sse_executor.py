"""
SSE 实时执行器 - 支持实时推送执行进度
"""
import json
from datetime import datetime
from typing import AsyncGenerator, Dict, Any
from test_executor import TestExecutor
from models import TestCase


class SSEExecutor:
    """支持 SSE 实时推送的执行器"""
    
    def __init__(self, database=None):
        self.database = database
    
    async def execute_with_stream(
        self, 
        test_case: TestCase
    ) -> AsyncGenerator[str, None]:
        """
        执行测试用例并实时推送进度
        
        Yields:
            SSE 格式的消息
        """
        try:
            # 发送开始消息
            yield self._format_sse({
                'type': 'start',
                'data': {
                    'testCaseId': test_case.id,
                    'testCaseName': test_case.name,
                    'totalSteps': len([n for n in test_case.flowConfig.nodes if n.type not in ['start', 'end']]),
                    'startTime': datetime.now().isoformat()
                }
            })
            
            # 创建执行器
            async with TestExecutor(timeout=30, database=self.database) as executor:
                # 获取执行顺序（返回普通节点和后置清理节点）
                execution_order, cleanup_nodes = executor._build_execution_order(test_case.flowConfig)
                total_steps = len(execution_order) + len(cleanup_nodes)
                
                # 初始化变量管理器等
                from variable_manager import VariableManager
                from assertion_engine import AssertionEngine
                from wait_handler import WaitHandler
                
                variable_manager = VariableManager(
                    test_case.flowConfig.variables or {}
                )
                assertion_engine = AssertionEngine(variable_manager)
                wait_handler = WaitHandler(variable_manager)
                
                executed_steps = 0
                passed_steps = 0
                failed_steps = 0
                has_failure = False
                
                # 记录每个节点的执行状态
                node_execution_map = {}  # {nodeId: {status, result}}
                
                # 第一阶段：逐个执行普通节点
                for idx, node in enumerate(execution_order):
                    print(f"[SSE执行器] ========== 开始执行步骤 {idx + 1}/{len(execution_order)}: {node.id} ({node.type.value}) ==========")
                    
                    # 发送步骤开始消息
                    yield self._format_sse({
                        'type': 'step_start',
                        'data': {
                            'stepIndex': idx + 1,
                            'totalSteps': total_steps,
                            'nodeId': node.id,
                            'nodeType': node.type.value,
                            'nodeName': node.data.get('name', f'步骤 {idx + 1}'),
                            'startTime': datetime.now().isoformat()
                        }
                    })
                    print(f"[SSE执行器] 已发送 step_start 事件")
                    
                    # 执行节点
                    start_time = datetime.now()
                    print(f"[SSE执行器] 调用 _execute_node...")
                    step_result = await executor._execute_node(
                        node=node,
                        variable_manager=variable_manager,
                        assertion_engine=assertion_engine,
                        wait_handler=wait_handler
                    )
                    end_time = datetime.now()
                    duration = (end_time - start_time).total_seconds()
                    
                    executed_steps += 1
                    print(f"[SSE执行器] 节点执行完成: success={step_result.success}, duration={duration}s")
                    
                    # 记录节点执行状态
                    node_execution_map[node.id] = {
                        'status': 'success' if step_result.success else 'error',
                        'executed': True,
                        'duration': duration
                    }
                    
                    if step_result.success:
                        passed_steps += 1
                        print(f"[SSE执行器] 成功步骤数: {passed_steps}")
                    else:
                        failed_steps += 1
                        print(f"[SSE执行器] 失败步骤数: {failed_steps}, 错误: {step_result.error}")
                    
                    # 发送步骤完成消息
                    step_data = {
                        'stepIndex': idx + 1,
                        'nodeId': node.id,
                        'nodeType': node.type.value,
                        'nodeName': step_result.stepName,
                        'success': step_result.success,
                        'duration': duration,
                        'endTime': end_time.isoformat()
                    }
                    
                    # 添加请求信息
                    if step_result.request:
                        try:
                            step_data['request'] = step_result.request if isinstance(step_result.request, dict) else {}
                        except:
                            step_data['request'] = {}
                    
                    # 添加响应信息
                    if step_result.response:
                        try:
                            step_data['response'] = step_result.response if isinstance(step_result.response, dict) else {}
                        except:
                            step_data['response'] = {}
                    
                    # 添加提取的变量
                    if step_result.extractedVariables:
                        try:
                            step_data['extractedVariables'] = step_result.extractedVariables if isinstance(step_result.extractedVariables, dict) else {}
                        except:
                            step_data['extractedVariables'] = {}
                    
                    # 添加断言结果
                    if step_result.assertions:
                        try:
                            # step_result.assertions 已经是字典列表了，不需要再调用 to_dict()
                            step_data['assertions'] = step_result.assertions if isinstance(step_result.assertions, list) else []
                            print(f"[断言] 节点 {node.id} 断言结果: {step_data['assertions']}")
                        except Exception as e:
                            print(f"Error serializing assertions: {e}")
                            step_data['assertions'] = []
                    
                    # 添加错误信息
                    if step_result.error:
                        step_data['error'] = str(step_result.error)
                        print(f"[错误] 节点 {node.id} 失败: {step_result.error}")
                    
                    # 发送步骤完成或失败消息
                    event_type = 'step_complete' if step_result.success else 'step_error'
                    print(f"[SSE] 发送消息类型: {event_type}, 节点: {node.id}, 成功: {step_result.success}")
                    yield self._format_sse({
                        'type': event_type,
                        'data': step_data
                    })
                    
                    # 如果失败，立即停止普通节点执行
                    if not step_result.success:
                        has_failure = True
                        print(f"[执行] 检测到失败，停止普通节点执行。已执行: {executed_steps}, 成功: {passed_steps}, 失败: {failed_steps}")
                        yield self._format_sse({
                            'type': 'error',
                            'data': {
                                'message': f"步骤 '{step_result.stepName}' 执行失败",
                                'error': step_result.error,
                                'nodeId': node.id,
                                'executedSteps': executed_steps,
                                'passedSteps': passed_steps,
                                'failedSteps': failed_steps
                            }
                        })
                        break
                
                # 第二阶段：执行后置清理节点（无论前面成功或失败）
                if cleanup_nodes:
                    if has_failure:
                        print(f"[SSE执行器] ⚠️ 检测到普通节点失败，但仍将执行 {len(cleanup_nodes)} 个后置清理节点")
                    
                    for idx, node in enumerate(cleanup_nodes):
                        cleanup_idx = len(execution_order) + idx
                        print(f"[SSE执行器] ========== 开始执行后置清理步骤 {cleanup_idx + 1}/{total_steps}: {node.id} ({node.type.value}) ==========")
                        
                        # 发送步骤开始消息
                        yield self._format_sse({
                            'type': 'step_start',
                            'data': {
                                'stepIndex': cleanup_idx + 1,
                                'totalSteps': total_steps,
                                'nodeId': node.id,
                                'nodeType': node.type.value,
                                'nodeName': f'[清理] {node.data.get("name", f"步骤 {cleanup_idx + 1}")}',
                                'startTime': datetime.now().isoformat(),
                                'isCleanup': True
                            }
                        })
                        
                        # 执行后置清理节点
                        start_time = datetime.now()
                        step_result = await executor._execute_node(
                            node=node,
                            variable_manager=variable_manager,
                            assertion_engine=assertion_engine,
                            wait_handler=wait_handler
                        )
                        end_time = datetime.now()
                        duration = (end_time - start_time).total_seconds()
                        
                        executed_steps += 1
                        
                        # 记录节点执行状态
                        node_execution_map[node.id] = {
                            'status': 'success' if step_result.success else 'error',
                            'executed': True,
                            'duration': duration,
                            'isCleanup': True
                        }
                        
                        if step_result.success:
                            passed_steps += 1
                            print(f"[SSE执行器] 后置清理节点成功: {passed_steps}")
                        else:
                            failed_steps += 1
                            print(f"[SSE执行器] 后置清理节点失败: {failed_steps}, 错误: {step_result.error}，但继续执行其他清理节点")
                        
                        # 发送步骤完成消息
                        step_data = {
                            'stepIndex': cleanup_idx + 1,
                            'nodeId': node.id,
                            'nodeType': node.type.value,
                            'nodeName': step_result.stepName,
                            'success': step_result.success,
                            'duration': duration,
                            'endTime': end_time.isoformat(),
                            'isCleanup': True
                        }
                        
                        if step_result.request:
                            try:
                                step_data['request'] = step_result.request if isinstance(step_result.request, dict) else {}
                            except:
                                step_data['request'] = {}
                        
                        if step_result.response:
                            try:
                                step_data['response'] = step_result.response if isinstance(step_result.response, dict) else {}
                            except:
                                step_data['response'] = {}
                        
                        if step_result.error:
                            step_data['error'] = str(step_result.error)
                        
                        event_type = 'step_complete' if step_result.success else 'step_error'
                        yield self._format_sse({
                            'type': event_type,
                            'data': step_data
                        })
                        # 后置清理节点失败不中断，继续执行其他清理节点
                
                # 发送完成消息（包含所有节点的最终状态）
                all_success = failed_steps == 0
                
                # 使用实际记录的节点执行状态
                print(f"[SSE执行器] 发送完成消息，节点状态: {node_execution_map}")
                
                yield self._format_sse({
                    'type': 'complete',
                    'data': {
                        'success': all_success,
                        'executedSteps': executed_steps,
                        'passedSteps': passed_steps,
                        'failedSteps': failed_steps,
                        'totalSteps': total_steps,
                        'variables': variable_manager.get_all_variables(),
                        'endTime': datetime.now().isoformat(),
                        'nodeStatuses': node_execution_map  # 使用实际记录的节点状态
                    }
                })
                
        except Exception as e:
            # 发送错误消息
            yield self._format_sse({
                'type': 'error',
                'data': {
                    'message': '执行异常',
                    'error': str(e)
                }
            })
    
    def _format_sse(self, data: Dict[str, Any]) -> str:
        """
        格式化 SSE 消息
        
        Args:
            data: 消息数据
            
        Returns:
            SSE 格式的字符串
        """
        return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"

