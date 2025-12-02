import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { safeJsonParse, safeJsonStringify } from '@/lib/json-utils';

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

// POST /api/test-cases/[id]/copy - 复制测试用例
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 获取原始测试用例
    const originalTestCase = await prisma.testCase.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!originalTestCase) {
      return NextResponse.json(
        {
          success: false,
          error: 'Test case not found',
        },
        { status: 404 }
      );
    }

    // 解析原始数据
    const parsedFlowConfig = safeJsonParse(originalTestCase.flowConfig);
    const parsedTags = safeJsonParse(originalTestCase.tags);

    // 清理 flowConfig 中的执行结果
    const cleanedFlowConfig = cleanExecutionFromFlowConfig(parsedFlowConfig);

    // 创建新的测试用例（名字前面加 "copy"）
    const newTestCase = await prisma.testCase.create({
      data: {
        name: `copy ${originalTestCase.name}`,
        description: originalTestCase.description,
        status: 'draft', // 复制的用例默认为草稿状态
        category: originalTestCase.category,
        tags: safeJsonStringify(parsedTags),
        flowConfig: safeJsonStringify(cleanedFlowConfig),
        steps: {
          create: originalTestCase.steps.map((step: any, index: number) => {
            const parsedConfig = safeJsonParse(step.config);
            const cleanedConfig = cleanExecutionFromConfig(parsedConfig);
            
            return {
              name: step.name,
              description: step.description,
              order: step.order ?? index,
              nodeId: step.nodeId,
              apiId: step.apiId,
              type: step.type || 'api',
              config: safeJsonStringify(cleanedConfig),
              positionX: step.positionX || 0,
              positionY: step.positionY || 0,
            };
          }),
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

    return NextResponse.json({
      success: true,
      data: newTestCase,
    });
  } catch (error) {
    console.error('Error copying test case:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to copy test case',
      },
      { status: 500 }
    );
  }
}

