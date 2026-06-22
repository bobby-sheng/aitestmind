import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/executions/suite/[executionId] - 获取测试套件执行详情
// ?detail=summary  轻量模式（轮询用）：只返回顶层统计 + 用例摘要，不含 stepExecutions
// ?detail=full     完整模式（默认）：返回全部数据含 stepExecutions 及 JSON 字段
export async function GET(
  request: Request,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;
    const url = new URL(request.url);
    const detail = url.searchParams.get('detail') || 'full';

    if (detail === 'summary') {
      return await getSummary(executionId);
    }
    return await getFullDetail(executionId);
  } catch (error: any) {
    console.error('Error fetching execution:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch execution' },
      { status: 500 }
    );
  }
}

/** 轻量模式：只查聚合统计 + 用例级摘要（无 stepExecutions，无重型 JSON 解析） */
async function getSummary(executionId: string) {
  const execution = await prisma.testSuiteExecution.findUnique({
    where: { id: executionId },
    include: {
      suite: { select: { id: true, name: true } },
      triggerUserRelation: { select: { id: true, loginName: true } },
      caseExecutions: {
        select: {
          id: true,
          testCaseId: true,
          testCaseName: true,
          status: true,
          order: true,
          totalSteps: true,
          passedSteps: true,
          failedSteps: true,
          duration: true,
          startTime: true,
          endTime: true,
          errorMessage: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!execution) {
    return NextResponse.json(
      { success: false, error: 'Execution not found' },
      { status: 404 }
    );
  }

  const passRate =
    execution.totalCases > 0
      ? Math.round((execution.passedCases / execution.totalCases) * 100)
      : 0;

  const response = NextResponse.json({
    success: true,
    data: {
      id: execution.id,
      suiteId: execution.suiteId,
      suiteName: execution.suiteName,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      duration: execution.duration,
      totalCases: execution.totalCases,
      passedCases: execution.passedCases,
      failedCases: execution.failedCases,
      totalSteps: execution.totalSteps,
      passedSteps: execution.passedSteps,
      failedSteps: execution.failedSteps,
      // 首屏需要展示环境信息；summary 仅解析这一处 JSON，避免 full 的重解析开销
      environmentSnapshot: execution.environmentSnapshot
        ? JSON.parse(execution.environmentSnapshot as string)
        : null,
      triggerUser: execution.triggerUser,
      triggerUserRelation: execution.triggerUserRelation,
      passRate,
      caseExecutions: execution.caseExecutions.map((ce: any) => ({
        id: ce.id,
        testCaseId: ce.testCaseId,
        testCaseName: ce.testCaseName,
        status: ce.status,
        order: ce.order,
        totalSteps: ce.totalSteps,
        passedSteps: ce.passedSteps,
        failedSteps: ce.failedSteps,
        duration: ce.duration,
        startTime: ce.startTime,
        endTime: ce.endTime,
        errorMessage: ce.errorMessage,
        stepExecutions: [],
      })),
    },
  });

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

// DELETE /api/executions/suite/[executionId] - 删除执行记录
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const { executionId } = await params;

    const execution = await prisma.testSuiteExecution.findUnique({
      where: { id: executionId },
      select: { id: true },
    });

    if (!execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    await prisma.testSuiteExecution.delete({
      where: { id: executionId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting execution:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete execution' },
      { status: 500 }
    );
  }
}

/** 完整模式：含 stepExecutions 和全量 JSON 解析 */
async function getFullDetail(executionId: string) {
  const execution = await prisma.testSuiteExecution.findUnique({
    where: { id: executionId },
    include: {
      suite: {
        select: { id: true, name: true, description: true },
      },
      triggerUserRelation: { select: { id: true, loginName: true } },
      caseExecutions: {
        include: {
          stepExecutions: { orderBy: { order: 'asc' } },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!execution) {
    return NextResponse.json(
      { success: false, error: 'Execution not found' },
      { status: 404 }
    );
  }

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

  const passRate =
    execution.totalCases > 0
      ? Math.round((execution.passedCases / execution.totalCases) * 100)
      : 0;

  const response = NextResponse.json({
    success: true,
    data: { ...parsedExecution, passRate },
  });

  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  return response;
}

