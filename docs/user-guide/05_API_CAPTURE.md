# 🎬 API 智能采集指南

> **完整工作流第一步**：采集 API → 编排流程 → AI 生成 → 执行测试

---

## 📋 目录

- [概述](#概述)
- [三种采集模式](#三种采集模式)
  - [模式 1: Playwright 浏览器插件](#模式-1-playwright-浏览器插件推荐)
  - [模式 2: HAR 文件导入](#模式-2-har-文件导入最快)
  - [模式 3: mitmproxy 代理](#模式-3-mitmproxy-代理最专业)
- [采集后的处理](#采集后的处理)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

---

## 📖 概述

API 采集是使用 API 智能测试平台 的第一步，也是最重要的一步。通过采集，你可以：

- 📝 **自动记录** API 的完整信息（URL、参数、响应）
- 🏷️ **智能分类** API 按业务领域自动归类
- 📊 **生成 Schema** 自动识别参数类型和结构
- 💾 **保存到仓库** 后续可用于编排和 AI 生成

### 🎯 三种模式对比

| 模式 | 适用场景 | 难度 | HTTPS | 推荐度 |
|------|----------|------|-------|--------|
| 🌐 Playwright 插件 | Web 应用 | 🟢 简单 | ✅ | ⭐⭐⭐⭐⭐ |
| 📦 HAR 导入 | 已有抓包 | 🟢 简单 | ✅ | ⭐⭐⭐⭐ |
| 🔒 mitmproxy 代理 | APP/小程序 | 🟡 中等 | ✅ | ⭐⭐⭐⭐⭐ |

---

## 🌐 模式 1: Playwright 浏览器插件（推荐）

### ✨ 适用场景
- ✅ Web 应用测试
- ✅ 本地开发环境
- ✅ 快速原型验证
- ✅ 新手入门

### 🚀 快速开始

#### 1. 访问采集页面

```bash
# 在浏览器中访问 API 采集页面
http://localhost:3000/api-capture
```

#### 2. 选择 Playwright 录制模式

```
1. 在页面中选择 "Playwright 浏览器录制" 标签
2. 输入要采集的目标网站 URL（例如：http://your-app.com）
3. 点击 "开始录制" 按钮
```

这将：
- 🚀 启动一个 Chromium 浏览器窗口
- 📡 自动监听所有网络请求
- 🎯 智能过滤静态资源
- 💾 实时显示捕获的 API

#### 3. 在浏览器中操作

在打开的 Chromium 浏览器中正常使用网站，所有 API 请求会被自动捕获：
- ✅ 登录
- ✅ 创建数据
- ✅ 查询列表
- ✅ 修改数据
- ✅ 删除数据

#### 4. 保存采集结果

```
1. 在 API 采集页面实时查看捕获的请求
2. 选择需要保存的 API（可多选）
3. 点击 "保存到 API 仓库" 按钮
4. 访问 http://localhost:3000/api-repository 查看已保存的 API
```

### 🎯 高级配置

编辑 `playwright.config.ts`：

```typescript
export default {
  // 设置代理服务器
  proxy: {
    server: 'http://localhost:8080'
  },
  
  // 设置 User-Agent
  userAgent: 'My Custom UA',
  
  // 设置忽略的域名
  ignoreHTTPSErrors: true,
}
```

### 📝 实际示例

```bash
# 1. 访问采集页面
http://localhost:3000/api-capture

# 2. 配置并启动录制
选择 "Playwright 浏览器录制"
输入目标 URL: http://localhost:8080
点击 "开始录制"

# 3. 在打开的浏览器中操作
- 访问登录页面
- 输入用户名和密码，点击登录
- 创建一个订单
- 查询订单列表
- 修改订单状态
- 删除订单

# 4. 查看和保存
- 在采集页面实时看到所有捕获的 API
- 选择需要的 API
- 点击 "保存到 API 仓库"

# 5. 停止录制
点击 "停止录制" 按钮关闭浏览器
```

### ✅ 采集到的信息

每个 API 会自动记录：
```json
{
  "name": "创建订单",
  "method": "POST",
  "url": "http://api.example.com/orders",
  "path": "/orders",
  "requestHeaders": {...},
  "requestBody": {...},
  "responseStatus": 200,
  "responseBody": {...},
  "responseTime": 123,
  "platform": "电商平台",
  "component": "订单管理",
  "feature": "订单创建"
}
```

---

## 📦 模式 2: HAR 文件导入（最快）

### ✨ 适用场景
- ✅ 已经有抓包文件
- ✅ 批量导入 API
- ✅ 从其他工具迁移
- ✅ 快速验证

### 🚀 快速开始

#### 1. 导出 HAR 文件

**Chrome DevTools:**
```
1. 打开 Chrome DevTools (F12)
2. 切换到 Network 标签
3. 刷新页面，操作功能
4. 右键点击任意请求 → Save all as HAR with content
5. 保存为 xxx.har
```

**Postman:**
```
1. 打开 Postman
2. 发送请求
3. 点击 Export → HAR
```

**Fiddler:**
```
1. 捕获流量
2. File → Export Sessions → HTTP Archive
```

#### 2. 导入到 API 智能测试平台

**方式 A: 拖拽上传**
```
1. 进入 API 仓库页面
2. 点击"导入 HAR"按钮
3. 拖拽 .har 文件到上传区域
4. 等待解析完成
```

**方式 B: API 接口**
```bash
curl -X POST http://localhost:3000/api/api-library/import-har \
  -F "file=@capture.har"
```

#### 3. 查看导入结果

```
✅ 导入成功！

📊 统计信息：
- 总请求数：156
- XHR/API：45
- 静态资源：111（已过滤）

💾 已保存：45 个 API
📁 自动分类：8 个模块
```

### 🎯 导入配置

可以配置导入选项：

```typescript
{
  // 过滤规则
  filters: {
    // 只导入 API 请求
    includeTypes: ['xhr', 'fetch'],
    
    // 排除静态资源
    excludeTypes: ['image', 'script', 'stylesheet'],
    
    // 只导入特定域名
    includeDomains: ['api.example.com'],
    
    // 排除特定路径
    excludePaths: ['/static/', '/assets/']
  },
  
  // 分类配置
  classification: {
    // 自动识别分类
    auto: true,
    
    // 手动指定平台
    platform: '电商平台'
  }
}
```

### 📝 实际示例

```bash
# 1. 从 Chrome 导出 HAR
# 操作：F12 → Network → 刷新 → 右键 → Save as HAR

# 2. 导入到 API 智能测试平台
curl -X POST http://localhost:3000/api/api-library/import-har \
  -F "file=@shopping-cart.har" \
  -F "platform=电商平台"

# 3. 查看结果
# 进入 API 仓库，可以看到：
# - 订单管理（15 个 API）
# - 商品管理（12 个 API）
# - 用户管理（8 个 API）
```

---

## 🔒 模式 3: mitmproxy 代理（最专业）

### ✨ 适用场景
- ✅ 移动端 APP
- ✅ 微信小程序
- ✅ HTTPS 解密
- ✅ 企业级测试

### 🚀 快速开始

#### 1. 启动 mitmproxy

**在 Web 界面启动（推荐）：**
```bash
# 1. 访问 API 采集页面
http://localhost:3000/api-capture

# 2. 选择 "mitmproxy 代理录制" 模式

# 3. 点击 "启动 mitmproxy 录制" 按钮
```

这将启动：
- 🔒 mitmproxy 代理服务器（端口 8899，可配置）
- 📊 实时 SSE 推送到前端
- 🎯 自动采集所有流量

#### 2. 配置设备

**iOS 设备:**
```
1. 设置 → Wi-Fi → 点击已连接的网络
2. 配置代理 → 手动
   - 服务器：你的电脑 IP（如 192.168.1.100）
   - 端口：8899
3. 浏览器访问 mitm.it
4. 下载并安装证书
5. 设置 → 通用 → 关于本机 → 证书信任设置
6. 开启对 mitmproxy 的完全信任
```

**Android 设备:**
```
1. 设置 → WLAN → 长按已连接网络 → 修改网络
2. 代理 → 手动
   - 代理服务器主机名：你的电脑 IP
   - 代理服务器端口：8899
3. 浏览器访问 mitm.it
4. 下载 Android 证书
5. 设置 → 安全 → 从存储设备安装 → 选择证书
```

**小程序:**
```
1. 微信开发者工具
2. 设置 → 代理设置
   - 代理类型：HTTP
   - 代理服务器：127.0.0.1:8899
3. 启用"不校验合法域名"
```

**macOS/Windows 浏览器:**
```
# macOS
系统设置 → 网络 → Wi-Fi/以太网 → 详情 → 代理
  └── 勾选 "网页代理(HTTP)" 和 "安全网页代理(HTTPS)"
      服务器: localhost  端口: 8899

# Windows
设置 → 网络和Internet → 代理 → 手动设置代理
  └── 地址: localhost  端口: 8899
```

#### 3. 开始采集

```bash
# 设备上操作 APP 或小程序
# 所有 HTTPS 流量都会被解密并采集
```

#### 4. 查看采集结果

```bash
# 实时查看捕获的请求
http://localhost:3000/api-capture

# 保存后在 API 仓库查看
http://localhost:3000/api-repository
```

**实时控制：**
- ▶️ **启动录制**: 开始捕获流量
- ⏸️ **暂停录制**: 暂停捕获（不记录新请求）
- ▶️ **继续录制**: 恢复捕获
- ⏹️ **停止录制**: 停止进程，结束会话
- 🗑️ **清理全部**: 清空已捕获的数据

### 🎯 高级配置

**自定义端口：**

编辑 `lib/mitmproxy-manager.ts`：

```typescript
// 默认端口配置
private port = 8899;

// 可以在启动时指定端口
const result = await mitmManager.start({ port: 9000 });
```

**过滤规则：**

编辑 `proxy-server/mitmproxy_recorder.py`：

```python
def request(self, flow: http.HTTPFlow):
    """拦截请求"""
    
    # 自定义过滤逻辑
    # 只捕获特定域名
    if 'api.example.com' not in flow.request.pretty_host:
        return
    
    # 排除静态资源
    if flow.request.path.endswith(('.png', '.jpg', '.css', '.js')):
        return
    
    # 只捕获特定方法
    if flow.request.method not in ['GET', 'POST', 'PUT', 'DELETE']:
        return
    
    # ... 其他捕获逻辑
```

**SSE 推送频率：**

编辑 `lib/mitmproxy-manager.ts`：

```typescript
// 文件监听防抖时间（毫秒）
private debounceDelay = 500;  // 默认 500ms
```

### 📝 实际示例

```bash
# 1. 在 Web 界面启动代理
访问 http://localhost:3000/api-capture
点击 "启动 mitmproxy 录制"

# 2. 配置手机代理（指向你的电脑）
# iOS: 192.168.1.100:8899
# Android: 192.168.1.100:8899

# 3. 安装证书（首次使用）
# 手机浏览器访问：http://mitm.it
# 下载并信任证书

# 4. 打开 APP 并操作
# - 登录
# - 浏览商品
# - 加入购物车
# - 创建订单

# 5. 实时查看采集的 API
# 在 Web 界面会自动显示所有捕获的请求
# 浏览器访问：http://localhost:3000/api-library

# 结果：
# ✅ 采集到 23 个 API
# 📁 自动分类：
#    - 用户认证（3 个）
#    - 商品管理（8 个）
#    - 订单管理（12 个）
```

---

## 🔄 采集后的处理

### 1. 智能分类

API 智能测试平台 会自动对采集的 API 进行四层分类：

```
平台（Platform）
  └── 组件（Component）
      └── 功能（Feature）
          └── API 动作
```

**示例：**
```
电商平台
  └── 订单管理
      └── 订单创建
          ├── POST /api/orders (创建订单)
          ├── GET /api/orders/:id (查询订单)
          ├── PUT /api/orders/:id (修改订单)
          └── DELETE /api/orders/:id (删除订单)
```

### 2. 生成 Schema

自动识别参数类型和结构：

```json
{
  "requestBody": {
    "type": "object",
    "properties": {
      "productId": {
        "type": "string",
        "example": "PRD001"
      },
      "quantity": {
        "type": "integer",
        "example": 2
      },
      "price": {
        "type": "number",
        "example": 99.99
      }
    },
    "required": ["productId", "quantity"]
  }
}
```

### 3. 添加标签

可以手动或自动添加标签：

```
🏷️ 标签示例：
- 核心功能
- 高频调用
- 需要登录
- 数据修改
- 敏感操作
```

---

## 💡 最佳实践

### 1. 采集前的准备

```bash
# 清空浏览器缓存
# 准备测试数据
# 规划操作流程
```

### 2. 采集时的技巧

- ✅ **完整流程**: 从登录到退出，完整操作一遍
- ✅ **多种场景**: 包括正常和异常场景
- ✅ **慢速操作**: 给每个请求充分的时间
- ✅ **记录笔记**: 标记重要的 API

### 3. 采集后的整理

```bash
# 1. 检查分类是否合理
# 2. 添加描述和标签
# 3. 删除无用的 API
# 4. 合并重复的 API
```

### 4. 命名规范

```
✅ 好的命名：
- 创建订单
- 查询用户列表
- 修改商品信息
- 删除购物车项

❌ 不好的命名：
- POST /api/orders
- GET request
- API_001
- test
```

---

## ❓ 常见问题

### Q1: Playwright 采集失败

**症状**: 浏览器启动失败或无法捕获请求

**解决方案**:
```bash
# 1. 确保 Playwright 已正确安装
npx playwright install chromium

# 2. 检查端口占用
lsof -i :3000     # Next.js 前端端口
lsof -i :8899     # mitmproxy 端口
lsof -i :8001     # 执行器端口

# 3. 检查执行器是否运行
curl http://localhost:8001/docs
# 应该返回 FastAPI 文档页面

# 4. 查看执行器日志
tail -f executor/executor.log
# 或
tail -f logs/$(date +%Y-%m-%d)-executor.log

# 5. 重启服务
# 重启执行器
cd executor
python main.py

# 重新构建并启动前端
npm run build && npm run start
```

### Q2: HAR 导入后 API 数量很少

**原因**: 可能过滤掉了静态资源

**解决方案**:
```typescript
// 调整过滤规则
filters: {
  includeTypes: ['xhr', 'fetch', 'document'],
  excludeTypes: []  // 不排除任何类型
}
```

### Q3: mitmproxy 证书安装失败

**iOS:**
```
1. 确保在"设置 > 通用 > 关于本机 > 证书信任设置"中启用
2. 重启设备
3. 重新访问 mitm.it 下载证书
```

**Android:**
```
1. 确保证书格式正确（.crt 或 .pem）
2. 从"设置 > 安全 > 加密与凭据 > 从存储设备安装"
3. 如果找不到，将证书移到 Downloads 文件夹
```

### Q4: 如何采集需要登录的 API？

**方案 A: 手动登录**
```
1. 启动采集
2. 在浏览器中手动登录
3. 继续操作业务功能
```

**方案 B: 导入 Cookie**
```typescript
// playwright.config.ts
{
  use: {
    storageState: 'auth.json'  // 预先保存的登录状态
  }
}
```

### Q5: API 分类不准确怎么办？

**手动调整**:
```
1. 进入 API 仓库
2. 点击 API 卡片
3. 编辑分类信息
4. 保存
```

**批量调整**:
```
1. 选择多个 API
2. 点击"批量操作"
3. 修改分类
4. 应用到所有选中的 API
```

---

## 🎓 进阶话题

### 自定义采集脚本

```typescript
// custom-capture.ts
import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();

// 监听所有请求
context.on('request', request => {
  console.log('Request:', request.url());
});

// 监听所有响应
context.on('response', response => {
  console.log('Response:', response.url(), response.status());
});

// 执行自动化操作
const page = await context.newPage();
await page.goto('https://example.com');
await page.click('#login-button');
// ...

await browser.close();
```

### 与 CI/CD 集成

可以通过 API 接口实现自动化采集：

```yaml
# .github/workflows/api-capture.yml
name: API Capture

on:
  schedule:
    - cron: '0 0 * * *'  # 每天执行

jobs:
  capture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Start services
        run: |
          docker-compose up -d
          sleep 10
      - name: Trigger capture via API
        run: |
          curl -X POST http://localhost:3000/api/capture/playwright/start \
            -H "Content-Type: application/json" \
            -d '{"url": "http://your-app.com"}'
      - name: Wait for completion
        run: sleep 60
      - name: Export captured APIs
        run: |
          curl http://localhost:3000/api/api-repository/export > captured-apis.json
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: captured-apis
          path: captured-apis.json
```

---

## 📚 相关文档

- [可视化编排指南](04_FLOW_ORCHESTRATION.md)
- [AI 生成指南](03_AI_GENERATION.md)
- [API 仓库管理](02_API_REPOSITORY.md)

---

## 💡 下一步

采集完 API 后，你可以：

1. 📝 [手动编排测试流程](04_FLOW_ORCHESTRATION.md)
2. 🤖 [使用 AI 自动生成测试用例](03_AI_GENERATION.md)
3. ✅ [执行测试并查看结果](06_EXECUTION.md)

---

<div align="center">

**有问题？**

查看 [FAQ](../FAQ.md) 或加入 [Discord 社区](https://discord.gg/aitestmind)

[⬅️ 返回文档首页](../README.md)

</div>


