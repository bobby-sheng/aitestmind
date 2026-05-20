# 📦 部署文档 / Deployment Documentation

[English](#english) | [中文](#中文)

---

## 中文

本目录包含 API 智能测试平台 的所有部署相关文档。

### 📚 文档列表

#### 🚀 快速开始

**[Docker 快速部署指南](QUICK_START_DOCKER.md)**
- 适用人群：所有用户
- 部署时间：30 秒
- 部署方式：
  - Docker Run（单命令启动）
  - Docker Compose（推荐）
  - 一键部署脚本
- 特点：最简单、最快速的部署方式

#### 📖 完整部署指南

**[完整部署指南](DEPLOYMENT_GUIDE.md)**
- 适用人群：运维人员、生产环境部署
- 涵盖内容：
  - **Docker 部署**（推荐）
    - Docker Hub 镜像使用
    - Docker Compose 配置
    - 环境变量详解
    - 数据持久化
  - **Kubernetes 部署**
    - K8s 清单文件
    - 服务配置
    - 扩展和监控
  - **本地开发部署**
    - Node.js + Python 环境搭建
    - 依赖安装
    - 开发环境配置
  - **生产环境优化**
    - 性能调优
    - 安全配置
    - 日志管理
    - 备份策略

### 🎯 选择合适的部署方式

| 场景 | 推荐方式 | 文档 |
|------|---------|------|
| 快速体验 | Docker Run | [快速部署](QUICK_START_DOCKER.md#方式-1-docker-run) |
| 开发测试 | Docker Compose | [快速部署](QUICK_START_DOCKER.md#方式-2-docker-compose) |
| 生产环境 | Docker Compose | [完整指南](DEPLOYMENT_GUIDE.md#docker-部署) |
| 大规模部署 | Kubernetes | [完整指南](DEPLOYMENT_GUIDE.md#kubernetes-部署) |
| 本地开发 | Node.js + Python | [完整指南](DEPLOYMENT_GUIDE.md#本地开发部署) |

### 🛠️ 部署脚本

位于项目根目录的部署相关脚本：

| 脚本 | 用途 |
|------|------|
| `quick-deploy.sh` | 交互式一键部署脚本 |
| `build-and-push.sh` | 构建并推送 Docker 镜像 |
| `build-and-test-local.sh` | 本地构建和测试 |
| `setup.sh` | 本地开发环境初始化 |
| `restart-all-services.sh` | 重启所有服务 |
| `start_executor.sh` | 启动执行器服务 |

### 🐳 Docker 配置文件

位于项目根目录的 Docker 配置文件：

| 文件 | 用途 |
|------|------|
| `docker-compose.yml` | 开发环境配置 |
| `docker-compose.prod.yml` | 生产环境配置（推荐） |
| `docker-compose.all-in-one.yml` | 单容器配置 |
| `Dockerfile` | 标准镜像构建文件 |
| `Dockerfile.all-in-one` | 单容器镜像构建文件 |

### 🔗 相关链接

- [项目主页](../../README.md)
- [Docker Hub 镜像](https://hub.docker.com/r/simonbo106/aitestmind)
- [用户指南](../user-guide/)
- [贡献指南](../../CONTRIBUTING.md)

### 💡 常见问题

**Q: 第一次部署应该选择哪种方式？**
A: 推荐使用 [Docker Compose 方式](QUICK_START_DOCKER.md#方式-2-docker-compose)，一条命令即可启动。

**Q: 生产环境推荐什么配置？**
A: 参考 [完整部署指南](DEPLOYMENT_GUIDE.md) 中的生产环境优化章节。

**Q: 如何更新到最新版本？**
A: 执行 `docker-compose pull && docker-compose up -d`

**Q: 数据如何备份？**
A: 参考 [完整部署指南](DEPLOYMENT_GUIDE.md) 中的备份策略章节。

---

## English

This directory contains all deployment-related documentation for API 智能测试平台.

### 📚 Documentation List

#### 🚀 Quick Start

**[Docker Quick Start Guide](QUICK_START_DOCKER.md)**
- Target audience: All users
- Deployment time: 30 seconds
- Deployment methods:
  - Docker Run (single command)
  - Docker Compose (recommended)
  - One-click deployment script
- Features: Simplest and fastest deployment

#### 📖 Complete Deployment Guide

**[Full Deployment Guide](DEPLOYMENT_GUIDE.md)**
- Target audience: DevOps, production deployment
- Coverage:
  - **Docker Deployment** (recommended)
    - Docker Hub image usage
    - Docker Compose configuration
    - Environment variables
    - Data persistence
  - **Kubernetes Deployment**
    - K8s manifests
    - Service configuration
    - Scaling and monitoring
  - **Local Development**
    - Node.js + Python setup
    - Dependencies installation
    - Development configuration
  - **Production Optimization**
    - Performance tuning
    - Security configuration
    - Log management
    - Backup strategy

### 🎯 Choose the Right Deployment

| Scenario | Recommended | Documentation |
|----------|-------------|---------------|
| Quick Trial | Docker Run | [Quick Start](QUICK_START_DOCKER.md#option-1-docker-run) |
| Development | Docker Compose | [Quick Start](QUICK_START_DOCKER.md#option-2-docker-compose) |
| Production | Docker Compose | [Full Guide](DEPLOYMENT_GUIDE.md#docker-deployment) |
| Large Scale | Kubernetes | [Full Guide](DEPLOYMENT_GUIDE.md#kubernetes-deployment) |
| Local Dev | Node.js + Python | [Full Guide](DEPLOYMENT_GUIDE.md#local-development) |

### 🛠️ Deployment Scripts

Located in the project root directory:

| Script | Purpose |
|--------|---------|
| `quick-deploy.sh` | Interactive one-click deployment |
| `build-and-push.sh` | Build and push Docker images |
| `build-and-test-local.sh` | Local build and test |
| `setup.sh` | Local development initialization |
| `restart-all-services.sh` | Restart all services |
| `start_executor.sh` | Start executor service |

### 🐳 Docker Configuration Files

Located in the project root directory:

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Development configuration |
| `docker-compose.prod.yml` | Production configuration (recommended) |
| `docker-compose.all-in-one.yml` | Single container configuration |
| `Dockerfile` | Standard image build file |
| `Dockerfile.all-in-one` | Single container image build file |

### 🔗 Related Links

- [Project Home](../../README_EN.md)
- [Docker Hub Image](https://hub.docker.com/r/simonbo106/aitestmind)
- [User Guides](../user-guide/)
- [Contributing Guide](../../CONTRIBUTING.md)

### 💡 FAQ

**Q: Which deployment method should I choose for the first time?**
A: We recommend [Docker Compose](QUICK_START_DOCKER.md#option-2-docker-compose), one command to start.

**Q: What's recommended for production?**
A: See the production optimization section in [Full Deployment Guide](DEPLOYMENT_GUIDE.md).

**Q: How to update to the latest version?**
A: Run `docker-compose pull && docker-compose up -d`

**Q: How to backup data?**
A: See the backup strategy section in [Full Deployment Guide](DEPLOYMENT_GUIDE.md).

---

<div align="center">

**📦 For more information, visit our [Documentation Center](../README.md)**

</div>

