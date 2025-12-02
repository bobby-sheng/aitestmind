import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger, OperationType } from '@/lib/logger';

// POST /api/test-cases/batch-delete - 批量删除测试用例
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: ids must be a non-empty array',
        },
        { status: 400 }
      );
    }

    // 记录请求
    logger.apiRequest('POST', '/api/test-cases/batch-delete', OperationType.DELETE, { count: ids.length });

    // 首先删除所有相关的步骤
    logger.db(OperationType.DELETE, 'TestCaseStep', 'deleteMany', { testCaseIds: ids });
    await prisma.testCaseStep.deleteMany({
      where: {
        testCaseId: {
          in: ids,
        },
      },
    });

    // 然后删除测试用例
    logger.db(OperationType.DELETE, 'TestCase', 'deleteMany', { ids });
    const result = await prisma.testCase.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/test-cases/batch-delete', OperationType.DELETE, 200, duration);
    logger.success(OperationType.DELETE, `批量删除 ${result.count} 个测试用例`);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.count,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/test-cases/batch-delete', OperationType.DELETE, 500, duration);
    logger.error(OperationType.DELETE, '批量删除测试用例失败', error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to batch delete test cases',
      },
      { status: 500 }
    );
  }
}

