import { randomBytes, pbkdf2Sync } from 'crypto';
import prisma from './prisma';

// 密码加密
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// 验证密码
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// 生成 session token
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

// 创建 session
export async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
  const token = generateSessionToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7天过期

  const session = await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  return session;
}

// 验证 session
export async function validateSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { token },
  });

  if (!session) {
    return null;
  }

  // 检查是否过期
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({
      where: { id: session.id },
    });
    return null;
  }

  // 获取用户信息
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      email: true,
      realName: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user || user.status !== 'active') {
    return null;
  }

  return { user, session };
}

// 删除 session
export async function deleteSession(token: string) {
  await prisma.session.deleteMany({
    where: { token },
  });
}

// 清理过期 session
export async function cleanExpiredSessions() {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}

// 获取当前用户（从请求中）
export async function getCurrentUser(request: Request) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    // 尝试从 cookie 中获取
    const cookies = request.headers.get('cookie');
    const cookieToken = cookies?.split(';').find(c => c.trim().startsWith('session='))?.split('=')[1];
    
    if (!cookieToken) {
      return null;
    }
    
    return validateSession(cookieToken);
  }
  
  return validateSession(token);
}

