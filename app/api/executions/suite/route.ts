import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/executions/suite - 获取所有测试套件执行记录
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status'); // 可选状态过滤

    // 构建查询条件
    const where: any = {};
    if (status) {
      where.status = status;
    }

    // 获取总数
    const total = await prisma.testSuiteExecution.findMany({
      where,
      orderBy: {
        startTime: 'desc',
      },
    });

    // 获取分页数据
    const executions = await prisma.testSuiteExecution.findMany({
      where,
      select: {
        id: true,
        suiteId: true,
        suiteName: true,
        status: true,
        startTime: true,
        endTime: true,
        duration: true,
        totalCases: true,
        passedCases: true,
        failedCases: true,
        skippedCases: true,
        totalSteps: true,
        passedSteps: true,
        failedSteps: true,
        triggeredBy: true,
        triggerUser: true,
        createdAt: true,
      },
      orderBy: {
        startTime: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      success: true,
      data: executions,
      total: total.length,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error('获取执行记录失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '获取执行记录失败',
      },
      { status: 500 }
    );
  }
}

