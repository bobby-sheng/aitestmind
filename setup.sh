#!/bin/bash

# 项目初始化和启动脚本

echo "======================================"
echo "项目初始化和启动"
echo "======================================"
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. 检查 Node.js 和 npm
echo "1. 检查依赖..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js 未安装${NC}"
    echo "请访问 https://nodejs.org/ 下载安装"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm 未安装${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}! Python3 未安装，executor服务将无法运行${NC}"
else
    echo -e "${GREEN}✓ Python3 $(python3 --version)${NC}"
fi
echo ""

# 2. 检查并创建 .env 文件
echo "2. 检查环境配置..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}! .env 文件不存在，正在创建...${NC}"
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✓ 已从 .env.example 创建 .env 文件${NC}"
    else
        cat > .env << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
EXECUTOR_URL="http://localhost:8001"
NODE_ENV="development"
EOF
        echo -e "${GREEN}✓ 已创建默认 .env 文件${NC}"
    fi
else
    echo -e "${GREEN}✓ .env 文件已存在${NC}"
fi
echo ""

# 3. 安装依赖（必须先安装，确保使用项目指定的 Prisma 版本）
echo "3. 安装依赖..."
if [ ! -d "node_modules" ]; then
    echo "正在安装 npm 依赖..."
    npm install
    echo -e "${GREEN}✓ npm 依赖安装完成${NC}"
else
    echo -e "${GREEN}✓ npm 依赖已安装${NC}"
fi
echo ""

# 4. 检查数据库
echo "4. 检查数据库..."
DB_CREATED=false

# 确保 prisma 目录存在
if [ ! -d "prisma" ]; then
    echo -e "${RED}✗ prisma 目录不存在${NC}"
    exit 1
fi

# 检查并修复 DATABASE_URL 配置
if [ -f ".env" ]; then
    CURRENT_DB_URL=$(grep "^DATABASE_URL=" .env | cut -d'=' -f2- | tr -d '"')
    if [ "$CURRENT_DB_URL" = "file:./prisma/dev.db" ]; then
        echo -e "${YELLOW}⚠ 检测到错误的 DATABASE_URL 配置，正在修复...${NC}"
        sed -i 's|DATABASE_URL="file:./prisma/dev.db"|DATABASE_URL="file:./dev.db"|g' .env
        echo -e "${GREEN}✓ DATABASE_URL 已修复为: file:./dev.db${NC}"
        export DATABASE_URL="file:./dev.db"
    fi
fi

# 检查是否有错误的嵌套数据库目录
if [ -f "prisma/prisma/dev.db" ]; then
    echo -e "${YELLOW}⚠ 检测到错误位置的数据库文件，正在迁移...${NC}"
    mv prisma/prisma/dev.db prisma/dev.db
    rm -rf prisma/prisma
    echo -e "${GREEN}✓ 数据库文件已移动到正确位置${NC}"
fi

if [ ! -f "prisma/dev.db" ]; then
    echo -e "${YELLOW}! 数据库不存在，正在初始化...${NC}"
    
    # 先生成 Prisma 客户端（migrate 需要）
    echo "生成 Prisma 客户端..."
    npx prisma generate
    
    # 执行数据库迁移
    echo "执行数据库迁移..."
    if npx prisma migrate dev --name init; then
        echo -e "${GREEN}✓ 数据库迁移执行成功${NC}"
        DB_CREATED=true
    else
        echo -e "${RED}✗ 数据库迁移失败${NC}"
        exit 1
    fi
    
    # 等待文件系统同步
    sleep 1
    
    # 验证数据库文件
    if [ -f "prisma/dev.db" ] || [ -f "./prisma/dev.db" ]; then
        echo -e "${GREEN}✓ 数据库文件已创建${NC}"
    else
        echo -e "${YELLOW}⚠ 注意: 数据库文件未找到，但迁移已执行${NC}"
    fi
else
    echo -e "${GREEN}✓ 数据库已存在${NC}"
    
    # 检查是否需要迁移
    echo "检查数据库迁移..."
    npx prisma migrate status
fi
echo ""

# 5. 初始化管理员账号和示例数据（如果是新创建的数据库）
if [ "$DB_CREATED" = true ]; then
    echo "5. 初始化管理员账号和示例数据..."
    
    # 检查数据库文件是否可访问
    if [ ! -f "prisma/dev.db" ]; then
        echo -e "${RED}✗ 数据库文件不存在: prisma/dev.db${NC}"
        exit 1
    fi
    
    # 检查数据库文件是否可读写
    if [ ! -r "prisma/dev.db" ] || [ ! -w "prisma/dev.db" ]; then
        echo -e "${RED}✗ 数据库文件权限不足${NC}"
        echo "尝试修复权限..."
        chmod 666 prisma/dev.db
    fi
    
    # 初始化管理员账号
    echo "→ 创建管理员账号..."
    if node scripts/init-admin.js; then
        echo -e "${GREEN}  ✓ 管理员账号初始化完成${NC}"
    else
        echo -e "${YELLOW}  ⚠ 管理员账号初始化失败，请稍后手动执行：${NC}"
        echo -e "    ${BLUE}node scripts/init-admin.js${NC}"
    fi
    
    # 初始化示例测试数据
    echo "→ 导入示例测试数据..."
    if node scripts/init-sample-data.js; then
        echo -e "${GREEN}  ✓ 示例数据导入完成${NC}"
    else
        echo -e "${YELLOW}  ⚠ 示例数据导入失败（不影响使用），可稍后手动执行：${NC}"
        echo -e "    ${BLUE}node scripts/init-sample-data.js${NC}"
    fi
    echo ""
fi

# 6. 构建 Next.js 生产版本（必须在安装 proxy-server venv 之前）
echo "6. 构建 Next.js 生产版本..."

# 临时移除 proxy-server/venv 以避免 Turbopack 错误
PROXY_VENV_BACKUP=""
if [ -d "proxy-server/venv" ]; then
    echo -e "${YELLOW}  ⚠ 临时移除 proxy-server/venv（Turbopack 无法处理 venv 符号链接）${NC}"
    mv proxy-server/venv /tmp/proxy-venv-backup-$$
    PROXY_VENV_BACKUP="/tmp/proxy-venv-backup-$$"
fi

echo "正在构建..."
if npm run build; then
    echo -e "${GREEN}✓ Next.js 构建完成${NC}"
else
    echo -e "${RED}✗ Next.js 构建失败${NC}"
    # 恢复 venv
    [ -n "$PROXY_VENV_BACKUP" ] && mv "$PROXY_VENV_BACKUP" proxy-server/venv
    exit 1
fi

# 恢复 proxy-server/venv
if [ -n "$PROXY_VENV_BACKUP" ]; then
    echo "  恢复 proxy-server/venv..."
    mv "$PROXY_VENV_BACKUP" proxy-server/venv
fi
echo ""

# 7. 安装 Python 依赖
echo "7. 安装 Python 依赖..."

# 安装 Executor 依赖
if [ -f "executor/requirements.txt" ]; then
    if command -v python3 &> /dev/null; then
        echo "正在安装 Executor 依赖..."
        cd executor
        if [ ! -d "venv" ]; then
            echo "创建虚拟环境..."
            python3 -m venv venv
        fi
        source venv/bin/activate
        pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
        deactivate
        cd ..
        echo -e "${GREEN}✓ Executor 依赖安装完成${NC}"
    else
        echo -e "${YELLOW}! Python3 未安装，跳过 executor 依赖安装${NC}"
    fi
fi

# 安装 proxy-server 依赖
if [ -f "proxy-server/requirements.txt" ]; then
    if command -v python3 &> /dev/null; then
        echo "正在安装 proxy-server 依赖..."
        cd proxy-server
        if [ ! -d "venv" ]; then
            echo "创建虚拟环境..."
            python3 -m venv venv
        fi
        source venv/bin/activate
        pip install -r requirements.txt -i https://mirrors.aliyun.com/pypi/simple/
        deactivate
        cd ..
        echo -e "${GREEN}✓ proxy-server 依赖安装完成${NC}"
    fi
fi
echo ""

# 8. 启动服务提示
echo "======================================"
echo "初始化完成！"
echo "======================================"
echo ""
echo -e "${BLUE}启动服务：${NC}"
echo ""
echo "终端1 - 启动 Next.js 生产服务器（已构建完成）："
echo -e "  ${GREEN}npm run start${NC}"
echo ""
echo "  💡 提示：如需重新构建，先删除 proxy-server/venv 再执行 npm run build"
echo ""
echo "终端2 - 启动 Executor 服务："
echo -e "  ${GREEN}cd executor && python main.py${NC}"
echo "  或"
echo -e "  ${GREEN}./start_executor.sh${NC}"
echo ""
echo -e "${BLUE}访问应用：${NC}"
echo "  • 前端: http://localhost:3000"
echo "  • Executor API: http://localhost:8001/docs"
echo "  • Prisma Studio: npx prisma studio (http://localhost:5555)"
echo ""
echo -e "${BLUE}故障排查：${NC}"
echo "  • 运行诊断: ./check_execution_status.sh"
echo "  • 查看文档: EXECUTION_MONITORING_TROUBLESHOOT.md"
echo ""

