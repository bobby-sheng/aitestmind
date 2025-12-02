#!/bin/bash

# ================================
# AI TestMind - 镜像构建和推送脚本
# 支持 Docker Hub 和 GitHub Container Registry
# ================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🐳 AI TestMind - 镜像构建和推送工具${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -r, --registry REGISTRY   镜像仓库 (dockerhub 或 ghcr)"
    echo "  -u, --username USERNAME   用户名或组织名"
    echo "  -v, --version VERSION     版本号 (例如: 1.0.0)"
    echo "  -p, --push                推送到远程仓库"
    echo "  --no-cache                不使用缓存构建"
    echo "  -h, --help                显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 --registry dockerhub --username myuser --version 1.0.0 --push"
    echo "  $0 --registry ghcr --username myorg --version 1.0.0 --push"
    echo "  $0 --registry dockerhub --username myuser --version 1.0.0  (仅构建)"
    echo ""
    echo "环境变量 (可选):"
    echo "  DOCKER_USERNAME    Docker Hub 用户名"
    echo "  GITHUB_USERNAME    GitHub 用户名/组织名"
    echo "  VERSION            版本号"
    echo ""
}

# 默认配置
REGISTRY="dockerhub"
USERNAME=""
VERSION=""
PUSH=false
NO_CACHE=""

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -u|--username)
            USERNAME="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}❌ 未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ 错误: Docker 未运行，请先启动 Docker${NC}"
    exit 1
fi

# 从环境变量或命令行参数获取配置
if [ -z "$USERNAME" ]; then
    if [ "$REGISTRY" = "dockerhub" ] && [ -n "$DOCKER_USERNAME" ]; then
        USERNAME="$DOCKER_USERNAME"
    elif [ "$REGISTRY" = "ghcr" ] && [ -n "$GITHUB_USERNAME" ]; then
        USERNAME="$GITHUB_USERNAME"
    fi
fi

# 验证必需参数
if [ -z "$USERNAME" ]; then
    echo -e "${RED}❌ 错误: 未指定用户名${NC}"
    echo "请使用 -u/--username 参数或设置环境变量 DOCKER_USERNAME/GITHUB_USERNAME"
    echo ""
    show_help
    exit 1
fi

if [ -z "$VERSION" ]; then
    if [ -n "$VERSION_ENV" ]; then
        VERSION="$VERSION_ENV"
    else
        # 使用 git tag 或默认版本
        VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "latest")
    fi
fi

# 设置镜像仓库地址
if [ "$REGISTRY" = "dockerhub" ]; then
    REGISTRY_URL="docker.io"
    IMAGE_PREFIX="${USERNAME}"
elif [ "$REGISTRY" = "ghcr" ]; then
    REGISTRY_URL="ghcr.io"
    IMAGE_PREFIX="${USERNAME}"
else
    echo -e "${RED}❌ 错误: 不支持的仓库类型: $REGISTRY${NC}"
    echo "支持的类型: dockerhub, ghcr"
    exit 1
fi

# 定义镜像名称
IMAGE_NAME="aitestmind-all-in-one"
FULL_IMAGE_NAME="${REGISTRY_URL}/${IMAGE_PREFIX}/${IMAGE_NAME}"

# 显示配置信息
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🐳 AI TestMind - 镜像构建${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📦 镜像仓库:${NC} $REGISTRY ($REGISTRY_URL)"
echo -e "${GREEN}👤 用户名:${NC} $USERNAME"
echo -e "${GREEN}🏷️  版本:${NC} $VERSION"
echo -e "${GREEN}📦 完整镜像名:${NC} $FULL_IMAGE_NAME:$VERSION"
echo -e "${GREEN}🚀 推送:${NC} $([ "$PUSH" = true ] && echo "是" || echo "否")"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 确认是否继续
if [ "$PUSH" = true ]; then
    read -p "确认以上配置并推送到远程仓库？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}⚠️  操作已取消${NC}"
        exit 0
    fi
fi

# 步骤 1: 构建镜像
echo ""
echo -e "${BLUE}🔨 步骤 1/3: 构建 All-in-One 镜像...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

docker build $NO_CACHE \
    -f Dockerfile.all-in-one \
    -t ${FULL_IMAGE_NAME}:${VERSION} \
    -t ${FULL_IMAGE_NAME}:latest \
    .

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}❌ 镜像构建失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 镜像构建成功${NC}"

# 步骤 2: 登录仓库（如果需要推送）
if [ "$PUSH" = true ]; then
    echo ""
    echo -e "${BLUE}🔑 步骤 2/3: 登录到 ${REGISTRY_URL}...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ "$REGISTRY" = "ghcr" ]; then
        # GitHub Container Registry 需要使用 PAT token
        if [ -z "$GITHUB_TOKEN" ]; then
            echo -e "${YELLOW}⚠️  请输入 GitHub Personal Access Token (需要 write:packages 权限):${NC}"
            read -s GITHUB_TOKEN
            echo
        fi
        echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$USERNAME" --password-stdin
    else
        # Docker Hub
        docker login docker.io -u "$USERNAME"
    fi
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ 登录失败${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 登录成功${NC}"
    
    # 步骤 3: 推送镜像
    echo ""
    echo -e "${BLUE}🚀 步骤 3/3: 推送镜像到 ${REGISTRY_URL}...${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    echo -e "${YELLOW}📤 推送 ${FULL_IMAGE_NAME}:${VERSION}...${NC}"
    docker push ${FULL_IMAGE_NAME}:${VERSION}
    
    echo -e "${YELLOW}📤 推送 ${FULL_IMAGE_NAME}:latest...${NC}"
    docker push ${FULL_IMAGE_NAME}:latest
    
    if [ $? -ne 0 ]; then
        echo ""
        echo -e "${RED}❌ 镜像推送失败${NC}"
        exit 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ 镜像推送成功${NC}"
fi

# 完成
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 镜像构建完成！${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}📝 镜像信息：${NC}"
echo "  • ${FULL_IMAGE_NAME}:${VERSION}"
echo "  • ${FULL_IMAGE_NAME}:latest"
echo ""

if [ "$PUSH" = true ]; then
    echo -e "${BLUE}📥 拉取镜像：${NC}"
    echo "  docker pull ${FULL_IMAGE_NAME}:${VERSION}"
    echo ""
fi

echo -e "${BLUE}🚀 使用镜像：${NC}"
echo "  docker run -d -p 3000:3000 -p 8001:8001 \\"
echo "    -v \$(pwd)/data:/app/data \\"
echo "    -v \$(pwd)/logs:/app/logs \\"
echo "    ${FULL_IMAGE_NAME}:${VERSION}"
echo ""

if [ "$REGISTRY" = "ghcr" ]; then
    echo -e "${BLUE}🌐 镜像地址：${NC}"
    echo "  https://github.com/${USERNAME}?tab=packages"
elif [ "$REGISTRY" = "dockerhub" ]; then
    echo -e "${BLUE}🌐 Docker Hub 链接：${NC}"
    echo "  https://hub.docker.com/r/${USERNAME}/${IMAGE_NAME}"
fi

echo ""
echo -e "${GREEN}✨ 完成！${NC}"

