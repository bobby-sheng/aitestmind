#!/bin/bash

# ================================
# AI TestMind - 本地构建和测试脚本
# 用于本地快速构建和测试 All-in-One 镜像
# ================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认配置
IMAGE_NAME="aitestmind-all-in-one"
VERSION="local-$(date +%Y%m%d-%H%M%S)"
CONTAINER_NAME="aitestmind-test"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🐳 AI TestMind - 本地构建和测试${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📦 镜像名称:${NC} $IMAGE_NAME"
echo -e "${GREEN}🏷️  版本标签:${NC} $VERSION"
echo -e "${GREEN}📦 容器名称:${NC} $CONTAINER_NAME"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ 错误: Docker 未运行，请先启动 Docker${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker 正在运行${NC}"
echo ""

# 步骤 1: 停止并删除旧容器（如果存在）
echo -e "${BLUE}🛑 步骤 1/5: 清理旧容器...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker ps -a | grep -q $CONTAINER_NAME; then
    echo -e "${YELLOW}⏹️  停止容器: $CONTAINER_NAME${NC}"
    docker stop $CONTAINER_NAME > /dev/null 2>&1 || true
    echo -e "${YELLOW}🗑️  删除容器: $CONTAINER_NAME${NC}"
    docker rm $CONTAINER_NAME > /dev/null 2>&1 || true
    echo -e "${GREEN}✅ 旧容器已清理${NC}"
else
    echo -e "${CYAN}ℹ️  没有发现旧容器${NC}"
fi
echo ""

# 步骤 2: 清理旧镜像（可选）
echo -e "${BLUE}🧹 步骤 2/5: 清理旧镜像（可选）...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if docker images | grep -q $IMAGE_NAME; then
    echo -e "${YELLOW}🗑️  发现旧的本地测试镜像${NC}"
    # 只删除带有 local- 前缀的旧版本
    docker images | grep $IMAGE_NAME | grep "local-" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    echo -e "${GREEN}✅ 旧测试镜像已清理${NC}"
else
    echo -e "${CYAN}ℹ️  没有发现旧镜像${NC}"
fi
echo ""

# 步骤 3: 构建新镜像
echo -e "${BLUE}🔨 步骤 3/5: 构建 All-in-One 镜像...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${CYAN}📝 使用 Dockerfile.all-in-one${NC}"
echo ""

docker build -f Dockerfile.all-in-one -t ${IMAGE_NAME}:${VERSION} -t ${IMAGE_NAME}:latest .

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 镜像构建成功${NC}"
echo ""

# 步骤 4: 创建必要的目录
echo -e "${BLUE}📁 步骤 4/5: 准备数据目录...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

mkdir -p ./data
mkdir -p ./logs

echo -e "${GREEN}✅ 数据目录已准备就绪${NC}"
echo ""

# 步骤 5: 启动容器
echo -e "${BLUE}🚀 步骤 5/5: 启动容器...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker run -d \
  --name $CONTAINER_NAME \
  -p 3000:3000 \
  -p 8001:8001 \
  -v "$(pwd)/data:/app/data" \
  -v "$(pwd)/logs:/app/logs" \
  -e NODE_ENV=production \
  -e DATABASE_URL=file:/app/data/dev.db \
  -e EXECUTOR_URL=http://localhost:8001 \
  -e PYTHONUNBUFFERED=1 \
  ${IMAGE_NAME}:latest

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ 容器启动失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 容器启动成功${NC}"
echo ""

# 等待服务启动
echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
sleep 5

# 检查容器状态
if docker ps | grep -q $CONTAINER_NAME; then
    echo -e "${GREEN}✅ 容器正在运行${NC}"
else
    echo -e "${RED}❌ 容器启动失败，查看日志：${NC}"
    docker logs $CONTAINER_NAME
    exit 1
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 本地构建和测试完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📝 容器信息：${NC}"
echo "  • 容器名称: $CONTAINER_NAME"
echo "  • 镜像标签: ${IMAGE_NAME}:${VERSION}"
echo ""
echo -e "${BLUE}🌐 访问地址：${NC}"
echo "  • 前端: ${CYAN}http://localhost:3000${NC}"
echo "  • 执行器: ${CYAN}http://localhost:8001${NC}"
echo "  • 健康检查: ${CYAN}http://localhost:3000/api/health${NC}"
echo ""
echo -e "${BLUE}📊 实用命令：${NC}"
echo "  • 查看日志: ${YELLOW}docker logs -f $CONTAINER_NAME${NC}"
echo "  • 停止容器: ${YELLOW}docker stop $CONTAINER_NAME${NC}"
echo "  • 启动容器: ${YELLOW}docker start $CONTAINER_NAME${NC}"
echo "  • 删除容器: ${YELLOW}docker rm -f $CONTAINER_NAME${NC}"
echo "  • 进入容器: ${YELLOW}docker exec -it $CONTAINER_NAME /bin/bash${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}💡 提示：${NC}"
echo "  1. 浏览器打开 http://localhost:3000 进行测试"
echo "  2. 使用 'docker logs -f $CONTAINER_NAME' 查看实时日志"
echo "  3. 测试完成后使用 'docker stop $CONTAINER_NAME' 停止容器"
echo ""
echo -e "${GREEN}✨ 开始测试吧！${NC}"
echo ""

