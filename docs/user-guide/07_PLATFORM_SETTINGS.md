# ⚙️ 平台设置指南

> **统一管理全局配置**：环境配置 → 认证配置 → Session 管理 → AI 配置

---

## 📋 目录

- [概述](#概述)
- [环境配置](#环境配置)
- [认证 Token 配置](#认证-token-配置)
- [Session 配置](#session-配置)
- [请求头过滤配置](#请求头过滤配置)
- [AI 配置](#ai-配置)
- [配置优先级](#配置优先级)
- [最佳实践](#最佳实践)

---

## 📖 概述

平台设置是 AI TestMind 的全局配置中心，用于统一管理测试环境、认证方式、AI 服务等核心配置。这些配置会在测试执行时自动应用，无需在每个测试用例中重复设置。

### ✨ 核心功能

| 配置类型 | 作用 | 应用场景 |
|---------|------|---------|
| 🌐 **环境配置** | 统一设置 API 基础路径 | 多环境切换（开发/测试/生产） |
| 🔐 **认证 Token** | 全局 Token 认证 | API 需要固定 Token 认证 |
| 🍪 **Session 管理** | 自动化登录获取 Cookie | 需要登录态的接口测试 |
| 🎯 **请求头过滤** | 采集API时过滤无用请求头 | 只保留业务相关的Headers |
| 🤖 **AI 配置** | AI 测试生成服务 | 智能生成测试用例 |

---

## 🌐 环境配置

### 功能说明

环境配置用于设置 API 请求的基础 URL，避免在每个 API 中重复配置完整路径。

### 配置项

**基础 URL (Base URL)**
- **作用**: 所有 API 请求的基础路径
- **格式**: `http://example.com` 或 `https://api.example.com/v1`
- **示例**: `https://api.testmind.com/v1`

### 使用示例

**配置前：**
```json
{
  "api": {
    "url": "https://api.testmind.com/v1/users/login"
  }
}
```

**配置后：**
```
基础 URL: https://api.testmind.com/v1
API 路径: /users/login
实际请求: https://api.testmind.com/v1/users/login
```

### 环境切换场景

```
开发环境: https://dev-api.testmind.com
测试环境: https://test-api.testmind.com
生产环境: https://api.testmind.com
```

只需修改平台设置中的基础 URL，所有测试用例的请求地址就会自动切换。

---

## 🔐 认证 Token 配置

### 功能说明

认证 Token 配置用于在所有 API 请求中自动添加固定的认证 Token，适用于使用 Token 认证的 API。

### 配置项

| 配置项 | 说明 | 示例 |
|-------|------|------|
| **启用 Token 认证** | 是否启用全局 Token | ✅ 启用 / ❌ 禁用 |
| **Header 键名** | Token 在 Header 中的键名 | `Authorization` |
| **Token 值** | 实际的 Token 值 | `Bearer eyJhbGci...` |

### 常见配置示例

**标准 Bearer Token:**
```
Header 键名: Authorization
Token 值: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**自定义 Token Header:**
```
Header 键名: X-API-Token
Token 值: sk_test_1234567890abcdef
```

**多个 Token (通过 JSON 配置):**
```
Header 键名: Authorization
Token 值: Bearer token1

额外配置:
Header 键名: X-API-Key
Token 值: api_key_value
```

### 使用场景

✅ **适用场景：**
- API 使用固定 Token 认证
- Token 长期有效
- 所有接口使用相同的认证方式

❌ **不适用场景：**
- 需要动态登录获取 Token（使用 Session 配置）
- 不同接口使用不同 Token
- Token 有效期很短需要频繁刷新

---

## 🍪 Session 配置

### 功能说明

Session 配置用于自动化登录流程，在测试执行前自动调用登录接口获取 Cookie，适用于需要登录态的接口测试。

### 配置项

| 配置项 | 说明 | 示例 |
|-------|------|------|
| **启用 Session** | 是否启用自动登录 | ✅ 启用 / ❌ 禁用 |
| **登录 API URL** | 登录接口的完整地址 | `https://api.example.com/login` |
| **请求方法** | 登录接口的 HTTP 方法 | `POST` / `GET` |
| **请求 Headers** | 登录请求的 Headers（JSON 格式） | `{"Content-Type": "application/json"}` |
| **请求 Body** | 登录请求的 Body（JSON 格式） | `{"username": "admin", "password": "123456"}` |
| **已保存 Cookies** | 最近一次登录获取的 Cookies | 自动保存，不需手动填写 |
| **最后更新时间** | Session 最后更新时间 | 自动记录 |

### 配置示例

**标准登录接口：**
```json
{
  "loginApiUrl": "https://api.testmind.com/api/auth/login",
  "loginMethod": "POST",
  "loginRequestHeaders": {
    "Content-Type": "application/json"
  },
  "loginRequestBody": {
    "username": "testuser",
    "password": "Test@123456"
  }
}
```

**带额外参数的登录：**
```json
{
  "loginApiUrl": "https://api.testmind.com/api/auth/login",
  "loginMethod": "POST",
  "loginRequestHeaders": {
    "Content-Type": "application/json",
    "X-Client-Type": "web"
  },
  "loginRequestBody": {
    "username": "testuser",
    "password": "Test@123456",
    "remember": true,
    "deviceId": "test-device-001"
  }
}
```

### 测试登录功能

配置完成后，点击"测试登录"按钮验证配置是否正确：

**成功响应：**
```
✅ 测试登录成功
获取到 3 个 Cookies:
  1. sessionId
  2. token
  3. refreshToken

最后更新: 2025-12-01 14:30:25
```

**失败响应：**
```
❌ 测试登录失败
错误信息: Invalid credentials
请检查登录 API URL、请求参数是否正确
```

### 工作原理

```
1. 测试执行开始
   ↓
2. 自动调用登录 API
   ↓
3. 提取响应中的 Set-Cookie
   ↓
4. 保存 Cookies 到平台设置
   ↓
5. 后续所有 API 请求自动携带 Cookies
```

### Session 更新策略

| 触发时机 | 说明 |
|---------|------|
| 手动测试登录 | 点击"测试登录"按钮 |
| 测试执行前 | 执行器自动检查并刷新 Session |
| Session 过期 | 检测到 401/403 时自动重新登录 |

---

## 🎯 请求头过滤配置

### 功能说明

请求头过滤配置用于在采集 API 并保存到仓库时，自动过滤掉浏览器自动生成的、不必要的请求头，只保留业务相关的 Headers。这样可以让 API 仓库更加清晰，避免保存大量无用的浏览器默认请求头。

### 为什么需要过滤请求头？

浏览器在发送请求时会自动添加很多请求头，例如：
- `User-Agent`：浏览器标识
- `Accept-Language`：语言偏好
- `Accept-Encoding`：编码方式
- `Cache-Control`：缓存控制
- `sec-fetch-*`：浏览器安全相关
- 等等...

这些请求头在实际的接口测试中通常不需要，保留它们会：
- ❌ 让 API 数据变得冗余
- ❌ 干扰后续的接口测试
- ❌ 难以识别真正重要的业务请求头

### 配置项

| 配置项 | 说明 | 格式 | 示例 |
|-------|------|------|------|
| **允许保留的请求头** | 配置要保留的请求头白名单 | 逗号分隔的字符串 | `Authorization, Content-Type, X-Api-Key` |

### 配置方式

**1. 进入设置页面**
```
导航栏 → 设置 → 请求头过滤配置
```

**2. 输入白名单**

在"允许保留的请求头"输入框中输入你想保留的请求头名称，多个用逗号分隔：

```
Authorization, Content-Type, X-Api-Key, X-Request-Id, X-Trace-Id
```

**3. 保存配置**

点击"保存所有配置"按钮，配置立即生效。

### 配置示例

**示例 1：标准 REST API**
```
Authorization, Content-Type, Accept
```
保留结果：
- `Authorization`: 用于身份认证
- `Content-Type`: 指定请求体格式
- `Accept`: 指定期望的响应格式

**示例 2：微服务架构**
```
Authorization, Content-Type, X-Request-Id, X-Trace-Id, X-Service-Name
```
保留结果：
- 认证相关：`Authorization`
- 格式相关：`Content-Type`
- 链路追踪：`X-Request-Id`, `X-Trace-Id`
- 服务标识：`X-Service-Name`

**示例 3：自定义业务 Headers**
```
Authorization, Content-Type, X-Api-Key, X-Tenant-Id, X-Client-Version
```
保留结果：
- 认证相关：`Authorization`, `X-Api-Key`
- 格式相关：`Content-Type`
- 业务相关：`X-Tenant-Id`, `X-Client-Version`

**示例 4：保留所有请求头（默认）**
```
留空或不配置
```
保留结果：所有请求头都会被保存

### 工作原理

```
1. 浏览器录制/代理采集 API
   ↓
2. 捕获到完整的请求（包含所有 Headers）
   ↓
3. 检查平台设置中的白名单配置
   ↓
4. 过滤 Headers（只保留白名单中的）
   ↓
5. 保存到 API 仓库
```

### 过滤规则

| 规则 | 说明 |
|------|------|
| **不区分大小写** | `authorization` 和 `Authorization` 视为相同 |
| **完全匹配** | 必须完全匹配请求头名称 |
| **逗号分隔** | 多个请求头用英文逗号 `,` 分隔 |
| **自动去除空格** | 前后空格会被自动去除 |
| **留空表示保留全部** | 如果不配置白名单，则保留所有请求头 |

### 使用场景

**✅ 适用场景：**
- API 采集入库时希望数据更清晰
- 只关注业务相关的请求头
- 团队有统一的 Header 规范
- 需要减少 API 数据冗余

**❌ 不适用场景：**
- 需要完整记录所有请求细节
- 不确定哪些 Headers 是必需的
- 调试阶段需要查看完整请求

### 常见业务请求头参考

**认证类：**
```
Authorization, X-Auth-Token, X-Api-Key, Cookie
```

**格式类：**
```
Content-Type, Accept, Accept-Language
```

**追踪类：**
```
X-Request-Id, X-Trace-Id, X-Span-Id, X-Correlation-Id
```

**业务类：**
```
X-Tenant-Id, X-User-Id, X-Client-Version, X-Platform, X-Device-Id
```

**跨域类（CORS）：**
```
Origin, Referer
```

### 注意事项

```
⚠️ 重要提示：

1. 白名单过滤只影响「新采集入库」的 API
   已保存的 API 不会被修改

2. 如果不确定需要哪些 Headers
   建议先不配置白名单，保留所有 Headers
   后续通过查看 API 数据再决定

3. 过滤后的 Headers 不影响测试执行
   执行时会自动添加平台配置的认证信息

4. 配置立即生效
   保存后的下一次采集就会应用过滤规则
```

### 查看过滤效果

采集 API 后，在后端日志中可以看到过滤信息：

```
🔍 [Headers过滤] 获取用户信息: 15 → 3 个请求头
✅ [创建成功] API已创建: api_xxx - 获取用户信息
```

这表示原始请求有 15 个 Headers，过滤后保留了 3 个。

---

## 🤖 AI 配置

### 功能说明

AI 配置用于启用 AI 智能生成测试用例功能，支持多种 AI 服务提供商。

### 配置项

| 配置项 | 说明 | 默认值 | 示例 |
|-------|------|--------|------|
| **启用 AI** | 是否启用 AI 功能 | ❌ 禁用 | ✅ 启用 |
| **AI 提供商** | AI 服务提供商 | `openai` | `openai`, `deepseek`, `claude` 等 |
| **模型** | 使用的 AI 模型 | `gpt-4-turbo-preview` | `gpt-4`, `claude-3-opus` 等 |
| **API Key** | AI 服务的 API 密钥 | - | `sk-xxx...` |
| **Base URL** | 自定义 API 端点（可选） | - | `https://api.openai.com/v1` |
| **Temperature** | 生成随机性（0-1） | `0.7` | `0.7` |
| **Max Tokens** | 最大生成长度 | `4000` | `4000` |
| **Top P** | 核采样参数（0-1） | `1.0` | `1.0` |

### 支持的 AI 提供商

| 提供商 | 推荐模型 | API Key 获取 |
|-------|---------|-------------|
| **OpenAI** | `gpt-4-turbo-preview` | https://platform.openai.com |
| **DeepSeek** | `deepseek-chat` | https://platform.deepseek.com |
| **Claude** | `claude-3-opus-20240229` | https://console.anthropic.com |
| **百度文心** | `ERNIE-Bot-4` | https://cloud.baidu.com |
| **阿里通义** | `qwen-max` | https://dashscope.aliyun.com |
| **智谱清言** | `glm-4` | https://open.bigmodel.cn |
| **Ollama** | `llama2`, `mistral` | 本地部署 |

### 配置示例

**OpenAI 配置：**
```json
{
  "aiProvider": "openai",
  "aiModel": "gpt-4-turbo-preview",
  "aiApiKey": "sk-proj-xxxxxxxxxxxxxxxxxxxx",
  "aiBaseUrl": "",
  "aiTemperature": 0.7,
  "aiMaxTokens": 4000,
  "aiTopP": 1.0
}
```

**DeepSeek 配置：**
```json
{
  "aiProvider": "deepseek",
  "aiModel": "deepseek-chat",
  "aiApiKey": "sk-xxxxxxxxxxxxxxxxxxxx",
  "aiBaseUrl": "https://api.deepseek.com/v1",
  "aiTemperature": 0.7,
  "aiMaxTokens": 4000,
  "aiTopP": 1.0
}
```

**本地 Ollama 配置：**
```json
{
  "aiProvider": "ollama",
  "aiModel": "llama2",
  "aiApiKey": "ollama",
  "aiBaseUrl": "http://localhost:11434",
  "aiTemperature": 0.7,
  "aiMaxTokens": 2000,
  "aiTopP": 1.0
}
```

### 测试连接功能

配置完成后，点击"测试连接"按钮验证 AI 配置是否正确：

**成功响应：**
```
✅ AI 连接成功
```

**失败响应：**
```
❌ AI 连接失败
错误信息: Invalid API key
```

### 高级配置说明

**Temperature (温度)**
- 范围: 0.0 - 1.0
- 作用: 控制生成结果的随机性
- 建议值:
  - `0.2-0.4`: 更确定性的输出（适合生成测试用例）
  - `0.7`: 平衡创造性和准确性（推荐）
  - `0.8-1.0`: 更有创意的输出

**Max Tokens (最大令牌数)**
- 作用: 限制 AI 生成的最大长度
- 建议值:
  - 简单测试用例: `2000`
  - 复杂测试流程: `4000`
  - 完整测试套件: `8000`

**Top P (核采样)**
- 范围: 0.0 - 1.0
- 作用: 控制生成多样性
- 建议值: `1.0`（通常不需要调整）

---

## 🔄 配置优先级

AI TestMind 支持多层级的配置体系，当配置冲突时，按以下优先级应用：

```
层级 1: 测试用例节点配置（最高优先级）
   ↓
层级 2: 测试套件独立配置
   ↓
层级 3: 平台全局设置（最低优先级）
```

### 示例说明

**场景：测试不同环境**

```
平台设置:
  baseUrl: https://api.testmind.com

测试套件 A（开发环境）:
  useGlobalSettings: false
  environmentConfig:
    baseUrl: https://dev-api.testmind.com

测试套件 B（测试环境）:
  useGlobalSettings: false
  environmentConfig:
    baseUrl: https://test-api.testmind.com

测试套件 C（生产环境）:
  useGlobalSettings: true
  实际使用: https://api.testmind.com
```

### 配置覆盖规则

| 配置项 | 节点配置 | 套件配置 | 平台配置 | 最终值 |
|-------|---------|---------|---------|-------|
| Base URL | - | `https://dev.com` | `https://api.com` | `https://dev.com` |
| Auth Token | `Token-ABC` | - | `Token-XYZ` | `Token-ABC` |
| Session | - | - | ✅ 启用 | ✅ 启用 |

---

## 💡 最佳实践

### 1. 环境管理策略

✅ **推荐做法：**
```
开发测试阶段:
  - 平台设置使用开发环境
  - 需要测试其他环境时，创建独立配置的测试套件

生产部署阶段:
  - 平台设置切换到生产环境
  - 关键测试套件使用独立配置，避免误操作
```

❌ **不推荐：**
```
- 频繁修改平台设置切换环境
- 所有套件都用独立配置（难以统一管理）
```

### 2. 认证配置选择

**何时使用 Token 认证：**
- ✅ API 使用固定的 API Key 或 Token
- ✅ 开发/测试环境有长期有效的 Token
- ✅ 不需要模拟用户登录流程

**何时使用 Session 认证：**
- ✅ 需要模拟真实用户登录
- ✅ 接口依赖登录态（Cookie/Session）
- ✅ Token 需要通过登录接口动态获取

**何时两者都不用：**
- ✅ API 是公开的，无需认证
- ✅ 每个测试用例需要不同的用户身份

### 3. Session 管理注意事项

```
✅ 定期更新:
  - 在测试执行前手动测试登录
  - 确保 Cookie 未过期

✅ 安全性:
  - 不要在生产环境使用真实用户账号
  - 使用专门的测试账号

✅ 并发处理:
  - Session 是全局共享的
  - 注意并发测试时的 Session 冲突
```

### 4. 请求头过滤建议

```
✅ 白名单配置策略:
  - 初期采集: 不配置白名单，保留所有 Headers
  - 分析阶段: 查看采集的 API，确定业务必需的 Headers
  - 优化阶段: 配置白名单，只保留业务相关的 Headers

✅ 推荐保留的 Headers:
  - 认证类: Authorization, X-Auth-Token, X-Api-Key, Cookie
  - 格式类: Content-Type, Accept
  - 追踪类: X-Request-Id, X-Trace-Id
  - 业务类: 根据实际业务决定

✅ 团队协作:
  - 统一团队的 Header 白名单规范
  - 在文档中记录必需的业务 Headers
  - 定期审查白名单配置的有效性

❌ 避免过度过滤:
  - 不确定时保留 Header，不要随意删除
  - 测试失败时检查是否过滤了必需的 Header
  - 新功能测试前先确认 Header 要求
```

### 5. AI 配置建议

```
✅ 选择合适的提供商:
  - 成本敏感: DeepSeek, Ollama
  - 质量优先: OpenAI GPT-4, Claude 3
  - 国内网络: 百度文心, 阿里通义, 智谱清言

✅ 参数调优:
  - Temperature: 0.3-0.5（更准确的测试用例）
  - Max Tokens: 根据用例复杂度调整

✅ API Key 安全:
  - 不要分享或提交到代码仓库
  - 定期更换 API Key
  - 使用环境变量管理（生产环境）
```

### 6. 配置备份与恢复

```
✅ 重要配置备份:
  1. 定期导出平台设置
  2. 记录各环境的配置参数
  3. 保存 Session 登录信息

✅ 快速恢复:
  1. 准备好配置模板
  2. 使用 API 批量导入配置
  3. 文档化配置变更历史
```

---

## 🎯 实战场景

### 场景 1: 多环境测试

**需求：** 同一套测试用例需要在开发、测试、生产环境执行

**方案：**
```
1. 平台设置配置开发环境（日常使用）:
   baseUrl: https://dev-api.testmind.com

2. 创建测试套件"生产环境回归测试":
   useGlobalSettings: false
   environmentConfig:
     baseUrl: https://api.testmind.com

3. 创建测试套件"测试环境验证":
   useGlobalSettings: false
   environmentConfig:
     baseUrl: https://test-api.testmind.com
```

### 场景 2: 混合认证

**需求：** 大部分接口需要登录，少数接口需要特殊 Token

**方案：**
```
1. 平台设置启用 Session 配置:
   sessionEnabled: true
   loginApiUrl: https://api.testmind.com/login

2. 特殊接口在节点中覆盖配置:
   headers:
     X-Admin-Token: "special_admin_token"
```

### 场景 3: 临时测试

**需求：** 临时测试新功能，不想影响全局配置

**方案：**
```
1. 创建独立测试套件:
   useGlobalSettings: false
   
2. 配置临时环境:
   environmentConfig:
     baseUrl: https://feature-branch-api.testmind.com
     authTokenEnabled: true
     authTokenKey: "X-Test-Token"
     authTokenValue: "temp_token_12345"

3. 测试完成后删除或禁用该套件
```

---

## 📚 相关文档

- [可视化流程编排](04_FLOW_ORCHESTRATION.md) - 了解如何在测试用例中使用配置
- [测试执行与监控](06_EXECUTION.md) - 了解配置如何影响执行过程
- [部署指南](../deployment/DEPLOYMENT_GUIDE.md) - 了解生产环境配置管理

---

<div align="center">

**配置完成了吗？**

[查看流程编排指南 →](04_FLOW_ORCHESTRATION.md)

[⬅️ 返回文档首页](../README.md)

</div>

