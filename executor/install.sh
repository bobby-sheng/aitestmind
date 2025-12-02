#!/bin/bash

# 安装依赖脚本（不使用虚拟环境）

echo "📦 安装 Python 依赖..."

pip3 install fastapi==0.104.1
pip3 install uvicorn==0.24.0
pip3 install pydantic==2.5.0
pip3 install httpx==0.25.1
pip3 install jsonpath-ng==1.6.0
pip3 install python-dotenv==1.0.0

echo "✅ 依赖安装完成！"

