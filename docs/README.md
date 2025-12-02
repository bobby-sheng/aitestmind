# 📖 AI TestMind 文档中心 / Documentation Center

[English](#english-documentation) | [中文](#中文文档)

---

## 中文文档

### 📚 文档目录

#### 🚀 快速开始
- [README 主页](../README.md) - 项目介绍和快速开始

#### 📦 部署指南
- [Docker 快速部署](deployment/QUICK_START_DOCKER.md) - 使用 Docker 30秒快速部署
- [完整部署指南](deployment/DEPLOYMENT_GUIDE.md) - 详细的部署文档（Docker、Kubernetes、本地部署）

#### 👥 贡献与开发
- [贡献指南](../CONTRIBUTING.md) - 如何为项目贡献代码

#### 📖 用户指南

##### 核心功能
1. [API 智能捕获](user-guide/05_API_CAPTURE.md)
   - 浏览器录制模式
   - HAR 文件导入
   - mitmproxy 代理模式

2. [API 仓库管理](user-guide/02_API_REPOSITORY.md)
   - 统一管理所有 API
   - 搜索、筛选和分类
   - 导入功能

3. [可视化流程编排](user-guide/04_FLOW_ORCHESTRATION.md)
   - 拖拽式构建测试流程
   - 变量提取和引用
   - 支持串行和并行执行
   - 定时任务调度
   - 独立环境配置

4. [AI 智能生成测试用例](user-guide/03_AI_GENERATION.md)
   - 自然语言描述生成测试
   - 支持多种 AI 提供商
   - 自动生成断言和清理步骤

5. [测试执行与监控](user-guide/06_EXECUTION.md)
   - 实时执行监控
   - 详细日志查看
   - 执行历史统计

6. [平台设置配置](user-guide/07_PLATFORM_SETTINGS.md)
   - 环境配置管理
   - 认证方式配置
   - Session 管理
   - AI 服务配置

#### 🔧 执行器文档
- [执行器使用说明](../executor/USAGE.md) - Python 执行器详细使用指南
- [执行器 README](../executor/README.md) - 执行器基础信息
- [日志示例](../executor/log_example.md) - 日志格式和示例

#### 🌐 代理服务器
- [代理服务器 README](../proxy-server/README.md) - mitmproxy 代理服务器说明

#### 📷 截图和演示

##### 动图演示
- [AI 生成演示](gifs/ai-generation.gif)
- [API 捕获演示](gifs/api-capture.gif)
- [执行监控演示](gifs/execution-monitor.gif)

##### 功能截图

**中文版截图**
- [仪表盘](screenshots/dashboard.png)
- [API 仓库](screenshots/api-repository.png)
- [AI 生成](screenshots/ai-generation.png)
- [流程编排器](screenshots/flow-builder.png)
- [完整流程](screenshots/flow-builder-full.png)
- [执行监控](screenshots/execution-monitor.png)
- [执行监控 - 单用例看板](screenshots/execution-monitor2.png)

**英文版截图**
- [Dashboard](screenshots/dashboard-en.png)
- [API Repository](screenshots/api-repository-en.png)
- [AI Generation](screenshots/ai-generation-en.png)
- [Flow Builder](screenshots/flow-builder-en.png)
- [Execution Monitor](screenshots/execution-monitor-en.png)
- [Execution Monitor Detail](screenshots/execution-monitor-en1.png)
- [API Capture](screenshots/api-capture-en.png)

#### 🖼️ 品牌资源
- [Logo SVG](images/logo.svg) - AI TestMind Logo
- [微信群二维码](images/wecaht-qr.png)
- [飞书群二维码](images/feishu-qr.png)

### 💡 使用建议

#### 新手入门路径
1. 阅读 [README 主页](../README.md) 了解项目概述
2. 按照 [Docker 快速部署](deployment/QUICK_START_DOCKER.md) 部署项目
3. 配置 [平台设置](user-guide/07_PLATFORM_SETTINGS.md) 设置环境和认证
4. 体验预置测试数据（README 中有详细说明）
5. 学习 [API 仓库管理](user-guide/02_API_REPOSITORY.md) 了解 API 的组织方式
6. 学习 [可视化流程编排](user-guide/04_FLOW_ORCHESTRATION.md)
7. 尝试 [AI 智能生成](user-guide/03_AI_GENERATION.md)

#### 进阶用户路径
1. 学习 [API 智能捕获](user-guide/05_API_CAPTURE.md) 的三种模式
2. 掌握 [API 仓库管理](user-guide/02_API_REPOSITORY.md) 的高级功能
3. 深入理解 [测试执行与监控](user-guide/06_EXECUTION.md)
4. 掌握 [平台设置](user-guide/07_PLATFORM_SETTINGS.md) 的多环境配置
5. 学习流程编排的 [定时任务](user-guide/04_FLOW_ORCHESTRATION.md#定时执行) 和 [独立配置](user-guide/04_FLOW_ORCHESTRATION.md#独立环境配置)
6. 查看 [执行器使用说明](../executor/USAGE.md) 了解底层实现
7. 参考 [完整部署指南](deployment/DEPLOYMENT_GUIDE.md) 进行生产环境部署

#### 开发者路径
1. 阅读 [贡献指南](../CONTRIBUTING.md)
2. 了解项目技术架构（见 README）
3. 查看执行器和代理服务器的技术文档
4. 提交 PR 贡献代码

### 🔗 快速链接

- 🏠 [项目主页](https://github.com/bobby-sheng/aitestmind)
- 🐳 [Docker Hub](https://hub.docker.com/r/simonbo106/aitestmind)
- 💬 [问题反馈](https://github.com/bobby-sheng/aitestmind/issues)
- ⭐ [Star 项目](https://github.com/bobby-sheng/aitestmind/stargazers)

### 📞 联系我们

- 📱 微信群：[扫码加入](images/wecaht-qr.png)
- 💬 飞书群：[扫码加入](images/feishu-qr.png)
- 📧 邮箱：simonboz@outlook.com

---

## English Documentation

### 📚 Documentation Index

#### 🚀 Getting Started
- [README Home](../README_EN.md) - Project introduction and quick start

#### 📦 Deployment Guides
- [Docker Quick Start](deployment/QUICK_START_DOCKER.md) - Deploy in 30 seconds with Docker
- [Full Deployment Guide](deployment/DEPLOYMENT_GUIDE.md) - Comprehensive deployment documentation (Docker, Kubernetes, Local)

#### 👥 Contributing & Development
- [Contributing Guide](../CONTRIBUTING.md) - How to contribute code to the project

#### 📖 User Guides

##### Core Features
1. [Smart API Capture](user-guide/05_API_CAPTURE.md)
   - Browser recording mode
   - HAR file import
   - mitmproxy proxy mode

2. [API Repository Management](user-guide/02_API_REPOSITORY.md)
   - Centralized API management
   - Search, filter, and categorize
   - Import and export features

3. [Visual Flow Orchestration](user-guide/04_FLOW_ORCHESTRATION.md)
   - Drag-and-drop test flow builder
   - Variable extraction and reference
   - Support serial and parallel execution
   - Scheduled task execution
   - Independent environment configuration

4. [AI-Powered Test Generation](user-guide/03_AI_GENERATION.md)
   - Generate tests from natural language
   - Support multiple AI providers
   - Auto-generate assertions and cleanup steps

5. [Test Execution & Monitoring](user-guide/06_EXECUTION.md)
   - Real-time execution monitoring
   - Detailed log viewing
   - Execution history statistics

6. [Platform Settings Configuration](user-guide/07_PLATFORM_SETTINGS.md)
   - Environment configuration management
   - Authentication methods setup
   - Session management
   - AI service configuration

#### 🔧 Executor Documentation
- [Executor Usage Guide](../executor/USAGE.md) - Detailed Python executor guide
- [Executor README](../executor/README.md) - Basic executor information
- [Log Examples](../executor/log_example.md) - Log format and examples

#### 🌐 Proxy Server
- [Proxy Server README](../proxy-server/README.md) - mitmproxy proxy server documentation

#### 📷 Screenshots & Demos

##### Animated Demos
- [AI Generation Demo](gifs/ai-generation.gif)
- [API Capture Demo](gifs/api-capture.gif)
- [Execution Monitor Demo](gifs/execution-monitor.gif)

##### Feature Screenshots

**Chinese Version**
- [Dashboard](screenshots/dashboard.png)
- [API Repository](screenshots/api-repository.png)
- [AI Generation](screenshots/ai-generation.png)
- [Flow Builder](screenshots/flow-builder.png)
- [Full Flow](screenshots/flow-builder-full.png)
- [Execution Monitor](screenshots/execution-monitor.png)
- [Execution Monitor - Single Case](screenshots/execution-monitor2.png)

**English Version**
- [Dashboard](screenshots/dashboard-en.png)
- [API Repository](screenshots/api-repository-en.png)
- [AI Generation](screenshots/ai-generation-en.png)
- [Flow Builder](screenshots/flow-builder-en.png)
- [Execution Monitor](screenshots/execution-monitor-en.png)
- [Execution Monitor Detail](screenshots/execution-monitor-en1.png)
- [API Capture](screenshots/api-capture-en.png)

#### 🖼️ Brand Assets
- [Logo SVG](images/logo.svg) - AI TestMind Logo
- [WeChat QR Code](images/wecaht-qr.png)
- [Feishu QR Code](images/feishu-qr.png)

### 💡 Learning Path

#### Beginner Path
1. Read [README Home](../README_EN.md) for project overview
2. Follow [Docker Quick Start](deployment/QUICK_START_DOCKER.md) to deploy
3. Configure [Platform Settings](user-guide/07_PLATFORM_SETTINGS.md) for environment and authentication
4. Experience pre-loaded test data (detailed in README)
5. Learn [API Repository Management](user-guide/02_API_REPOSITORY.md) to understand API organization
6. Learn [Visual Flow Orchestration](user-guide/04_FLOW_ORCHESTRATION.md)
7. Try [AI-Powered Generation](user-guide/03_AI_GENERATION.md)

#### Advanced User Path
1. Learn [Smart API Capture](user-guide/05_API_CAPTURE.md) three modes
2. Master [API Repository Management](user-guide/02_API_REPOSITORY.md) advanced features
3. Deep dive into [Test Execution & Monitoring](user-guide/06_EXECUTION.md)
4. Master [Platform Settings](user-guide/07_PLATFORM_SETTINGS.md) for multi-environment configuration
5. Learn [Scheduled Tasks](user-guide/04_FLOW_ORCHESTRATION.md#定时执行) and [Independent Configuration](user-guide/04_FLOW_ORCHESTRATION.md#独立环境配置) in Flow Orchestration
6. Review [Executor Usage Guide](../executor/USAGE.md) for implementation details
7. Reference [Full Deployment Guide](deployment/DEPLOYMENT_GUIDE.md) for production deployment

#### Developer Path
1. Read [Contributing Guide](../CONTRIBUTING.md)
2. Understand project architecture (see README)
3. Review executor and proxy server technical docs
4. Submit PRs to contribute code

### 🔗 Quick Links

- 🏠 [Project Home](https://github.com/bobby-sheng/aitestmind)
- 🐳 [Docker Hub](https://hub.docker.com/r/simonbo106/aitestmind)
- 💬 [Report Issues](https://github.com/bobby-sheng/aitestmind/issues)
- ⭐ [Star Project](https://github.com/bobby-sheng/aitestmind/stargazers)

### 📞 Contact Us

- 💬 Discord: [Join Server](https://discord.gg/aitestmind)
- 📧 Email: simonboz@outlook.com

---

<div align="center">

**📚 Documentation is continuously updated**

如有文档问题或建议，欢迎 [提交 Issue](https://github.com/bobby-sheng/aitestmind/issues)

If you have any documentation issues or suggestions, please [submit an Issue](https://github.com/bobby-sheng/aitestmind/issues)

</div>

