/**
 * 初始化管理员账号脚本
 * 运行方式: node scripts/init-admin.js
 */

const { PrismaClient } = require('@prisma/client');
const { randomBytes, pbkdf2Sync } = require('crypto');

const prisma = new PrismaClient();

// 密码加密函数
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function initAdmin() {
  try {
    console.log('🚀 开始初始化管理员账号...');

    // 检查是否已经有管理员账号
    const adminCount = await prisma.user.count({
      where: { role: 'admin' }
    });

    if (adminCount > 0) {
      console.log('✅ 管理员账号已存在，无需初始化');
      return;
    }

    // 创建默认管理员账号
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        password: hashPassword('admin123'), // 默认密码
        email: 'admin@example.com',
        realName: '系统管理员',
        role: 'admin',
        status: 'active',
      },
    });

    console.log('✅ 管理员账号创建成功！');
    console.log('');
    console.log('📋 账号信息：');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('   邮箱:', adminUser.email);
    console.log('');
    console.log('⚠️  请登录后立即修改默认密码！');
  } catch (error) {
    console.error('❌ 创建管理员账号失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行初始化
initAdmin()
  .then(() => {
    console.log('');
    console.log('🎉 初始化完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('初始化失败:', error);
    process.exit(1);
  });

