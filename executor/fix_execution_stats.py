"""
修复执行记录的统计数据

用法:
    python fix_execution_stats.py <suite_execution_id>
    
或修复所有未完成的执行记录:
    python fix_execution_stats.py --all
"""
import sys
import sqlite3
from pathlib import Path

# 数据库路径
DB_PATH = Path(__file__).parent.parent / "prisma" / "dev.db"


def fix_suite_execution(suite_execution_id: str):
    """修复单个测试套件执行记录"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # 1. 查询测试套件执行记录
        cursor.execute(
            "SELECT * FROM TestSuiteExecution WHERE id = ?",
            (suite_execution_id,)
        )
        suite_exec = cursor.fetchone()
        
        if not suite_exec:
            print(f"❌ 未找到执行记录: {suite_execution_id}")
            return False
        
        print(f"\n{'='*60}")
        print(f"正在修复执行记录: {suite_exec['suiteName']}")
        print(f"执行ID: {suite_execution_id}")
        print(f"当前状态: {suite_exec['status']}")
        print(f"{'='*60}\n")
        
        # 2. 查询关联的用例执行记录
        cursor.execute(
            """
            SELECT 
                id,
                status,
                passedSteps,
                failedSteps,
                totalSteps,
                testCaseName
            FROM TestCaseExecution 
            WHERE suiteExecutionId = ?
            """,
            (suite_execution_id,)
        )
        case_executions = cursor.fetchall()
        
        if not case_executions:
            print(f"⚠️  没有找到关联的用例执行记录")
            return False
        
        # 3. 修复每个用例执行记录
        print(f"开始修复 {len(case_executions)} 个用例执行记录...\n")
        
        for case_exec in case_executions:
            case_exec_id = case_exec['id']
            case_name = case_exec['testCaseName']
            
            # 查询该用例的步骤执行记录
            cursor.execute(
                """
                SELECT id, status, endTime, errorMessage
                FROM TestStepExecution
                WHERE caseExecutionId = ?
                ORDER BY "order" ASC
                """,
                (case_exec_id,)
            )
            step_execs = cursor.fetchall()
            
            if step_execs:
                # 先修复每个步骤的状态
                for step in step_execs:
                    step_id = step['id']
                    step_status = step['status']
                    step_end_time = step['endTime']
                    step_error = step['errorMessage']
                    
                    # 如果有结束时间但状态还是running/pending，说明需要更新状态
                    if step_end_time and step_status in ('running', 'pending'):
                        # 根据是否有错误消息来判断状态
                        if step_error:
                            new_status = 'failed'
                        else:
                            new_status = 'success'
                        
                        cursor.execute(
                            "UPDATE TestStepExecution SET status = ? WHERE id = ?",
                            (new_status, step_id)
                        )
                
                # 重新查询更新后的步骤状态
                cursor.execute(
                    """
                    SELECT status
                    FROM TestStepExecution
                    WHERE caseExecutionId = ?
                    """,
                    (case_exec_id,)
                )
                step_execs = cursor.fetchall()
                
                total_step_count = len(step_execs)
                passed_step_count = sum(1 for s in step_execs if s['status'] == 'success')
                failed_step_count = sum(1 for s in step_execs if s['status'] == 'failed')
                
                # 确定用例状态
                if failed_step_count > 0:
                    case_status = 'failed'
                elif passed_step_count == total_step_count:
                    case_status = 'passed'
                else:
                    case_status = 'running'
                
                # 更新用例执行记录
                cursor.execute(
                    """
                    UPDATE TestCaseExecution
                    SET 
                        status = ?,
                        totalSteps = ?,
                        passedSteps = ?,
                        failedSteps = ?
                    WHERE id = ?
                    """,
                    (case_status, total_step_count, passed_step_count, failed_step_count, case_exec_id)
                )
                
                print(f"  ✓ {case_name}: {case_status} (步骤: {passed_step_count}/{total_step_count}, 失败: {failed_step_count})")
            else:
                print(f"  ⚠️  {case_name}: 没有步骤执行记录")
        
        print()
        
        # 4. 重新查询更新后的用例执行记录，计算测试套件统计
        cursor.execute(
            """
            SELECT 
                status,
                passedSteps,
                failedSteps,
                totalSteps
            FROM TestCaseExecution 
            WHERE suiteExecutionId = ?
            """,
            (suite_execution_id,)
        )
        case_executions = cursor.fetchall()
        
        total_cases = len(case_executions)
        passed_cases = 0
        failed_cases = 0
        skipped_cases = 0
        total_passed_steps = 0
        total_failed_steps = 0
        total_steps = 0
        
        for case_exec in case_executions:
            status = case_exec['status']
            if status == 'passed':
                passed_cases += 1
            elif status == 'failed':
                failed_cases += 1
            elif status == 'skipped':
                skipped_cases += 1
            
            total_passed_steps += case_exec['passedSteps'] or 0
            total_failed_steps += case_exec['failedSteps'] or 0
            total_steps += case_exec['totalSteps'] or 0
        
        print(f"测试套件统计结果:")
        print(f"  总用例数: {total_cases}")
        print(f"  通过用例: {passed_cases}")
        print(f"  失败用例: {failed_cases}")
        print(f"  跳过用例: {skipped_cases}")
        print(f"  总步骤数: {total_steps}")
        print(f"  通过步骤: {total_passed_steps}")
        print(f"  失败步骤: {total_failed_steps}")
        
        # 5. 确定执行状态
        # 如果所有用例都执行完成（没有pending或running状态），则状态为completed
        cursor.execute(
            """
            SELECT COUNT(*) as count 
            FROM TestCaseExecution 
            WHERE suiteExecutionId = ? 
            AND status IN ('pending', 'running')
            """,
            (suite_execution_id,)
        )
        pending_count = cursor.fetchone()['count']
        
        if pending_count > 0:
            final_status = 'running'
        elif failed_cases > 0:
            final_status = 'completed'  # 有失败但已完成
        else:
            final_status = 'completed'  # 全部成功
        
        print(f"  最终状态: {final_status}")
        
        # 6. 更新测试套件执行记录
        cursor.execute(
            """
            UPDATE TestSuiteExecution 
            SET 
                status = ?,
                totalCases = ?,
                passedCases = ?,
                failedCases = ?,
                skippedCases = ?,
                totalSteps = ?,
                passedSteps = ?,
                failedSteps = ?
            WHERE id = ?
            """,
            (
                final_status,
                total_cases,
                passed_cases,
                failed_cases,
                skipped_cases,
                total_steps,
                total_passed_steps,
                total_failed_steps,
                suite_execution_id
            )
        )
        
        conn.commit()
        
        print(f"\n✅ 执行记录已修复")
        print(f"{'='*60}\n")
        
        return True
        
    except Exception as e:
        print(f"❌ 修复失败: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        conn.close()


def fix_all_incomplete_executions():
    """修复所有未完成或数据不一致的执行记录"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # 查找所有可能需要修复的执行记录
        # 条件1: 状态为running但有结束时间
        # 条件2: 步骤统计为0但有用例执行记录
        cursor.execute(
            """
            SELECT id, suiteName, status 
            FROM TestSuiteExecution 
            WHERE 
                (status = 'running' AND endTime IS NOT NULL)
                OR (totalSteps = 0 AND id IN (
                    SELECT DISTINCT suiteExecutionId 
                    FROM TestCaseExecution
                ))
            ORDER BY createdAt DESC
            """
        )
        
        executions = cursor.fetchall()
        
        if not executions:
            print("✅ 没有需要修复的执行记录")
            return
        
        print(f"\n找到 {len(executions)} 个需要修复的执行记录:\n")
        
        for idx, exec_record in enumerate(executions):
            print(f"[{idx+1}/{len(executions)}] {exec_record['suiteName']} ({exec_record['id']})")
        
        print("\n开始修复...\n")
        
        success_count = 0
        for exec_record in executions:
            if fix_suite_execution(exec_record['id']):
                success_count += 1
        
        print(f"\n{'='*60}")
        print(f"修复完成: {success_count}/{len(executions)} 个记录修复成功")
        print(f"{'='*60}\n")
        
    finally:
        conn.close()


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("用法:")
        print("  python fix_execution_stats.py <suite_execution_id>")
        print("  python fix_execution_stats.py --all")
        sys.exit(1)
    
    arg = sys.argv[1]
    
    if arg == '--all':
        fix_all_incomplete_executions()
    else:
        fix_suite_execution(arg)

