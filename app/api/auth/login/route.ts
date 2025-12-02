import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';
import { logger, OperationType } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { username, password } = body;

    // 记录登录请求
    logger.apiRequest('POST', '/api/auth/login', OperationType.AUTH, { username });

    // 验证必填字段
    if (!username || !password) {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/auth/login', OperationType.AUTH, 400, duration);
      logger.warn(OperationType.AUTH, '登录失败：缺少用户名或密码');
      
      return NextResponse.json(
        { error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    // 查找用户
    logger.db(OperationType.READ, 'User', 'findUnique', { username });
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/auth/login', OperationType.AUTH, 401, duration);
      logger.auth('login', username, false);
      logger.warn(OperationType.AUTH, `登录失败：用户不存在 - ${username}`);
      
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    const isValidPassword = verifyPassword(password, user.password);

    if (!isValidPassword) {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/auth/login', OperationType.AUTH, 401, duration);
      logger.auth('login', username, false);
      logger.warn(OperationType.AUTH, `登录失败：密码错误 - ${username}`);
      
      return NextResponse.json(
        { error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 检查用户状态
    if (user.status !== 'active') {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/auth/login', OperationType.AUTH, 403, duration);
      logger.auth('login', username, false);
      logger.warn(OperationType.AUTH, `登录失败：账号已禁用 - ${username}`);
      
      return NextResponse.json(
        { error: '账号已被禁用，请联系管理员' },
        { status: 403 }
      );
    }

    // 创建 session
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    logger.db(OperationType.CREATE, 'Session', 'create', { userId: user.id, ipAddress });
    const session = await createSession(user.id, ipAddress, userAgent);

    // 更新最后登录时间
    logger.db(OperationType.UPDATE, 'User', 'update', { userId: user.id });
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/auth/login', OperationType.AUTH, 200, duration);
    logger.auth('login', user.id, true);
    logger.success(OperationType.AUTH, `用户登录成功: ${username} (${user.role})`, { 
      userId: user.id,
      ipAddress,
    });

    // 返回用户信息和 token
    const response = NextResponse.json({
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        realName: user.realName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: new Date(),
      },
      token: session.token,
    });

    // 设置 cookie
    response.cookies.set('session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/auth/login', OperationType.AUTH, 500, duration);
    logger.error(OperationType.AUTH, '登录异常', error as Error);
    
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}

