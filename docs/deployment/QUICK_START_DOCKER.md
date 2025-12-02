# 🚀 AI TestMind - Docker 快速开始

## 📦 选择你的方式

### 🎯 方式 1: 一键部署（最简单）

```bash
# 下载并运行快速部署脚本
curl -fsSL https://raw.githubusercontent.com/bobby-sheng/aitestmind/main/quick-deploy.sh | bash
```

或者克隆仓库后运行：

```bash
git clone https://github.com/bobby-sheng/aitestmind.git
cd aitestmind
./quick-deploy.sh
```

---

### 🐋 方式 2: Docker Compose（推荐用于生产）

```bash
# 1. 下载 docker-compose.prod.yml
curl -fsSL https://raw.githubusercontent.com/bobby-sheng/aitestmind/main/docker-compose.prod.yml \
  -o docker-compose.yml

# 2. 启动服务
docker-compose up -d

# 3. 访问应用
# http://localhost:3000
```

---

### 🔧 方式 3: 本地构建并运行（推荐）

```bash
# 1. 克隆代码
git clone https://github.com/bobby-sheng/aitestmind.git
cd aitestmind

# 2. 构建镜像（将 YOUR_SERVER_IP 替换为你的服务器 IP）
docker build -f Dockerfile.all-in-one \
  --build-arg NEXT_PUBLIC_EXECUTOR_URL=http://YOUR_SERVER_IP:8001 \
  -t aitestmind:latest .

# 3. 运行容器
docker run -d \
  --name aitestmind \
  -p 3000:3000 \
  -p 8001:8001 \
  -p 8899:8899 \
  -v $(pwd)/logs:/app/logs \
  aitestmind:latest

# 端口说明：
# 3000: Next.js 前端
# 8001: Python 执行器
# 8899: mitmproxy 代理服务（API 采集功能需要）
```

> **⚠️ 重要**: `NEXT_PUBLIC_EXECUTOR_URL` 是浏览器访问执行器 API 的地址，必须在**构建时**通过 `--build-arg` 传入。
> 
> 如果浏览器提示 "执行失败: Failed to fetch"，说明此参数配置不正确。

---

## 🔑 推送你自己的镜像

### 步骤 1: 构建镜像

```bash
# 使用构建脚本
./build-and-push.sh --help

# 推送到 GitHub Container Registry
./build-and-push.sh \
  --registry ghcr \
  --username YOUR_GITHUB_USERNAME \
  --version 1.0.0 \
  --push

# 或推送到 Docker Hub
./build-and-push.sh \
  --registry dockerhub \
  --username YOUR_DOCKER_USERNAME \
  --version 1.0.0 \
  --push
```

### 步骤 2: 配置 GitHub Actions 自动构建

1. 设置 GitHub Secrets（如果推送到 Docker Hub）:
   - `DOCKER_USERNAME`
   - `DOCKER_TOKEN`

2. 推送代码或创建 Tag 触发构建:
   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

3. 在 Actions 页面查看构建进度

---

## 📚 详细文档

| 文档 | 说明 |
|------|------|
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | 完整的部署指南 |
| [DOCKER_PUSH_GUIDE.md](DOCKER_PUSH_GUIDE.md) | Docker 镜像推送详细指南 |
| [BUILD_TEST_REPORT.md](BUILD_TEST_REPORT.md) | 本地构建测试报告 |
| [README.md](../../README.md) | 项目介绍（中文） |
| [README_EN.md](../../README_EN.md) | 项目介绍（英文） |

---

## ✅ 健康检查

```bash
# 前端
curl http://localhost:3000/api/health

# 执行器
curl http://localhost:8001/health
```

---

## 🛠️ 常用命令

```bash
# 查看日志
docker logs -f aitestmind

# 停止服务
docker stop aitestmind

# 重启服务
docker restart aitestmind

# 进入容器
docker exec -it aitestmind /bin/bash

# 备份数据
docker cp aitestmind:/app/prisma/dev.db ./backup.db
```

---

## 🆘 遇到问题？

1. 查看 [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#故障排查)
2. 提交 [Issue](https://github.com/bobby-sheng/aitestmind/issues)
3. 参与 [Discussions](https://github.com/bobby-sheng/aitestmind/discussions)

---

**开始你的测试之旅！** 🎉

