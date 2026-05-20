# 🎨 可视化编排指南

> **完整工作流第二步**：采集 API → **编排流程** → AI 生成 → 执行测试

---

## 📋 目录

- [概述](#概述)
- [5 分钟上手](#5-分钟上手)
- [节点类型详解](#节点类型详解)
- [变量系统](#变量系统)
- [断言配置](#断言配置)
- [流程控制](#流程控制)
- [定时执行](#定时执行)
- [独立环境配置](#独立环境配置)
- [最佳实践](#最佳实践)
- [实战案例](#实战案例)

---

## 📖 概述

可视化编排是 API 智能测试平台 的核心功能之一。通过拖拽的方式，你可以快速构建复杂的测试流程，无需编写任何代码。

### ✨ 核心优势

| 特性 | 传统方式 | API 智能测试平台 | 优势 |
|------|---------|-------------|------|
| 📝 **编写方式** | 编码脚本 | 拖拽节点 | **20x 效率** |
| 🔍 **调试** | 打印日志 | 可视化状态 | **实时查看** |
| 🔄 **维护** | 修改代码 | 修改配置 | **零编码** |
| 👥 **协作** | 代码审查 | 直观流程图 | **易理解** |

---

## 🚀 5 分钟上手

### 步骤 1: 创建测试用例

```
1. 进入"测试用例"页面
2. 点击"+ 新建用例"
3. 输入用例名称："用户登录流程测试"
4. 选择分类："用户管理"
5. 点击"创建"
```

### 步骤 2: 添加节点

```
从左侧 API 仓库拖拽"用户登录"API 到画布
```

画布上会出现一个 API 节点：

```
┌─────────────────┐
│   start (开始)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  用户登录 (API)  │
│  POST /login    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    end (结束)    │
└─────────────────┘
```

### 步骤 3: 配置参数

点击"用户登录"节点，右侧出现配置面板：

```json
{
  "requestBody": {
    "username": "testuser",
    "password": "123456"
  }
}
```

### 步骤 4: 添加断言

在配置面板中添加断言：

```json
{
  "assertions": [
    {
      "type": "status",
      "expected": 200
    },
    {
      "type": "jsonpath",
      "path": "$.data.token",
      "operator": "exists"
    }
  ]
}
```

### 步骤 5: 保存并执行

```
1. 点击右上角"保存"
2. 点击"执行"
3. 实时查看执行状态
```

🎉 恭喜！你已经创建了第一个测试用例！

---

## 🧩 节点类型详解

### 1. API 节点 🌐

最常用的节点类型，用于发送 HTTP 请求。

**基础配置:**

```json
{
  "type": "api",
  "apiId": "api_xxx",  // 从 API 仓库选择
  "name": "用户登录",
  
  // 请求配置
  "requestConfig": {
    // 请求头
    "headers": {
      "Content-Type": "application/json",
      "User-Agent": "AI-TestMind"
    },
    
    // 查询参数
    "queryParams": {
      "page": 1,
      "size": 10
    },
    
    // 路径参数
    "pathParams": {
      "id": "123"
    },
    
    // 请求体
    "body": {
      "username": "testuser",
      "password": "123456"
    }
  }
}
```

**高级配置:**

```json
{
  // 超时设置（毫秒）
  "timeout": 5000,
  
  // 重试配置
  "retry": {
    "times": 3,
    "interval": 1000
  },
  
  // 跟随重定向
  "followRedirect": true,
  
  // SSL 验证
  "validateSSL": false
}
```

### 2. 并发节点 ⚡

同时执行多个 API 请求。

```
        ┌──────────┐
        │  start   │
        └────┬─────┘
             │
        ┌────▼─────┐
        │ 并发节点  │
        └──┬──┬──┬─┘
           │  │  │
    ┌──────┘  │  └──────┐
    ▼         ▼         ▼
┌────────┐┌────────┐┌────────┐
│ API 1  ││ API 2  ││ API 3  │
└───┬────┘└───┬────┘└───┬────┘
    │         │         │
    └────┬────┴────┬────┘
         ▼         ▼
      ┌────────────┐
      │    end     │
      └────────────┘
```

**配置示例:**

```json
{
  "type": "parallel",
  "name": "并发查询",
  "children": [
    "step_user",    // 查询用户
    "step_order",   // 查询订单
    "step_product"  // 查询商品
  ],
  "mode": "all",  // all: 全部完成 / any: 任意完成 / race: 最快完成
  "timeout": 10000
}
```

### 3. 等待节点 ⏰

延迟执行或等待条件满足。

**固定延迟:**

```json
{
  "type": "wait",
  "mode": "fixed",
  "duration": 3000  // 等待 3 秒
}
```

**条件等待:**

```json
{
  "type": "wait",
  "mode": "condition",
  "condition": {
    "type": "jsonpath",
    "path": "$.data.status",
    "operator": "equals",
    "value": "completed"
  },
  "checkInterval": 1000,  // 每秒检查一次
  "timeout": 30000        // 最多等待 30 秒
}
```

---

## 🔗 变量系统

变量系统是流程编排的核心，用于在节点之间传递数据。

### 变量提取

从响应中提取数据：

**JSONPath 提取:**

```json
{
  "extract": [
    {
      "name": "userId",
      "type": "jsonpath",
      "path": "$.data.id"
    },
    {
      "name": "token",
      "type": "jsonpath",
      "path": "$.data.token"
    }
  ]
}
```

**正则提取:**

```json
{
  "extract": [
    {
      "name": "orderId",
      "type": "regex",
      "pattern": "order_id=(\\d+)",
      "group": 1
    }
  ]
}
```

**Header 提取:**

```json
{
  "extract": [
    {
      "name": "setCookie",
      "type": "header",
      "key": "Set-Cookie"
    }
  ]
}
```

### 变量引用

在后续节点中使用变量：

**基础引用:**

```json
{
  "pathParams": {
    "id": "{{userId}}"  // 引用之前提取的 userId
  }
}
```

**嵌套引用:**

```json
{
  "headers": {
    "Authorization": "Bearer {{token}}"
  }
}
```

**默认值:**

```json
{
  "queryParams": {
    "page": "{{page:1}}",  // 如果 page 不存在，使用默认值 1
    "size": "{{size:10}}"
  }
}
```

### 运行时函数

内置的运行时函数：

```json
{
  "body": {
    "name": "测试用户${{random(8)}}",      // 生成 8 位随机数
    "email": "test${{random(6)}}@example.com",
    "timestamp": "${{timestamp()}}",       // 当前时间戳
    "uuid": "${{uuid()}}",                 // 生成 UUID
    "date": "${{date('YYYY-MM-DD')}}",     // 格式化日期
    "time": "${{time('HH:mm:ss')}}"        // 格式化时间
  }
}
```

**自定义函数:**

```typescript
// 在设置页面添加自定义函数
{
  "encodeBase64": (str) => btoa(str),
  "md5": (str) => md5Hash(str),
  "hmacSha256": (str, key) => hmacSha256(str, key)
}
```

使用：

```json
{
  "headers": {
    "Authorization": "${{encodeBase64(username + ':' + password)}}"
  }
}
```

---

## ✅ 断言配置

断言用于验证 API 响应是否符合预期。

### 状态码断言

```json
{
  "assertions": [
    {
      "type": "status",
      "operator": "equals",
      "expected": 200
    }
  ]
}
```

### JSONPath 断言

```json
{
  "assertions": [
    // 检查字段存在
    {
      "type": "jsonpath",
      "path": "$.data.id",
      "operator": "exists"
    },
    
    // 检查字段值
    {
      "type": "jsonpath",
      "path": "$.code",
      "operator": "equals",
      "expected": 0
    },
    
    // 检查数组长度
    {
      "type": "jsonpath",
      "path": "$.data.items",
      "operator": "lengthEquals",
      "expected": 10
    },
    
    // 检查字段包含
    {
      "type": "jsonpath",
      "path": "$.message",
      "operator": "contains",
      "expected": "success"
    }
  ]
}
```

### 响应时间断言

```json
{
  "assertions": [
    {
      "type": "responseTime",
      "operator": "lessThan",
      "expected": 1000  // 响应时间小于 1 秒
    }
  ]
}
```

### 正则断言

```json
{
  "assertions": [
    {
      "type": "regex",
      "source": "body",
      "pattern": "^\\d{10}$",
      "description": "手机号格式验证"
    }
  ]
}
```

### 自定义脚本断言

```javascript
{
  "assertions": [
    {
      "type": "script",
      "script": `
        // response 是响应对象
        const data = response.data;
        
        // 自定义验证逻辑
        if (data.items.length > 0) {
          const firstItem = data.items[0];
          return firstItem.price > 0 && firstItem.stock >= 0;
        }
        
        return false;
      `,
      "message": "商品数据验证失败"
    }
  ]
}
```

---

## 🔀 流程控制

### 串行执行

节点按顺序依次执行（默认）：

```
A → B → C → D
```

### 并行执行

多个节点同时执行：

```
    ┌─→ B ─┐
A ──┼─→ C ─┼─→ E
    └─→ D ─┘
```

### 错误处理

配置错误时的行为：

```json
{
  "errorHandling": {
    // continue: 继续执行
    // stop: 停止执行
    // retry: 重试
    "mode": "retry",
    
    // 重试配置
    "retry": {
      "times": 3,
      "interval": 1000,
      "backoff": "exponential"  // linear / exponential
    },
    
    // 失败后执行的节点
    "onError": "step_cleanup"
  }
}
```

---

## ⏰ 定时执行

测试套件支持定时和周期性自动执行，无需手动触发。

### 执行模式

| 模式 | 说明 | 适用场景 |
|-----|------|---------|
| **manual** | 手动执行 | 开发调试阶段、临时测试 |
| **scheduled** | 定时执行 | 定期回归测试、监控测试 |

### 定时配置

在测试套件页面配置定时任务：

```json
{
  "executionMode": "scheduled",
  "scheduleConfig": {
    "type": "cron",
    "expression": "0 2 * * *",
    "timezone": "Asia/Shanghai"
  },
  "scheduleStatus": "active"
}
```

### 调度类型

#### 1. Cron 表达式

使用标准 Cron 表达式定义复杂的执行计划：

```
格式: 分 时 日 月 星期

示例:
"0 2 * * *"      - 每天凌晨 2:00 执行
"0 */6 * * *"    - 每 6 小时执行一次
"0 9,18 * * *"   - 每天 9:00 和 18:00 执行
"0 9 * * 1-5"    - 周一到周五每天 9:00 执行
"0 0 1 * *"      - 每月 1 号凌晨执行
```

**配置示例:**

```json
{
  "type": "cron",
  "expression": "0 */2 * * *",
  "timezone": "Asia/Shanghai",
  "description": "每 2 小时执行一次"
}
```

#### 2. 固定间隔

按固定时间间隔重复执行：

```json
{
  "type": "interval",
  "interval": 3600,
  "unit": "seconds",
  "description": "每小时执行一次"
}
```

**单位选项:**
- `seconds` - 秒
- `minutes` - 分钟
- `hours` - 小时
- `days` - 天

#### 3. 单次执行

在指定时间执行一次：

```json
{
  "type": "date",
  "runDate": "2025-12-25 10:00:00",
  "timezone": "Asia/Shanghai",
  "description": "圣诞节执行一次"
}
```

### 调度状态管理

| 状态 | 说明 | 行为 |
|-----|------|------|
| **active** | 激活 | 按计划自动执行 |
| **paused** | 暂停 | 暂时停止执行，保留配置 |
| **disabled** | 禁用 | 停止执行并清除调度 |

### 实时监控

```
测试套件详情页显示:
- 📅 下次执行时间: 2025-12-01 14:00:00
- 🕐 上次执行时间: 2025-12-01 12:00:00
- 📊 执行状态: 成功 / 失败
- 📈 成功率: 95%
```

### 配置示例

**案例 1: 每日回归测试**

```json
{
  "name": "每日回归测试",
  "executionMode": "scheduled",
  "scheduleConfig": {
    "type": "cron",
    "expression": "0 2 * * *",
    "timezone": "Asia/Shanghai",
    "description": "每天凌晨 2:00 执行完整回归测试"
  },
  "scheduleStatus": "active"
}
```

**案例 2: 工作日接口监控**

```json
{
  "name": "工作日接口健康检查",
  "executionMode": "scheduled",
  "scheduleConfig": {
    "type": "cron",
    "expression": "0 */4 * * 1-5",
    "timezone": "Asia/Shanghai",
    "description": "周一到周五，每 4 小时检查一次"
  },
  "scheduleStatus": "active"
}
```

**案例 3: 高频性能测试**

```json
{
  "name": "API 性能基准测试",
  "executionMode": "scheduled",
  "scheduleConfig": {
    "type": "interval",
    "interval": 30,
    "unit": "minutes",
    "description": "每 30 分钟执行性能测试"
  },
  "scheduleStatus": "active"
}
```

### 调度 API 同步

当在前端修改调度配置后，需要同步到执行器：

```bash
# 自动同步（推荐）
POST /api/test-suites/{id}
# 保存测试套件时自动同步调度配置

# 手动同步
POST /api/executor/sync-schedule
{
  "suite_id": "suite_xxx"
}
```

### 调度器架构

```
┌─────────────────────────────────────┐
│        前端（Next.js）               │
│  - 配置调度规则                      │
│  - 显示下次执行时间                  │
└──────────┬──────────────────────────┘
           │ HTTP API
           ▼
┌─────────────────────────────────────┐
│      执行器（Python FastAPI）        │
│  - APScheduler 调度引擎              │
│  - 加载并执行测试套件                │
└─────────────────────────────────────┘
```

### 最佳实践

```
✅ 合理的执行时间：
  - 避开业务高峰期
  - 凌晨执行大型回归测试
  - 工作时间执行监控测试

✅ 错误通知：
  - 配置执行失败通知
  - 关注调度日志
  - 定期检查调度状态

✅ 性能考虑：
  - 避免过于频繁的调度
  - 大型测试套件建议每日执行
  - 轻量监控可每小时执行

❌ 避免：
  - 多个大型套件同时执行
  - 过于频繁的调度（如每分钟）
  - 生产环境高峰期执行压力测试
```

---

## 🎨 独立环境配置

测试套件支持使用独立的环境配置，不依赖全局平台设置。

### 功能说明

每个测试套件可以选择：
1. **使用全局配置** - 使用平台设置中的全局配置
2. **使用独立配置** - 使用套件专属的环境配置

### 配置选项

```json
{
  "useGlobalSettings": false,
  "environmentConfig": {
    "baseUrl": "https://dev-api.example.com",
    "authTokenEnabled": true,
    "authTokenKey": "Authorization",
    "authTokenValue": "Bearer dev_token_xxx",
    "sessionEnabled": false,
    "otherConfig": {}
  }
}
```

### 配置项说明

| 配置项 | 类型 | 说明 | 示例 |
|-------|------|------|------|
| **useGlobalSettings** | boolean | 是否使用全局配置 | `true` / `false` |
| **environmentConfig** | object | 独立环境配置 | 见下表 |

### 环境配置结构

与平台设置保持一致的配置结构：

```typescript
interface EnvironmentConfig {
  // 环境配置
  baseUrl?: string;
  
  // Token 认证
  authTokenEnabled: boolean;
  authTokenKey?: string;
  authTokenValue?: string;
  
  // Session 认证
  sessionEnabled: boolean;
  loginApiUrl?: string;
  loginMethod?: string;
  loginRequestHeaders?: Record<string, string>;
  loginRequestBody?: Record<string, any>;
  sessionCookies?: string;
  
  // 其他配置
  otherConfig?: Record<string, any>;
}
```

### 使用场景

#### 场景 1: 多环境测试

```
测试套件 A - 开发环境:
  useGlobalSettings: false
  baseUrl: https://dev-api.example.com

测试套件 B - 测试环境:
  useGlobalSettings: false
  baseUrl: https://test-api.example.com

测试套件 C - 生产环境:
  useGlobalSettings: false
  baseUrl: https://api.example.com
```

#### 场景 2: 不同认证方式

```
测试套件 A - Token 认证:
  useGlobalSettings: false
  authTokenEnabled: true
  sessionEnabled: false

测试套件 B - Session 认证:
  useGlobalSettings: false
  authTokenEnabled: false
  sessionEnabled: true
```

#### 场景 3: 临时测试

```
测试套件 - 临时功能验证:
  useGlobalSettings: false
  baseUrl: https://feature-branch.example.com
  authTokenValue: "temporary_test_token"
```

### 配置优先级

```
执行时的配置优先级（从高到低）:

1. 节点级配置（最高）
   └─ 单个 API 节点的配置覆盖

2. 测试套件独立配置
   └─ useGlobalSettings = false 时生效

3. 平台全局设置（最低）
   └─ useGlobalSettings = true 时使用
```

### 配置示例

**开发环境测试套件:**

```json
{
  "name": "开发环境 - 用户模块测试",
  "useGlobalSettings": false,
  "environmentConfig": {
    "baseUrl": "https://dev-api.example.com",
    "authTokenEnabled": true,
    "authTokenKey": "Authorization",
    "authTokenValue": "Bearer dev_token_abc123",
    "sessionEnabled": false
  }
}
```

**生产环境监控套件:**

```json
{
  "name": "生产环境 - 核心接口监控",
  "useGlobalSettings": false,
  "environmentConfig": {
    "baseUrl": "https://api.example.com",
    "authTokenEnabled": false,
    "sessionEnabled": true,
    "loginApiUrl": "https://api.example.com/auth/login",
    "loginMethod": "POST",
    "loginRequestBody": {
      "username": "monitor_user",
      "password": "secure_password_xxx"
    }
  }
}
```

### 在测试套件中配置

**步骤 1: 创建或编辑测试套件**

```
1. 进入"测试套件"页面
2. 点击"新建套件"或"编辑"
3. 展开"环境配置"区域
```

**步骤 2: 选择配置方式**

```
□ 使用全局平台设置
  └─ 勾选后，使用平台设置中的配置

☑ 使用独立环境配置
  └─ 勾选后，显示配置表单
```

**步骤 3: 填写独立配置**

```json
{
  "baseUrl": "https://your-env-api.com",
  "authTokenEnabled": true,
  "authTokenKey": "X-API-Key",
  "authTokenValue": "your_api_key_here"
}
```

**步骤 4: 保存并测试**

```
1. 点击"保存"
2. 执行测试套件验证配置
3. 检查执行日志确认使用了正确的配置
```

### 配置验证

执行日志中会显示使用的配置来源：

```
✅ 配置来源: 测试套件独立配置
   Base URL: https://dev-api.example.com
   认证方式: Token (Authorization)
   
开始执行测试套件...
```

### 最佳实践

```
✅ 推荐使用独立配置：
  - 多环境测试（开发/测试/生产）
  - 不同项目的测试套件
  - 临时功能验证
  - 需要特殊认证的测试

✅ 推荐使用全局配置：
  - 单一环境测试
  - 配置完全相同的套件
  - 快速原型验证
  - 配置统一管理

✅ 配置管理：
  - 记录各环境的配置参数
  - 使用描述性的套件名称
  - 定期检查配置有效性
  - 敏感信息（Token/密码）妥善保管

❌ 避免：
  - 在生产环境套件中使用测试环境配置
  - 配置参数硬编码在测试用例中
  - 多个套件使用相同的临时配置
```

---

## 💡 最佳实践

### 1. 命名规范

```
✅ 好的命名：
- step_login: 用户登录
- step_create_order: 创建订单
- step_cleanup: 清理数据

❌ 不好的命名：
- step_1
- api_node
- test
```

### 2. 变量命名

```
✅ 清晰的变量名：
- userId
- orderToken
- productList

❌ 模糊的变量名：
- var1
- data
- temp
```

### 3. 断言策略

```
✅ 多层断言：
1. 状态码断言
2. 响应结构断言
3. 业务逻辑断言

❌ 只检查状态码：
- 状态码 200 不代表业务成功
```

### 4. 错误处理

```
✅ 完善的错误处理：
- 设置合理的超时时间
- 配置重试策略
- 添加失败清理步骤

❌ 不处理错误：
- 没有超时配置
- 失败后不清理脏数据
```

### 5. 性能优化

```
✅ 使用并发节点：
- 独立的查询可以并发执行
- 减少总执行时间

❌ 全部串行：
- 浪费等待时间
```

---

## 🎯 实战案例

### 案例 1: 用户注册流程

```
1. 注册新用户
   ↓
2. 提取 userId
   ↓
3. 发送验证邮件
   ↓
4. 激活账号
   ↓
5. 清理测试数据
```

**完整配置:**

```json
{
  "name": "用户注册流程测试",
  "nodes": [
    {
      "id": "step_register",
      "type": "api",
      "apiId": "register_api",
      "params": {
        "body": {
          "username": "testuser${{random(8)}}",
          "email": "test${{random(6)}}@example.com",
          "password": "Test123456"
        }
      },
      "extract": [
        {
          "name": "userId",
          "type": "jsonpath",
          "path": "$.data.id"
        }
      ],
      "assertions": [
        {
          "type": "status",
          "expected": 201
        },
        {
          "type": "jsonpath",
          "path": "$.data.id",
          "operator": "exists"
        }
      ]
    },
    {
      "id": "step_send_email",
      "type": "api",
      "apiId": "send_verification_api",
      "params": {
        "body": {
          "userId": "{{userId}}"
        }
      }
    },
    {
      "id": "step_activate",
      "type": "api",
      "apiId": "activate_api",
      "params": {
        "pathParams": {
          "id": "{{userId}}"
        }
      }
    },
    {
      "id": "step_cleanup",
      "type": "api",
      "apiId": "delete_user_api",
      "params": {
        "pathParams": {
          "id": "{{userId}}"
        }
      },
      "isCleanup": true
    }
  ],
  "edges": [
    { "from": "start", "to": "step_register" },
    { "from": "step_register", "to": "step_send_email" },
    { "from": "step_send_email", "to": "step_activate" },
    { "from": "step_activate", "to": "step_cleanup" },
    { "from": "step_cleanup", "to": "end" }
  ]
}
```

### 案例 2: 订单创建流程（含并发）

```
1. 用户登录
   ↓
2. 并发查询
   ├→ 查询商品列表
   ├→ 查询库存
   └→ 查询优惠券
   ↓
3. 创建订单
   ↓
4. 支付订单
   ↓
5. 清理订单
```

---

## 📚 相关文档

- [平台设置配置](07_PLATFORM_SETTINGS.md) - 了解全局配置和独立配置
- [API 智能采集](05_API_CAPTURE.md) - 了解如何采集 API
- [AI 生成指南](03_AI_GENERATION.md) - 了解 AI 智能生成功能
- [执行与监控](06_EXECUTION.md) - 了解测试执行过程

---

<div align="center">

**准备好了吗？**

[查看 AI 生成指南 →](03_AI_GENERATION.md)

[⬅️ 返回文档首页](../README.md)

</div>



