"""
FastAPI 主应用 - 测试执行器 API
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from database import Database
from test_executor import TestExecutor
from sse_executor import SSEExecutor
from suite_executor import SuiteExecutor
from scheduler import TestSuiteScheduler
from models import ExecutionResult

# 数据库路径
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
db = Database(DB_PATH)

# 全局调度器实例
scheduler: Optional[TestSuiteScheduler] = None

# 全局停止标志（execution_id -> should_stop）
stop_flags = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global scheduler
    
    # 启动时初始化
    print("\n" + "="*60)
    print("🚀 启动测试执行器...")
    print("="*60 + "\n")
    
    try:
        # 初始化调度器
        scheduler = TestSuiteScheduler(db)
        await scheduler.initialize()
        
        print("="*60)
        print("✅ 执行器启动完成")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"❌ 调度器初始化失败: {e}")
        import traceback
        traceback.print_exc()
    
    yield
    
    # 关闭时清理
    print("\n" + "="*60)
    print("🛑 关闭测试执行器...")
    print("="*60 + "\n")
    
    if scheduler and scheduler.scheduler.running:
        scheduler.shutdown()
        print("✅ 调度器已停止")
    
    print("="*60)
    print("👋 再见！")
    print("="*60 + "\n")


# 初始化 FastAPI 应用（使用 lifespan）
app = FastAPI(
    title="测试执行器 API",
    description="API 测试用例执行引擎",
    version="1.0.0",
    lifespan=lifespan
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== 请求/响应模型 ====================

class ExecuteRequest(BaseModel):
    """执行请求"""
    testCaseId: Optional[str] = None
    testCaseName: Optional[str] = None


class ExecuteResponse(BaseModel):
    """执行响应"""
    success: bool
    message: str
    result: Optional[ExecutionResult] = None


class ExecuteSuiteRequest(BaseModel):
    """执行测试套件请求"""
    suite_execution_id: str
    suite_id: str
    environment_config: dict


class TestCaseListResponse(BaseModel):
    """测试用例列表响应"""
    success: bool
    data: List[dict]


# ==================== API 路由 ====================

@app.get("/")
async def root():
    """根路径"""
    return {
        "name": "测试执行器 API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/test-cases", response_model=TestCaseListResponse)
async def list_test_cases(status: Optional[str] = None):
    """
    获取测试用例列表
    
    Args:
        status: 状态过滤（可选）: draft, active, archived
    """
    try:
        test_cases = db.list_test_cases(status)
        return {
            "success": True,
            "data": test_cases
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/test-cases/{test_case_id}")
async def get_test_case(test_case_id: str):
    """
    获取单个测试用例详情
    
    Args:
        test_case_id: 测试用例 ID
    """
    try:
        test_case = db.get_test_case_by_id(test_case_id)
        
        if not test_case:
            raise HTTPException(status_code=404, detail="测试用例不存在")
        
        return {
            "success": True,
            "data": test_case.dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/execute", response_model=ExecuteResponse)
async def execute_test_case(request: ExecuteRequest):
    """
    执行测试用例
    
    Args:
        request: 执行请求，包含测试用例 ID 或名称
    """
    try:
        # 获取测试用例
        test_case = None
        
        if request.testCaseId:
            test_case = db.get_test_case_by_id(request.testCaseId)
        elif request.testCaseName:
            test_case = db.get_test_case_by_name(request.testCaseName)
        else:
            raise HTTPException(
                status_code=400, 
                detail="必须提供 testCaseId 或 testCaseName"
            )
        
        if not test_case:
            raise HTTPException(status_code=404, detail="测试用例不存在")
        
        # 执行测试用例
        async with TestExecutor(timeout=30, database=db) as executor:
            result = await executor.execute_test_case(test_case)
        
        # 更新统计信息
        db.update_test_case_stats(test_case.id, result.success)
        
        # 返回结果
        return {
            "success": True,
            "message": "执行完成" if result.success else "执行失败",
            "result": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"执行异常: {str(e)}")


@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    try:
        # 检查数据库连接
        test_cases = db.get_all_test_cases()
        return {
            "status": "healthy",
            "database": "connected",
            "test_cases_count": len(test_cases)
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }


@app.post("/api/execute/stream")
async def execute_test_case_stream(request: ExecuteRequest):
    """
    执行测试用例（SSE 实时流式推送）
    
    Args:
        request: 执行请求，包含测试用例 ID 或名称
    """
    try:
        print(f"\n[API] ========== 收到执行请求 ==========")
        print(f"[API] testCaseId: {request.testCaseId}")
        print(f"[API] testCaseName: {request.testCaseName}")
        
        # 获取测试用例
        test_case = None
        
        if request.testCaseId:
            print(f"[API] 通过 ID 查询测试用例: {request.testCaseId}")
            test_case = db.get_test_case_by_id(request.testCaseId)
        elif request.testCaseName:
            print(f"[API] 通过名称查询测试用例: {request.testCaseName}")
            test_case = db.get_test_case_by_name(request.testCaseName)
        else:
            raise HTTPException(
                status_code=400, 
                detail="必须提供 testCaseId 或 testCaseName"
            )
        
        if not test_case:
            print(f"[API] 错误：测试用例不存在")
            raise HTTPException(status_code=404, detail="测试用例不存在")
        
        print(f"[API] 找到测试用例: {test_case.name}")
        print(f"[API] 节点数: {len(test_case.flowConfig.nodes)}")
        print(f"[API] 边数: {len(test_case.flowConfig.edges)}")
        
        # 创建 SSE 执行器
        print(f"[API] 创建 SSE 执行器...")
        sse_executor = SSEExecutor(database=db)
        
        # 返回流式响应
        print(f"[API] 开始流式执行...")
        return StreamingResponse(
            sse_executor.execute_with_stream(test_case),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[API] 执行异常:")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"执行异常: {str(e)}")


@app.post("/api/execute-suite")
async def execute_suite(request: ExecuteSuiteRequest):
    """
    执行测试测试套件
    
    Args:
        request: 测试套件执行请求
    """
    try:
        print(f"\n{'='*60}")
        print(f"收到测试套件执行请求")
        print(f"Suite Execution ID: {request.suite_execution_id}")
        print(f"Suite ID: {request.suite_id}")
        print(f"{'='*60}\n")
        
        # 清除停止标志（如果存在）
        if request.suite_execution_id in stop_flags:
            del stop_flags[request.suite_execution_id]
        
        # 创建测试套件执行器
        suite_executor = SuiteExecutor(db, stop_flags)
        
        # 执行测试套件
        result = await suite_executor.execute_suite(
            suite_execution_id=request.suite_execution_id,
            suite_id=request.suite_id,
            environment_config=request.environment_config
        )
        
        # 执行完成后清除停止标志
        if request.suite_execution_id in stop_flags:
            del stop_flags[request.suite_execution_id]
        
        return result
    
    except Exception as e:
        import traceback
        error_msg = str(e)
        error_trace = traceback.format_exc()
        
        print(f"❌ 执行测试套件失败:")
        print(error_msg)
        print(error_trace)
        
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": error_msg,
                "trace": error_trace
            }
        )


@app.post("/api/execute/batch")
async def execute_batch(test_case_ids: List[str]):
    """
    批量执行测试用例
    
    Args:
        test_case_ids: 测试用例 ID 列表
    """
    results = []
    
    for test_case_id in test_case_ids:
        try:
            test_case = db.get_test_case_by_id(test_case_id)
            
            if not test_case:
                results.append({
                    "testCaseId": test_case_id,
                    "success": False,
                    "error": "测试用例不存在"
                })
                continue
            
            # 执行测试用例
            async with TestExecutor(timeout=30, database=db) as executor:
                result = await executor.execute_test_case(test_case)
            
            # 更新统计信息
            db.update_test_case_stats(test_case.id, result.success)
            
            results.append({
                "testCaseId": test_case_id,
                "testCaseName": test_case.name,
                "success": result.success,
                "duration": result.duration,
                "passedSteps": result.passedSteps,
                "failedSteps": result.failedSteps
            })
        
        except Exception as e:
            results.append({
                "testCaseId": test_case_id,
                "success": False,
                "error": str(e)
            })
    
    return {
        "success": True,
        "total": len(test_case_ids),
        "results": results
    }


# ==================== 调度管理 API ====================

class SyncScheduleRequest(BaseModel):
    """同步调度任务请求"""
    suite_id: str


@app.post("/api/schedules/sync")
async def sync_schedule(request: SyncScheduleRequest):
    """
    同步调度任务（当前端保存测试套件时调用）
    
    当测试套件的调度配置发生变化时，调用此接口同步到调度器
    """
    try:
        if not scheduler:
            raise HTTPException(status_code=503, detail="调度器未启动")
        
        suite_id = request.suite_id
        
        # 从数据库重新加载套件信息
        suite = db.get_test_suite(suite_id)
        
        if not suite:
            raise HTTPException(status_code=404, detail="测试套件不存在")
        
        if suite.get('executionMode') == 'scheduled' and suite.get('scheduleStatus') == 'active':
            # 注册或更新调度
            await scheduler.register_schedule(suite)
            
            schedule_info = scheduler.get_schedule_info(suite_id)
            
            return {
                "success": True,
                "message": "调度任务已同步",
                "data": schedule_info
            }
        else:
            # 移除调度
            scheduler.remove_schedule(suite_id)
            return {
                "success": True,
                "message": "调度任务已移除"
            }
    
    except Exception as e:
        print(f"同步调度失败: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schedules/list")
async def list_schedules():
    """获取所有活动的调度任务"""
    try:
        if not scheduler:
            raise HTTPException(status_code=503, detail="调度器未启动")
        
        schedules = scheduler.get_all_schedules()
        
        return {
            "success": True,
            "data": schedules
        }
    
    except Exception as e:
        print(f"获取调度列表失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/schedules/{suite_id}")
async def get_schedule(suite_id: str):
    """获取指定测试套件的调度信息"""
    try:
        if not scheduler:
            raise HTTPException(status_code=503, detail="调度器未启动")
        
        schedule_info = scheduler.get_schedule_info(suite_id)
        
        if not schedule_info:
            raise HTTPException(status_code=404, detail="调度任务不存在")
        
        return {
            "success": True,
            "data": schedule_info
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"获取调度信息失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/schedules/{suite_id}/pause")
async def pause_schedule(suite_id: str):
    """暂停调度任务"""
    try:
        if not scheduler:
            raise HTTPException(status_code=503, detail="调度器未启动")
        
        success = scheduler.pause_schedule(suite_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="调度任务不存在")
        
        # 更新数据库状态
        db.execute_update(
            "UPDATE TestSuite SET scheduleStatus = ? WHERE id = ?",
            ('paused', suite_id)
        )
        
        return {
            "success": True,
            "message": "调度任务已暂停"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"暂停调度失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/schedules/{suite_id}/resume")
async def resume_schedule(suite_id: str):
    """恢复调度任务"""
    try:
        if not scheduler:
            raise HTTPException(status_code=503, detail="调度器未启动")
        
        success = scheduler.resume_schedule(suite_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="调度任务不存在")
        
        # 更新数据库状态
        db.execute_update(
            "UPDATE TestSuite SET scheduleStatus = ? WHERE id = ?",
            ('active', suite_id)
        )
        
        return {
            "success": True,
            "message": "调度任务已恢复"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"恢复调度失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 执行控制 API ====================

class StopExecutionRequest(BaseModel):
    """停止执行请求"""
    execution_id: str


@app.post("/api/executions/stop")
async def stop_execution(request: StopExecutionRequest):
    """
    停止正在执行的测试套件
    
    Args:
        request: 停止执行请求
    """
    try:
        execution_id = request.execution_id
        
        print(f"\n{'='*60}")
        print(f"🛑 收到停止执行请求")
        print(f"Execution ID: {execution_id}")
        print(f"{'='*60}\n")
        
        # 设置停止标志
        stop_flags[execution_id] = True
        
        print(f"✅ 已设置停止标志，执行器将在下一个用例前停止")
        
        return {
            "success": True,
            "message": "停止信号已发送"
        }
    
    except Exception as e:
        print(f"❌ 停止执行失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== 启动配置 ====================

if __name__ == "__main__":
    import uvicorn
    
    # 从环境变量读取配置
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8001"))
    
    print(f"🚀 启动测试执行器 API")
    print(f"📍 地址: http://{host}:{port}")
    print(f"📚 文档: http://{host}:{port}/docs")
    print(f"💾 数据库: {DB_PATH}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )

