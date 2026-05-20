#!/bin/bash

# ================================
# API 智能测试平台 - All-in-One 启动脚本
# 同时启动前端和执行器
# ================================

set -e

echo "================================"
echo "🚀 启动 API 智能测试平台 All-in-One"
echo "================================"
echo ""

# 修复挂载目录的权限问题
echo "🔧 检查并修复目录权限..."
chown -R nextjs:nodejs /app/logs /app/prisma 2>/dev/null || true
chmod -R 755 /app/logs /app/prisma 2>/dev/null || true
mkdir -p /app/logs /app/executor/logs /app/prisma
chown -R nextjs:nodejs /app/logs /app/executor/logs /app/prisma
echo "✅ 权限修复完成"
echo ""

# 设置默认的 DATABASE_URL（如果未设置）
export DATABASE_URL=${DATABASE_URL:-"file:/app/prisma/dev.db"}
echo "📁 数据库路径: $DATABASE_URL"
echo ""

# 初始化数据库（首次运行）
if [ -f "/app/docker/init-db.sh" ]; then
  echo "🔍 检查数据库状态..."
  bash /app/docker/init-db.sh
fi

# 启动执行器（后台运行，以 nextjs 用户身份）
echo "📦 启动执行器服务..."
cd /app/executor
# 设置执行器端口为8001
export API_PORT=8001
su -s /bin/bash nextjs -c "cd /app/executor && python3 main.py" &
EXECUTOR_PID=$!
echo "✅ 执行器已启动 (PID: $EXECUTOR_PID)"
echo ""

# 等待执行器启动
echo "⏳ 等待执行器就绪..."
sleep 3

# 启动前端（以 nextjs 用户身份）
echo "🌐 启动前端服务..."
cd /app
su -s /bin/bash nextjs -c "cd /app && node server.js" &
FRONTEND_PID=$!
echo "✅ 前端已启动 (PID: $FRONTEND_PID)"
echo ""

echo "================================"
echo "✅ 所有服务启动完成"
echo "================================"
echo "📍 前端地址: http://localhost:3000"
echo "📍 执行器地址: http://localhost:8001"
echo ""
echo "🔐 默认管理员账号:"
echo "   用户名: admin"
echo "   密码: admin123"
echo "================================"
echo ""

# 等待任一进程退出
wait -n

# 如果任一进程退出，杀死所有进程
echo "⚠️  检测到服务异常退出，正在关闭所有服务..."
kill $FRONTEND_PID $EXECUTOR_PID 2>/dev/null
exit 1
