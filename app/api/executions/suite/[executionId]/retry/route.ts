import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/executions/suite/[executionId]/retry - 重试执行
export async function POST(
  request: Request,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;

    // 1. 查询原执行记录
    const originalExecution = await prisma.testSuiteExecution.findUnique({
      where: { id: executionId },
      select: {
        suiteId: true,
        suiteName: true,
        environmentSnapshot: true,
        totalCases: true,
        totalSteps: true,
      },
    });

    if (!originalExecution) {
      return NextResponse.json(
        {
          success: false,
          error: '原执行记录不存在',
        },
        { status: 404 }
      );
    }

    // 2. 调用测试套件执行API
    const executeResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/test-suites/${originalExecution.suiteId}/execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 使用原执行的环境配置
          environmentSnapshot: originalExecution.environmentSnapshot,
        }),
      }
    );

    const executeResult = await executeResponse.json();

    if (!executeResult.success) {
      throw new Error(executeResult.error);
    }

    // 3. 添加日志到新的执行记录
    await prisma.executionLog.create({
      data: {
        id: `log_retry_${Date.now()}`,
        timestamp: new Date(),
        suiteExecutionId: executeResult.data.executionId,
        level: 'info',
        type: 'system',
        message: `重试执行，原执行ID: ${executionId}`,
        createdAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: '重试执行已启动',
      data: {
        executionId: executeResult.data.executionId,
        originalExecutionId: executionId,
      },
    });
  } catch (error: any) {
    console.error('重试执行失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '重试执行失败',
      },
      { status: 500 }
    );
  }
}

