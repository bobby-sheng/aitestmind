"""
数据库访问层 - 从 SQLite 数据库读取测试用例
"""
import sqlite3
import json
import re
import pytz
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import uuid4
from models import TestCase, TestStep, FlowConfig, TestCaseStatus, NodeType


def format_datetime_for_prisma(dt: datetime) -> str:
    """
    格式化 datetime 为 Prisma 兼容的格式
    Prisma 只支持毫秒精度（3位），不支持微秒（6位）
    
    Args:
        dt: datetime 对象
        
    Returns:
        格式化的 ISO 8601 字符串（毫秒精度 + Z）
    """
    # 格式化为 ISO 8601，截取到毫秒（3位）
    iso_str = dt.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
    return iso_str


def sanitize_text(text: str, max_length: int = None) -> str:
    """
    清理文本，移除无效字符和控制字符
    
    Args:
        text: 要清理的文本
        max_length: 最大长度限制
        
    Returns:
        清理后的文本
    """
    if not text:
        return text
    
    # 移除 ANSI 颜色代码
    text = re.sub(r'\x1b\[[0-9;]*m', '', text)
    
    # 移除其他控制字符，但保留换行、制表符
    text = ''.join(char for char in text if ord(char) >= 32 or char in '\n\r\t')
    
    # 确保是有效的 UTF-8
    text = text.encode('utf-8', errors='ignore').decode('utf-8', errors='ignore')
    
    # 限制长度
    if max_length and len(text) > max_length:
        text = text[:max_length] + '...(truncated)'
    
    return text


def sanitize_json(data: Any) -> str:
    """
    安全地序列化 JSON 数据
    
    Args:
        data: 要序列化的数据
        
    Returns:
        JSON 字符串
    """
    try:
        # 使用 ensure_ascii=False 保持 UTF-8 编码
        json_str = json.dumps(data, ensure_ascii=False, default=str)
        # 清理可能的无效字符
        return sanitize_text(json_str)
    except Exception as e:
        # 如果序列化失败，返回错误信息
        return json.dumps({"error": f"Failed to serialize: {str(e)}"})


class Database:
    """数据库访问类"""
    
    def __init__(self, db_path: str):
        """
        初始化数据库连接
        
        Args:
            db_path: 数据库文件路径
        """
        self.db_path = db_path
    
    def get_connection(self):
        """获取数据库连接"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # 使用字典游标
        return conn
    
    def get_platform_settings(self) -> Optional[Dict[str, Any]]:
        """
        获取平台设置
        
        Returns:
            平台设置字典
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """
                SELECT * FROM PlatformSettings 
                ORDER BY updatedAt DESC 
                LIMIT 1
                """
            )
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return dict(row)
        
        finally:
            conn.close()
    
    def get_api_by_id(self, api_id: str) -> Optional[Dict[str, Any]]:
        """
        根据 ID 获取 API 信息
        
        Args:
            api_id: API ID
            
        Returns:
            API 信息字典
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """
                SELECT id, name, method, url, path, domain,
                       requestHeaders, requestQuery, requestBody
                FROM Api WHERE id = ?
                """,
                (api_id,)
            )
            row = cursor.fetchone()
            
            if not row:
                return None
            
            return dict(row)
        
        finally:
            conn.close()
    
    def get_test_case_by_id(self, test_case_id: str) -> Optional[TestCase]:
        """
        根据 ID 获取测试用例
        
        Args:
            test_case_id: 测试用例 ID
            
        Returns:
            测试用例对象，如果不存在则返回 None
        """
        print(f"[数据库] 查询测试用例 ID: {test_case_id}")
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # 查询测试用例
            cursor.execute(
                """
                SELECT * FROM TestCase WHERE id = ?
                """,
                (test_case_id,)
            )
            row = cursor.fetchone()
            
            if not row:
                print(f"[数据库] 未找到测试用例 ID: {test_case_id}")
                return None
            
            print(f"[数据库] 找到测试用例: {row['name']}")
            
            # 查询测试步骤
            cursor.execute(
                """
                SELECT * FROM TestStep 
                WHERE testCaseId = ? 
                ORDER BY "order" ASC
                """,
                (test_case_id,)
            )
            step_rows = cursor.fetchall()
            print(f"[数据库] 测试步骤数: {len(step_rows)}")
            
            # 转换为对象
            test_case = self._row_to_test_case(row, step_rows)
            print(f"[数据库] 测试用例转换完成，flowConfig 节点数: {len(test_case.flowConfig.nodes)}")
            return test_case
        
        except Exception as e:
            print(f"[数据库] 查询测试用例异常: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
        
        finally:
            conn.close()
    
    def get_test_case_by_name(self, name: str) -> Optional[TestCase]:
        """
        根据名称获取测试用例
        
        Args:
            name: 测试用例名称
            
        Returns:
            测试用例对象，如果不存在则返回 None
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # 查询测试用例
            cursor.execute(
                """
                SELECT * FROM TestCase WHERE name = ? LIMIT 1
                """,
                (name,)
            )
            row = cursor.fetchone()
            
            if not row:
                return None
            
            # 查询测试步骤
            cursor.execute(
                """
                SELECT * FROM TestStep 
                WHERE testCaseId = ? 
                ORDER BY "order" ASC
                """,
                (row['id'],)
            )
            step_rows = cursor.fetchall()
            
            # 转换为对象
            test_case = self._row_to_test_case(row, step_rows)
            return test_case
        
        finally:
            conn.close()
    
    def list_test_cases(
        self, 
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        列出所有测试用例
        
        Args:
            status: 状态过滤（可选）
            
        Returns:
            测试用例列表
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            if status:
                cursor.execute(
                    """
                    SELECT id, name, description, status, 
                           executeCount, successCount, failCount,
                           createdAt, updatedAt
                    FROM TestCase 
                    WHERE status = ?
                    ORDER BY updatedAt DESC
                    """,
                    (status,)
                )
            else:
                cursor.execute(
                    """
                    SELECT id, name, description, status, 
                           executeCount, successCount, failCount,
                           createdAt, updatedAt
                    FROM TestCase 
                    ORDER BY updatedAt DESC
                    """
                )
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        
        finally:
            conn.close()
    
    def update_test_case_stats(
        self,
        test_case_id: str,
        success: bool
    ) -> None:
        """
        更新测试用例统计信息
        
        Args:
            test_case_id: 测试用例 ID
            success: 是否执行成功
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            if success:
                cursor.execute(
                    """
                    UPDATE TestCase 
                    SET executeCount = executeCount + 1,
                        successCount = successCount + 1
                    WHERE id = ?
                    """,
                    (test_case_id,)
                )
            else:
                cursor.execute(
                    """
                    UPDATE TestCase 
                    SET executeCount = executeCount + 1,
                        failCount = failCount + 1
                    WHERE id = ?
                    """,
                    (test_case_id,)
                )
            
            conn.commit()
        
        finally:
            conn.close()
    
    def _row_to_test_case(self, row: sqlite3.Row, step_rows: List[sqlite3.Row]) -> TestCase:
        """
        将数据库行转换为测试用例对象
        
        Args:
            row: 测试用例行
            step_rows: 测试步骤行列表
            
        Returns:
            测试用例对象
        """
        # 解析 JSON 字段
        flow_config_data = json.loads(row['flowConfig'])
        tags = json.loads(row['tags']) if row['tags'] else []
        
        # 转换步骤
        steps = []
        for step_row in step_rows:
            step = TestStep(
                id=step_row['id'],
                name=step_row['name'],
                description=step_row['description'],
                order=step_row['order'],
                nodeId=step_row['nodeId'],
                apiId=step_row['apiId'],
                type=NodeType(step_row['type']),
                config=json.loads(step_row['config']),
                positionX=step_row['positionX'],
                positionY=step_row['positionY']
            )
            steps.append(step)
        
        # 创建测试用例
        test_case = TestCase(
            id=row['id'],
            name=row['name'],
            description=row['description'],
            status=TestCaseStatus(row['status']),
            tags=tags,
            flowConfig=FlowConfig(**flow_config_data),
            steps=steps,
            executeCount=row['executeCount'],
            successCount=row['successCount'],
            failCount=row['failCount']
        )
        
        return test_case
    
    # ==================== 测试套件相关方法 ====================
    
    def get_suite_execution(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """获取测试套件执行记录"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                "SELECT * FROM TestSuiteExecution WHERE id = ?",
                (execution_id,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()
    
    def get_suite_test_cases(self, suite_id: str) -> List[Dict[str, Any]]:
        """获取测试套件中的所有测试用例（按order排序，只获取enabled的）"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """
                SELECT tc.id, tc.name, tc.status, tc.flowConfig, tsc."order"
                FROM TestCase tc
                JOIN TestSuiteCase tsc ON tc.id = tsc.testCaseId
                WHERE tsc.suiteId = ? AND tsc.enabled = 1
                ORDER BY tsc."order" ASC
                """,
                (suite_id,)
            )
            rows = cursor.fetchall()
            
            result = []
            for row in rows:
                result.append({
                    'id': row['id'],
                    'name': row['name'],
                    'status': row['status'],
                    'flowConfig': json.loads(row['flowConfig']),
                    'order': row['order']
                })
            
            return result
        finally:
            conn.close()
    
    def create_case_execution(
        self,
        suite_execution_id: str,
        test_case_id: str,
        test_case_name: str,
        test_case_snapshot: Dict[str, Any],
        order: int,
        total_steps: int
    ) -> str:
        """创建用例执行记录"""
        import time
        case_execution_id = f"case_exec_{int(time.time() * 1000)}_{test_case_id[:8]}"
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # 调试：打印原始数据
            print(f"\n{'='*80}")
            print(f"[数据库写入] TestCaseExecution 表 - 创建用例执行记录")
            print(f"{'='*80}")
            print(f"  - case_execution_id: {case_execution_id}")
            print(f"  - suite_execution_id: {suite_execution_id}")
            print(f"  - test_case_id: {test_case_id}")
            print(f"  - test_case_name 类型: {type(test_case_name)}, 长度: {len(test_case_name) if test_case_name else 0}")
            print(f"  - test_case_name 原始值: {repr(test_case_name[:100]) if test_case_name else 'None'}")
            print(f"  - test_case_snapshot 类型: {type(test_case_snapshot)}")
            print(f"  - order: {order}, totalSteps: {total_steps}")
            
            # 序列化 JSON
            snapshot_json = json.dumps(test_case_snapshot, ensure_ascii=False)
            print(f"  - snapshot_json 长度: {len(snapshot_json)}")
            print(f"  - snapshot_json 前200字符: {repr(snapshot_json[:200])}")
            print(f"  - snapshot_json 后200字符: {repr(snapshot_json[-200:])}")
            
            # 详细检查 JSON 字符串中的特殊字符
            print(f"\n  [深度检查] 扫描 snapshot_json 中的特殊字符:")
            has_null = '\x00' in snapshot_json
            has_control_chars = any(ord(c) < 32 and c not in '\n\r\t' for c in snapshot_json)
            
            if has_null:
                print(f"  ✗ 发现 NUL 字符 (\\x00)")
                null_positions = [i for i, c in enumerate(snapshot_json) if c == '\x00']
                print(f"  ✗ NUL 字符位置: {null_positions[:10]}")  # 只显示前10个
            else:
                print(f"  ✓ 无 NUL 字符")
            
            if has_control_chars:
                print(f"  ✗ 发现控制字符")
                control_chars = [(i, hex(ord(c))) for i, c in enumerate(snapshot_json[:1000]) if ord(c) < 32 and c not in '\n\r\t']
                print(f"  ✗ 控制字符（前10个）: {control_chars[:10]}")
            else:
                print(f"  ✓ 无异常控制字符")
            
            # 检查每个字段的编码
            try:
                test_case_name.encode('utf-8')
                print(f"  ✓ test_case_name UTF-8 编码正常")
            except Exception as e:
                print(f"  ✗ test_case_name UTF-8 编码失败: {e}")
            
            try:
                snapshot_json.encode('utf-8')
                print(f"  ✓ snapshot_json UTF-8 编码正常")
            except Exception as e:
                print(f"  ✗ snapshot_json UTF-8 编码失败: {e}")
            
            # 写入临时文件用于详细分析
            try:
                import tempfile
                with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.json', encoding='utf-8') as f:
                    f.write(snapshot_json)
                    temp_path = f.name
                print(f"  📄 完整 JSON 已保存到: {temp_path}")
            except Exception as e:
                print(f"  ⚠️  无法保存临时文件: {e}")
            
            cursor.execute(
                """
                INSERT INTO TestCaseExecution (
                    id, suiteExecutionId, testCaseId, testCaseName, 
                    testCaseSnapshot, status, "order", totalSteps,
                    startTime, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    case_execution_id,
                    suite_execution_id,
                    test_case_id,
                    test_case_name,
                    snapshot_json,
                    'running',
                    order,
                    total_steps,
                    format_datetime_for_prisma(datetime.now()),
                    format_datetime_for_prisma(datetime.now())
                )
            )
            conn.commit()
            print(f"  ✅ TestCaseExecution 创建成功")
            print(f"{'='*80}\n")
            return case_execution_id
        except Exception as e:
            print(f"  ❌ TestCaseExecution 创建失败: {e}")
            print(f"  错误类型: {type(e)}")
            print(f"{'='*80}\n")
            import traceback
            traceback.print_exc()
            raise
        finally:
            conn.close()
    
    def update_case_execution(
        self,
        case_execution_id: str,
        status: str,
        end_time=None,
        duration: int = None,
        passed_steps: int = 0,
        failed_steps: int = 0,
        total_steps: int = None,
        error_message: str = None
    ):
        """更新用例执行记录"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            print(f"\n{'='*80}")
            print(f"[数据库更新] TestCaseExecution 表 - 更新用例执行记录")
            print(f"{'='*80}")
            print(f"  - case_execution_id: {case_execution_id}")
            print(f"  - status: {status}")
            print(f"  - duration: {duration}")
            print(f"  - passed_steps: {passed_steps}, failed_steps: {failed_steps}")
            
            sql_parts = ["UPDATE TestCaseExecution SET status = ?"]
            params = [status]
            
            if end_time:
                sql_parts.append("endTime = ?")
                params.append(format_datetime_for_prisma(end_time) if hasattr(end_time, 'isoformat') else end_time)
            
            if duration is not None:
                sql_parts.append("duration = ?")
                params.append(duration)
            
            sql_parts.append("passedSteps = ?")
            params.append(passed_steps)
            
            sql_parts.append("failedSteps = ?")
            params.append(failed_steps)
            
            if total_steps is not None:
                sql_parts.append("totalSteps = ?")
                params.append(total_steps)
            
            if error_message:
                print(f"  - error_message 类型: {type(error_message)}")
                print(f"  - error_message 长度: {len(str(error_message))}")
                print(f"  - error_message 前200字符: {repr(str(error_message)[:200])}")
                
                # 检查编码
                try:
                    str(error_message).encode('utf-8')
                    print(f"  ✓ error_message UTF-8 编码正常")
                except Exception as e:
                    print(f"  ✗ error_message UTF-8 编码失败: {e}")
                
                sql_parts.append("errorMessage = ?")
                params.append(error_message)
            
            params.append(case_execution_id)
            
            sql = ", ".join(sql_parts) + " WHERE id = ?"
            print(f"  - SQL: {sql}")
            print(f"  - 参数数量: {len(params)}")
            
            cursor.execute(sql, params)
            conn.commit()
            print(f"  ✅ TestCaseExecution 更新成功")
            print(f"{'='*80}\n")
        except Exception as e:
            print(f"  ❌ TestCaseExecution 更新失败: {e}")
            print(f"  错误类型: {type(e)}")
            print(f"{'='*80}\n")
            import traceback
            traceback.print_exc()
            raise
        finally:
            conn.close()
    
    def create_step_execution(
        self,
        case_execution_id: str,
        node_id: str,
        node_name: str,
        node_type: str,
        node_snapshot: Dict[str, Any],
        order: int
    ) -> str:
        """创建步骤执行记录"""
        import time
        step_execution_id = f"step_exec_{int(time.time() * 1000)}_{node_id[:8]}"
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            print(f"\n{'='*80}")
            print(f"[数据库写入] TestStepExecution 表 - 创建步骤执行记录")
            print(f"{'='*80}")
            print(f"  - step_execution_id: {step_execution_id}")
            print(f"  - case_execution_id: {case_execution_id}")
            print(f"  - node_id: {node_id}")
            print(f"  - node_name 类型: {type(node_name)}, 长度: {len(node_name) if node_name else 0}")
            print(f"  - node_name 原始值: {repr(node_name[:100]) if node_name else 'None'}")
            print(f"  - node_type: {node_type}")
            print(f"  - order: {order}")
            
            # 序列化 JSON
            snapshot_json = json.dumps(node_snapshot, ensure_ascii=False)
            print(f"  - snapshot_json 长度: {len(snapshot_json)}")
            print(f"  - snapshot_json 前200字符: {repr(snapshot_json[:200])}")
            
            # 检查编码
            try:
                node_name.encode('utf-8')
                print(f"  ✓ node_name UTF-8 编码正常")
            except Exception as e:
                print(f"  ✗ node_name UTF-8 编码失败: {e}")
            
            try:
                snapshot_json.encode('utf-8')
                print(f"  ✓ snapshot_json UTF-8 编码正常")
            except Exception as e:
                print(f"  ✗ snapshot_json UTF-8 编码失败: {e}")
            
            cursor.execute(
                """
                INSERT INTO TestStepExecution (
                    id, caseExecutionId, nodeId, nodeName, nodeType,
                    nodeSnapshot, status, "order", startTime, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    step_execution_id,
                    case_execution_id,
                    node_id,
                    node_name,
                    node_type,
                    snapshot_json,
                    'running',
                    order,
                    format_datetime_for_prisma(datetime.now()),
                    format_datetime_for_prisma(datetime.now())
                )
            )
            conn.commit()
            print(f"  ✅ TestStepExecution 创建成功")
            print(f"{'='*80}\n")
            return step_execution_id
        except Exception as e:
            print(f"  ❌ TestStepExecution 创建失败: {e}")
            print(f"  错误类型: {type(e)}")
            print(f"{'='*80}\n")
            import traceback
            traceback.print_exc()
            raise
        finally:
            conn.close()
    
    def update_step_execution(
        self,
        step_execution_id: str,
        **kwargs
    ):
        """更新步骤执行记录"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            print(f"\n{'='*80}")
            print(f"[数据库更新] TestStepExecution 表 - 更新步骤执行记录")
            print(f"{'='*80}")
            print(f"  - step_execution_id: {step_execution_id}")
            print(f"  - 更新字段: {list(kwargs.keys())}")
            
            set_parts = []
            params = []
            
            for key, value in kwargs.items():
                # 转换驼峰命名为数据库字段名
                if key == 'endTime':
                    set_parts.append('endTime = ?')
                    params.append(format_datetime_for_prisma(value) if hasattr(value, 'isoformat') else value)
                elif key in ['requestHeaders', 'requestBody', 'responseHeaders', 'responseBody', 
                             'assertionResults', 'extractedVariables', 'requestParams']:
                    set_parts.append(f'{key} = ?')
                    # 使用 sanitize_json 清理 JSON 数据
                    params.append(sanitize_json(value) if value is not None else None)
                elif key in ['errorMessage', 'logs']:
                    # 清理错误信息和日志
                    set_parts.append(f'{key} = ?')
                    params.append(sanitize_text(str(value), max_length=5000) if value is not None else None)
                elif key == 'errorStack':
                    # 清理错误堆栈
                    set_parts.append(f'{key} = ?')
                    params.append(sanitize_text(str(value), max_length=10000) if value is not None else None)
                elif key in ['requestUrl', 'requestMethod']:
                    # 清理 URL 和方法
                    set_parts.append(f'{key} = ?')
                    params.append(sanitize_text(str(value), max_length=2000) if value is not None else None)
                else:
                    set_parts.append(f'{key} = ?')
                    params.append(value)
            
            if not set_parts:
                print(f"  ⚠️  没有字段需要更新")
                print(f"{'='*80}\n")
                return
            
            # 打印要更新的详细信息
            for key, value in kwargs.items():
                if key in ['requestHeaders', 'requestBody', 'responseHeaders', 'responseBody']:
                    print(f"  - {key}: {type(value)}, 长度: {len(str(value)) if value else 0}")
                elif key in ['errorMessage', 'logs']:
                    print(f"  - {key}: {repr(str(value)[:100]) if value else 'None'}")
                else:
                    print(f"  - {key}: {value}")
            
            params.append(step_execution_id)
            sql = f"UPDATE TestStepExecution SET {', '.join(set_parts)} WHERE id = ?"
            print(f"  - SQL: {sql}")
            print(f"  - 参数数量: {len(params)}")
            
            cursor.execute(sql, params)
            conn.commit()
            print(f"  ✅ TestStepExecution 更新成功")
            print(f"{'='*80}\n")
        except Exception as e:
            print(f"  ❌ TestStepExecution 更新失败: {e}")
            print(f"  错误类型: {type(e)}")
            print(f"{'='*80}\n")
            import traceback
            traceback.print_exc()
            raise
        finally:
            conn.close()
    
    def update_suite_execution(
        self,
        suite_execution_id: str,
        **kwargs
    ):
        """更新测试套件执行记录"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            set_parts = []
            params = []
            
            print(f"\n[DEBUG] 更新测试套件执行记录:")
            print(f"  执行ID: {suite_execution_id}")
            print(f"  更新字段: {kwargs}")
            
            for key, value in kwargs.items():
                if key == 'end_time':
                    set_parts.append('endTime = ?')
                    params.append(format_datetime_for_prisma(value) if hasattr(value, 'isoformat') else value)
                elif key == 'passed_cases':
                    set_parts.append('passedCases = ?')
                    params.append(value)
                elif key == 'failed_cases':
                    set_parts.append('failedCases = ?')
                    params.append(value)
                elif key == 'passed_steps':
                    set_parts.append('passedSteps = ?')
                    params.append(value)
                elif key == 'failed_steps':
                    set_parts.append('failedSteps = ?')
                    params.append(value)
                else:
                    set_parts.append(f'{key} = ?')
                    params.append(value)
            
            if not set_parts:
                print("  [WARNING] 没有字段需要更新")
                return
            
            params.append(suite_execution_id)
            sql = f"UPDATE TestSuiteExecution SET {', '.join(set_parts)} WHERE id = ?"
            print(f"  SQL: {sql}")
            print(f"  参数: {params}")
            
            cursor.execute(sql, params)
            conn.commit()
            
            print(f"  ✅ 更新成功，影响行数: {cursor.rowcount}")
            
            # 验证更新是否成功
            cursor.execute("SELECT status, passedCases, totalSteps FROM TestSuiteExecution WHERE id = ?", [suite_execution_id])
            row = cursor.fetchone()
            if row:
                print(f"  📋 验证更新后的值: status={row[0]}, passedCases={row[1]}, totalSteps={row[2]}")
            else:
                print(f"  ⚠️  警告: 未找到执行记录")
        except Exception as e:
            print(f"  ❌ 更新失败: {str(e)}")
            raise
        finally:
            conn.close()
    
    def create_execution_log(
        self,
        level: str,
        message: str,
        step_execution_id: str = None,
        case_execution_id: str = None,
        suite_execution_id: str = None,
        log_type: str = None,
        details: Dict[str, Any] = None,
        node_id: str = None,
        node_name: str = None
    ) -> str:
        """
        创建执行日志记录
        
        Args:
            level: 日志级别 (info, warning, error, debug, success)
            message: 日志消息
            step_execution_id: 关联的步骤执行ID（可选）
            case_execution_id: 关联的用例执行ID（可选）
            suite_execution_id: 关联的测试套件执行ID（可选）
            log_type: 日志类型 (request, response, assertion, variable, system, error)
            details: 详细数据（可选）
            node_id: 节点ID（可选）
            node_name: 节点名称（可选）
            
        Returns:
            日志ID
        """
        import time
        log_id = f"log_{int(time.time() * 1000)}"
        
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # 清理消息文本，限制长度
            clean_message = sanitize_text(message, max_length=2000)
            clean_node_name = sanitize_text(node_name, max_length=500) if node_name else None
            details_json = sanitize_json(details) if details else None
            
            cursor.execute(
                """
                INSERT INTO ExecutionLog (
                    id, timestamp, stepExecutionId, caseExecutionId, 
                    suiteExecutionId, level, type, message, details,
                    nodeId, nodeName, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    log_id,
                    format_datetime_for_prisma(datetime.now()),
                    step_execution_id,
                    case_execution_id,
                    suite_execution_id,
                    level,
                    log_type,
                    clean_message,
                    details_json,
                    node_id,
                    clean_node_name,
                    format_datetime_for_prisma(datetime.now())
                )
            )
            conn.commit()
            return log_id
        except Exception as e:
            print(f"⚠️ 创建日志失败: {e}")
            return None
        finally:
            conn.close()
    
    def get_execution_logs(
        self,
        step_execution_id: str = None,
        case_execution_id: str = None,
        suite_execution_id: str = None,
        level: str = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        获取执行日志
        
        Args:
            step_execution_id: 步骤执行ID
            case_execution_id: 用例执行ID
            suite_execution_id: 测试套件执行ID
            level: 日志级别过滤
            limit: 最大返回数量
            
        Returns:
            日志列表
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            where_clauses = []
            params = []
            
            if step_execution_id:
                where_clauses.append("stepExecutionId = ?")
                params.append(step_execution_id)
            
            if case_execution_id:
                where_clauses.append("caseExecutionId = ?")
                params.append(case_execution_id)
            
            if suite_execution_id:
                where_clauses.append("suiteExecutionId = ?")
                params.append(suite_execution_id)
            
            if level:
                where_clauses.append("level = ?")
                params.append(level)
            
            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"
            
            cursor.execute(
                f"""
                SELECT 
                    id, timestamp, stepExecutionId, caseExecutionId,
                    suiteExecutionId, level, type, message, details,
                    nodeId, nodeName, createdAt
                FROM ExecutionLog
                WHERE {where_sql}
                ORDER BY timestamp ASC
                LIMIT ?
                """,
                params + [limit]
            )
            
            columns = [desc[0] for desc in cursor.description]
            logs = []
            
            for row in cursor.fetchall():
                log = dict(zip(columns, row))
                # 解析 JSON 字段
                if log.get('details'):
                    try:
                        log['details'] = json.loads(log['details'])
                    except:
                        pass
                logs.append(log)
            
            return logs
        finally:
            conn.close()
    
    # ==================== 调度相关方法 ====================
    
    def get_scheduled_suites(self) -> List[Dict[str, Any]]:
        """
        获取所有需要调度的测试套件
        
        Returns:
            测试套件列表
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """
                SELECT id, name, scheduleConfig, scheduleStatus, executionMode
                FROM TestSuite
                WHERE executionMode = 'scheduled'
                AND scheduleStatus = 'active'
                AND scheduleConfig IS NOT NULL
                """
            )
            
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        finally:
            conn.close()
    
    def get_test_suite(self, suite_id: str) -> Optional[Dict[str, Any]]:
        """
        获取测试套件详情
        
        Args:
            suite_id: 测试套件ID
            
        Returns:
            测试套件字典，如果不存在则返回 None
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """
                SELECT * FROM TestSuite WHERE id = ?
                """,
                (suite_id,)
            )
            
            row = cursor.fetchone()
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
            return None
        
        finally:
            conn.close()
    
    def get_running_executions(self, suite_id: str) -> List[Dict[str, Any]]:
        """
        获取正在执行的任务
        
        Args:
            suite_id: 测试套件ID
            
        Returns:
            执行记录列表
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """
                SELECT id, status FROM TestSuiteExecution
                WHERE suiteId = ?
                AND status IN ('pending', 'running')
                """,
                (suite_id,)
            )
            
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        finally:
            conn.close()
    
    def get_environment_config(self, suite: Dict[str, Any]) -> Dict[str, Any]:
        """
        获取测试套件的环境配置
        
        Args:
            suite: 测试套件字典
            
        Returns:
            环境配置字典
        """
        if suite.get('useGlobalSettings'):
            # 使用全局配置
            return self.get_global_settings()
        else:
            # 使用套件独立配置
            env_config = suite.get('environmentConfig')
            if env_config:
                try:
                    if isinstance(env_config, str):
                        return json.loads(env_config)
                    return env_config
                except json.JSONDecodeError:
                    pass
            return {}
    
    def get_global_settings(self) -> Dict[str, Any]:
        """
        获取全局平台设置
        
        Returns:
            全局设置字典
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """
                SELECT config FROM PlatformSettings
                ORDER BY updatedAt DESC
                LIMIT 1
                """
            )
            
            row = cursor.fetchone()
            if row and row[0]:
                try:
                    return json.loads(row[0])
                except json.JSONDecodeError:
                    pass
            return {}
        
        finally:
            conn.close()
    
    def create_suite_execution(
        self,
        suite_id: str,
        suite_name: str,
        triggered_by: str,
        environment_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        创建测试套件执行记录
        
        Args:
            suite_id: 测试套件ID
            suite_name: 测试套件名称
            triggered_by: 触发方式 (manual/schedule/api)
            environment_config: 环境配置
            
        Returns:
            执行记录字典
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # 获取套件中的测试用例数量
            cursor.execute(
                """
                SELECT COUNT(*) as count FROM TestSuiteCase
                WHERE suiteId = ? AND enabled = 1
                """,
                (suite_id,)
            )
            
            row = cursor.fetchone()
            total_cases = row[0] if row else 0
            
            # 计算总步骤数
            cursor.execute(
                """
                SELECT COUNT(*) as count FROM TestStep ts
                INNER JOIN TestSuiteCase tsc ON ts.testCaseId = tsc.testCaseId
                WHERE tsc.suiteId = ? AND tsc.enabled = 1
                """,
                (suite_id,)
            )
            
            row = cursor.fetchone()
            total_steps = row[0] if row else 0
            
            # 创建执行记录
            execution_id = str(uuid4())
            start_time = datetime.now().isoformat()
            
            env_snapshot = json.dumps({
                'source': 'global' if environment_config.get('useGlobalSettings') else 'suite',
                'snapshotTime': start_time,
                'config': environment_config
            })
            
            cursor.execute(
                """
                INSERT INTO TestSuiteExecution (
                    id, suiteId, suiteName, status, startTime,
                    environmentSnapshot, totalCases, totalSteps,
                    triggeredBy, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    execution_id,
                    suite_id,
                    suite_name,
                    'pending',
                    start_time,
                    env_snapshot,
                    total_cases,
                    total_steps,
                    triggered_by,
                    start_time
                )
            )
            
            conn.commit()
            
            return {
                'id': execution_id,
                'suiteId': suite_id,
                'suiteName': suite_name,
                'status': 'pending',
                'totalCases': total_cases,
                'totalSteps': total_steps
            }
        
        finally:
            conn.close()
    
    def update_suite_next_run_time(self, suite_id: str, next_run_time: datetime) -> None:
        """
        更新测试套件的下次执行时间
        
        Args:
            suite_id: 测试套件ID
            next_run_time: 下次执行时间（带时区的 datetime）
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # 转换为 UTC 时间并格式化为 SQLite 兼容格式
            # 数据库统一存储 UTC 时间，前端显示时根据用户时区转换
            if next_run_time.tzinfo is not None:
                utc_time = next_run_time.astimezone(pytz.UTC)
            else:
                utc_time = next_run_time
            
            formatted_time = utc_time.strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute(
                """
                UPDATE TestSuite
                SET nextRunTime = ?
                WHERE id = ?
                """,
                (formatted_time, suite_id)
            )
            conn.commit()
        
        finally:
            conn.close()
    
    def update_suite_last_run_time(self, suite_id: str, last_run_time: datetime) -> None:
        """
        更新测试套件的上次执行时间
        
        Args:
            suite_id: 测试套件ID
            last_run_time: 上次执行时间
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # 转换为 UTC 时间并格式化
            if last_run_time.tzinfo is not None:
                utc_time = last_run_time.astimezone(pytz.UTC)
            else:
                # 如果没有时区，假定为 UTC
                utc_time = last_run_time
            
            formatted_time = utc_time.strftime('%Y-%m-%d %H:%M:%S')
            
            cursor.execute(
                """
                UPDATE TestSuite
                SET lastScheduledRun = ?
                WHERE id = ?
                """,
                (formatted_time, suite_id)
            )
            conn.commit()
        
        finally:
            conn.close()
    
    def disable_suite_schedule(self, suite_id: str) -> None:
        """
        禁用测试套件的调度
        
        Args:
            suite_id: 测试套件ID
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                """
                UPDATE TestSuite
                SET scheduleStatus = 'disabled'
                WHERE id = ?
                """,
                (suite_id,)
            )
            conn.commit()
        
        finally:
            conn.close()
    
    def execute_update(self, query: str, params: tuple) -> None:
        """
        执行数据库更新操作
        
        Args:
            query: SQL 更新语句
            params: 参数元组
        """
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(query, params)
            conn.commit()
        
        finally:
            conn.close()

