# 🔧 环境变量配置指南

## 📋 目录

- [快速开始](#快速开始)
- [环境变量详解](#环境变量详解)
- [常见问题](#常见问题)
- [部署场景示例](#部署场景示例)

---

## 🚀 快速开始

### 本地开发环境

```bash
# 1. 复制配置模板
cp env.example .env

# 2. 使用默认配置即可（localhost）
# 默认配置已经可以直接使用，无需修改

# 3. 构建并启动服务
npm run build                  # 构建生产版本
npm run start                  # 启动前端（生产模式）
cd executor && python3.12 main.py  # 启动后端
```

### 服务器生产环境

```bash
# 1. 复制配置模板
cp env.example .env

# 2. 修改关键配置（重要！）
nano .env

# 必须修改这一行（替换为你的服务器 IP 或域名）：
NEXT_PUBLIC_EXECUTOR_URL=http://你的服务器IP:8001

# 3. 构建和启动
npm run build
npm run start

# 4. 启动执行器
cd executor && python3.12 main.py
```

---

## 📖 环境变量详解

### 🔴 必须配置的变量（服务器部署）

#### `NEXT_PUBLIC_EXECUTOR_URL` 

**最重要的环境变量！服务器部署时必须配置。**

```bash
# 用途：
# - 浏览器端 JavaScript 代码调用执行器时使用
# - 代码在用户浏览器中运行，不能使用 localhost

# 开发环境：
NEXT_PUBLIC_EXECUTOR_URL=http://localhost:8001

# 生产环境（使用服务器 IP）：
NEXT_PUBLIC_EXECUTOR_URL=http://192.168.1.100:8001

# 生产环境（使用域名）：
NEXT_PUBLIC_EXECUTOR_URL=https://api.yourdomain.com

# 生产环境（使用 Nginx 反向代理）：
NEXT_PUBLIC_EXECUTOR_URL=https://yourdomain.com/executor
```

**为什么必须配置？**

```
用户电脑 (浏览器)              服务器 (192.168.1.100)
┌─────────────────┐            ┌──────────────────┐
│   访问网站      │  HTTP      │  Next.js :3000  │
│ 192.168.1.100   │───────────→│  提供网页和JS   │
└─────────────────┘            │                  │
        ↓                       │  Python :8001   │
    下载 JS 到本地              │  执行器服务     │
        ↓                       └──────────────────┘
    在浏览器中执行                      ↑
        ↓                               │
    调用执行器 API                     │
        ↓                               │
    如果用 localhost ❌               │
    会访问用户自己的电脑              │
        ↓                               │
    必须用服务器 IP ✅ ─────────────┘
    才能正确访问服务器
```

#### `API_HOST` 和 `API_PORT`

```bash
# 执行器监听地址
API_HOST=0.0.0.0  # 监听所有网络接口（推荐）
API_PORT=8001     # 执行器端口

# 说明：
# - 0.0.0.0：允许从任何网络接口访问（服务器部署必须）
# - 127.0.0.1：只允许本机访问（仅限本地开发）
```

### 🟡 推荐配置的变量

#### `EXECUTOR_URL`

```bash
# 服务端 API 路由调用执行器
EXECUTOR_URL=http://localhost:8001

# 用途：
# - Next.js 服务端代码（API Routes）调用执行器
# - 代码在服务器上运行，可以使用 localhost

# 场景：
# - 同一台服务器：使用 localhost（推荐，更快）
# - 不同服务器：使用执行器服务器的地址
```

#### `DATABASE_URL`

```bash
# SQLite（默认，推荐）
DATABASE_URL="file:./prisma/dev.db"

# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/aitestmind"

# MySQL
DATABASE_URL="mysql://user:password@localhost:3306/aitestmind"
```

### 🟢 可选配置的变量

#### AI 提供商配置

```bash
# OpenAI
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
OPENAI_BASE_URL=https://api.openai.com/v1

# DeepSeek（深度求索）
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1

# Claude
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx

# 百度文心一言
BAIDU_API_KEY=xxxxxxxxxxxxxxxxxxxx
BAIDU_SECRET_KEY=xxxxxxxxxxxxxxxxxxxx

# 阿里通义千问
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

# 智谱 AI
ZHIPU_API_KEY=xxxxxxxxxxxxxxxxxxxx

# Ollama（本地部署，完全免费）
OLLAMA_BASE_URL=http://localhost:11434
```

#### 应用配置

```bash
# 运行环境
NODE_ENV=production         # development | production

# 服务端口
PORT=3000                   # Next.js 端口

# 日志级别
LOG_LEVEL=info             # debug | info | warn | error

# 禁用遥测
NEXT_TELEMETRY_DISABLED=1
```

---

## ❓ 常见问题

### Q1: 浏览器报错 "Failed to fetch" 或 "无法连接到执行器"

**错误截图：**
```
Failed to fetch
执行器地址是否正确: http://localhost:8001
```

**原因：**
1. 未创建 `.env` 文件
2. `NEXT_PUBLIC_EXECUTOR_URL` 使用了 `localhost`
3. 修改配置后未重新构建

**解决方法：**

```bash
# 1. 检查 .env 文件
cat .env | grep NEXT_PUBLIC_EXECUTOR_URL

# 应该显示服务器 IP，不是 localhost：
# NEXT_PUBLIC_EXECUTOR_URL=http://192.168.1.100:8001

# 2. 如果配置错误，修改它
nano .env
# 改为：NEXT_PUBLIC_EXECUTOR_URL=http://你的服务器IP:8001

# 3. 重新构建（重要！）
rm -rf .next
npm run build

# 4. 重启服务
pkill -f "next"
npm run start
```

### Q2: 为什么修改 `.env` 后没有生效？

**原因：**

`NEXT_PUBLIC_*` 环境变量会在构建时打包到 JavaScript 文件中，运行时修改无效。

**解决方法：**

```bash
# 每次修改 NEXT_PUBLIC_* 变量后，必须重新构建
rm -rf .next
npm run build
npm run start
```

### Q3: Docker 部署如何配置环境变量？

**方法 1：通过 `-e` 参数传递**

```bash
docker run -d \
  --name aitestmind \
  -p 3000:3000 \
  -p 8001:8001 \
  -e NEXT_PUBLIC_EXECUTOR_URL=http://192.168.1.100:8001 \
  -e EXECUTOR_URL=http://localhost:8001 \
  -e NODE_ENV=production \
  simonbo106/aitestmind:latest
```

**方法 2：使用 docker-compose.yml**

```yaml
version: '3.8'
services:
  aitestmind:
    image: simonbo106/aitestmind:latest
    ports:
      - "3000:3000"
      - "8001:8001"
    environment:
      - NEXT_PUBLIC_EXECUTOR_URL=http://192.168.1.100:8001
      - EXECUTOR_URL=http://localhost:8001
      - NODE_ENV=production
```

**方法 3：使用 .env 文件**

```bash
# 创建 .env 文件
cat > .env << 'EOF'
NEXT_PUBLIC_EXECUTOR_URL=http://192.168.1.100:8001
EXECUTOR_URL=http://localhost:8001
NODE_ENV=production
EOF

# 在 docker-compose.yml 中引用
version: '3.8'
services:
  aitestmind:
    image: simonbo106/aitestmind:latest
    env_file:
      - .env
    ports:
      - "3000:3000"
      - "8001:8001"
```

### Q4: 如何验证配置是否正确？

```bash
# 1. 检查 .env 文件
cat .env | grep NEXT_PUBLIC_EXECUTOR_URL

# 2. 检查构建后的配置（构建后执行）
cat .next/server/app/test-orchestration/page.js | grep EXECUTOR

# 3. 在浏览器中验证
# 打开开发者工具（F12），查看 Console：
#   - 运行测试用例
#   - 查看日志输出的连接地址
#   - 应该显示服务器 IP，不是 localhost

# 4. 测试执行器连接
curl http://localhost:8001/docs
curl http://你的服务器IP:8001/docs
```

### Q5: env.example 和 .env 有什么区别？

| 文件 | 用途 | 是否提交到 Git | 是否被读取 |
|------|------|---------------|-----------|
| `env.example` | 配置模板/示例 | ✅ 是 | ❌ 否 |
| `.env` | 实际配置文件 | ❌ 否（敏感信息） | ✅ 是 |

**工作流程：**
1. 开发者提供 `env.example` 作为模板（提交到 Git）
2. 用户复制为 `.env` 并填入实际配置（不提交到 Git）
3. 应用读取 `.env` 文件中的配置

---

## 🌍 部署场景示例

### 场景 1: 本地开发

```bash
# .env 文件
API_HOST=0.0.0.0
API_PORT=8001
NEXT_PUBLIC_EXECUTOR_URL=http://localhost:8001
EXECUTOR_URL=http://localhost:8001
DATABASE_URL="file:./prisma/dev.db"
NODE_ENV=development
PORT=3000
```

### 场景 2: 单台服务器部署（使用 IP）

```bash
# .env 文件
API_HOST=0.0.0.0
API_PORT=8001
NEXT_PUBLIC_EXECUTOR_URL=http://192.168.1.100:8001
EXECUTOR_URL=http://localhost:8001
DATABASE_URL="file:./prisma/dev.db"
NODE_ENV=production
PORT=3000
```

### 场景 3: 单台服务器部署（使用域名）

```bash
# .env 文件
API_HOST=0.0.0.0
API_PORT=8001
NEXT_PUBLIC_EXECUTOR_URL=https://api.yourdomain.com
EXECUTOR_URL=http://localhost:8001
DATABASE_URL="file:./prisma/dev.db"
NODE_ENV=production
PORT=3000
```

### 场景 4: 前后端分离部署

```bash
# 前端服务器 (192.168.1.100) .env 文件
NEXT_PUBLIC_EXECUTOR_URL=http://192.168.1.101:8001
EXECUTOR_URL=http://192.168.1.101:8001
DATABASE_URL="postgresql://user:pass@192.168.1.102:5432/aitestmind"
NODE_ENV=production
PORT=3000

# 后端服务器 (192.168.1.101) 配置
API_HOST=0.0.0.0
API_PORT=8001
```

### 场景 5: 使用 Nginx 反向代理

```nginx
# Nginx 配置
server {
    listen 80;
    server_name yourdomain.com;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
    }

    # 执行器 API
    location /executor/ {
        proxy_pass http://localhost:8001/;
        proxy_buffering off;  # SSE 支持
    }
}
```

```bash
# .env 文件
API_HOST=0.0.0.0
API_PORT=8001
NEXT_PUBLIC_EXECUTOR_URL=https://yourdomain.com/executor
EXECUTOR_URL=http://localhost:8001
NODE_ENV=production
PORT=3000
```

---

## 📚 相关文档

- [env.example](../../env.example) - 完整的环境变量模板
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 完整部署指南
- [QUICK_START_DOCKER.md](QUICK_START_DOCKER.md) - Docker 快速开始

---

## 💡 最佳实践

1. **开发环境**：直接使用 `localhost`
2. **生产环境**：必须配置服务器 IP 或域名
3. **敏感信息**：API Key 等敏感信息不要提交到 Git
4. **版本控制**：提供 `env.example` 模板，`.env` 加入 `.gitignore`
5. **文档同步**：修改环境变量时同步更新文档
6. **环境隔离**：开发、测试、生产使用不同的 `.env` 文件
7. **定期检查**：验证配置是否正确，特别是部署后

---

## 🆘 获取帮助

如果遇到环境变量配置问题：

1. 📖 查看本文档
2. 🔍 搜索 [GitHub Issues](https://github.com/bobby-sheng/aitestmind/issues)
3. 💬 加入 [Discord 社区](https://discord.gg/Kys4DcgNeC)
4. 🐛 [提交 Issue](https://github.com/bobby-sheng/aitestmind/issues/new)

