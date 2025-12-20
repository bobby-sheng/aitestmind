# Ollama 本地部署配置指南

## 📖 简介

Ollama 是一个开源的大型语言模型运行工具，支持在本地运行 Llama、Qwen、Mistral 等多种开源模型，**完全免费且数据完全私密**。

## ✨ 优势

- ✅ **完全免费**：无需 API Key，无使用限制
- ✅ **数据私密**：所有数据在本地处理，不会上传到云端
- ✅ **离线可用**：无需网络连接即可使用
- ✅ **模型丰富**：支持多种开源大模型
- ✅ **API 兼容**：兼容 OpenAI API 格式

## 🚀 快速开始

### 1. 安装 Ollama

#### macOS / Linux

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

#### Windows

访问 [ollama.ai](https://ollama.ai) 下载 Windows 安装包。

#### Docker

```bash
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

### 2. 下载模型

安装完成后，下载你想使用的模型：

#### 推荐模型

```bash
# Qwen 2.5（阿里通义千问，中文效果好）
ollama pull qwen2.5:7b
ollama pull qwen2.5:14b
ollama pull qwen2.5-coder:7b  # 代码专用

# Llama（Meta 开源模型）
ollama pull llama3.1:8b
ollama pull llama3.1:70b

# Mistral（轻量高效）
ollama pull mistral:7b

# DeepSeek Coder（代码生成专用）
ollama pull deepseek-coder:6.7b
```

查看所有可用模型：
```bash
ollama list
```

### 3. 启动 Ollama 服务

```bash
ollama serve
```

默认监听在 `http://localhost:11434`

### 4. 在平台中配置

访问 **设置页面**，在 **AI 配置** 部分：

1. **AI 服务提供商**：选择 `Ollama 本地模型`
2. **AI 模型**：输入你下载的模型名称，如：
   - `qwen2.5:7b`
   - `qwen2.5-coder:7b`
   - `llama3.1:8b`
   - `mistral:7b`
3. **API Key**：填写任意值（如：`ollama`）
4. **API Base URL**：
   - 本地运行：`http://localhost:11434/v1`
   - Docker 运行：`http://host.docker.internal:11434/v1`（macOS/Windows）
   - 远程服务器：`http://your-server-ip:11434/v1`

### 5. 测试连接

点击 **测试连接** 按钮，确认配置正确。

## 🔧 常见问题

### Q1: 连接失败：ECONNREFUSED

**原因**：Ollama 服务未启动或端口配置错误

**解决方案**：
```bash
# 检查 Ollama 是否运行
ps aux | grep ollama

# 启动 Ollama 服务
ollama serve

# 检查端口是否监听
lsof -i :11434
```

### Q2: 模型未找到

**原因**：模型名称错误或未下载

**解决方案**：
```bash
# 查看已下载的模型
ollama list

# 下载需要的模型
ollama pull qwen2.5:7b
```

### Q3: Docker 环境下连接不上

**原因**：网络隔离问题

**解决方案**：
```yaml
# docker-compose.yml
services:
  app:
    environment:
      - OLLAMA_BASE_URL=http://host.docker.internal:11434/v1
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

### Q4: 响应速度慢

**原因**：模型太大或硬件性能不足

**解决方案**：
- 使用较小的模型（7B 而不是 70B）
- 确保有足够的 RAM（至少 8GB）
- 考虑使用 GPU 加速（需要 NVIDIA GPU）

### Q5: 中文效果不好

**原因**：模型对中文支持较差

**解决方案**：
- 使用 Qwen 系列模型（专为中文优化）
```bash
ollama pull qwen2.5:7b
ollama pull qwen2.5:14b
```

## 🎯 性能优化

### 1. 使用 GPU 加速

如果有 NVIDIA GPU：

```bash
# 安装 NVIDIA Docker 运行时
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama
```

### 2. 调整并发数

```bash
# 设置环境变量
export OLLAMA_NUM_PARALLEL=4
ollama serve
```

### 3. 选择合适的模型大小

| 模型大小 | 最低 RAM | 推荐 RAM | 适用场景 |
|---------|---------|---------|---------|
| 7B | 8 GB | 16 GB | 日常使用、快速响应 |
| 13-14B | 16 GB | 32 GB | 平衡性能和质量 |
| 70B | 64 GB | 128 GB | 最佳质量、服务器部署 |

## 🌐 生产环境部署

### 1. 使用 systemd（Linux）

创建服务文件：

```bash
sudo nano /etc/systemd/system/ollama.service
```

内容：

```ini
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
User=ollama
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3
Environment="OLLAMA_HOST=0.0.0.0:11434"

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
```

### 2. Nginx 反向代理

```nginx
server {
    listen 80;
    server_name ollama.yourdomain.com;

    location / {
        proxy_pass http://localhost:11434;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置（AI 响应可能较慢）
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

### 3. 安全考虑

如果暴露到公网，建议：

1. **使用 HTTPS**（配置 SSL 证书）
2. **添加认证**（Nginx Basic Auth 或 API Gateway）
3. **限制访问频率**（Nginx rate limiting）
4. **防火墙规则**（只允许特定 IP）

## 📊 模型推荐

### 代码生成和测试用例生成

| 模型 | 大小 | 特点 |
|------|------|------|
| `qwen2.5-coder:7b` | 7B | 阿里专用代码模型，中英文均佳 |
| `deepseek-coder:6.7b` | 6.7B | DeepSeek 代码专用，推理能力强 |
| `codellama:13b` | 13B | Meta 代码模型，多语言支持 |

### 通用对话和推理

| 模型 | 大小 | 特点 |
|------|------|------|
| `qwen2.5:7b` | 7B | 中文最佳，阿里通义千问 |
| `llama3.1:8b` | 8B | 英文最佳，Meta 出品 |
| `mistral:7b` | 7B | 轻量高效，响应快 |

### 多模态（图片+文本）

| 模型 | 大小 | 特点 |
|------|------|------|
| `llava:7b` | 7B | 支持图片理解 |
| `bakllava:7b` | 7B | 改进版视觉模型 |

## 🔗 相关链接

- [Ollama 官网](https://ollama.ai)
- [Ollama GitHub](https://github.com/ollama/ollama)
- [可用模型列表](https://ollama.ai/library)
- [模型评测对比](https://huggingface.co/spaces/lmsys/chatbot-arena-leaderboard)

## 💡 提示

1. **首次使用建议先下载 7B 模型**（如 `qwen2.5:7b`），测试效果后再考虑更大的模型
2. **代码生成推荐使用专用代码模型**（如 `qwen2.5-coder:7b`）
3. **中文用户强烈推荐 Qwen 系列**，效果远超其他开源模型
4. **定期更新模型**：`ollama pull <model>` 会自动更新到最新版本

---

**祝你使用愉快！** 🎉

如有问题，请在 GitHub Issues 提交反馈。

