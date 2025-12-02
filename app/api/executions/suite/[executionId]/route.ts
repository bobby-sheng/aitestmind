import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/executions/suite/[executionId] - 获取测试套件执行详情
export async function GET(
  request: Request,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;
    
    const execution = await prisma.testSuiteExecution.findUnique({
      where: { id: executionId },
      include: {
        suite: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        caseExecutions: {
          include: {
            stepExecutions: {
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!execution) {
      return NextResponse.json(
        {
          success: false,
          error: 'Execution not found',
        },
        { status: 404 }
      );
    }

    // 解析 JSON 字段
    const parsedExecution = {
      ...execution,
      environmentSnapshot: execution.environmentSnapshot 
        ? JSON.parse(execution.environmentSnapshot as string)
        : null,
      caseExecutions: execution.caseExecutions.map((caseExec: any) => ({
        ...caseExec,
        testCaseSnapshot: caseExec.testCaseSnapshot 
          ? JSON.parse(caseExec.testCaseSnapshot as string)
          : null,
        stepExecutions: caseExec.stepExecutions.map((stepExec: any) => ({
          ...stepExec,
          nodeSnapshot: stepExec.nodeSnapshot 
            ? JSON.parse(stepExec.nodeSnapshot as string)
            : null,
          requestHeaders: stepExec.requestHeaders 
            ? JSON.parse(stepExec.requestHeaders as string)
            : null,
          requestBody: stepExec.requestBody 
            ? JSON.parse(stepExec.requestBody as string)
            : null,
          requestParams: stepExec.requestParams 
            ? JSON.parse(stepExec.requestParams as string)
            : null,
          responseHeaders: stepExec.responseHeaders 
            ? JSON.parse(stepExec.responseHeaders as string)
            : null,
          responseBody: stepExec.responseBody 
            ? JSON.parse(stepExec.responseBody as string)
            : null,
          assertionResults: stepExec.assertionResults 
            ? JSON.parse(stepExec.assertionResults as string)
            : null,
          extractedVariables: stepExec.extractedVariables 
            ? JSON.parse(stepExec.extractedVariables as string)
            : null,
        })),
      })),
    };

    // 计算通过率
    const passRate =
      execution.totalCases > 0
        ? Math.round((execution.passedCases / execution.totalCases) * 100)
        : 0;

    const response = NextResponse.json({
      success: true,
      data: {
        ...parsedExecution,
        passRate,
      },
    });
    
    // 禁用缓存，确保每次都获取最新数据
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error: any) {
    console.error('Error fetching execution:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch execution',
      },
      { status: 500 }
    );
  }
}

