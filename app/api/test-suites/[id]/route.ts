import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger, OperationType } from '@/lib/logger';
import { getExecutorUrl } from '@/lib/config';

// GET /api/test-suites/[id] - 获取测试套件详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;
  
  try {
    logger.apiRequest('GET', `/api/test-suites/${id}`, OperationType.READ, { id });
    logger.db(OperationType.READ, 'TestSuite', 'findUnique', { id });
    
    const testSuite = await prisma.testSuite.findUnique({
      where: { id },
      include: {
        testCases: {
          include: {
            testCase: {
              select: {
                id: true,
                name: true,
                description: true,
                status: true,
                flowConfig: true,
                steps: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        executions: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            totalCases: true,
            passedCases: true,
            failedCases: true,
            duration: true,
          },
          orderBy: {
            startTime: 'desc',
          },
          take: 10, // 只返回最近10次执行
        },
      },
    });

    if (!testSuite) {
      const duration = Date.now() - startTime;
      logger.apiResponse('GET', `/api/test-suites/${id}`, OperationType.READ, 404, duration);
      logger.warn(OperationType.READ, `测试套件不存在: ${id}`);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Test suite not found',
        },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', `/api/test-suites/${id}`, OperationType.READ, 200, duration);
    logger.success(OperationType.READ, `获取测试套件详情: ${testSuite.name}`, {
      testCasesCount: testSuite.testCases.length,
      executionsCount: testSuite.executions.length
    });

    return NextResponse.json({
      success: true,
      data: testSuite,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.apiResponse('GET', `/api/test-suites/${id}`, OperationType.READ, 500, duration);
    logger.error(OperationType.READ, '获取测试套件详情失败', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch test suite',
      },
      { status: 500 }
    );
  }
}

// PUT /api/test-suites/[id] - 更新测试套件
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;
  
  try {
    const body = await request.json();
    
    logger.apiRequest('PUT', `/api/test-suites/${id}`, OperationType.UPDATE, {
      name: body.name,
      status: body.status,
      testCasesCount: body.testCases?.length
    });
    const {
      name,
      description,
      status,
      category,
      tags,
      useGlobalSettings,
      environmentConfig,
      testCases,
      executionMode,
      scheduleConfig,
      scheduleStatus,
    } = body;

    // 更新测试套件基本信息
    const updateData: any = {
      name,
      description,
      status,
      category,
      tags: tags ? JSON.stringify(tags) : null,
      useGlobalSettings,
      environmentConfig: environmentConfig || null,
    };

    // 如果有调度相关字段，也更新它们
    if (executionMode !== undefined) {
      updateData.executionMode = executionMode;
    }
    if (scheduleConfig !== undefined) {
      updateData.scheduleConfig = scheduleConfig ? JSON.stringify(scheduleConfig) : null;
    }
    if (scheduleStatus !== undefined) {
      updateData.scheduleStatus = scheduleStatus;
    }

    // 使用事务确保更新操作的原子性
    logger.db(OperationType.UPDATE, 'TestSuite', 'transaction', { id, name });
    const testSuite = await prisma.$transaction(async (tx) => {
      // 更新测试套件基本信息
      const updatedSuite = await tx.testSuite.update({
        where: { id },
        data: updateData,
      });

      // 如果提供了testCases，更新关联
      if (testCases) {
        logger.db(OperationType.DELETE, 'TestSuiteCase', 'deleteMany', { suiteId: id });
        // 删除旧的关联
        await tx.testSuiteCase.deleteMany({
          where: { suiteId: id },
        });

        // 创建新的关联
        if (testCases.length > 0) {
          logger.db(OperationType.CREATE, 'TestSuiteCase', 'createMany', { count: testCases.length });
          await Promise.all(
            testCases.map((tc: any, index: number) =>
              tx.testSuiteCase.create({
                data: {
                  suiteId: id,
                  testCaseId: tc.testCaseId || tc.id,
                  order: tc.order !== undefined ? tc.order : index + 1,
                  enabled: tc.enabled !== undefined ? tc.enabled : true,
                },
              })
            )
          );
        }
      }

      return updatedSuite;
    });

    // 返回更新后的完整信息
    const updatedSuite = await prisma.testSuite.findUnique({
      where: { id },
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

    // 如果调度配置发生变化，同步到调度器
    if (executionMode !== undefined || scheduleConfig !== undefined || scheduleStatus !== undefined) {
      try {
        logger.external('FastAPI', '同步调度配置', true, { suiteId: id });
        const executorUrl = getExecutorUrl(false); // 服务端调用
        await fetch(`${executorUrl}/api/schedules/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ suite_id: id }),
        });
      } catch (error) {
        logger.external('FastAPI', '同步调度配置失败', false, { suiteId: id });
        // 不影响主流程，只记录错误
      }
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('PUT', `/api/test-suites/${id}`, OperationType.UPDATE, 200, duration);
    logger.success(OperationType.UPDATE, `更新测试套件成功: ${updatedSuite?.name}`, {
      testCasesCount: updatedSuite?.testCases.length
    });

    return NextResponse.json({
      success: true,
      data: updatedSuite,
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.apiResponse('PUT', `/api/test-suites/${id}`, OperationType.UPDATE, 500, duration);
    logger.error(OperationType.UPDATE, '更新测试套件失败', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update test suite',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/test-suites/[id] - 删除测试套件
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;
  
  try {
    logger.apiRequest('DELETE', `/api/test-suites/${id}`, OperationType.DELETE, { id });
    logger.db(OperationType.DELETE, 'TestSuite', 'delete', { id });
    
    await prisma.testSuite.delete({
      where: { id },
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('DELETE', `/api/test-suites/${id}`, OperationType.DELETE, 200, duration);
    logger.success(OperationType.DELETE, `删除测试套件成功: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Test suite deleted successfully',
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.apiResponse('DELETE', `/api/test-suites/${id}`, OperationType.DELETE, 500, duration);
    logger.error(OperationType.DELETE, '删除测试套件失败', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete test suite',
      },
      { status: 500 }
    );
  }
}

