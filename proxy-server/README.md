# mitmproxy 捕获脚本

基于 mitmproxy 的 HTTP/HTTPS 流量捕获脚本，由 Next.js 应用直接管理。

## 🌟 核心特性

✅ **完整的 HTTPS 支持** - 通过 MITM 证书拦截 HTTPS 请求  
✅ **实时数据采集** - 支持暂停/继续/停止  
✅ **标准 HAR 格式** - 生成标准 HAR 数据  
✅ **Next.js 集成** - 无需单独管理进程  
✅ **SSE 实时推送** - 前端实时显示捕获的请求  

## 📋 系统要求

- Python 3.8+
- pip (Python 包管理器)
- 支持的操作系统：macOS, Linux, Windows

## 🚀 快速开始

### 1. 安装 Python 依赖

```bash
cd proxy-server

# 使用安装脚本（推荐）
./start_mitm_server.sh

# 或手动安装
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 或 venv\Scripts\activate  # Windows
pip install -r requirements.txt
```

### 2. 在 Web 界面启动

```bash
# 1. 启动 Next.js 应用
npm run dev

# 2. 访问 API 采集页面
http://localhost:3000/api-capture

# 3. 选择 "mitmproxy 代理录制" 模式

# 4. 点击 "启动 mitmproxy 录制"
```

启动成功后：
- **代理端口**: `8899` (默认)
- **证书路径**: `~/.mitmproxy/mitmproxy-ca-cert.pem`
- **Web 界面**: `http://localhost:3000/api-capture`

### 3. 安装 HTTPS 证书（首次使用）

mitmproxy 需要安装 CA 证书才能拦截 HTTPS 请求。

#### macOS

```bash
# 1. 打开钥匙串访问
open ~/.mitmproxy/mitmproxy-ca-cert.pem

# 2. 双击证书导入到"登录"钥匙串
# 3. 右键点击证书 → 显示简介 → 信任 → 设置为"始终信任"
```

#### Linux

```bash
# Ubuntu/Debian
sudo cp ~/.mitmproxy/mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitmproxy.crt
sudo update-ca-certificates

# CentOS/RHEL
sudo cp ~/.mitmproxy/mitmproxy-ca-cert.pem /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust
```

#### Windows

```bash
# 1. 双击证书文件
# 2. 安装到"受信任的根证书颁发机构"
# 3. 重启浏览器
```

#### 浏览器内安装（推荐）

1. 启动 mitmproxy 代理后
2. 配置浏览器代理为 `localhost:8899`
3. 访问 `http://mitm.it`
4. 根据浏览器类型选择并安装证书

### 4. 配置浏览器代理

配置浏览器使用代理：`localhost:8899`

参考：[代理配置指南](../docs/PROXY_MODE_USER_GUIDE.md)

### 5. 配置系统代理

**macOS:**
```bash
系统设置 → 网络 → Wi-Fi/以太网 → 详情 → 代理
勾选 "网页代理(HTTP)" 和 "安全网页代理(HTTPS)"
服务器: localhost  端口: 8899
```

**Windows:**
```bash
设置 → 网络和Internet → 代理 → 手动设置代理
地址: localhost  端口: 8899
```

**移动设备:**
```bash
# iOS/Android
Wi-Fi 设置 → 配置代理 → 手动
服务器: 你的电脑IP  端口: 8899
```

### 6. 开始捕获流量

访问任何网站或启动 APP，Web 界面会实时显示所有捕获的请求。

## 🏗️ 架构说明

```
┌──────────────────────┐
│  Next.js 应用        │
│  (端口 3000)         │
│  ┌────────────────┐  │
│  │ Web UI         │  │
│  └────────┬───────┘  │
│           │          │
│  ┌────────▼───────┐  │
│  │ API Routes     │  │
│  │ /api/mitm/*    │  │
│  └────────┬───────┘  │
│           │          │
│  ┌────────▼────────┐ │
│  │ mitmproxy       │ │
│  │ Manager         │ │ ← lib/mitmproxy-manager.ts
│  └────────┬────────┘ │
└───────────┼──────────┘
            │ spawn/管理子进程
            ▼
┌──────────────────────┐
│  mitmdump 进程       │
│  (端口 8899)         │
│  ┌────────────────┐  │
│  │ mitmproxy      │  │
│  │ Addon          │  │ ← mitmproxy_recorder.py
│  └────────┬───────┘  │
└───────────┼──────────┘
            │ 拦截流量
            ▼
┌──────────────────────┐
│  浏览器/APP 流量     │
│  HTTP/HTTPS          │
└──────────────────────┘
            │
            │ 实时数据
            ▼
┌──────────────────────┐
│  临时 JSON 文件      │
│  mitm_capture_temp   │ ← 进程间通信
└───────────┬──────────┘
            │ 文件监听 (chokidar)
            ▼
┌──────────────────────┐
│  SSE 推送到前端      │
│  实时显示请求        │
└──────────────────────┘
```

### 组件说明

1. **mitmproxy_recorder.py**
   - mitmproxy Addon（插件）
   - 拦截和记录 HTTP/HTTPS 请求
   - 生成 HAR 格式数据
   - 支持暂停/继续（通过标记文件）
   - 写入临时 JSON 文件

2. **lib/mitmproxy-manager.ts**
   - Next.js 进程管理器
   - 使用 `child_process.spawn` 管理 mitmdump
   - 文件监听实现 SSE 推送
   - 孤儿进程检测和恢复

3. **start_mitm_server.sh**
   - 环境安装脚本
   - 创建虚拟环境
   - 安装 Python 依赖
   - 检查 mitmproxy 证书

## 🔧 配置选项

### 自定义端口

编辑 `lib/mitmproxy-manager.ts`：

```typescript
// 默认端口
private port = 8899;

// 启动时指定端口
const result = await mitmManager.start({ port: 9000 });
```

### 过滤规则

编辑 `mitmproxy_recorder.py`：

```python
def request(self, flow: http.HTTPFlow):
    """自定义过滤逻辑"""
    
    # 只捕获特定域名
    if 'api.example.com' not in flow.request.pretty_host:
        return
    
    # 排除静态资源
    if flow.request.path.endswith(('.png', '.jpg', '.css')):
        return
    
    # ... 其他逻辑
```

## 📝 使用示例

### 完整使用流程

```bash
# 1. 安装依赖（首次使用）
cd proxy-server
./start_mitm_server.sh

# 2. 启动 Next.js 应用
cd ..
npm run dev

# 3. Web 界面操作
# 访问 http://localhost:3000/api-capture
# 点击 "启动 mitmproxy 录制"

# 4. 配置系统代理
# macOS: 系统设置 → 网络 → 代理 → localhost:8899
# Windows: 设置 → 网络 → 代理 → localhost:8899

# 5. 安装证书（首次使用）
# 访问 http://mitm.it
# 下载并信任证书

# 6. 开始捕获
# 访问任何网站，Web 界面实时显示请求
```

### 命令行测试代理

```bash
# 配置代理环境变量
export http_proxy=http://localhost:8899
export https_proxy=http://localhost:8899

# 测试 HTTP 请求
curl http://httpbin.org/get

# 测试 HTTPS 请求（需先安装证书）
curl https://api.github.com/users/github

# 取消代理
unset http_proxy https_proxy
```

## 🌐 远程部署场景（重要）

### 部署架构说明

如果您的 mitmproxy 部署在**远程服务器**上，而浏览器在**本地电脑**使用，证书安装位置需要特别注意！

```
本地电脑（浏览器）
      ↓ 代理请求（HTTP CONNECT）
远程服务器（mitmproxy）→ 拦截并解密 HTTPS → 互联网
      ↓ 返回加密响应
本地电脑（浏览器）← 解密并显示内容
```

### ✅ 关键点：证书必须安装在本地电脑！

**原因**：
- 浏览器运行在**本地电脑**
- TLS 握手发生在 **本地浏览器 ↔ 远程 mitmproxy** 之间
- 浏览器需要信任 mitmproxy 的 CA 证书才能完成握手

### 📦 完整部署步骤

#### 步骤 1：服务器端启动 mitmproxy（允许外部连接）

```bash
# 在远程服务器上执行
cd /path/to/proxy-server
source venv/bin/activate

# 重要：使用 0.0.0.0 监听所有网卡（允许外部访问）
mitmdump -s mitmproxy_recorder.py --listen-host 0.0.0.0 --listen-port 8899

# 或通过 Web 界面启动（需要修改配置监听 0.0.0.0）
```

#### 步骤 2：配置服务器防火墙

```bash
# Ubuntu/Debian
sudo ufw allow 8899/tcp

# 或使用 iptables
sudo iptables -I INPUT -p tcp --dport 8899 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4

# 检查端口是否开放
netstat -tlnp | grep 8899
```

#### 步骤 3：从服务器下载证书到本地

**方法 A：使用 SCP（推荐）**

```bash
# 在本地电脑执行，替换 SERVER_IP 为您的服务器地址
SERVER_IP="192.168.30.97"  # 或域名如 jira.sky-cloud.net
scp root@${SERVER_IP}:~/.mitmproxy/mitmproxy-ca-cert.pem ~/Downloads/
```

**方法 B：使用 HTTP 下载**

```bash
# 在服务器上临时启动文件服务器
cd ~/.mitmproxy
python3 -m http.server 8888

# 在本地浏览器访问下载（注意：HTTP 不安全，下载后立即停止服务器）
# http://192.168.30.97:8888/mitmproxy-ca-cert.pem
```

**方法 C：使用 mitm.it（最简单）**

配置好代理后，直接访问 `http://mitm.it` 会自动检测并提供证书下载！

#### 步骤 4：在本地电脑安装证书

根据您本地电脑的操作系统选择：

##### 🍎 macOS 本地

```bash
# 方法 1：图形界面（推荐）
open ~/Downloads/mitmproxy-ca-cert.pem

# 系统会打开"钥匙串访问"
# 1. 证书会被导入到"登录"钥匙串
# 2. 找到名为 "mitmproxy" 的证书
# 3. 双击 → 信任 → 使用此证书时：始终信任

# 方法 2：命令行（需要管理员密码）
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  ~/Downloads/mitmproxy-ca-cert.pem
```

##### 🪟 Windows 本地

**图形界面方式**：
1. 双击 `mitmproxy-ca-cert.pem` 文件
2. 点击 "安装证书"
3. 选择 "本地计算机"（需要管理员权限）
4. 选择 "将所有证书放入下列存储"
5. 点击 "浏览" → 选择 "受信任的根证书颁发机构"
6. 完成安装
7. **重启浏览器**

**命令行方式**（管理员权限）：
```powershell
certutil -addstore "ROOT" C:\Users\YourName\Downloads\mitmproxy-ca-cert.pem
```

##### 🐧 Linux 本地

**系统级证书（适用于 curl、wget 等命令行工具）**：

```bash
# Ubuntu/Debian
sudo cp ~/Downloads/mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitmproxy.crt
sudo update-ca-certificates

# 验证安装
ls -la /etc/ssl/certs/ | grep mitmproxy
```

**浏览器证书（Chrome/Chromium）**：

```bash
# 安装工具
sudo apt-get install libnss3-tools

# 创建证书数据库（如果不存在）
mkdir -p $HOME/.pki/nssdb
certutil -N -d sql:$HOME/.pki/nssdb --empty-password

# 导入证书
certutil -d sql:$HOME/.pki/nssdb -A -t "C,," -n "mitmproxy" \
  -i ~/Downloads/mitmproxy-ca-cert.pem

# 验证
certutil -d sql:$HOME/.pki/nssdb -L | grep mitmproxy
```

**Firefox 浏览器**：

```bash
# 找到 Firefox 配置目录
FIREFOX_PROFILE=$(find ~/.mozilla/firefox -maxdepth 1 -name "*.default-release" | head -n 1)

# 导入证书
certutil -d "$FIREFOX_PROFILE" -A -t "C,," -n "mitmproxy" \
  -i ~/Downloads/mitmproxy-ca-cert.pem

# 或者在 Firefox 中手动导入：
# 设置 → 隐私与安全 → 证书 → 查看证书 → 证书机构 → 导入
```

#### 步骤 5：配置本地浏览器代理

**注意**：代理地址指向**远程服务器**！

```
HTTP Proxy:  192.168.30.97:8899
HTTPS Proxy: 192.168.30.97:8899
```

**Chrome 启动方式**：

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --proxy-server="http://192.168.30.97:8899"

# Linux
google-chrome --proxy-server="http://192.168.30.97:8899"

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --proxy-server="http://192.168.30.97:8899"
```

**推荐：使用代理插件（SwitchyOmega）**

1. 安装 [Proxy SwitchyOmega](https://chrome.google.com/webstore/detail/proxy-switchyomega/padekgcemlokbadohgkifijomclgjgif)
2. 新建情景模式 → 选择 "代理服务器"
3. 配置：
   - 协议：HTTP
   - 地址：192.168.30.97
   - 端口：8899
4. 应用选项并切换到该模式

#### 步骤 6：测试验证

##### 测试 1：访问 mitm.it

```bash
# 配置好代理后，在本地浏览器访问
http://mitm.it
```

如果显示 mitmproxy 的证书下载页面，说明代理连接成功！

##### 测试 2：访问 HTTPS 网站

```bash
# 访问任意 HTTPS 网站
https://www.baidu.com
https://api.github.com
```

- ✅ **如果正常显示**：证书安装成功！
- ❌ **如果显示证书错误**：证书未正确安装或未信任

##### 测试 3：命令行测试（可选）

```bash
# 在本地电脑执行
export http_proxy=http://192.168.30.97:8899
export https_proxy=http://192.168.30.97:8899

# 测试 HTTPS 请求
curl https://httpbin.org/get -v

# 应该看到：
# * SSL connection using TLSv1.3 / TLS_AES_256_GCM_SHA384
# * SSL certificate verify ok.
```

### 🔧 快速诊断脚本

**服务器端检查**：

```bash
#!/bin/bash
echo "🔍 检查 mitmproxy 服务器状态..."

# 检查进程
if pgrep -f mitmdump > /dev/null; then
    echo "✅ mitmproxy 进程正在运行"
else
    echo "❌ mitmproxy 进程未运行"
fi

# 检查端口
if netstat -tlnp 2>/dev/null | grep -q ":8899"; then
    echo "✅ 端口 8899 正在监听"
    netstat -tlnp | grep 8899
else
    echo "❌ 端口 8899 未监听"
fi

# 检查防火墙
if command -v ufw &> /dev/null; then
    if sudo ufw status | grep -q "8899.*ALLOW"; then
        echo "✅ 防火墙已允许端口 8899"
    else
        echo "⚠️ 防火墙可能未开放端口 8899"
        echo "执行: sudo ufw allow 8899/tcp"
    fi
fi

# 测试本地访问
if curl -s -x http://localhost:8899 http://httpbin.org/get > /dev/null; then
    echo "✅ 本地代理测试成功"
else
    echo "❌ 本地代理测试失败"
fi
```

**本地端检查**：

```bash
#!/bin/bash
SERVER_IP="192.168.30.97"  # 修改为您的服务器 IP
PROXY="http://${SERVER_IP}:8899"

echo "🔍 检查本地到远程代理的连接..."

# 检查网络连通性
if ping -c 1 $SERVER_IP &> /dev/null; then
    echo "✅ 服务器网络可达"
else
    echo "❌ 服务器网络不可达"
    exit 1
fi

# 检查代理端口
if nc -zv $SERVER_IP 8899 2>&1 | grep -q "succeeded"; then
    echo "✅ 代理端口 8899 可访问"
else
    echo "❌ 代理端口 8899 不可访问"
    exit 1
fi

# 检查证书是否安装
if [ -f ~/Downloads/mitmproxy-ca-cert.pem ]; then
    echo "✅ 证书文件已下载"
else
    echo "⚠️ 证书文件未下载"
    echo "执行: scp root@${SERVER_IP}:~/.mitmproxy/mitmproxy-ca-cert.pem ~/Downloads/"
fi

# 测试 HTTP 代理
if curl -s -x $PROXY http://httpbin.org/get > /dev/null; then
    echo "✅ HTTP 代理测试成功"
else
    echo "❌ HTTP 代理测试失败"
fi

# 测试 HTTPS 代理
if curl -s -x $PROXY https://httpbin.org/get > /dev/null 2>&1; then
    echo "✅ HTTPS 代理测试成功（证书已正确安装）"
else
    echo "⚠️ HTTPS 代理测试失败（证书可能未安装或未信任）"
fi
```

### 📋 常见错误与解决

#### 错误 1：NET::ERR_CERT_AUTHORITY_INVALID

**原因**：浏览器不信任 mitmproxy 的 CA 证书

**解决**：
1. 确认证书已下载到本地
2. 按照上面的步骤重新安装证书到**本地系统**
3. **必须重启浏览器**
4. 清除浏览器缓存和 SSL 状态

#### 错误 2：HTTP/2 502（mitmproxy 返回）

**原因**：服务器端 mitmproxy 无法访问目标网站

**解决**：
```bash
# 在服务器上测试
curl https://www.baidu.com -v

# 如果失败，检查服务器网络：
# 1. DNS 解析
nslookup www.baidu.com

# 2. 防火墙出站规则
sudo iptables -L OUTPUT -n -v

# 3. 重启 mitmproxy 并添加 --ssl-insecure
mitmdump -s mitmproxy_recorder.py --listen-host 0.0.0.0 --listen-port 8899 --ssl-insecure
```

#### 错误 3：连接被拒绝（Connection Refused）

**原因**：服务器防火墙阻止或端口未监听外部连接

**解决**：
```bash
# 确保 mitmproxy 监听 0.0.0.0（不是 127.0.0.1）
netstat -tlnp | grep 8899
# 应该显示 0.0.0.0:8899 而不是 127.0.0.1:8899

# 开放防火墙
sudo ufw allow 8899/tcp
```

### 🔐 安全加固建议

如果在公网部署，建议：

1. **使用 SSH 隧道代替直接暴露端口**：

```bash
# 在本地电脑执行（推荐）
ssh -N -L 8899:localhost:8899 root@192.168.30.97

# 然后本地浏览器配置代理为 localhost:8899
# 流量通过加密的 SSH 隧道传输到服务器
```

2. **使用 VPN**：
   - 仅在 VPN 网络内访问 mitmproxy 端口

3. **IP 白名单**：
```bash
# 仅允许特定 IP 访问
sudo ufw allow from YOUR_LOCAL_IP to any port 8899
```

---

## 🐛 常见问题

### Q1: mitmproxy 启动失败

**错误**: `mitmproxy not found`

**解决**:
```bash
pip install mitmproxy
# 或
pip install -r requirements.txt
```

### Q2: 无法拦截 HTTPS 请求

**原因**: 证书未安装或未信任

**解决**:
1. 检查证书路径: `ls ~/.mitmproxy/`
2. 重新安装证书（参考上面的安装步骤）
3. 重启浏览器
4. 访问 `http://mitm.it` 验证

### Q3: 端口被占用

**错误**: `Address already in use`

**解决**:
```bash
# 查看占用端口的进程
lsof -i :8899

# 杀死孤儿进程
kill -9 <PID>

# 或在 Web 界面点击 "停止录制"
# 系统会自动清理进程
```

### Q4: Python 环境问题

**错误**: `ModuleNotFoundError`

**解决**:
```bash
# 确保使用虚拟环境
source venv/bin/activate

# 重新安装依赖
pip install -r requirements.txt

# 检查 Python 版本
python --version  # 需要 3.8+
```

### Q5: 前端显示"未录制"但后台在采集

**原因**: 孤儿进程问题

**解决**:
```bash
# 刷新页面，系统会自动恢复会话
# 或手动停止孤儿进程
lsof -i :8899 | grep LISTEN
kill -9 <PID>
```

## 🔒 安全注意事项

1. **不要在生产环境使用**
   - mitmproxy 可以看到所有明文流量
   - 仅用于开发和测试

2. **保护证书文件**
   - 不要泄露 `~/.mitmproxy/` 目录
   - 定期更换证书

3. **限制访问**
   - 使用防火墙限制端口访问
   - 不要暴露到公网

4. **清理数据**
   - 及时删除捕获的敏感数据
   - 不要提交 HAR 文件到代码库

## 📚 相关文档

- [mitmproxy 官方文档](https://docs.mitmproxy.org/)
- [HAR 1.2 规范](http://www.softwareishard.com/blog/har-12-spec/)
- [API 采集完整指南](../docs/user-guide/05_API_CAPTURE.md)
- [项目主 README](../README.md)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

## 🔄 架构演进

**v2.0 (当前版本)** - Next.js 直接管理
- ✅ 移除 Flask API 服务器
- ✅ Next.js 直接 spawn 管理 mitmdump
- ✅ 文件监听 + SSE 实时推送
- ✅ 孤儿进程自动检测和恢复

**v1.0 (已废弃)** - Flask 中间层
- ❌ 需要单独启动 Flask 服务
- ❌ 进程间通信复杂
- ❌ 无法自动恢复孤儿进程

---

**最后更新**: 2025-12-01  
**版本**: 2.0.0  
**架构**: Next.js 集成

