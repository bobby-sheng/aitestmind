import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/execution-logs?stepExecutionId=xxx&caseExecutionId=xxx&suiteExecutionId=xxx&level=info&limit=1000
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const stepExecutionId = searchParams.get('stepExecutionId');
    const caseExecutionId = searchParams.get('caseExecutionId');
    const suiteExecutionId = searchParams.get('suiteExecutionId');
    const level = searchParams.get('level');
    const limit = parseInt(searchParams.get('limit') || '1000');

    // 构建where条件
    const where: any = {};
    if (stepExecutionId) where.stepExecutionId = stepExecutionId;
    if (caseExecutionId) where.caseExecutionId = caseExecutionId;
    if (suiteExecutionId) where.suiteExecutionId = suiteExecutionId;
    if (level) where.level = level;

    // 查询日志
    const logs = await prisma.executionLog.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      take: limit,
      select: {
        id: true,
        timestamp: true,
        level: true,
        type: true,
        message: true,
        details: true,
        nodeId: true,
        nodeName: true,
        stepExecutionId: true,
        caseExecutionId: true,
        suiteExecutionId: true,
      },
    });

    return NextResponse.json({
      success: true,
      logs,
      total: logs.length,
    });
  } catch (error: any) {
    console.error('[API] 获取执行日志失败:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '获取执行日志失败',
        details: error.message
      },
      { status: 500 }
    );
  }
}

