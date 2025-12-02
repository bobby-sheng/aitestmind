import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { logger, OperationType } from '@/lib/logger';

// 获取单个用户
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const { id } = params;
  
  try {
    logger.apiRequest('GET', `/api/users/${id}`, OperationType.READ);
    
    const result = await getCurrentUser(request);

    if (!result) {
      const duration = Date.now() - startTime;
      logger.apiResponse('GET', `/api/users/${id}`, OperationType.READ, 401, duration);
      logger.warn(OperationType.AUTH, '未登录用户尝试查询用户详情');
      
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 只能查看自己的信息，或者管理员可以查看所有人
    if (result.user.id !== id && result.user.role !== 'admin') {
      const duration = Date.now() - startTime;
      logger.apiResponse('GET', `/api/users/${id}`, OperationType.READ, 403, duration);
      logger.warn(OperationType.AUTH, `非授权用户尝试查询他人信息: ${result.user.username} -> ${id}`);
      
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    logger.db(OperationType.READ, 'User', 'findUnique', { id });
    const user = await prisma.user.findUnique({
      where: { id },
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
    });

    if (!user) {
      const duration = Date.now() - startTime;
      logger.apiResponse('GET', `/api/users/${id}`, OperationType.READ, 404, duration);
      logger.warn(OperationType.READ, `用户不存在: ${id}`);
      
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', `/api/users/${id}`, OperationType.READ, 200, duration);
    logger.success(OperationType.READ, `查询用户详情成功: ${user.username}`);

    return NextResponse.json({ user });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('GET', `/api/users/${id}`, OperationType.READ, 500, duration);
    logger.error(OperationType.READ, '获取用户失败', error as Error);
    
    return NextResponse.json(
      { error: '获取用户失败' },
      { status: 500 }
    );
  }
}

// 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const { id } = params;
  
  try {
    const result = await getCurrentUser(request);

    if (!result) {
      const duration = Date.now() - startTime;
      logger.apiResponse('PUT', `/api/users/${id}`, OperationType.UPDATE, 401, duration);
      logger.warn(OperationType.AUTH, '未登录用户尝试更新用户');
      
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username, password, email, realName, role, status } = body;
    
    logger.apiRequest('PUT', `/api/users/${id}`, OperationType.UPDATE, { username, email, role });

    // 只能修改自己的信息，或者管理员可以修改所有人
    if (result.user.id !== id && result.user.role !== 'admin') {
      const duration = Date.now() - startTime;
      logger.apiResponse('PUT', `/api/users/${id}`, OperationType.UPDATE, 403, duration);
      logger.warn(OperationType.AUTH, `非授权用户尝试更新他人信息: ${result.user.username} -> ${id}`);
      
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    // 检查用户是否存在
    logger.db(OperationType.READ, 'User', 'findUnique', { id });
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      const duration = Date.now() - startTime;
      logger.apiResponse('PUT', `/api/users/${id}`, OperationType.UPDATE, 404, duration);
      logger.warn(OperationType.UPDATE, `尝试更新不存在的用户: ${id}`);
      
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    const updateData: any = {};

    // 如果修改用户名，检查是否重复
    if (username && username !== existingUser.username) {
      logger.db(OperationType.READ, 'User', 'findUnique', { username });
      const duplicateUsername = await prisma.user.findUnique({
        where: { username },
      });

      if (duplicateUsername) {
        const duration = Date.now() - startTime;
        logger.apiResponse('PUT', `/api/users/${id}`, OperationType.UPDATE, 409, duration);
        logger.warn(OperationType.UPDATE, `更新失败: 用户名已存在 - ${username}`);
        
        return NextResponse.json(
          { error: '用户名已存在' },
          { status: 409 }
        );
      }

      updateData.username = username;
    }

    // 如果修改密码
    if (password) {
      if (password.length < 6) {
        const duration = Date.now() - startTime;
        logger.apiResponse('PUT', `/api/users/${id}`, OperationType.UPDATE, 400, duration);
        logger.warn(OperationType.UPDATE, '更新失败: 密码长度不符');
        
        return NextResponse.json(
          { error: '密码长度至少为6个字符' },
          { status: 400 }
        );
      }
      updateData.password = hashPassword(password);
    }

    // 如果修改邮箱，检查是否重复
    if (email !== undefined) {
      if (email && email !== existingUser.email) {
        logger.db(OperationType.READ, 'User', 'findFirst', { email });
        const duplicateEmail = await prisma.user.findFirst({
          where: { email },
        });

        if (duplicateEmail) {
          const duration = Date.now() - startTime;
          logger.apiResponse('PUT', `/api/users/${id}`, OperationType.UPDATE, 409, duration);
          logger.warn(OperationType.UPDATE, `更新失败: 邮箱已存在 - ${email}`);
          
          return NextResponse.json(
            { error: '邮箱已被使用' },
            { status: 409 }
          );
        }
      }
      updateData.email = email || null;
    }

    // 普通用户不能修改角色和状态
    if (result.user.role === 'admin') {
      if (role !== undefined) {
        updateData.role = role;
      }
      if (status !== undefined) {
        updateData.status = status;
      }
    }

    if (realName !== undefined) {
      updateData.realName = realName || null;
    }

    // 更新用户
    logger.db(OperationType.UPDATE, 'User', 'update', { id, updateData });
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('PUT', `/api/users/${id}`, OperationType.UPDATE, 200, duration);
    logger.success(OperationType.UPDATE, `更新用户成功: ${user.username}`, {
      updatedBy: result.user.username,
      fields: Object.keys(updateData)
    });

    return NextResponse.json({
      message: '用户更新成功',
      user,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('PUT', `/api/users/${id}`, OperationType.UPDATE, 500, duration);
    logger.error(OperationType.UPDATE, '更新用户失败', error as Error);
    
    return NextResponse.json(
      { error: '更新用户失败' },
      { status: 500 }
    );
  }
}

// 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  const { id } = params;
  
  try {
    logger.apiRequest('DELETE', `/api/users/${id}`, OperationType.DELETE);
    
    const result = await getCurrentUser(request);

    if (!result) {
      const duration = Date.now() - startTime;
      logger.apiResponse('DELETE', `/api/users/${id}`, OperationType.DELETE, 401, duration);
      logger.warn(OperationType.AUTH, '未登录用户尝试删除用户');
      
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 只有管理员可以删除用户
    if (result.user.role !== 'admin') {
      const duration = Date.now() - startTime;
      logger.apiResponse('DELETE', `/api/users/${id}`, OperationType.DELETE, 403, duration);
      logger.warn(OperationType.AUTH, `非管理员尝试删除用户: ${result.user.username}`);
      
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    // 不能删除自己
    if (result.user.id === id) {
      const duration = Date.now() - startTime;
      logger.apiResponse('DELETE', `/api/users/${id}`, OperationType.DELETE, 400, duration);
      logger.warn(OperationType.DELETE, '尝试删除自己');
      
      return NextResponse.json(
        { error: '不能删除自己' },
        { status: 400 }
      );
    }

    // 检查用户是否存在
    logger.db(OperationType.READ, 'User', 'findUnique', { id });
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      const duration = Date.now() - startTime;
      logger.apiResponse('DELETE', `/api/users/${id}`, OperationType.DELETE, 404, duration);
      logger.warn(OperationType.DELETE, `尝试删除不存在的用户: ${id}`);
      
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 删除用户及其 session
    logger.db(OperationType.DELETE, 'User', 'transaction', { userId: id });
    await prisma.$transaction([
      prisma.session.deleteMany({
        where: { userId: id },
      }),
      prisma.user.delete({
        where: { id },
      }),
    ]);

    const duration = Date.now() - startTime;
    logger.apiResponse('DELETE', `/api/users/${id}`, OperationType.DELETE, 200, duration);
    logger.success(OperationType.DELETE, `删除用户成功: ${user.username}`, {
      deletedBy: result.user.username
    });

    return NextResponse.json({
      message: '用户删除成功',
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.apiResponse('DELETE', `/api/users/${id}`, OperationType.DELETE, 500, duration);
    logger.error(OperationType.DELETE, '删除用户失败', error as Error);
    
    return NextResponse.json(
      { error: '删除用户失败' },
      { status: 500 }
    );
  }
}

