#!/bin/bash

# ================================
# AI TestMind - 数据库初始化脚本
# 自动创建数据库、迁移和导入测试数据
# ================================

set -e

echo "================================"
echo "🗄️  数据库初始化"
echo "================================"
echo ""

# 设置数据库路径
export DATABASE_URL=${DATABASE_URL:-"file:/app/prisma/dev.db"}
DB_PATH="/app/prisma/dev.db"
DB_DIR="/app/prisma"

echo "📁 数据库路径: $DATABASE_URL"
echo ""

# 确保数据目录存在
if [ ! -d "$DB_DIR" ]; then
  echo "📂 创建数据目录..."
  mkdir -p "$DB_DIR"
  echo "✅ 数据目录创建成功"
fi

# 检查数据库是否已存在
if [ -f "$DB_PATH" ]; then
  echo "ℹ️  数据库文件已存在，跳过初始化"
  echo "   如需重新初始化，请删除 $DB_PATH"
  echo ""
  exit 0
fi

echo "🔧 开始初始化数据库..."
echo ""

# 1. 生成 Prisma Client（确保最新）
echo "1️⃣  生成 Prisma Client..."
cd /app
# 使用全局安装的 prisma CLI (版本 6.19.0)
prisma generate
echo "✅ Prisma Client 生成完成"
echo ""

# 2. 创建数据库表结构
echo "2️⃣  创建数据库表结构..."
# 使用 db push 直接根据 schema.prisma 创建表，不需要迁移文件
prisma db push --accept-data-loss --skip-generate
echo "✅ 数据库表结构创建完成"
echo ""

# 3. 初始化管理员账号
echo "3️⃣  初始化管理员账号..."
if [ -f "/app/scripts/init-admin.js" ]; then
  node /app/scripts/init-admin.js
  echo "✅ 管理员账号初始化完成"
else
  echo "⚠️  未找到 init-admin.js，跳过管理员初始化"
fi
echo ""

# 4. 导入示例测试数据
echo "4️⃣  导入示例测试数据..."
if [ -f "/app/scripts/init-sample-data.js" ]; then
  node /app/scripts/init-sample-data.js
  echo "✅ 示例数据导入完成"
else
  echo "⚠️  未找到 init-sample-data.js，跳过示例数据导入"
fi
echo ""

# 设置数据库文件权限
chmod 666 "$DB_PATH" 2>/dev/null || true

echo "================================"
echo "✅ 数据库初始化完成！"
echo "================================"
echo ""
echo "📊 数据库内容："
echo "   • 管理员账号: admin / admin123"
echo "   • 4 个示例 API (JSONPlaceholder)"
echo "   • 1 个完整的 E2E 测试用例"
echo ""

