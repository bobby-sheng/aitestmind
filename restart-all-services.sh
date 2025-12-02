#!/bin/bash

echo "========================================="
echo "重启所有服务"
echo "========================================="

cd "$(dirname "$0")"

# 1. 停止所有运行中的服务
echo ""
echo "1. 停止现有服务..."

# 停止 Next.js 开发服务器 (端口 3000)
echo "  - 停止 Next.js (端口 3000)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || echo "    Next.js 未运行"

# 停止 Python 执行器 (端口 8001)
echo "  - 停止 Python 执行器 (端口 8001)..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || echo "    Python 执行器未运行"

# 停止 MITM 代理服务器 (端口 8080)
echo "  - 停止 MITM 代理 (端口 8080)..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || echo "    MITM 代理未运行"

sleep 2

# 2. 清理缓存
echo ""
echo "2. 清理缓存..."
rm -rf .next
rm -rf node_modules/.prisma
rm -rf node_modules/.cache
echo "  ✓ 缓存已清理"

# 3. 重新生成 Prisma 客户端
echo ""
echo "3. 重新生成 Prisma 客户端..."
npx prisma generate
echo "  ✓ Prisma 客户端已生成"

# 4. 启动 Python 执行器
echo ""
echo "4. 启动 Python 执行器..."
cd executor
if [ ! -d "venv" ]; then
    echo "  ! 未找到 Python 虚拟环境，跳过..."
else
    source venv/bin/activate
    nohup python main.py > executor.log 2>&1 &
    echo "  ✓ Python 执行器已启动 (PID: $!)"
fi
cd ..

sleep 2

# 5. 启动 Next.js 开发服务器
echo ""
echo "5. 启动 Next.js 开发服务器..."
nohup npm run dev > dev.log 2>&1 &
NEXTJS_PID=$!
echo "  ✓ Next.js 已启动 (PID: $NEXTJS_PID)"

sleep 3

echo ""
echo "========================================="
echo "✅ 所有服务已重启！"
echo "========================================="
echo ""
echo "服务状态："
echo "  - Next.js:        http://localhost:3000"
echo "  - Python 执行器:  http://localhost:8001"
echo ""
echo "查看日志："
echo "  - Next.js:        tail -f dev.log"
echo "  - Python:         tail -f executor/executor.log"
echo ""
echo "注意：Next.js 可能需要 10-20 秒完全启动"

