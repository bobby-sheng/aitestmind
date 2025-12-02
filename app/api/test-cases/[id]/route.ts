import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeJsonParse, safeJsonStringify } from '@/lib/json-utils';
import { logger, OperationType } from '@/lib/logger';

// 清理节点中的执行结果（后端保护层）
function cleanExecutionFromFlowConfig(flowConfig: any): any {
  if (!flowConfig || !flowConfig.nodes) {
    return flowConfig;
  }
  
  return {
    ...flowConfig,
    nodes: flowConfig.nodes.map((node: any) => {
      if (node.data && 'execution' in node.data) {
        const { execution, ...cleanData } = node.data;
        return { ...node, data: cleanData };
      }
      return node;
    }),
  };
}

// 清理步骤配置中的执行结果
function cleanExecutionFromConfig(config: any): any {
  if (!config) {
    return config;
  }
  
  if ('execution' in config) {
    const { execution, ...cleanConfig } = config;
    return cleanConfig;
  }
  
  return config;
}

// GET /api/test-cases/[id] - 获取单个测试用例
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;
  
  try {
    logger.apiRequest('GET', `/api/test-cases/${id}`, OperationType.READ, { id });
    logger.db(OperationType.READ, 'TestCase', 'findUnique', { id });
    
    const testCase = await prisma.testCase.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!testCase) {
      const duration = Date.now() - startTime;
      logger.apiResponse('GET', `/api/test-cases/${id}`, OperationType.READ, 404, duration);
      logger.warn(OperationType.READ, `测试用例不存在: ${id}`);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Test case not found',
        },
        { status: 404 }
      );
    }

    // 解析 JSON 字符串字段（数据库中是 TEXT 类型）
    const parsedTestCase = {
      ...testCase,
      flowConfig: safeJsonParse(testCase.flowConfig),
      tags: safeJsonParse(testCase.tags),
      steps: testCase.steps.map((step: any) => ({
        ...step,
        config: safeJsonParse(step.config),
      })),
    };

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', `/api/test-cases/${id}`, OperationType.READ, 200, duration);
    logger.success(OperationType.READ, `获取测试用例详情: ${testCase.name}`, {
      stepsCount: testCase.steps.length
    });

    return NextResponse.json({
      success: true,
      data: parsedTestCase,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('GET', `/api/test-cases/${id}`, OperationType.READ, 500, duration);
    logger.error(OperationType.READ, '获取测试用例详情失败', error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch test case',
      },
      { status: 500 }
    );
  }
}

// PUT /api/test-cases/[id] - 更新测试用例
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;
  
  try {
    const body = await request.json();
    const { name, description, status, category, tags, flowConfig, steps } = body;

    logger.apiRequest('PUT', `/api/test-cases/${id}`, OperationType.UPDATE, {
      name,
      status,
      stepsCount: steps?.length
    });

    // 清理 flowConfig 中的执行结果（后端保护层）
    const cleanedFlowConfig = cleanExecutionFromFlowConfig(flowConfig);

    // 使用事务确保删除和更新操作的原子性
    logger.db(OperationType.UPDATE, 'TestCase', 'transaction', { id, name, stepsCount: steps?.length });
    const testCase = await prisma.$transaction(async (tx) => {
      // 删除旧的步骤
      logger.db(OperationType.DELETE, 'TestStep', 'deleteMany', { testCaseId: id });
      await tx.testStep.deleteMany({
        where: { testCaseId: id },
      });

      // 更新测试用例和创建新的步骤
      return await tx.testCase.update({
        where: { id },
        data: {
          name,
          description,
          status,
          category: category || null,
          tags: safeJsonStringify(tags),
          flowConfig: safeJsonStringify(cleanedFlowConfig),
          steps: {
            create: steps?.map((step: any, index: number) => ({
              name: step.name,
              description: step.description,
              order: step.order ?? index,
              nodeId: step.nodeId,
              apiId: step.apiId,
              type: step.type || 'api',
              config: safeJsonStringify(cleanExecutionFromConfig(step.config)),
              positionX: step.positionX || 0,
              positionY: step.positionY || 0,
            })) || [],
          },
        },
        include: {
          steps: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('PUT', `/api/test-cases/${id}`, OperationType.UPDATE, 200, duration);
    logger.success(OperationType.UPDATE, `更新测试用例成功: ${testCase.name}`, {
      stepsCount: testCase.steps.length
    });

    return NextResponse.json({
      success: true,
      data: testCase,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('PUT', `/api/test-cases/${id}`, OperationType.UPDATE, 500, duration);
    logger.error(OperationType.UPDATE, '更新测试用例失败', error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update test case',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/test-cases/[id] - 删除测试用例
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  const { id } = await params;
  
  try {
    logger.apiRequest('DELETE', `/api/test-cases/${id}`, OperationType.DELETE, { id });
    logger.db(OperationType.DELETE, 'TestCase', 'delete', { id });
    
    await prisma.testCase.delete({
      where: { id },
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('DELETE', `/api/test-cases/${id}`, OperationType.DELETE, 200, duration);
    logger.success(OperationType.DELETE, `删除测试用例成功: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Test case deleted successfully',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('DELETE', `/api/test-cases/${id}`, OperationType.DELETE, 500, duration);
    logger.error(OperationType.DELETE, '删除测试用例失败', error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete test case',
      },
      { status: 500 }
    );
  }
}
