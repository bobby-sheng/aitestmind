#!/bin/bash

# 测试执行器启动脚本

echo "🚀 启动测试执行器..."

# 检查 Python 版本
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "📦 Python 版本: $python_version"

# 检查依赖
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

echo "📦 激活虚拟环境..."
source venv/bin/activate

echo "📦 安装依赖..."
pip install -r requirements.txt

echo "🚀 启动服务..."
python main.py

