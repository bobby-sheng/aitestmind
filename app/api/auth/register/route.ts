import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { logger, OperationType } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { username, password, email, realName } = body;

    // 记录注册请求
    logger.apiRequest('POST', '/api/auth/register', OperationType.AUTH, { username, email });

    // 验证必填字段
    if (!username || !password) {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/auth/register', OperationType.AUTH, 400, duration);
      logger.warn(OperationType.AUTH, '注册失败：缺少必填字段');
      
      return NextResponse.json(
        { error: '用户名和密码是必填项' },
        { status: 400 }
      );
    }

    // 验证用户名长度
    if (username.length < 3 || username.length > 20) {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/auth/register', OperationType.AUTH, 400, duration);
      logger.warn(OperationType.AUTH, `注册失败：用户名长度不符 - ${username}`);
      
      return NextResponse.json(
        { error: '用户名长度必须在3-20个字符之间' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/auth/register', OperationType.AUTH, 400, duration);
      logger.warn(OperationType.AUTH, `注册失败：密码长度不符 - ${username}`);
      
      return NextResponse.json(
        { error: '密码长度至少为6个字符' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    logger.db(OperationType.READ, 'User', 'findUnique', { username });
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/auth/register', OperationType.AUTH, 409, duration);
      logger.warn(OperationType.AUTH, `注册失败：用户名已存在 - ${username}`);
      
      return NextResponse.json(
        { error: '用户名已存在' },
        { status: 409 }
      );
    }

    // 检查邮箱是否已存在
    if (email) {
      logger.db(OperationType.READ, 'User', 'findFirst', { email });
      const existingEmail = await prisma.user.findFirst({
        where: { email },
      });

      if (existingEmail) {
        const duration = Date.now() - startTime;
        logger.apiResponse('POST', '/api/auth/register', OperationType.AUTH, 409, duration);
        logger.warn(OperationType.AUTH, `注册失败：邮箱已存在 - ${email}`);
        
        return NextResponse.json(
          { error: '邮箱已被使用' },
          { status: 409 }
        );
      }
    }

    // 创建用户
    const hashedPassword = hashPassword(password);
    
    // 检查是否为第一个用户，如果是则设为管理员
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'admin' : 'user';

    logger.db(OperationType.CREATE, 'User', 'create', { username, role });
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null,
        realName: realName || null,
        role,
        status: 'active',
      },
      select: {
        id: true,
        username: true,
        email: true,
        realName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/auth/register', OperationType.AUTH, 200, duration);
    logger.auth('register', user.id, true);
    logger.success(OperationType.AUTH, `用户注册成功: ${username} (${role})`, { 
      userId: user.id,
      isFirstUser: role === 'admin',
    });

    return NextResponse.json({
      message: '注册成功',
      user,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/auth/register', OperationType.AUTH, 500, duration);
    logger.error(OperationType.AUTH, '注册异常', error as Error);
    
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}

