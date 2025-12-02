#!/bin/bash

# mitmproxy 依赖安装脚本

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "========================================="
echo "📦 安装 mitmproxy 依赖"
echo "========================================="

# 检查 Python 环境
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 Python 3"
    echo "请安装 Python 3: https://www.python.org/downloads/"
    exit 1
fi

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
if [ ! -f "venv/.dependencies_installed" ]; then
    echo "📦 安装依赖包..."
    pip install -r requirements.txt
    touch venv/.dependencies_installed
    echo "✅ 依赖安装完成"
fi

# 检查 mitmproxy 安装
echo ""
echo "🔍 验证 mitmproxy 安装..."
if ! python -c "import mitmproxy" 2>/dev/null; then
    echo "❌ mitmproxy 安装失败，请检查错误信息"
    exit 1
fi

# 检查 mitmproxy 证书
CERT_PATH="$HOME/.mitmproxy/mitmproxy-ca-cert.pem"
if [ ! -f "$CERT_PATH" ]; then
    echo ""
    echo "ℹ️  首次使用 mitmproxy 时会自动生成证书"
    echo "证书位置: $CERT_PATH"
    echo "需要在系统中安装并信任该证书以拦截 HTTPS 请求"
fi

# 完成
echo ""
echo "========================================="
echo "✅ 依赖安装完成"
echo "========================================="
echo ""
echo "📝 下一步："
echo "1. 启动 Next.js 应用: npm run dev"
echo "2. 访问: http://localhost:3000/api-capture"
echo "3. 点击 '启动 mitmproxy 录制'"
echo "4. 配置系统代理: localhost:8899"
echo "5. 安装并信任证书（首次使用）"
echo ""
echo "证书路径: $CERT_PATH"
echo "========================================="
echo ""

