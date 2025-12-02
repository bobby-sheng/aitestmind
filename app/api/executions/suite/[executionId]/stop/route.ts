import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getExecutorUrl } from '@/lib/config';

// POST /api/executions/suite/[executionId]/stop - 停止执行
export async function POST(
  request: Request,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;

    // 1. 查询执行记录
    const execution = await prisma.testSuiteExecution.findUnique({
      where: { id: executionId },
      select: {
        id: true,
        status: true,
        startTime: true,
      },
    });

    if (!execution) {
      return NextResponse.json(
        {
          success: false,
          error: '执行记录不存在',
        },
        { status: 404 }
      );
    }

    // 2. 检查状态
    if (execution.status !== 'running' && execution.status !== 'pending') {
      return NextResponse.json(
        {
          success: false,
          error: `无法停止${execution.status}状态的执行`,
        },
        { status: 400 }
      );
    }

    // 3. 更新所有正在执行的用例状态为 stopped
    const endTime = new Date();
    
    // 更新所有 running 或 pending 状态的用例
    await prisma.testCaseExecution.updateMany({
      where: {
        suiteExecutionId: executionId,
        status: {
          in: ['pending', 'running'],
        },
      },
      data: {
        status: 'stopped',
        endTime,
      },
    });

    // 更新所有 running 或 pending 状态的步骤
    await prisma.testStepExecution.updateMany({
      where: {
        caseExecution: {
          suiteExecutionId: executionId,
        },
        status: {
          in: ['pending', 'running'],
        },
      },
      data: {
        status: 'stopped',
      },
    });

    // 4. 更新套件执行状态为 stopped
    const duration = endTime.getTime() - new Date(execution.startTime).getTime();

    await prisma.testSuiteExecution.update({
      where: { id: executionId },
      data: {
        status: 'stopped',
        endTime,
        duration,
      },
    });

    // 5. 添加日志
    await prisma.executionLog.create({
      data: {
        id: `log_stop_${Date.now()}`,
        timestamp: endTime,
        suiteExecutionId: executionId,
        level: 'warning',
        type: 'system',
        message: '执行已被用户手动停止',
        createdAt: endTime,
      },
    });

    // 6. 通知 Python 执行器停止
    try {
      const executorUrl = getExecutorUrl(false); // 服务端调用
      const stopResponse = await fetch(`${executorUrl}/api/executions/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          execution_id: executionId,
        }),
      });

      if (stopResponse.ok) {
        console.log('✅ 已通知 Python 执行器停止');
      } else {
        console.warn('⚠️  通知 Python 执行器停止失败（可能已经完成）');
      }
    } catch (error) {
      console.warn('⚠️  无法连接到 Python 执行器:', error);
      // 即使无法通知执行器，也继续返回成功（因为数据库状态已更新）
    }

    return NextResponse.json({
      success: true,
      message: '执行已停止',
    });
  } catch (error: any) {
    console.error('停止执行失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '停止执行失败',
      },
      { status: 500 }
    );
  }
}

