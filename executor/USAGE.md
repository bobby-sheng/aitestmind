# 测试执行器使用指南

## 快速开始

### 1. 启动 FastAPI 服务

```bash
cd executor
python3 main.py
```

服务将在 `http://localhost:8001` 启动。

### 2. 访问 API 文档

打开浏览器访问：http://localhost:8001/docs

### 3. 测试 API

#### 方式一：使用 curl

```bash
# 执行登录用例
curl -X POST http://localhost:8001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"testCaseName": "登录用例"}'

# 或使用 ID
curl -X POST http://localhost:8001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"testCaseId": "cmhrppfmd00001yhxhyx1a3ha"}'
```

#### 方式二：使用 Python 脚本

```bash
python3 test_example.py
```

#### 方式三：使用 Swagger UI

访问 http://localhost:8001/docs，在界面上测试 API。

## 测试结果解读

### 成功的执行结果

```json
{
  "success": true,
  "message": "执行完成",
  "result": {
    "success": true,
    "testCaseId": "cmhrppfmd00001yhxhyx1a3ha",
    "testCaseName": "登录用例",
    "startTime": "2024-11-09T10:30:00",
    "endTime": "2024-11-09T10:30:05",
    "duration": 5.23,
    "totalSteps": 2,
    "executedSteps": 2,
    "passedSteps": 2,
    "failedSteps": 0,
    "steps": [
      {
        "stepId": "step_1762692611301",
        "stepName": "iNet登录 POST /api/sky-platform/auth/user/v2/login",
        "nodeType": "api",
        "success": true,
        "duration": 1.2,
        "request": {
          "method": "POST",
          "url": "http://172.21.1.156/api/sky-platform/auth/user/v2/login",
          "headers": {
            "accept": "application/json"
          },
          "body": {
            "username": "admin",
            "password": "2SjO7IDAQlP1LUxtwHK6sQ=="
          }
        },
        "response": {
          "status": 200,
          "body": {
            "code": 0,
            "data": {
              "token": "eyJhbGciOiJIUzI1NiIs..."
            }
          }
        },
        "extractedVariables": {
          "loginToken": "eyJhbGciOiJIUzI1NiIs..."
        }
      }
    ],
    "variables": {
      "variables": {
        "loginToken": "eyJhbGciOiJIUzI1NiIs..."
      }
    }
  }
}
```

### 失败的执行结果

```json
{
  "success": true,
  "message": "执行失败",
  "result": {
    "success": false,
    "testCaseId": "cmhrppfmd00001yhxhyx1a3ha",
    "testCaseName": "登录用例",
    "error": "步骤 'iNet登录' 执行失败: API 请求超时",
    "duration": 30.01,
    "totalSteps": 2,
    "executedSteps": 1,
    "passedSteps": 0,
    "failedSteps": 1,
    "steps": [
      {
        "stepId": "step_1762692611301",
        "stepName": "iNet登录",
        "success": false,
        "error": "API 请求超时: timeout"
      }
    ]
  }
}
```

## 功能演示

### 1. 基础 API 调用

测试用例包含一个简单的 API 节点：
- 发送 POST 请求
- 携带固定的请求体
- 返回响应数据

### 2. 变量提取和引用

```json
{
  "responseExtract": [
    {
      "path": "data.token",
      "variable": "loginToken"
    }
  ]
}
```

后续步骤可以使用：
```json
{
  "headers": {
    "Authorization": {
      "valueType": "variable",
      "variable": "loginToken",
      "template": "Bearer {value}"
    }
  }
}
```

### 3. 断言验证

```json
{
  "assertions": [
    {
      "field": "status",
      "operator": "equals",
      "expected": 200
    },
    {
      "field": "data.code",
      "operator": "equals",
      "expected": 0
    },
    {
      "field": "data.token",
      "operator": "exists"
    }
  ]
}
```

### 4. 等待节点

时间等待：
```json
{
  "type": "time",
  "value": 5000  // 等待 5 秒
}
```

条件等待：
```json
{
  "type": "condition",
  "condition": {
    "variable": "step_1.response.data.status",
    "operator": "equals",
    "expected": "completed"
  }
}
```

### 5. 并发执行

```json
{
  "name": "前置准备",
  "apis": [
    {
      "id": "api1",
      "apiId": "xxx",
      "name": "创建用户",
      "method": "POST",
      "url": "..."
    },
    {
      "id": "api2",
      "apiId": "yyy",
      "name": "创建角色",
      "method": "POST",
      "url": "..."
    }
  ],
  "failureStrategy": "stopAll"
}
```

## 常见问题

### Q: 如何查看所有测试用例？

```bash
curl http://localhost:8001/api/test-cases
```

### Q: 如何查看特定测试用例的详情？

```bash
curl http://localhost:8001/api/test-cases/{testCaseId}
```

### Q: 如何批量执行测试用例？

```bash
curl -X POST http://localhost:8001/api/execute/batch \
  -H "Content-Type: application/json" \
  -d '["id1", "id2", "id3"]'
```

### Q: API 请求超时怎么办？

检查：
1. 网络连接是否正常
2. API 服务是否可访问
3. 超时时间设置（默认 30 秒）

可以在初始化时修改超时时间：
```python
TestExecutor(timeout=60)  # 设置为 60 秒
```

### Q: 变量提取失败怎么办？

检查：
1. JSONPath 语法是否正确
2. 响应数据结构是否匹配
3. 查看执行结果中的实际响应数据

### Q: 断言失败怎么办？

在执行结果中查看：
1. `actual`: 实际值
2. `expected`: 期望值
3. `message`: 断言消息

调整断言条件或修复 API 返回值。

## 高级用法

### 自定义超时时间

```python
async with TestExecutor(timeout=60, database=db) as executor:
    result = await executor.execute_test_case(test_case)
```

### 集成到 CI/CD

```bash
#!/bin/bash

# 启动服务
python3 main.py &
SERVER_PID=$!

# 等待服务启动
sleep 3

# 执行测试
RESULT=$(curl -s -X POST http://localhost:8001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"testCaseName": "登录用例"}')

# 检查结果
SUCCESS=$(echo $RESULT | jq -r '.result.success')

# 停止服务
kill $SERVER_PID

# 返回退出码
if [ "$SUCCESS" = "true" ]; then
  exit 0
else
  exit 1
fi
```

## 开发建议

### 1. 合理使用变量

- 提取需要复用的数据（如 token、ID）
- 使用描述性的变量名
- 避免过度提取

### 2. 完善断言

- 验证关键字段
- 使用合适的操作符
- 添加清晰的期望值

### 3. 优化等待

- 优先使用条件等待
- 设置合理的超时时间
- 避免不必要的等待

### 4. 并发控制

- 合理分组并发任务
- 选择合适的失败策略
- 注意并发安全

## 性能优化

1. **连接复用**: 执行器使用连接池，自动复用 HTTP 连接
2. **并发执行**: 使用 parallel 节点并发执行多个 API
3. **超时控制**: 合理设置超时时间，避免长时间等待
4. **资源清理**: 执行完成后自动清理资源

## 监控和日志

执行器会输出详细的执行日志：
- 请求详情（URL、方法、参数）
- 响应详情（状态码、响应体）
- 断言结果（字段、期望值、实际值）
- 错误信息（类型、消息）

建议在生产环境中：
1. 启用日志记录
2. 监控执行时间
3. 追踪失败率
4. 记录执行历史

## 下一步

1. ✅ 基础功能已完成
2. 🔄 可以添加更多节点类型
3. 🔄 可以添加更多断言操作符
4. 🔄 可以添加测试报告生成
5. 🔄 可以添加执行历史记录

## 技术支持

如有问题，请：
1. 查看执行日志
2. 检查 API 文档
3. 查看示例代码
4. 提交 Issue

