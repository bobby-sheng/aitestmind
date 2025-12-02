# 详细执行日志示例

## 成功执行的完整日志输出

```
🧪 测试执行器示例

============================================================
🔍 查询测试用例列表...
============================================================

找到 1 个测试用例:

1. 登录用例
   ID: cmhrppfmd00001yhxhyx1a3ha
   状态: active
   执行次数: 5 (成功: 3, 失败: 2)

============================================================
🚀 执行测试用例: 登录用例
============================================================

📝 用例描述: 测试用户登录接口
📊 节点数量: 3
🔗 连线数量: 2

============================================================
📊 执行结果
============================================================

✅ 执行成功

⏱️  总耗时: 2.35 秒
📈 总步骤: 2
✅ 成功步骤: 2
❌ 失败步骤: 0

================================================================================
📋 详细执行日志
================================================================================

================================================================================
步骤 1: iNet登录 POST /api/sky-platform/auth/user/v2/login
================================================================================
节点类型: NodeType.API
节点 ID: step_1762692611301
执行状态: ✅ 成功
执行耗时: 1.23 秒

📤 请求详情:
  ├─ 方法: POST
  ├─ URL: http://172.21.1.156/api/sky-platform/auth/user/v2/login
  ├─ 请求头:
  │   ├─ accept: application/json
  │   ├─ content-type: application/json
  │   ├─ user-agent: python-httpx/0.25.1
  └─ 请求体:
      {
          "username": "admin",
          "password": "2SjO7IDAQlP1LUxtwHK6sQ=="
      }

📥 响应详情:
  ├─ 状态码: 200
  ├─ 响应头:
  │   ├─ content-type: application/json; charset=utf-8
  │   ├─ content-length: 256
  │   ├─ server: nginx/1.18.0
  │   ├─ date: Sat, 09 Nov 2024 12:30:00 GMT
  └─ 响应体:
      {
          "code": 0,
          "message": "登录成功",
          "data": {
              "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMzQ1LCJ1c2VybmFtZSI6ImFkbWluIiwiaWF0IjoxNjk5NTI0NjAwfQ.abcdefghijklmnopqrstuvwxyz123456789",
              "userId": 12345,
              "username": "admin",
              "roles": ["admin", "user"],
              "permissions": [
                  "user:read",
                  "user:write",
                  "device:read",
                  "device:write"
              ],
              "expiresIn": 3600
          }
      }

📦 提取的变量:
  ├─ loginToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMzQ1LCJ1c2VybmFtZSI6ImFkbWluIiwiaWF...
  ├─ userId: 12345

✓ 断言结果:
  ├─ ✅ 通过
  │   ├─ 字段: status
  │   ├─ 操作符: equals
  │   ├─ 期望值: 200
  │   ├─ 实际值: 200
  │   └─ 消息: 期望 200 == 200
  ├─ ✅ 通过
  │   ├─ 字段: data.code
  │   ├─ 操作符: equals
  │   ├─ 期望值: 0
  │   ├─ 实际值: 0
  │   └─ 消息: 期望 0 == 0
  ├─ ✅ 通过
  │   ├─ 字段: data.token
  │   ├─ 操作符: exists
  │   ├─ 期望值: None
  │   ├─ 实际值: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  │   └─ 消息: 期望字段存在，实际: True


================================================================================
步骤 2: 新建高可用组 POST /api/sky-nap/device/ha-group
================================================================================
节点类型: NodeType.API
节点 ID: step_1762696514361
执行状态: ✅ 成功
执行耗时: 1.12 秒

📤 请求详情:
  ├─ 方法: POST
  ├─ URL: http://172.21.1.156/api/sky-nap/device/ha-group
  ├─ 请求头:
  │   ├─ accept: application/json
  │   ├─ content-type: application/json
  │   ├─ authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ├─ 查询参数:
  │   ├─ datacenter: dc-001
  └─ 请求体:
      {
          "name": "高可用组-测试-001",
          "deviceType": "sky_firewall",
          "type": "ANALYZE_DISPATCH",
          "dispatchOrder": "UNLIMITED",
          "description": "自动化测试创建的高可用组",
          "devices": [
              {
                  "deviceId": "device-001",
                  "priority": 100
              },
              {
                  "deviceId": "device-002",
                  "priority": 90
              }
          ]
      }

📥 响应详情:
  ├─ 状态码: 201
  ├─ 响应头:
  │   ├─ content-type: application/json; charset=utf-8
  │   ├─ content-length: 156
  │   ├─ server: nginx/1.18.0
  │   ├─ date: Sat, 09 Nov 2024 12:30:01 GMT
  └─ 响应体:
      {
          "code": 0,
          "message": "创建成功",
          "data": {
              "id": "ha-group-20241109-001",
              "name": "高可用组-测试-001",
              "status": "active",
              "createdAt": "2024-11-09T12:30:01Z",
              "deviceCount": 2
          }
      }

📦 提取的变量:
  ├─ haGroupId: ha-group-20241109-001

✓ 断言结果:
  ├─ ✅ 通过
  │   ├─ 字段: status
  │   ├─ 操作符: equals
  │   ├─ 期望值: 201
  │   ├─ 实际值: 201
  │   └─ 消息: 期望 201 == 201
  ├─ ✅ 通过
  │   ├─ 字段: data.id
  │   ├─ 操作符: exists
  │   ├─ 期望值: None
  │   ├─ 实际值: ha-group-20241109-001
  │   └─ 消息: 期望字段存在，实际: True


================================================================================
📦 全局变量
================================================================================

  ├─ loginToken: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMzQ1LCJ1c2VybmFtZSI6ImFkbWluIiwiaWF...
  ├─ userId: 12345
  ├─ haGroupId: ha-group-20241109-001

✅ 已更新测试用例统计信息
```

## 日志内容说明

### 📤 请求详情
- **方法**: HTTP 方法（GET, POST, PUT, DELETE 等）
- **URL**: 完整的请求 URL
- **请求头**: 所有请求头键值对
- **查询参数**: URL 查询参数（如果有）
- **请求体**: JSON 格式化的请求体（如果有）

### 📥 响应详情
- **状态码**: HTTP 响应状态码
- **响应头**: 重要的响应头（content-type, content-length, server, date 等）
- **响应体**: JSON 格式化的响应体

### 📦 提取的变量
- 显示从响应中提取的所有变量
- 长字符串会被截断（超过 100 字符）

### ✓ 断言结果
- 每个断言的执行结果
- 包含：字段、操作符、期望值、实际值、消息

### ❌ 错误信息
- 如果执行失败，显示详细的错误信息
- 包含错误类型和错误消息

## 日志特点

1. **层次清晰**: 使用树形结构展示数据
2. **格式化 JSON**: 所有 JSON 都经过格式化，易于阅读
3. **颜色标记**: 使用 emoji 标记不同类型的信息
4. **完整详细**: 包含所有请求和响应的详细信息
5. **性能指标**: 显示每个步骤的执行耗时

