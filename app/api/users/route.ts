import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { logger, OperationType } from '@/lib/logger';

// 获取用户列表
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const result = await getCurrentUser(request);

    if (!result) {
      const duration = Date.now() - startTime;
      logger.apiResponse('GET', '/api/users', OperationType.READ, 401, duration);
      logger.warn(OperationType.AUTH, '未登录用户尝试访问用户列表');
      
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 只有管理员可以查看用户列表
    if (result.user.role !== 'admin') {
      const duration = Date.now() - startTime;
      logger.apiResponse('GET', '/api/users', OperationType.READ, 403, duration);
      logger.warn(OperationType.AUTH, `非管理员尝试访问用户列表: ${result.user.username}`);
      
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    
    logger.apiRequest('GET', '/api/users', OperationType.READ, { page, pageSize, search, role, status });

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { realName: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    logger.db(OperationType.READ, 'User', 'findMany', { where, page, pageSize });
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          realName: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/users', OperationType.READ, 200, duration);
    logger.success(OperationType.READ, `查询用户列表成功: ${users.length} 条记录`, { 
      total,
      page,
      pageSize 
    });

    return NextResponse.json({
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/users', OperationType.READ, 500, duration);
    logger.error(OperationType.READ, '获取用户列表失败', error as Error);
    
    return NextResponse.json(
      { error: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// 创建用户
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const result = await getCurrentUser(request);

    if (!result) {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/users', OperationType.CREATE, 401, duration);
      logger.warn(OperationType.AUTH, '未登录用户尝试创建用户');
      
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 只有管理员可以创建用户
    if (result.user.role !== 'admin') {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/users', OperationType.CREATE, 403, duration);
      logger.warn(OperationType.AUTH, `非管理员尝试创建用户: ${result.user.username}`);
      
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, password, email, realName, role, status } = body;
    
    logger.apiRequest('POST', '/api/users', OperationType.CREATE, { username, email, role });

    // 验证必填字段
    if (!username || !password) {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/users', OperationType.CREATE, 400, duration);
      logger.warn(OperationType.CREATE, '创建用户失败: 缺少必填字段');
      
      return NextResponse.json(
        { error: '用户名和密码是必填项' },
        { status: 400 }
      );
    }

    // 验证用户名长度
    if (username.length < 3 || username.length > 20) {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/users', OperationType.CREATE, 400, duration);
      logger.warn(OperationType.CREATE, `创建用户失败: 用户名长度不符 - ${username}`);
      
      return NextResponse.json(
        { error: '用户名长度必须在3-20个字符之间' },
        { status: 400 }
      );
    }

    // 验证密码长度
    if (password.length < 6) {
      const duration = Date.now() - startTime;
      logger.apiResponse('POST', '/api/users', OperationType.CREATE, 400, duration);
      logger.warn(OperationType.CREATE, '创建用户失败: 密码长度不符');
      
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
      logger.apiResponse('POST', '/api/users', OperationType.CREATE, 409, duration);
      logger.warn(OperationType.CREATE, `创建用户失败: 用户名已存在 - ${username}`);
      
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
        logger.apiResponse('POST', '/api/users', OperationType.CREATE, 409, duration);
        logger.warn(OperationType.CREATE, `创建用户失败: 邮箱已存在 - ${email}`);
        
        return NextResponse.json(
          { error: '邮箱已被使用' },
          { status: 409 }
        );
      }
    }

    // 创建用户
    const hashedPassword = hashPassword(password);

    logger.db(OperationType.CREATE, 'User', 'create', { username, role: role || 'user' });
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email: email || null,
        realName: realName || null,
        role: role || 'user',
        status: status || 'active',
      },
      select: {
        id: true,
        username: true,
        email: true,
        realName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/users', OperationType.CREATE, 200, duration);
    logger.success(OperationType.CREATE, `创建用户成功: ${username} (${user.role})`, {
      userId: user.id,
      createdBy: result.user.username
    });

    return NextResponse.json({
      message: '用户创建成功',
      user,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/users', OperationType.CREATE, 500, duration);
    logger.error(OperationType.CREATE, '创建用户失败', error as Error);
    
    return NextResponse.json(
      { error: '创建用户失败' },
      { status: 500 }
    );
  }
}

