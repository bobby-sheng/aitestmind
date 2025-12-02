import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/test-suites/[id]/executions - 获取测试套件执行历史
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');

    const where: any = { suiteId: id };
    if (status) where.status = status;

    // 获取总数和统计信息
    const total = await prisma.testSuiteExecution.count({ where });
    
    // 计算统计数据（所有已完成的执行记录）
    const allExecutions = await prisma.testSuiteExecution.findMany({
      where: { suiteId: id },
      select: {
        status: true,
      },
    });
    
    const stats = {
      total: allExecutions.length,
      completed: allExecutions.filter(e => e.status === 'completed').length,
      failed: allExecutions.filter(e => e.status === 'failed').length,
    };

    // 获取分页数据
    const executions = await prisma.testSuiteExecution.findMany({
      where,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        totalCases: true,
        passedCases: true,
        failedCases: true,
        skippedCases: true,
        totalSteps: true,
        passedSteps: true,
        failedSteps: true,
        duration: true,
        triggeredBy: true,
        triggerUser: true,
        environmentSnapshot: true,
        createdAt: true,
      },
      orderBy: {
        startTime: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 计算通过率并解析 JSON 字段
    const executionsWithStats = executions.map((execution) => ({
      ...execution,
      environmentSnapshot: execution.environmentSnapshot 
        ? JSON.parse(execution.environmentSnapshot as string)
        : null,
      passRate:
        execution.totalCases > 0
          ? Math.round((execution.passedCases / execution.totalCases) * 100)
          : 0,
    }));

    const response = NextResponse.json({
      success: true,
      data: {
        executions: executionsWithStats,
        stats, // 添加统计信息
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    });
    
    // 禁用缓存，确保每次都获取最新数据
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    
    return response;
  } catch (error: any) {
    console.error('Error fetching executions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch executions',
      },
      { status: 500 }
    );
  }
}

