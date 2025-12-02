# 执行器 URL 配置指南

## 问题描述

在服务器部署时，如果前端代码中硬编码了 `http://localhost:8001`，浏览器会尝试访问用户本地的 8001 端口，而不是服务器上的执行器服务，导致 "Failed to fetch" 错误。

## 解决方案

使用 `NEXT_PUBLIC_EXECUTOR_URL` 参数配置浏览器访问执行器的地址。

> **⚠️ 重要提示**
> 
> `NEXT_PUBLIC_EXECUTOR_URL` 是 Next.js 的**构建时变量**，必须在 **Docker 构建时** 通过 `--build-arg` 传入，**运行时设置无效**！

## Docker 部署（推荐方式）

```bash
# 构建镜像时传入 NEXT_PUBLIC_EXECUTOR_URL
docker build -f Dockerfile.all-in-one \
  --build-arg NEXT_PUBLIC_EXECUTOR_URL=http://YOUR_SERVER_IP:8001 \
  -t aitestmind:latest .

# 运行容器
docker run -d \
  --name aitestmind \
  -p 3000:3000 \
  -p 8001:8001 \
  -e DATABASE_URL=file:/app/prisma/dev.db \
  -v $(pwd)/logs:/app/logs \
  aitestmind:latest
```

## 参数说明

### NEXT_PUBLIC_EXECUTOR_URL

**用途**: 浏览器端（客户端）访问执行器服务的 URL  
**必需**: 在服务器部署时必须配置  
**传入方式**: Docker 构建时通过 `--build-arg` 传入  
**前缀**: `NEXT_PUBLIC_` 表示这个变量会暴露给浏览器

| 部署场景 | 配置值示例 | 说明 |
|----------|-----------|------|
| 本地开发 | `http://localhost:8001` | 浏览器和服务在同一台机器 |
| Docker 本地测试 | `http://localhost:8001` | 端口已映射到宿主机 |
| 内网服务器 | `http://192.168.1.100:8001` | 使用服务器内网 IP |
| 公网服务器 | `http://your-public-ip:8001` | 使用服务器公网 IP |
| 使用域名 | `https://api.yourdomain.com` | 通过域名访问 |

> **📝 说明**
> - 执行器服务绑定到 `0.0.0.0:8001`，允许所有 IP 访问
> - `NEXT_PUBLIC_EXECUTOR_URL` 是**浏览器访问**的地址，不是服务绑定地址
> - 浏览器需要能访问到这个地址，所以不能用容器内部地址

## 配置示例

### 开发环境 (.env.local)

```bash
# 浏览器和服务端都访问本地 8001 端口
NEXT_PUBLIC_EXECUTOR_URL=http://localhost:8001
EXECUTOR_URL=http://localhost:8001
```

### 生产环境 - 同一服务器部署

如果 Next.js 应用和执行器服务部署在同一台服务器：

```bash
# 浏览器访问公网 IP 或域名
NEXT_PUBLIC_EXECUTOR_URL=http://your-server-ip:8001

# 服务端可以访问本地（更快）
EXECUTOR_URL=http://localhost:8001
```

或者使用域名：

```bash
NEXT_PUBLIC_EXECUTOR_URL=https://api.yourdomain.com/executor
EXECUTOR_URL=http://localhost:8001
```

### 生产环境 - 分离部署

如果 Next.js 应用和执行器服务部署在不同服务器：

```bash
# 都访问执行器服务器的公网地址
NEXT_PUBLIC_EXECUTOR_URL=http://executor-server-ip:8001
EXECUTOR_URL=http://executor-server-ip:8001
```

### Docker 部署

使用 Docker Compose 时，可以使用服务名：

```bash
# 浏览器访问宿主机 IP
NEXT_PUBLIC_EXECUTOR_URL=http://your-host-ip:8001

# 服务端使用 Docker 网络内的服务名
EXECUTOR_URL=http://executor:8001
```

## 部署步骤

### 1. 复制环境变量文件

```bash
cp env.example .env
```

### 2. 编辑 .env 文件

根据你的部署环境，修改以下配置：

```bash
# 修改为你的服务器地址
NEXT_PUBLIC_EXECUTOR_URL=http://your-server-ip:8001
```

### 3. 重启服务

修改环境变量后需要重启服务才能生效：

```bash
# 如果使用 npm
npm run build
npm run start

# 如果使用 Docker
docker-compose down
docker-compose up -d

# 如果使用 PM2
pm2 restart all
```

## 验证配置

### 1. 检查环境变量是否加载

在浏览器控制台查看执行器 URL：

```javascript
// 打开浏览器开发者工具 Console
console.log('Executor URL:', process.env.NEXT_PUBLIC_EXECUTOR_URL || 'http://localhost:8001')
```

### 2. 测试连接

启动一个测试用例，查看浏览器控制台的日志：

```
[SSE] 连接地址: http://your-server-ip:8001/api/execute/stream
```

确认地址是否正确。

### 3. 检查网络连接

在浏览器中直接访问执行器 API 文档：

```
http://your-server-ip:8001/docs
```

如果能打开，说明网络连接正常。

## 常见问题

### Q1: 修改了 .env 但不生效？

**原因**: Next.js 在构建时会打包环境变量，运行时修改需要重新构建。

**解决**:
```bash
npm run build
npm run start
```

### Q2: 浏览器显示 CORS 错误？

**原因**: 执行器服务未配置 CORS 允许前端访问。

**解决**: 检查 `executor/main.py` 中的 CORS 配置：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境建议指定具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Q3: 服务端调用执行器失败？

**原因**: `EXECUTOR_URL` 配置错误，或执行器服务未启动。

**检查步骤**:
1. 确认执行器服务是否运行：`curl http://localhost:8001/docs`
2. 检查 `EXECUTOR_URL` 配置是否正确
3. 查看 Next.js 服务日志

### Q4: Docker 部署时连接失败？

**原因**: Docker 网络配置问题。

**解决**:
1. 确保执行器服务暴露了端口：
```yaml
executor:
  ports:
    - "8001:8001"
```

2. 浏览器访问使用宿主机 IP，不要用容器名：
```bash
NEXT_PUBLIC_EXECUTOR_URL=http://宿主机IP:8001
```

3. 服务端可以使用容器名（Docker 网络内部）：
```bash
EXECUTOR_URL=http://executor:8001
```

### Q5: Nginx 反向代理配置？

如果使用 Nginx 作为反向代理：

```nginx
# /etc/nginx/sites-available/aitesthandle

# 前端应用
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

# 执行器 API
location /executor/ {
    proxy_pass http://localhost:8001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # SSE 支持
    proxy_buffering off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

对应的环境变量配置：

```bash
NEXT_PUBLIC_EXECUTOR_URL=https://yourdomain.com/executor
EXECUTOR_URL=http://localhost:8001
```

## 架构说明

```
┌─────────────────┐
│   浏览器        │
│  (Browser)      │
└────────┬────────┘
         │ NEXT_PUBLIC_EXECUTOR_URL
         │ (http://server-ip:8001)
         ▼
┌─────────────────┐
│  Executor API   │  ◄─── EXECUTOR_URL (http://localhost:8001)
│  (Python)       │  ◄─── 从 Next.js API 路由调用
│  Port: 8001     │
└─────────────────┘
         ▲
         │
┌────────┴────────┐
│   Next.js       │
│   API Routes    │
│   Port: 3000    │
└─────────────────┘
```

## 安全建议

1. **生产环境不要使用 `*` 作为 CORS 来源**
   ```python
   allow_origins=["https://yourdomain.com"]
   ```

2. **使用 HTTPS**
   ```bash
   NEXT_PUBLIC_EXECUTOR_URL=https://api.yourdomain.com
   ```

3. **限制执行器端口访问**
   - 使用防火墙规则限制 8001 端口只能从 Next.js 服务器访问
   - 或者使用 Nginx 反向代理，不直接暴露 8001 端口

4. **使用环境变量管理工具**
   - 生产环境使用 Secrets Manager（如 AWS Secrets Manager, Vault）
   - 不要在代码中提交 .env 文件

## 相关文件

- `lib/config.ts` - 配置管理
- `env.example` - 环境变量示例
- `components/test-orchestration/ExecutionLogPanel.tsx` - 客户端调用
- `app/api/test-suites/[id]/execute/route.ts` - 服务端调用

## 技术支持

如果遇到问题，请：

1. 查看浏览器控制台日志
2. 查看 Next.js 服务日志
3. 查看执行器服务日志：`tail -f logs/$(date +%Y-%m-%d)-executor.log`
4. 在 GitHub Issues 中提问

