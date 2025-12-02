# 🚀 AI TestMind - 部署指南

本指南将帮助你快速部署 AI TestMind 到生产环境。

## 📋 目录

- [快速开始](#快速开始)
- [部署方式](#部署方式)
  - [Docker Compose (推荐)](#docker-compose-推荐)
  - [Docker Run](#docker-run)
  - [Kubernetes](#kubernetes)
- [镜像仓库](#镜像仓库)
- [环境配置](#环境配置)
- [数据持久化](#数据持久化)
- [健康检查](#健康检查)
- [故障排查](#故障排查)

---

## 🎯 快速开始

### 前提条件

- Docker 20.10+ 或 Podman
- Docker Compose 2.0+ (可选)
- 2GB+ 可用内存
- 1GB+ 可用磁盘空间

### 一键部署

```bash
# 1. 下载部署脚本
curl -fsSL https://raw.githubusercontent.com/bobby-sheng/aitestmind/main/docker-compose.prod.yml -o docker-compose.yml

# 2. 启动服务
docker-compose up -d

# 3. 访问应用
# 浏览器打开: http://localhost:3000
```

---

## 🐳 部署方式

### Docker Compose (推荐)

#### 使用 GitHub Container Registry (GHCR)

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  aitestmind:
    image: ghcr.io/bobby-sheng/aitestmind-all-in-one:latest
    container_name: aitestmind
    ports:
      - "3000:3000"  # 前端端口
      - "8001:8001"  # 执行器端口
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/prisma/dev.db
      - EXECUTOR_URL=http://localhost:8001
      - PYTHONUNBUFFERED=1
      # AI 提供商配置 (可选)
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_BASE_URL=${OPENAI_BASE_URL}
    volumes:
      - ./data:/app/data        # 数据库持久化
      - ./logs:/app/logs        # 日志持久化
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

#### 使用 Docker Hub

将镜像地址改为：

```yaml
image: bobby-sheng/aitestmind-all-in-one:latest
```

#### 启动服务

```bash
# 启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down

# 停止并删除数据
docker-compose down -v
```

---

### Docker Run

#### 本地构建并运行（推荐）

由于 `NEXT_PUBLIC_EXECUTOR_URL` 是构建时变量，推荐在本地构建镜像：

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
  -e DATABASE_URL=file:/app/prisma/dev.db \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  aitestmind:latest
```

> **⚠️ 重要参数说明**
> 
> | 参数 | 说明 | 示例 |
> |------|------|------|
> | `NEXT_PUBLIC_EXECUTOR_URL` | 浏览器访问执行器的地址（**构建时**传入） | `http://192.168.1.100:8001` |
> | `DATABASE_URL` | 数据库路径（运行时传入） | `file:/app/prisma/dev.db` |
> 
> 如果浏览器提示 "执行失败: Failed to fetch"，说明 `NEXT_PUBLIC_EXECUTOR_URL` 配置不正确。

#### 带 AI 配置

```bash
# 构建镜像
docker build -f Dockerfile.all-in-one \
  --build-arg NEXT_PUBLIC_EXECUTOR_URL=http://YOUR_SERVER_IP:8001 \
  -t aitestmind:latest .

# 运行容器（带 AI 配置）
docker run -d \
  --name aitestmind \
  -p 3000:3000 \
  -p 8001:8001 \
  -e DATABASE_URL=file:/app/prisma/dev.db \
  -e OPENAI_API_KEY=sk-your-api-key \
  -e OPENAI_BASE_URL=https://api.openai.com/v1 \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  aitestmind:latest
```

---

### Kubernetes

创建 `aitestmind-deployment.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: aitestmind

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: aitestmind-data
  namespace: aitestmind
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: aitestmind-logs
  namespace: aitestmind
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi

---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aitestmind
  namespace: aitestmind
spec:
  replicas: 1
  selector:
    matchLabels:
      app: aitestmind
  template:
    metadata:
      labels:
        app: aitestmind
    spec:
      containers:
      - name: aitestmind
        image: ghcr.io/bobby-sheng/aitestmind-all-in-one:latest
        ports:
        - containerPort: 3000
          name: frontend
        - containerPort: 8001
          name: executor
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          value: "file:/app/prisma/dev.db"
        - name: EXECUTOR_URL
          value: "http://localhost:8001"
        volumeMounts:
        - name: data
          mountPath: /app/data
        - name: logs
          mountPath: /app/logs
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 40
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 20
          periodSeconds: 10
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: aitestmind-data
      - name: logs
        persistentVolumeClaim:
          claimName: aitestmind-logs

---
apiVersion: v1
kind: Service
metadata:
  name: aitestmind
  namespace: aitestmind
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 3000
    name: frontend
  - port: 8001
    targetPort: 8001
    name: executor
  selector:
    app: aitestmind

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: aitestmind
  namespace: aitestmind
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - aitestmind.yourdomain.com
    secretName: aitestmind-tls
  rules:
  - host: aitestmind.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: aitestmind
            port:
              number: 80
```

部署到 Kubernetes:

```bash
kubectl apply -f aitestmind-deployment.yaml
```

---

## 📦 镜像仓库

### GitHub Container Registry (推荐)

```bash
# 公开镜像（无需登录）
docker pull ghcr.io/bobby-sheng/aitestmind-all-in-one:latest

# 私有镜像（需要登录）
echo $GITHUB_TOKEN | docker login ghcr.io -u bobby-sheng --password-stdin
docker pull ghcr.io/bobby-sheng/aitestmind-all-in-one:latest
```

**镜像地址**: https://github.com/bobby-sheng?tab=packages

### Docker Hub

```bash
# 拉取镜像
docker pull bobby-sheng/aitestmind-all-in-one:latest

# 指定版本
docker pull bobby-sheng/aitestmind-all-in-one:1.0.0
```

**镜像地址**: https://hub.docker.com/r/bobby-sheng/aitestmind-all-in-one

### 镜像标签

| 标签 | 说明 | 示例 |
|------|------|------|
| `latest` | 最新稳定版本 | `aitestmind-all-in-one:latest` |
| `v1.0.0` | 指定版本 | `aitestmind-all-in-one:v1.0.0` |
| `main` | 主分支最新构建 | `aitestmind-all-in-one:main` |
| `develop` | 开发分支最新构建 | `aitestmind-all-in-one:develop` |

---

## ⚙️ 环境配置

### 必需环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `DATABASE_URL` | 数据库路径 | `file:/app/prisma/dev.db` |
| `EXECUTOR_URL` | 执行器地址 | `http://localhost:8001` |

### 可选环境变量 - AI 配置

#### OpenAI

```bash
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
```

#### DeepSeek（深度求索）

```bash
DEEPSEEK_API_KEY=sk-your-api-key
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

#### Claude (Anthropic)

```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key
```

#### 百度文心一言

```bash
BAIDU_API_KEY=your-api-key
BAIDU_SECRET_KEY=your-secret-key
```

#### 阿里通义千问

```bash
DASHSCOPE_API_KEY=sk-your-api-key
```

#### Ollama（本地部署）

```bash
OLLAMA_BASE_URL=http://localhost:11434
```

### 使用 .env 文件

创建 `.env` 文件：

```bash
NODE_ENV=production
DATABASE_URL=file:/app/prisma/dev.db
EXECUTOR_URL=http://localhost:8001

# AI 配置
OPENAI_API_KEY=sk-your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
```

使用 Docker Compose:

```bash
docker-compose --env-file .env up -d
```

---

## 💾 数据持久化

### 目录结构

```
./
├── data/              # 数据库文件
│   └── dev.db        # SQLite 数据库
└── logs/             # 应用日志
    ├── 2024-01-01-nextjs-api.log
    └── 2024-01-01-executor.log
```

### 备份数据库

```bash
# 备份
docker exec aitestmind cp /app/prisma/dev.db /app/prisma/dev.db.backup
docker cp aitestmind:/app/prisma/dev.db.backup ./backup-$(date +%Y%m%d).db

# 恢复
docker cp ./backup-20240101.db aitestmind:/app/prisma/dev.db
docker restart aitestmind
```

### 使用外部数据库（PostgreSQL/MySQL）

修改 `DATABASE_URL`:

```bash
# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/aitestmind"

# MySQL
DATABASE_URL="mysql://user:password@localhost:3306/aitestmind"
```

---

## 🏥 健康检查

### 前端服务

```bash
curl http://localhost:3000/api/health

# 响应
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "aitestmind-frontend",
  "database": "connected"
}
```

### 执行器服务

```bash
curl http://localhost:8001/health

# 响应
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000000"
}
```

### 容器健康状态

```bash
docker ps
# STATUS 列应显示: Up X minutes (healthy)
```

---

## 🔧 故障排查

### 查看日志

```bash
# Docker Compose
docker-compose logs -f

# Docker
docker logs -f aitestmind

# 只看错误
docker logs aitestmind 2>&1 | grep ERROR
```

### 常见问题

#### 1. 端口已被占用

**错误**: `Bind for 0.0.0.0:3000 failed: port is already allocated`

**解决**:

```bash
# 修改端口映射
docker run -p 8080:3000 -p 8002:8001 ...
```

#### 2. 数据库文件权限问题

**错误**: `SQLITE_CANTOPEN: unable to open database file`

**解决**:

```bash
# 确保目录存在且有写权限
mkdir -p ./data ./logs
chmod -R 777 ./data ./logs
```

#### 3. 容器启动失败

**检查**:

```bash
# 查看详细日志
docker logs aitestmind

# 进入容器调试
docker exec -it aitestmind /bin/bash
```

#### 4. AI 功能不可用

**检查 API Key**:

```bash
# 验证环境变量
docker exec aitestmind env | grep API_KEY
```

---

## 🔄 更新部署

### 拉取最新镜像

```bash
# Docker Compose
docker-compose pull
docker-compose up -d

# Docker
docker pull ghcr.io/bobby-sheng/aitestmind-all-in-one:latest
docker stop aitestmind
docker rm aitestmind
# 重新运行容器...
```

### 回滚到旧版本

```bash
# 使用指定版本标签
docker run ... ghcr.io/bobby-sheng/aitestmind-all-in-one:v1.0.0
```

---

## 🌐 反向代理配置

### Nginx

```nginx
server {
    listen 80;
    server_name aitestmind.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/executor {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host; 
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Traefik

```yaml
version: '3.8'

services:
  aitestmind:
    image: ghcr.io/bobby-sheng/aitestmind-all-in-one:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.aitestmind.rule=Host(`aitestmind.yourdomain.com`)"
      - "traefik.http.routers.aitestmind.entrypoints=websecure"
      - "traefik.http.routers.aitestmind.tls.certresolver=letsencrypt"
      - "traefik.http.services.aitestmind.loadbalancer.server.port=3000"
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
```

---

## 📊 监控和日志

### 日志收集

```yaml
# docker-compose.yml with logging
services:
  aitestmind:
    # ...
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Prometheus 监控

添加健康检查到 Prometheus 配置:

```yaml
scrape_configs:
  - job_name: 'aitestmind'
    metrics_path: '/api/health'
    static_configs:
      - targets: ['localhost:3000']
```

---

## 🔐 安全建议

1. **使用 HTTPS**: 在生产环境中始终使用 HTTPS
2. **限制端口暴露**: 只暴露必要的端口
3. **定期更新**: 及时更新到最新版本
4. **备份数据**: 定期备份数据库
5. **使用强密码**: 为管理员账户设置强密码
6. **API Key 安全**: 不要在代码中硬编码 API Key

---

## 📞 获取帮助

- 📖 文档: [docs/README.md](README.md)
- 🐛 问题反馈: [GitHub Issues](https://github.com/bobby-sheng/aitestmind/issues)
- 💬 社区讨论: [discord](https://discord.gg/Kys4DcgNeC)

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

