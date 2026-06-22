# 项目流程时序图

本文档描述了 API 智能测试平台的核心业务流程时序图。

## 目录

1. [测试套件执行流程](#1-测试套件执行流程)
2. [单个测试用例执行流程（SSE实时推送）](#2-单个测试用例执行流程sse实时推送)
3. [测试用例节点执行流程](#3-测试用例节点执行流程)

---

## 1. 测试套件执行流程

### 流程说明

测试套件执行是平台的核心功能，支持批量执行多个测试用例。流程包括：
- 前端触发执行
- Next.js API 创建执行记录
- Python 执行器异步执行
- 数据库记录执行结果
- SSE 实时推送执行状态

### 时序图代码（Mermaid）

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as 前端页面<br/>(TestSuitesPage)
    participant NextAPI as Next.js API<br/>(/api/test-suites/[id]/execute)
    participant DB as 数据库<br/>(Prisma)
    participant Executor as Python执行器<br/>(FastAPI)
    participant SuiteExecutor as SuiteExecutor
    participant TestExecutor as TestExecutor
    participant API as 目标API

    User->>Frontend: 点击执行测试套件
    Frontend->>NextAPI: POST /api/test-suites/{id}/execute
    
    NextAPI->>DB: 查询测试套件信息
    DB-->>NextAPI: 返回测试套件及用例列表
    
    NextAPI->>DB: 获取环境配置<br/>(全局/套件配置)
    DB-->>NextAPI: 返回环境配置
    
    NextAPI->>DB: 创建 TestSuiteExecution 记录<br/>(status: pending)
    DB-->>NextAPI: 返回 executionId
    
    NextAPI->>Executor: POST /api/execute-suite<br/>(suite_execution_id, suite_id, environment_config)
    NextAPI-->>Frontend: 返回执行ID和基本信息
    
    Frontend->>Frontend: 显示执行已启动提示
    
    Executor->>SuiteExecutor: execute_suite()
    
    SuiteExecutor->>DB: 获取测试套件执行记录
    SuiteExecutor->>DB: 获取测试用例列表<br/>(按order排序)
    
    loop 遍历每个测试用例
        SuiteExecutor->>DB: 创建 TestCaseExecution 记录<br/>(status: pending)
        DB-->>SuiteExecutor: 返回 case_execution_id
        
        SuiteExecutor->>TestExecutor: execute_test_case()<br/>(传入 case_execution_id)
        
        TestExecutor->>TestExecutor: 初始化变量管理器<br/>断言引擎、等待处理器
        
        loop 遍历每个节点
            TestExecutor->>DB: 创建 StepExecution 记录<br/>(status: pending)
            
            alt 节点类型: API请求
                TestExecutor->>TestExecutor: 解析变量、构建请求
                TestExecutor->>API: 发送HTTP请求
                API-->>TestExecutor: 返回响应
                TestExecutor->>TestExecutor: 执行断言
                TestExecutor->>TestExecutor: 提取变量
            else 节点类型: 等待
                TestExecutor->>TestExecutor: 执行等待逻辑
            else 节点类型: 条件判断
                TestExecutor->>TestExecutor: 执行条件判断
            end
            
            TestExecutor->>DB: 更新 StepExecution 记录<br/>(status, response, logs)
            
            alt 节点执行失败
                TestExecutor->>TestExecutor: 标记失败，停止执行
            end
        end
        
        TestExecutor->>DB: 更新 TestCaseExecution 记录<br/>(status: passed/failed)
        TestExecutor-->>SuiteExecutor: 返回执行结果
        
        SuiteExecutor->>DB: 更新统计信息<br/>(passedCases, failedCases)
    end
    
    SuiteExecutor->>DB: 更新 TestSuiteExecution 记录<br/>(status: completed/failed)
    SuiteExecutor-->>Executor: 返回执行结果
    
    Note over Frontend,DB: 前端通过SSE轮询获取执行状态
    Frontend->>NextAPI: GET /api/executions/suite/{executionId}/stream
    NextAPI->>DB: 轮询查询执行状态<br/>(每500ms)
    DB-->>NextAPI: 返回最新执行状态
    NextAPI-->>Frontend: SSE推送状态更新
```

### 时序图代码（PlantUML）

```plantuml
@startuml 测试套件执行流程
actor 用户
participant "前端页面\n(TestSuitesPage)" as Frontend
participant "Next.js API\n(/api/test-suites/[id]/execute)" as NextAPI
database "数据库\n(Prisma)" as DB
participant "Python执行器\n(FastAPI)" as Executor
participant "SuiteExecutor" as SuiteExecutor
participant "TestExecutor" as TestExecutor
participant "目标API" as API

用户 -> Frontend: 点击执行测试套件
Frontend -> NextAPI: POST /api/test-suites/{id}/execute

NextAPI -> DB: 查询测试套件信息
DB --> NextAPI: 返回测试套件及用例列表

NextAPI -> DB: 获取环境配置\n(全局/套件配置)
DB --> NextAPI: 返回环境配置

NextAPI -> DB: 创建 TestSuiteExecution 记录\n(status: pending)
DB --> NextAPI: 返回 executionId

NextAPI -> Executor: POST /api/execute-suite\n(suite_execution_id, suite_id, environment_config)
NextAPI --> Frontend: 返回执行ID和基本信息

Frontend -> Frontend: 显示执行已启动提示

Executor -> SuiteExecutor: execute_suite()

SuiteExecutor -> DB: 获取测试套件执行记录
SuiteExecutor -> DB: 获取测试用例列表\n(按order排序)

loop 遍历每个测试用例
    SuiteExecutor -> DB: 创建 TestCaseExecution 记录\n(status: pending)
    DB --> SuiteExecutor: 返回 case_execution_id
    
    SuiteExecutor -> TestExecutor: execute_test_case()\n(传入 case_execution_id)
    
    TestExecutor -> TestExecutor: 初始化变量管理器\n断言引擎、等待处理器
    
    loop 遍历每个节点
        TestExecutor -> DB: 创建 StepExecution 记录\n(status: pending)
        
        alt 节点类型: API请求
            TestExecutor -> TestExecutor: 解析变量、构建请求
            TestExecutor -> API: 发送HTTP请求
            API --> TestExecutor: 返回响应
            TestExecutor -> TestExecutor: 执行断言
            TestExecutor -> TestExecutor: 提取变量
        else 节点类型: 等待
            TestExecutor -> TestExecutor: 执行等待逻辑
        else 节点类型: 条件判断
            TestExecutor -> TestExecutor: 执行条件判断
        end
        
        TestExecutor -> DB: 更新 StepExecution 记录\n(status, response, logs)
        
        alt 节点执行失败
            TestExecutor -> TestExecutor: 标记失败，停止执行
        end
    end
    
    TestExecutor -> DB: 更新 TestCaseExecution 记录\n(status: passed/failed)
    TestExecutor --> SuiteExecutor: 返回执行结果
    
    SuiteExecutor -> DB: 更新统计信息\n(passedCases, failedCases)
end

SuiteExecutor -> DB: 更新 TestSuiteExecution 记录\n(status: completed/failed)
SuiteExecutor --> Executor: 返回执行结果

note right of Frontend
  前端通过SSE轮询获取执行状态
end note

Frontend -> NextAPI: GET /api/executions/suite/{executionId}/stream
NextAPI -> DB: 轮询查询执行状态\n(每500ms)
DB --> NextAPI: 返回最新执行状态
NextAPI --> Frontend: SSE推送状态更新

@enduml
```

---

## 2. 单个测试用例执行流程（SSE实时推送）

### 流程说明

单个测试用例执行支持实时推送执行进度，通过 SSE (Server-Sent Events) 实现。流程包括：
- 前端通过 SSE 连接执行器
- 执行器实时推送节点执行状态
- 前端实时更新UI显示

### 时序图代码（Mermaid）

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as 前端页面<br/>(TestOrchestrationPage)
    participant ExecutionLogPanel as ExecutionLogPanel
    participant Executor as Python执行器<br/>(FastAPI)
    participant SSEExecutor as SSEExecutor
    participant TestExecutor as TestExecutor
    participant DB as 数据库
    participant API as 目标API

    User->>Frontend: 点击运行测试用例
    Frontend->>Frontend: 检查是否已保存
    Frontend->>Frontend: 设置 isExecuting = true
    Frontend->>ExecutionLogPanel: 触发执行
    
    ExecutionLogPanel->>ExecutionLogPanel: 生成执行ID
    ExecutionLogPanel->>Executor: POST /api/execute/stream<br/>(testCaseId)<br/>建立SSE连接
    
    Executor->>DB: 查询测试用例
    DB-->>Executor: 返回测试用例信息
    
    Executor->>SSEExecutor: execute_with_stream()
    SSEExecutor-->>Executor: SSE流生成器
    
    Executor-->>ExecutionLogPanel: SSE流响应<br/>(text/event-stream)
    
    SSEExecutor->>SSEExecutor: 发送开始消息<br/>(type: start)
    SSEExecutor-->>ExecutionLogPanel: data: {"type":"start",...}
    
    ExecutionLogPanel->>ExecutionLogPanel: 解析SSE消息<br/>更新UI状态
    
    SSEExecutor->>TestExecutor: execute_test_case()
    
    loop 遍历每个节点
        TestExecutor->>TestExecutor: 执行节点
        
        alt 节点类型: API请求
            TestExecutor->>API: 发送HTTP请求
            API-->>TestExecutor: 返回响应
            TestExecutor->>TestExecutor: 执行断言
            TestExecutor->>TestExecutor: 提取变量
        end
        
        TestExecutor-->>SSEExecutor: 节点执行结果
        
        SSEExecutor->>SSEExecutor: 发送节点更新消息<br/>(type: node_update)
        SSEExecutor-->>ExecutionLogPanel: data: {"type":"node_update",...}
        
        ExecutionLogPanel->>Frontend: onNodeStatusUpdate()
        Frontend->>Frontend: 更新节点状态显示
    end
    
    TestExecutor-->>SSEExecutor: 执行完成结果
    
    SSEExecutor->>SSEExecutor: 发送完成消息<br/>(type: complete)
    SSEExecutor-->>ExecutionLogPanel: data: {"type":"complete",...}
    
    ExecutionLogPanel->>Frontend: onExecutionComplete()
    Frontend->>Frontend: 设置 isExecuting = false
    Frontend->>Frontend: 显示执行结果
```

### 时序图代码（PlantUML）

```plantuml
@startuml 单个测试用例执行流程（SSE）
actor 用户
participant "前端页面\n(TestOrchestrationPage)" as Frontend
participant "ExecutionLogPanel" as ExecutionLogPanel
participant "Python执行器\n(FastAPI)" as Executor
participant "SSEExecutor" as SSEExecutor
participant "TestExecutor" as TestExecutor
database "数据库" as DB
participant "目标API" as API

用户 -> Frontend: 点击运行测试用例
Frontend -> Frontend: 检查是否已保存
Frontend -> Frontend: 设置 isExecuting = true
Frontend -> ExecutionLogPanel: 触发执行

ExecutionLogPanel -> ExecutionLogPanel: 生成执行ID
ExecutionLogPanel -> Executor: POST /api/execute/stream\n(testCaseId)\n建立SSE连接

Executor -> DB: 查询测试用例
DB --> Executor: 返回测试用例信息

Executor -> SSEExecutor: execute_with_stream()
SSEExecutor --> Executor: SSE流生成器

Executor --> ExecutionLogPanel: SSE流响应\n(text/event-stream)

SSEExecutor -> SSEExecutor: 发送开始消息\n(type: start)
SSEExecutor --> ExecutionLogPanel: data: {"type":"start",...}

ExecutionLogPanel -> ExecutionLogPanel: 解析SSE消息\n更新UI状态

SSEExecutor -> TestExecutor: execute_test_case()

loop 遍历每个节点
    TestExecutor -> TestExecutor: 执行节点
    
    alt 节点类型: API请求
        TestExecutor -> API: 发送HTTP请求
        API --> TestExecutor: 返回响应
        TestExecutor -> TestExecutor: 执行断言
        TestExecutor -> TestExecutor: 提取变量
    end
    
    TestExecutor --> SSEExecutor: 节点执行结果
    
    SSEExecutor -> SSEExecutor: 发送节点更新消息\n(type: node_update)
    SSEExecutor --> ExecutionLogPanel: data: {"type":"node_update",...}
    
    ExecutionLogPanel -> Frontend: onNodeStatusUpdate()
    Frontend -> Frontend: 更新节点状态显示
end

TestExecutor --> SSEExecutor: 执行完成结果

SSEExecutor -> SSEExecutor: 发送完成消息\n(type: complete)
SSEExecutor --> ExecutionLogPanel: data: {"type":"complete",...}

ExecutionLogPanel -> Frontend: onExecutionComplete()
Frontend -> Frontend: 设置 isExecuting = false
Frontend -> Frontend: 显示执行结果

@enduml
```

---

## 3. 测试用例节点执行流程

### 流程说明

详细描述单个节点的执行流程，包括变量解析、请求发送、断言验证、变量提取等步骤。

### 时序图代码（Mermaid）

```mermaid
sequenceDiagram
    participant TestExecutor as TestExecutor
    participant VariableManager as VariableManager
    participant AssertionEngine as AssertionEngine
    participant WaitHandler as WaitHandler
    participant HTTPClient as HTTP客户端<br/>(httpx)
    participant API as 目标API
    participant DB as 数据库

    TestExecutor->>DB: 创建 StepExecution 记录<br/>(status: pending)
    
    TestExecutor->>VariableManager: 解析节点配置中的变量<br/>(URL, Headers, Body等)
    VariableManager-->>TestExecutor: 返回解析后的值
    
    alt 节点类型: API请求节点
        TestExecutor->>TestExecutor: 构建HTTP请求<br/>(URL, Method, Headers, Body)
        TestExecutor->>HTTPClient: 发送HTTP请求
        HTTPClient->>API: HTTP请求
        API-->>HTTPClient: HTTP响应
        HTTPClient-->>TestExecutor: 响应数据
        
        TestExecutor->>DB: 更新 StepExecution<br/>(requestUrl, requestMethod,<br/>requestHeaders, requestBody,<br/>responseStatus, responseHeaders,<br/>responseBody, responseTime)
        
        TestExecutor->>AssertionEngine: 执行断言验证<br/>(传入响应数据)
        AssertionEngine->>AssertionEngine: 解析断言规则
        AssertionEngine->>AssertionEngine: 执行断言逻辑
        AssertionEngine-->>TestExecutor: 返回断言结果列表
        
        TestExecutor->>DB: 更新 StepExecution<br/>(assertionResults)
        
        alt 断言失败
            TestExecutor->>DB: 更新 StepExecution<br/>(status: failed, errorMessage)
            TestExecutor->>TestExecutor: 标记步骤失败
        else 断言成功
            TestExecutor->>VariableManager: 提取变量<br/>(从响应中提取)
            VariableManager->>VariableManager: 解析提取规则<br/>(JSONPath, 正则等)
            VariableManager->>VariableManager: 执行提取逻辑
            VariableManager-->>TestExecutor: 返回提取的变量
            
            TestExecutor->>DB: 更新 StepExecution<br/>(extractedVariables, status: success)
        end
        
    else 节点类型: 等待节点
        TestExecutor->>WaitHandler: 执行等待逻辑
        WaitHandler->>WaitHandler: 解析等待配置<br/>(固定时间/条件等待)
        WaitHandler->>WaitHandler: 执行等待
        WaitHandler-->>TestExecutor: 等待完成
        
        TestExecutor->>DB: 更新 StepExecution<br/>(status: success)
        
    else 节点类型: 条件判断节点
        TestExecutor->>VariableManager: 获取条件表达式中变量
        VariableManager-->>TestExecutor: 返回变量值
        TestExecutor->>TestExecutor: 评估条件表达式
        TestExecutor->>DB: 更新 StepExecution<br/>(status: success/failed)
    end
    
    TestExecutor->>DB: 更新 StepExecution<br/>(duration, endTime)
```

### 时序图代码（PlantUML）

```plantuml
@startuml 测试用例节点执行流程
participant "TestExecutor" as TestExecutor
participant "VariableManager" as VariableManager
participant "AssertionEngine" as AssertionEngine
participant "WaitHandler" as WaitHandler
participant "HTTP客户端\n(httpx)" as HTTPClient
participant "目标API" as API
database "数据库" as DB

TestExecutor -> DB: 创建 StepExecution 记录\n(status: pending)

TestExecutor -> VariableManager: 解析节点配置中的变量\n(URL, Headers, Body等)
VariableManager --> TestExecutor: 返回解析后的值

alt 节点类型: API请求节点
    TestExecutor -> TestExecutor: 构建HTTP请求\n(URL, Method, Headers, Body)
    TestExecutor -> HTTPClient: 发送HTTP请求
    HTTPClient -> API: HTTP请求
    API --> HTTPClient: HTTP响应
    HTTPClient --> TestExecutor: 响应数据
    
    TestExecutor -> DB: 更新 StepExecution\n(requestUrl, requestMethod,\nrequestHeaders, requestBody,\nresponseStatus, responseHeaders,\nresponseBody, responseTime)
    
    TestExecutor -> AssertionEngine: 执行断言验证\n(传入响应数据)
    AssertionEngine -> AssertionEngine: 解析断言规则
    AssertionEngine -> AssertionEngine: 执行断言逻辑
    AssertionEngine --> TestExecutor: 返回断言结果列表
    
    TestExecutor -> DB: 更新 StepExecution\n(assertionResults)
    
    alt 断言失败
        TestExecutor -> DB: 更新 StepExecution\n(status: failed, errorMessage)
        TestExecutor -> TestExecutor: 标记步骤失败
    else 断言成功
        TestExecutor -> VariableManager: 提取变量\n(从响应中提取)
        VariableManager -> VariableManager: 解析提取规则\n(JSONPath, 正则等)
        VariableManager -> VariableManager: 执行提取逻辑
        VariableManager --> TestExecutor: 返回提取的变量
        
        TestExecutor -> DB: 更新 StepExecution\n(extractedVariables, status: success)
    end
    
else 节点类型: 等待节点
    TestExecutor -> WaitHandler: 执行等待逻辑
    WaitHandler -> WaitHandler: 解析等待配置\n(固定时间/条件等待)
    WaitHandler -> WaitHandler: 执行等待
    WaitHandler --> TestExecutor: 等待完成
    
    TestExecutor -> DB: 更新 StepExecution\n(status: success)
    
else 节点类型: 条件判断节点
    TestExecutor -> VariableManager: 获取条件表达式中变量
    VariableManager --> TestExecutor: 返回变量值
    TestExecutor -> TestExecutor: 评估条件表达式
    TestExecutor -> DB: 更新 StepExecution\n(status: success/failed)
end

TestExecutor -> DB: 更新 StepExecution\n(duration, endTime)

@enduml
```

---

## 关键组件说明

### 前端组件

- **TestSuitesPage**: 测试套件列表页面，提供执行入口
- **TestOrchestrationPage**: 测试用例编排页面，支持单个用例执行
- **ExecutionLogPanel**: 执行日志面板，处理SSE连接和实时更新
- **CaseExecutionDialog**: 用例执行详情对话框，显示执行结果

### 后端API

- **Next.js API Routes**: 
  - `/api/test-suites/[id]/execute`: 执行测试套件
  - `/api/executions/suite/[executionId]/stream`: SSE流推送执行状态
- **Python FastAPI**:
  - `/api/execute-suite`: 执行测试套件（批量）
  - `/api/execute/stream`: 执行单个测试用例（SSE实时推送）

### 执行器组件

- **SuiteExecutor**: 测试套件执行器，负责批量执行多个测试用例
- **TestExecutor**: 测试用例执行器，负责执行单个测试用例
- **SSEExecutor**: SSE执行器，支持实时推送执行进度
- **VariableManager**: 变量管理器，处理变量解析和提取
- **AssertionEngine**: 断言引擎，执行断言验证
- **WaitHandler**: 等待处理器，处理等待逻辑

### 数据库模型

- **TestSuiteExecution**: 测试套件执行记录
- **TestCaseExecution**: 测试用例执行记录
- **StepExecution**: 步骤执行记录
- **ExecutionLog**: 执行日志记录

---

## 执行状态流转

### 测试套件执行状态

```
pending → running → completed/failed/stopped
```

### 测试用例执行状态

```
pending → running → passed/failed
```

### 步骤执行状态

```
pending → running → success/failed/skipped
```

---

## 注意事项

1. **异步执行**: 测试套件执行是异步的，前端通过SSE轮询获取状态
2. **错误处理**: 每个层级都有错误处理机制，确保执行失败时能正确记录
3. **变量作用域**: 变量在测试用例级别共享，可在节点间传递
4. **后置清理**: 即使普通节点失败，后置清理节点仍会执行
5. **停止机制**: 支持手动停止执行，通过stop_flags实现

---

## 相关文件

- `app/api/test-suites/[id]/execute/route.ts`: 测试套件执行API
- `app/api/executions/suite/[executionId]/stream/route.ts`: SSE流推送API
- `executor/main.py`: Python执行器主入口
- `executor/suite_executor.py`: 测试套件执行器
- `executor/test_executor.py`: 测试用例执行器
- `executor/sse_executor.py`: SSE执行器
- `components/test-orchestration/ExecutionLogPanel.tsx`: 执行日志面板
- `components/reports/CaseExecutionDialog.tsx`: 用例执行详情对话框
