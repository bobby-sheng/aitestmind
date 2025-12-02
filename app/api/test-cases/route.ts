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

// GET /api/test-cases - 获取所有测试用例
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // 记录请求
    logger.apiRequest('GET', '/api/test-cases', OperationType.READ, { status });

    const where = status ? { status } : {};

    logger.db(OperationType.READ, 'TestCase', 'findMany', { where });
    const testCases = await prisma.testCase.findMany({
      where,
      include: {
        steps: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // 解析 JSON 字符串字段（数据库中是 TEXT 类型）
    const parsedTestCases = testCases.map((testCase: any) => ({
      ...testCase,
      flowConfig: safeJsonParse(testCase.flowConfig),
      tags: safeJsonParse(testCase.tags),
      steps: testCase.steps.map((step: any) => ({
        ...step,
        config: safeJsonParse(step.config),
      })),
    }));

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/test-cases', OperationType.READ, 200, duration);
    logger.success(OperationType.READ, `获取 ${parsedTestCases.length} 个测试用例`);

    return NextResponse.json({
      success: true,
      data: parsedTestCases,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/test-cases', OperationType.READ, 500, duration);
    logger.error(OperationType.READ, '获取测试用例失败', error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch test cases',
      },
      { status: 500 }
    );
  }
}

// POST /api/test-cases - 创建新测试用例
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { name, description, status, category, tags, flowConfig, steps } = body;

    // 记录请求
    logger.apiRequest('POST', '/api/test-cases', OperationType.CREATE, { name, status, stepsCount: steps?.length });

    // 清理 flowConfig 中的执行结果（后端保护层）
    const cleanedFlowConfig = cleanExecutionFromFlowConfig(flowConfig);

    logger.db(OperationType.CREATE, 'TestCase', 'create', { name, stepsCount: steps?.length });
    
    // 创建测试用例和步骤
    const testCase = await prisma.testCase.create({
      data: {
        name,
        description,
        status: status || 'draft',
        category: category || null,
        tags: safeJsonStringify(tags),
        flowConfig: safeJsonStringify(cleanedFlowConfig) || '{}',
        steps: {
          create: steps?.map((step: any, index: number) => ({
            name: step.name,
            description: step.description,
            order: step.order ?? index,
            nodeId: step.nodeId,
            apiId: step.apiId,
            type: step.type || 'api',
            config: safeJsonStringify(cleanExecutionFromConfig(step.config)) || '{}',
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

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/test-cases', OperationType.CREATE, 200, duration);
    logger.success(OperationType.CREATE, `创建测试用例成功: ${name} (ID: ${testCase.id})`);

    return NextResponse.json({
      success: true,
      data: testCase,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/test-cases', OperationType.CREATE, 500, duration);
    logger.error(OperationType.CREATE, '创建测试用例失败', error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create test case',
      },
      { status: 500 }
    );
  }
}

