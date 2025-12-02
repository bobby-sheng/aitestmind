#!/bin/bash

echo "🚀 启动测试执行器"
echo ""
echo "📍 后端地址: http://localhost:8001"
echo "📚 API 文档: http://localhost:8001/docs"
echo "🎨 前端地址: http://localhost:3000/test-orchestration"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

cd executor
python3 main.py

