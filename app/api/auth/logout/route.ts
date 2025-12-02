import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/auth';
import { logger, OperationType } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.apiRequest('POST', '/api/auth/logout', OperationType.AUTH);
    
    // 从 cookie 或 header 中获取 token
    const token = request.cookies.get('session')?.value || 
                  request.headers.get('Authorization')?.replace('Bearer ', '');

    if (token) {
      logger.db(OperationType.DELETE, 'Session', 'delete', { token: '***' });
      await deleteSession(token);
      logger.success(OperationType.AUTH, '会话已删除');
    } else {
      logger.warn(OperationType.AUTH, '未找到 token，但允许登出');
    }

    const response = NextResponse.json({
      message: '登出成功',
    });

    // 清除 cookie
    response.cookies.delete('session');

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/auth/logout', OperationType.AUTH, 200, duration);
    logger.success(OperationType.AUTH, '用户登出成功');

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/auth/logout', OperationType.AUTH, 500, duration);
    logger.error(OperationType.AUTH, '登出失败', error as Error);
    
    return NextResponse.json(
      { error: '登出失败' },
      { status: 500 }
    );
  }
}

