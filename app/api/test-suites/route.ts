import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger, OperationType } from '@/lib/logger';
import { getExecutorUrl } from '@/lib/config';

// GET /api/test-suites - 获取测试套件列表
export async function GET(request: Request) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    logger.apiRequest('GET', '/api/test-suites', OperationType.READ, { status, category });

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;

    logger.db(OperationType.READ, 'TestSuite', 'findMany', { where });
    const testSuites = await prisma.testSuite.findMany({
      where,
      include: {
        testCases: {
          include: {
            testCase: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            executions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 计算最后执行时间和通过率
    const testSuitesWithStats = await Promise.all(
      testSuites.map(async (suite) => {
        const lastExecution = await prisma.testSuiteExecution.findFirst({
          where: { suiteId: suite.id },
          orderBy: { startTime: 'desc' },
          select: {
            startTime: true,
            status: true,
            passedCases: true,
            totalCases: true,
          },
        });

        return {
          ...suite,
          testCaseCount: suite.testCases.length,
          executionCount: suite._count.executions,
          lastExecution: lastExecution
            ? {
                time: lastExecution.startTime,
                status: lastExecution.status,
                passRate:
                  lastExecution.totalCases > 0
                    ? Math.round(
                        (lastExecution.passedCases / lastExecution.totalCases) * 100
                      )
                    : 0,
              }
            : null,
        };
      })
    );

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/test-suites', OperationType.READ, 200, duration);
    logger.success(OperationType.READ, `获取 ${testSuitesWithStats.length} 个测试套件`);

    return NextResponse.json({
      success: true,
      data: testSuitesWithStats,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/test-suites', OperationType.READ, 500, duration);
    logger.error(OperationType.READ, '获取测试套件列表失败', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch test suites',
      },
      { status: 500 }
    );
  }
}

// POST /api/test-suites - 创建测试套件
export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const {
      name,
      description,
      status = 'draft',
      category,
      tags,
      useGlobalSettings = true,
      environmentConfig,
      testCases = [],
      executionMode = 'manual',
      scheduleConfig,
      scheduleStatus,
    } = body;

    logger.apiRequest('POST', '/api/test-suites', OperationType.CREATE, { 
      name, 
      status, 
      executionMode,
      testCasesCount: testCases.length 
    });

    // 创建测试套件
    logger.db(OperationType.CREATE, 'TestSuite', 'create', { name, executionMode });
    const testSuite = await prisma.testSuite.create({
      data: {
        name,
        description,
        status,
        category,
        tags: tags ? JSON.stringify(tags) : null,
        useGlobalSettings,
        environmentConfig: environmentConfig || null,
        executionMode,
        scheduleConfig: scheduleConfig ? JSON.stringify(scheduleConfig) : null,
        scheduleStatus: executionMode === 'scheduled' ? (scheduleStatus || 'active') : null,
      },
    });

    // 创建用例关联
    if (testCases.length > 0) {
      await Promise.all(
        testCases.map((tc: any, index: number) =>
          prisma.testSuiteCase.create({
            data: {
              suiteId: testSuite.id,
              testCaseId: tc.testCaseId || tc.id,
              order: tc.order !== undefined ? tc.order : index + 1,
              enabled: tc.enabled !== undefined ? tc.enabled : true,
            },
          })
        )
      );
    }

    // 返回完整的测试套件信息
    const createdSuite = await prisma.testSuite.findUnique({
      where: { id: testSuite.id },
      include: {
        testCases: {
          include: {
            testCase: {
              select: {
                id: true,
                name: true,
                status: true,
                flowConfig: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    // 如果是定时执行模式，同步到调度器
    if (executionMode === 'scheduled' && scheduleConfig) {
      try {
        logger.external('FastAPI', '同步调度任务', true, { suiteId: testSuite.id });
        const executorUrl = getExecutorUrl(false); // 服务端调用
        await fetch(`${executorUrl}/api/schedules/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suite_id: testSuite.id }),
        });
      } catch (error) {
        logger.external('FastAPI', '同步调度任务失败', false, { suiteId: testSuite.id });
        // 不影响主流程，只记录错误
      }
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/test-suites', OperationType.CREATE, 200, duration);
    logger.success(OperationType.CREATE, `创建测试套件成功: ${name}`, { 
      suiteId: testSuite.id,
      testCasesCount: testCases.length,
      executionMode 
    });

    return NextResponse.json({
      success: true,
      data: createdSuite,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/test-suites', OperationType.CREATE, 500, duration);
    logger.error(OperationType.CREATE, '创建测试套件失败', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create test suite',
      },
      { status: 500 }
    );
  }
}











