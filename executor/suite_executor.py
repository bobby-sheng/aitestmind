"""
测试套件执行器 - 批量执行测试测试套件
"""
import asyncio
import json
import sys
import os
from datetime import datetime
from typing import Dict, Any, List

# 添加当前目录到 Python 路径
sys.path.insert(0, os.path.dirname(__file__))

from database import Database
from test_executor import TestExecutor
from models import TestCase, FlowConfig, FlowNode, NodeType
from logger_config import get_logger

# 获取日志器
logger = get_logger('executor')


class SuiteExecutor:
    """测试套件执行器"""
    
    def __init__(self, database: Database, stop_flags: dict = None):
        self.database = database
        self.stop_flags = stop_flags if stop_flags is not None else {}
    
    async def execute_suite(
        self, 
        suite_execution_id: str,
        suite_id: str,
        environment_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        执行测试测试套件
        
        Args:
            suite_execution_id: 测试套件执行ID
            suite_id: 测试套件ID
            environment_config: 环境配置
            
        Returns:
            执行结果
        """
        # 记录执行开始
        suite_data = self.database.get_test_suite(suite_id)
        suite_name = suite_data.get('name', suite_id) if suite_data else suite_id
        
        logger.execution_start(suite_name, suite_execution_id)
        
        start_time = datetime.now()
        
        # 初始化统计变量（必须在try外初始化，以便异常处理时可用）
        total_cases = 0
        passed_cases = 0
        failed_cases = 0
        total_passed_steps = 0
        total_failed_steps = 0
        
        # 记录测试套件级别的日志
        self.database.create_execution_log(
            level='info',
            message=f'开始执行测试套件: {suite_id}',
            suite_execution_id=suite_execution_id,
            log_type='system'
        )
        
        try:
            # 1. 获取测试套件信息
            logger.db_operation('SELECT', 'TestSuiteExecution')
            suite_execution = self.database.get_suite_execution(suite_execution_id)
            if not suite_execution:
                raise Exception(f"测试套件执行记录不存在: {suite_execution_id}")
            
            # 2. 获取用例列表（按order排序，只获取enabled=true的）
            logger.db_operation('SELECT', 'TestSuiteCase', data={'suiteId': suite_id})
            test_cases = self.database.get_suite_test_cases(suite_id)
            
            if not test_cases:
                raise Exception(f"测试套件中没有启用的测试用例: {suite_id}")
            
            logger.info(f"📋 总共 {len(test_cases)} 个测试用例待执行")
            
            self.database.create_execution_log(
                level='info',
                message=f'共有 {len(test_cases)} 个测试用例待执行',
                suite_execution_id=suite_execution_id,
                log_type='system'
            )
            
            # 3. 更新总用例数
            total_cases = len(test_cases)
            
            # 4. 逐个执行用例
            for idx, test_case_data in enumerate(test_cases):
                # 检查是否需要停止执行
                if self.stop_flags.get(suite_execution_id):
                    logger.warning(f"🛑 检测到停止信号，中断执行")
                    self.database.create_execution_log(
                        level='warning',
                        message='执行已被用户手动停止',
                        suite_execution_id=suite_execution_id,
                        log_type='system'
                    )
                    break
                
                case_order = idx + 1
                test_case_id = test_case_data['id']
                test_case_name = test_case_data['name']
                test_case_config = test_case_data['flowConfig']
                
                logger.flow(f"\n{'─'*60}")
                logger.flow(f"[{case_order}/{total_cases}] 执行用例: {test_case_name}")
                logger.flow(f"{'─'*60}")
                
                # 4.1 创建用例执行记录
                logger.db_operation('INSERT', 'TestCaseExecution', data={'testCaseName': test_case_name})
                case_execution_id = self.database.create_case_execution(
                    suite_execution_id=suite_execution_id,
                    test_case_id=test_case_id,
                    test_case_name=test_case_name,
                    test_case_snapshot=test_case_config,
                    order=case_order,
                    total_steps=len([n for n in test_case_config.get('nodes', []) if n.get('type') not in ['start', 'end']])
                )
                
                # 记录用例开始日志
                self.database.create_execution_log(
                    level='info',
                    message=f'开始执行用例: {test_case_name}',
                    case_execution_id=case_execution_id,
                    suite_execution_id=suite_execution_id,
                    log_type='system'
                )
                
                # 4.2 执行用例
                case_start_time = datetime.now()
                
                try:
                    # 使用TestExecutor执行单个用例
                    test_case_obj = TestCase(
                        id=test_case_id,
                        name=test_case_name,
                        status=test_case_data['status'],
                        flowConfig=FlowConfig(**test_case_config)
                    )
                    
                    async with TestExecutor(
                        timeout=60, 
                        database=self.database, 
                        environment_config=environment_config,
                        case_execution_id=case_execution_id,  # 传递用例执行ID
                        suite_execution_id=suite_execution_id  # 传递套件执行ID
                    ) as executor:
                        # 执行用例
                        result = await executor.execute_test_case(test_case_obj)
                    
                    case_end_time = datetime.now()
                    case_duration = int((case_end_time - case_start_time).total_seconds() * 1000)
                    
                    # 4.3 更新用例执行记录
                    if result.success:
                        passed_cases += 1
                        self.database.update_case_execution(
                            case_execution_id,
                            status='passed',
                            end_time=case_end_time,
                            duration=case_duration,
                            passed_steps=result.passedSteps,
                            failed_steps=result.failedSteps,
                            total_steps=result.totalSteps
                        )
                        print(f"✅ 用例执行成功 (耗时: {case_duration}ms)")
                        
                        self.database.create_execution_log(
                            level='success',
                            message=f'用例执行成功，耗时 {case_duration}ms',
                            case_execution_id=case_execution_id,
                            suite_execution_id=suite_execution_id,
                            log_type='system'
                        )
                    else:
                        failed_cases += 1
                        self.database.update_case_execution(
                            case_execution_id,
                            status='failed',
                            end_time=case_end_time,
                            duration=case_duration,
                            passed_steps=result.passedSteps,
                            failed_steps=result.failedSteps,
                            total_steps=result.totalSteps,
                            error_message=result.error
                        )
                        print(f"❌ 用例执行失败: {result.error}")
                        
                        self.database.create_execution_log(
                            level='error',
                            message=f'用例执行失败: {result.error}',
                            case_execution_id=case_execution_id,
                            suite_execution_id=suite_execution_id,
                            log_type='error',
                            details={'error': result.error}
                        )
                        # 继续执行下一个用例（不中断）
                    
                    # 累加步骤统计
                    total_passed_steps += result.passedSteps
                    total_failed_steps += result.failedSteps
                    
                except Exception as e:
                    case_end_time = datetime.now()
                    case_duration = int((case_end_time - case_start_time).total_seconds() * 1000)
                    
                    failed_cases += 1
                    self.database.update_case_execution(
                        case_execution_id,
                        status='failed',
                        end_time=case_end_time,
                        duration=case_duration,
                        error_message=str(e)
                    )
                    print(f"❌ 用例执行异常: {str(e)}")
                    
                    self.database.create_execution_log(
                        level='error',
                        message=f'用例执行异常: {str(e)}',
                        case_execution_id=case_execution_id,
                        suite_execution_id=suite_execution_id,
                        log_type='error',
                        details={'error': str(e)}
                    )
                    # 继续执行下一个用例
            
            # 5. 所有用例执行完成
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds() * 1000)
            
            # 6. 检查是否因停止而中断
            was_stopped = self.stop_flags.get(suite_execution_id, False)
            final_status = 'stopped' if was_stopped else 'completed'
            
            # 7. 更新测试套件执行记录
            self.database.update_suite_execution(
                suite_execution_id,
                status=final_status,
                end_time=end_time,
                duration=duration,
                passed_cases=passed_cases,
                failed_cases=failed_cases,
                passed_steps=total_passed_steps,
                failed_steps=total_failed_steps
            )
            
            # 8. 输出汇总
            print(f"\n{'='*60}")
            if was_stopped:
                print(f"测试套件执行已停止")
            else:
                print(f"测试套件执行完成")
            print(f"{'='*60}")
            print(f"总用例数: {total_cases}")
            print(f"通过: {passed_cases}")
            print(f"失败: {failed_cases}")
            print(f"通过率: {(passed_cases/total_cases*100):.1f}%")
            print(f"总耗时: {duration}ms ({duration/1000:.2f}s)")
            print(f"{'='*60}\n")
            
            return {
                'success': True,
                'suiteExecutionId': suite_execution_id,
                'totalCases': total_cases,
                'passedCases': passed_cases,
                'failedCases': failed_cases,
                'duration': duration
            }
            
        except Exception as e:
            print(f"\n❌ 测试套件执行失败: {str(e)}\n")
            
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds() * 1000)
            
            # 记录测试套件失败日志
            self.database.create_execution_log(
                level='error',
                message=f'测试套件执行异常: {str(e)}',
                suite_execution_id=suite_execution_id,
                type='system'
            )
            
            # 更新为失败状态，包含统计信息
            self.database.update_suite_execution(
                suite_execution_id,
                status='failed',
                end_time=end_time,
                duration=duration,
                passed_cases=passed_cases,
                failed_cases=failed_cases,
                passed_steps=total_passed_steps,
                failed_steps=total_failed_steps,
                logs=f"执行异常: {str(e)}"
            )
            
            return {
                'success': False,
                'error': str(e)
            }


# 测试代码
if __name__ == '__main__':
    async def test_suite_executor():
        """测试套件执行器"""
        db = Database()
        executor = SuiteExecutor(db)
        
        # 模拟参数（实际使用时从API接收）
        suite_execution_id = 'test_execution_001'
        suite_id = 'test_suite_001'
        environment_config = {
            'baseUrl': 'https://api.example.com',
            'authTokenEnabled': True,
            'authTokenKey': 'Authorization',
            'authTokenValue': 'Bearer test-token'
        }
        
        result = await executor.execute_suite(
            suite_execution_id,
            suite_id,
            environment_config
        )
        
        print(f"执行结果: {json.dumps(result, indent=2, ensure_ascii=False)}")
    
    asyncio.run(test_suite_executor())

