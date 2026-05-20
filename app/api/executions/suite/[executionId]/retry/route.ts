import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { logger, OperationType } from '@/lib/logger';
import { getExecutorUrl } from '@/lib/config';

// POST /api/executions/suite/[executionId]/retry - 重试执行
export async function POST(
  request: Request,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    const triggerUserId = currentUser?.user?.id ?? null;
    const triggerUser = currentUser?.user?.loginName ?? null;

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

    // 2. 获取测试套件信息
    logger.db(OperationType.READ, 'TestSuite', 'findUnique', { id: originalExecution.suiteId });
    const testSuite = await prisma.testSuite.findUnique({
      where: { id: originalExecution.suiteId },
      include: {
        testCases: {
          where: { enabled: true },
          include: {
            testCase: {
              select: {
                id: true,
                name: true,
                flowConfig: true,
                steps: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!testSuite) {
      return NextResponse.json(
        {
          success: false,
          error: '测试套件不存在',
        },
        { status: 404 }
      );
    }

    if (testSuite.testCases.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: '测试套件没有启用的测试用例',
        },
        { status: 400 }
      );
    }

    // 3. 解析原执行的环境配置快照
    let environmentConfig: any = null;
    try {
      const envSnapshot = JSON.parse(originalExecution.environmentSnapshot || '{}');
      environmentConfig = envSnapshot.config || null;
    } catch (e) {
      // 如果解析失败，使用测试套件的配置
      if (testSuite.useGlobalSettings) {
        const globalSettings = await prisma.platformSettings.findFirst({
          orderBy: { updatedAt: 'desc' },
        });
        if (globalSettings) {
          environmentConfig = {
            baseUrl: globalSettings.baseUrl,
            authTokenEnabled: globalSettings.authTokenEnabled,
            authTokenKey: globalSettings.authTokenKey,
            authTokenValue: globalSettings.authTokenValue,
            sessionEnabled: globalSettings.sessionEnabled,
            loginApiUrl: globalSettings.loginApiUrl,
            loginMethod: globalSettings.loginMethod,
            loginRequestHeaders: globalSettings.loginRequestHeaders,
            loginRequestBody: globalSettings.loginRequestBody,
            sessionCookies: globalSettings.sessionCookies,
            otherConfig: globalSettings.otherConfig,
          };
        }
      } else {
        environmentConfig = testSuite.environmentConfig;
      }
    }

    // 4. 计算总步骤数
    const totalSteps = testSuite.testCases.reduce(
      (sum, tc) => sum + (tc.testCase.steps?.length || 0),
      0
    );

    // 5. 创建新的执行记录
    logger.db(OperationType.CREATE, 'TestSuiteExecution', 'create', {
      suiteId: testSuite.id,
      suiteName: testSuite.name,
      totalCases: testSuite.testCases.length,
      totalSteps,
    });

    const newExecution = await prisma.testSuiteExecution.create({
      data: {
        suiteId: testSuite.id,
        suiteName: testSuite.name,
        status: 'pending',
        startTime: new Date(),
        environmentSnapshot: originalExecution.environmentSnapshot,
        totalCases: testSuite.testCases.length,
        totalSteps,
        triggeredBy: 'retry',
        ...(triggerUserId && { triggerUserId }),
        ...(triggerUser && { triggerUser }),
      },
    });

    logger.success(OperationType.CREATE, `创建重试执行记录: ${newExecution.id}`);

    // 6. 添加日志到新的执行记录
    await prisma.executionLog.create({
      data: {
        id: `log_retry_${Date.now()}`,
        timestamp: new Date(),
        suiteExecutionId: newExecution.id,
        level: 'info',
        type: 'system',
        message: `重试执行，原执行ID: ${executionId}`,
        createdAt: new Date(),
      },
    });

    // 7. 异步调用Python执行器
    try {
      const executorUrl = getExecutorUrl(false); // 服务端调用
      const endpoint = `${executorUrl}/api/execute-suite`;
      
      logger.external('FastAPI', '调用执行器（重试）', true, {
        endpoint,
        executionId: newExecution.id,
        suiteId: testSuite.id,
        originalExecutionId: executionId,
      });
      
      const executorResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suite_execution_id: newExecution.id,
          suite_id: testSuite.id,
          environment_config: environmentConfig,
        }),
      });

      if (!executorResponse.ok) {
        throw new Error('Failed to start execution');
      }

      logger.success(OperationType.EXECUTE, `执行器启动成功（重试）: ${newExecution.id}`);

      // 更新状态为running（仅当状态仍为pending时）
      await prisma.testSuiteExecution.updateMany({
        where: { 
          id: newExecution.id,
          status: 'pending'
        },
        data: { status: 'running' },
      });
    } catch (error) {
      logger.error(OperationType.EXECUTE, '启动执行器失败（重试）', error as Error, {
        executionId: newExecution.id,
      });
      
      // 更新状态为failed
      await prisma.testSuiteExecution.update({
        where: { id: newExecution.id },
        data: {
          status: 'failed',
          logs: `Failed to start execution: ${error instanceof Error ? error.message : String(error)}`,
          endTime: new Date(),
        },
      });

      throw error;
    }

    return NextResponse.json({
      success: true,
      message: '重试执行已启动',
      data: {
        executionId: newExecution.id,
        originalExecutionId: executionId,
      },
    });
  } catch (error: any) {
    console.error('重试执行失败:', error);
    logger.error(OperationType.EXECUTE, '重试执行失败', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '重试执行失败',
      },
      { status: 500 }
    );
  }
}

