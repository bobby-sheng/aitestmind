/**
 * 添加 username 列到 User 表
 * 运行: node scripts/add-username-column.js
 * 对现有用户，将 loginName 复制到 username
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
  console.log('添加 username 列到 User 表...');
  try {
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
    
    // SQLite: 添加列
    await prisma.$executeRawUnsafe(`
      ALTER TABLE User ADD COLUMN username TEXT
    `);
    
    // 对现有用户，username = loginName
    await prisma.$executeRawUnsafe(`
      UPDATE User SET username = loginName WHERE username IS NULL
    `);
    
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    console.log('完成！');
  } catch (error) {
    // 如果列已存在会报错，忽略
    if (error.message && error.message.includes('duplicate column name')) {
      console.log('username 列已存在，跳过');
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));
