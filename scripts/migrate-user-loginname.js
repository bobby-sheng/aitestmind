/**
 * 迁移脚本：username/realName -> loginName
 * 运行: node scripts/migrate-user-loginname.js
 * 
 * 此脚本会：
 * 1. 将 User 表的 username 复制到 loginName
 * 2. 创建新表结构（loginName，无 username/realName）
 * 3. 迁移数据后替换原表
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function migrate() {
  console.log('开始迁移 User 表: username/realName -> loginName...');
  
  try {
    // SQLite: 需要禁用外键，重建表
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
    
    // 创建新表
    await prisma.$executeRawUnsafe(`
      CREATE TABLE User_new (
        id TEXT PRIMARY KEY NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL,
        loginName TEXT NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        status TEXT NOT NULL DEFAULT 'active',
        lastLoginAt DATETIME
      )
    `);
    
    // 复制数据: username -> loginName
    await prisma.$executeRawUnsafe(`
      INSERT INTO User_new (id, createdAt, updatedAt, loginName, password, email, role, status, lastLoginAt)
      SELECT id, createdAt, updatedAt, username, password, email, role, status, lastLoginAt FROM User
    `);
    
    // 删除旧表
    await prisma.$executeRawUnsafe('DROP TABLE User');
    
    // 重命名新表
    await prisma.$executeRawUnsafe('ALTER TABLE User_new RENAME TO User');
    
    // 创建索引
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX User_loginName_key ON User(loginName)');
    await prisma.$executeRawUnsafe('CREATE INDEX User_loginName_idx ON User(loginName)');
    await prisma.$executeRawUnsafe('CREATE INDEX User_role_idx ON User(role)');
    await prisma.$executeRawUnsafe('CREATE INDEX User_status_idx ON User(status)');
    await prisma.$executeRawUnsafe('CREATE INDEX User_createdAt_idx ON User(createdAt)');
    
    await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
    
    console.log('迁移完成！');
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
