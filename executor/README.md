# 测试执行器 (Test Executor)

基于 Python + FastAPI 的 API 测试用例执行引擎。

## 功能特性

- ✅ **完整的测试流程支持**
  - API 节点：发送 HTTP 请求
  - 等待节点：时间等待和条件等待
  - 断言节点：验证响应数据
  - 并发节点：并行执行多个 API

- ✅ **强大的变量系统**
  - 全局变量定义
  - 响应数据提取
  - 变量引用和替换
  - 模板字符串支持

- ✅ **灵活的断言引擎**
  - 等于/不等于
  - 包含/不包含
  - 大于/小于
  - 存在/不存在

- ✅ **实时执行结果**
  - 详细的步骤执行日志
  - 请求/响应记录
  - 断言结果记录
  - 变量提取记录

## 项目结构

```
executor/
├── main.py                 # FastAPI 主应用
├── models.py              # 数据模型定义
├── database.py            # 数据库访问层
├── test_executor.py       # 测试执行器核心引擎
├── variable_manager.py    # 变量管理器
├── assertion_engine.py    # 断言引擎
├── wait_handler.py        # 等待处理器
├── requirements.txt       # Python 依赖
└── README.md             # 本文档
```

## 快速开始

### 1. 安装依赖

```bash
cd executor
pip install -r requirements.txt
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
DATABASE_URL=sqlite:///../prisma/dev.db
API_HOST=0.0.0.0
API_PORT=8000
```

### 3. 启动服务

```bash
python main.py
```

服务将在 `http://localhost:8001` 启动。

### 4. 访问 API 文档

打开浏览器访问：
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## API 接口

### 获取测试用例列表

```http
GET /api/test-cases?status=active
```

### 获取测试用例详情

```http
GET /api/test-cases/{testCaseId}
```

### 执行测试用例（通过 ID）

```http
POST /api/execute
Content-Type: application/json

{
  "testCaseId": "cm2x1y2z3..."
}
```

### 执行测试用例（通过名称）

```http
POST /api/execute
Content-Type: application/json

{
  "testCaseName": "登录用例"
}
```

### 批量执行测试用例

```http
POST /api/execute/batch
Content-Type: application/json

["testCaseId1", "testCaseId2", "testCaseId3"]
```

## 执行结果示例

```json
{
  "success": true,
  "message": "执行完成",
  "result": {
    "success": true,
    "testCaseId": "cm2x1y2z3...",
    "testCaseName": "登录用例",
    "startTime": "2024-11-09T10:30:00",
    "endTime": "2024-11-09T10:30:05",
    "duration": 5.23,
    "totalSteps": 3,
    "executedSteps": 3,
    "passedSteps": 3,
    "failedSteps": 0,
    "steps": [
      {
        "stepId": "node_1",
        "stepName": "登录接口",
        "nodeType": "api",
        "success": true,
        "duration": 1.2,
        "request": {
          "method": "POST",
          "url": "https://api.example.com/login",
          "body": {
            "username": "test@example.com",
            "password": "password123"
          }
        },
        "response": {
          "status": 200,
          "body": {
            "code": 0,
            "data": {
              "token": "eyJhbGciOiJIUzI1NiIs...",
              "userId": 12345
            }
          }
        },
        "assertions": [
          {
            "field": "status",
            "operator": "equals",
            "expected": 200,
            "actual": 200,
            "success": true
          }
        ],
        "extractedVariables": {
          "loginToken": "eyJhbGciOiJIUzI1NiIs..."
        }
      }
    ],
    "variables": {
      "loginToken": "eyJhbGciOiJIUzI1NiIs...",
      "userId": 12345
    }
  }
}
```

## 数据模型

### 测试用例结构

测试用例包含以下核心部分：

1. **FlowConfig**: 流程图配置
   - `nodes`: 节点列表
   - `edges`: 连线列表
   - `variables`: 全局变量

2. **Node Types**: 节点类型
   - `start`: 开始节点
   - `api`: API 请求节点
   - `wait`: 等待节点
   - `assertion`: 断言节点
   - `parallel`: 并发节点
   - `end`: 结束节点

3. **Request Config**: 请求配置
   - `pathParams`: 路径参数
   - `queryParams`: 查询参数
   - `headers`: 请求头
   - `body`: 请求体

4. **Variable System**: 变量系统
   - 固定值: `{ "valueType": "fixed", "value": "hello" }`
   - 变量引用: `{ "valueType": "variable", "variable": "step_1.response.data.token" }`
   - 模板替换: `{ "valueType": "variable", "variable": "token", "template": "Bearer {value}" }`

## 变量引用语法

支持以下变量引用格式：

```
# 全局变量
variableName

# 步骤响应数据
step_1.response.body.data.token
step_login.response.status

# 步骤请求数据
step_1.request.body.username
```

## 断言操作符

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `equals` | 等于 | `status == 200` |
| `notEquals` | 不等于 | `code != 500` |
| `contains` | 包含 | `"success" in message` |
| `notContains` | 不包含 | `"error" not in message` |
| `greaterThan` | 大于 | `count > 10` |
| `lessThan` | 小于 | `duration < 1000` |
| `exists` | 存在 | `token is not None` |
| `notExists` | 不存在 | `error is None` |

## 等待类型

### 时间等待

```json
{
  "type": "time",
  "value": 5000  // 等待 5 秒
}
```

### 条件等待

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

## 测试示例

### 完整的登录用例测试

```bash
curl -X POST http://localhost:8001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"testCaseName": "登录用例"}'
```

## 开发指南

### 扩展新的节点类型

1. 在 `models.py` 中添加新的 `NodeType`
2. 在 `test_executor.py` 中实现对应的执行方法
3. 更新文档说明

### 扩展新的断言操作符

1. 在 `models.py` 中添加新的 `AssertionOperator`
2. 在 `assertion_engine.py` 的 `_compare` 方法中实现逻辑
3. 更新文档说明

## 故障排查

### 数据库连接失败

确保数据库文件路径正确：
```python
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
```

### 变量提取失败

检查 JSONPath 语法是否正确，路径应该类似：
- `$.data.token` 或 `data.token`
- `$.response.body.user.id`

### 断言失败

检查字段路径和期望值是否正确，可以在执行结果中查看实际值。

## 技术栈

- **FastAPI**: 现代、高性能的 Web 框架
- **httpx**: 异步 HTTP 客户端
- **jsonpath-ng**: JSONPath 解析
- **pydantic**: 数据验证和序列化
- **SQLite**: 轻量级数据库

## 许可证

MIT License

## 联系方式

如有问题，请提交 Issue。

