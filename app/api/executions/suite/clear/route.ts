import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger, OperationType } from '@/lib/logger';

// POST /api/executions/suite/clear - 清空所有执行记录
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 记录请求
    logger.apiRequest('POST', '/api/executions/suite/clear', OperationType.DELETE, { action: 'clearAll' });

    // 删除所有测试套件执行记录（级联删除会自动删除相关的用例执行、步骤执行和执行日志）
    logger.db(OperationType.DELETE, 'TestSuiteExecution', 'deleteMany', { action: 'clearAll' });
    const result = await prisma.testSuiteExecution.deleteMany({});

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/executions/suite/clear', OperationType.DELETE, 200, duration);
    logger.success(OperationType.DELETE, `清空 ${result.count} 个执行记录`);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.count,
      },
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/executions/suite/clear', OperationType.DELETE, 500, duration);
    logger.error(OperationType.DELETE, '清空执行记录失败', error as Error);
    
    console.error('清空执行记录失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || '清空执行记录失败',
      },
      { status: 500 }
    );
  }
}
