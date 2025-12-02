import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger, OperationType } from '@/lib/logger';
import { getExecutorUrl } from '@/lib/config';

// POST /api/test-suites/[id]/execute - 执行测试套件
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;
  
  try {
    // 获取请求参数
    const body = await request.json().catch(() => ({}));
    const triggeredBy = body.triggered_by || 'manual';
    
    logger.apiRequest('POST', `/api/test-suites/${id}/execute`, OperationType.EXECUTE, { 
      suiteId: id, 
      triggeredBy 
    });
    
    // 获取测试套件信息
    logger.db(OperationType.READ, 'TestSuite', 'findUnique', { id });
    const testSuite = await prisma.testSuite.findUnique({
      where: { id },
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
      logger.error(OperationType.EXECUTE, `测试套件不存在: ${id}`);
      return NextResponse.json(
        {
          success: false,
          error: 'Test suite not found',
        },
        { status: 404 }
      );
    }

    if (testSuite.testCases.length === 0) {
      logger.warn(OperationType.EXECUTE, `测试套件没有启用的测试用例: ${testSuite.name}`);
      return NextResponse.json(
        {
          success: false,
          error: 'No enabled test cases in this suite',
        },
        { status: 400 }
      );
    }
    
    logger.info(OperationType.EXECUTE, `准备执行测试套件: ${testSuite.name}`, { 
      testCasesCount: testSuite.testCases.length 
    });

    // 获取环境配置（测试套件配置 或 全局配置）
    let environmentConfig: any = null;
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

    // 计算总步骤数
    const totalSteps = testSuite.testCases.reduce(
      (sum, tc) => sum + (tc.testCase.steps?.length || 0),
      0
    );

    // 创建执行记录
    logger.db(OperationType.CREATE, 'TestSuiteExecution', 'create', {
      suiteId: testSuite.id,
      suiteName: testSuite.name,
      totalCases: testSuite.testCases.length,
      totalSteps,
    });
    
    const execution = await prisma.testSuiteExecution.create({
      data: {
        suiteId: testSuite.id,
        suiteName: testSuite.name,
        status: 'pending',
        startTime: new Date(),
        environmentSnapshot: JSON.stringify({
          source: testSuite.useGlobalSettings ? 'global' : 'suite',
          snapshotTime: new Date().toISOString(),
          config: environmentConfig,
        }),
        totalCases: testSuite.testCases.length,
        totalSteps,
        triggeredBy,
      },
    });
    
    logger.success(OperationType.CREATE, `创建执行记录: ${execution.id}`);

    // 异步调用Python执行器
    try {
      const executorUrl = getExecutorUrl(false); // 服务端调用
      const endpoint = `${executorUrl}/api/execute-suite`;
      
      logger.external('FastAPI', '调用执行器', true, {
        endpoint,
        executionId: execution.id,
        suiteId: testSuite.id,
      });
      
      const executorResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suite_execution_id: execution.id,
          suite_id: testSuite.id,
          environment_config: environmentConfig,
        }),
      });

      if (!executorResponse.ok) {
        throw new Error('Failed to start execution');
      }

      logger.success(OperationType.EXECUTE, `执行器启动成功: ${execution.id}`);

      // 更新状态为running（仅当状态仍为pending时）
      // 避免覆盖执行器已经设置的completed/failed状态
      await prisma.testSuiteExecution.updateMany({
        where: { 
          id: execution.id,
          status: 'pending'  // 只有当状态还是pending时才更新
        },
        data: { status: 'running' },
      });
    } catch (error) {
      logger.error(OperationType.EXECUTE, '启动执行器失败', error as Error, {
        executionId: execution.id,
      });
      
      // 更新状态为failed
      await prisma.testSuiteExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          logs: `Failed to start execution: ${error instanceof Error ? error.message : String(error)}`,
          endTime: new Date(),
        },
      });
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', `/api/test-suites/${id}/execute`, OperationType.EXECUTE, 200, duration);
    
    return NextResponse.json({
      success: true,
      data: {
        executionId: execution.id,
        suiteId: testSuite.id,
        suiteName: testSuite.name,
        totalCases: testSuite.testCases.length,
        totalSteps,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', `/api/test-suites/${id}/execute`, OperationType.EXECUTE, 500, duration);
    logger.error(OperationType.EXECUTE, '执行测试套件失败', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to execute test suite',
      },
      { status: 500 }
    );
  }
}

