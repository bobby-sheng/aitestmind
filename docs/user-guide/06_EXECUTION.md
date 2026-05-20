# 📊 测试执行与监控 / Test Execution & Monitoring

[English](#english) | [中文](#中文)

---

## 中文

### 概述

API 智能测试平台 提供强大的实时测试执行和监控能力，让您能够清晰地观察每个测试步骤的执行过程。

### 主要特性

#### 1. 实时执行监控

- **实时状态更新**：通过 Server-Sent Events (SSE) 实时推送执行状态
- **节点级别可视化**：每个节点实时显示执行状态（等待、执行中、成功、失败）
- **进度跟踪**：实时显示整体执行进度

#### 2. 详细执行日志

点击任意节点可查看：
- 📋 **请求详情**：完整的请求 URL、Headers、Body
- 📥 **响应详情**：响应状态码、Headers、Body
- ⏱️ **性能指标**：响应时间、各阶段耗时
- ✅ **断言结果**：每个断言的执行结果和详细信息
- 🔄 **变量提取**：提取的变量名称和值

#### 3. 执行控制

- **▶️ 运行测试**：一键启动测试执行
- **⏸️ 暂停/继续**：暂停执行并随时继续
- **🛑 停止执行**：立即终止测试
- **🔄 重试失败**：对失败的节点进行重试

#### 4. 执行历史

访问 `/execution` 页面查看：
- 📊 所有测试用例的执行记录
- 📈 成功率统计
- ⏱️ 执行时间趋势
- 🔍 筛选和搜索历史记录

### 使用指南

#### 从编排器执行测试

1. 打开测试用例的可视化编排器
2. 点击右上角的 "运行测试" ▶️ 按钮
3. 观察实时执行过程：
   - 绿色 ✅：执行成功
   - 红色 ❌：执行失败
   - 蓝色 🔵：正在执行
   - 灰色 ⚪：等待执行

4. 点击任意节点查看详细日志

#### 查看执行历史

1. 访问 `/execution` 页面
2. 查看所有执行记录列表
3. 点击任意记录查看详细信息
4. 使用筛选器按状态、时间等条件过滤

#### 分析执行结果

**成功的执行**：
- ✅ 所有断言通过
- ✅ 所有 API 调用成功
- ✅ 变量正确提取和传递

**失败的执行**：
- ❌ 点击失败节点查看错误信息
- 📋 检查请求和响应详情
- 🔍 分析断言失败原因
- 🔄 修复问题后重新运行

### 实时监控功能

#### SSE 实时推送

API 智能测试平台 使用 Server-Sent Events 技术实现：
- 📡 零延迟状态更新
- 🔄 自动重连机制
- 💡 低资源占用

#### 执行状态

每个节点的执行状态：
- `pending` - 等待执行
- `running` - 正在执行
- `success` - 执行成功
- `failed` - 执行失败
- `skipped` - 跳过执行

### 性能监控

查看详细的性能指标：
- **DNS 查询时间**
- **TCP 连接时间**
- **TLS 握手时间**
- **首字节时间 (TTFB)**
- **内容下载时间**
- **总响应时间**

### 断言验证

支持多种断言类型：

#### 1. 状态码断言
```
响应状态码 equals 200
响应状态码 in [200, 201, 204]
```

#### 2. JSONPath 断言
```
$.data.id exists
$.data.name equals "test"
$.data.count greaterThan 0
```

#### 3. 响应时间断言
```
响应时间 lessThan 1000ms
```

#### 4. 自定义断言
```
正则表达式匹配
JSON Schema 验证
自定义函数验证
```

### 最佳实践

#### 1. 合理使用断言

- ✅ 验证关键字段
- ✅ 检查响应状态
- ✅ 验证数据类型
- ❌ 避免过度断言

#### 2. 查看详细日志

当测试失败时：
1. 查看失败节点的请求详情
2. 检查响应内容是否符合预期
3. 验证断言条件是否合理
4. 检查变量引用是否正确

#### 3. 性能优化

- 使用并发节点提高执行效率
- 合理设置超时时间
- 避免不必要的等待节点

#### 4. 执行历史管理

- 定期查看执行趋势
- 识别不稳定的测试
- 优化失败率高的用例

### 故障排查

#### 常见问题

**1. 执行卡住不动**
- 检查执行器服务是否正常运行
- 查看执行器日志：`logs/executor.log`
- 检查 API 端点是否可访问

**2. 断言总是失败**
- 验证响应数据结构
- 检查 JSONPath 表达式
- 确认断言条件是否正确

**3. 变量引用错误**
- 确认前置节点已执行成功
- 检查变量名称是否正确
- 验证 JSONPath 提取路径

**4. 响应时间过长**
- 检查网络连接
- 优化 API 性能
- 调整超时设置

### 技术实现

API 智能测试平台 的执行引擎：
- **前端**：React + SSE 客户端
- **后端**：Python FastAPI
- **通信**：Server-Sent Events
- **存储**：SQLite + Prisma

执行流程：
```
前端触发 → API Routes → Python执行器 → 
执行测试 → SSE推送状态 → 前端实时更新 → 保存结果
```

---

## English

### Overview

API 智能测试平台 provides powerful real-time test execution and monitoring capabilities, allowing you to clearly observe the execution process of each test step.

### Key Features

#### 1. Real-time Execution Monitoring

- **Real-time Status Updates**: Push execution status in real-time via Server-Sent Events (SSE)
- **Node-level Visualization**: Each node displays execution status in real-time (waiting, running, success, failed)
- **Progress Tracking**: Display overall execution progress in real-time

#### 2. Detailed Execution Logs

Click any node to view:
- 📋 **Request Details**: Complete request URL, Headers, Body
- 📥 **Response Details**: Response status code, Headers, Body
- ⏱️ **Performance Metrics**: Response time, timing for each phase
- ✅ **Assertion Results**: Execution results and details for each assertion
- 🔄 **Variable Extraction**: Extracted variable names and values

#### 3. Execution Control

- **▶️ Run Test**: Start test execution with one click
- **⏸️ Pause/Resume**: Pause execution and resume anytime
- **🛑 Stop Execution**: Terminate test immediately
- **🔄 Retry Failed**: Retry failed nodes

#### 4. Execution History

Visit `/execution` page to view:
- 📊 Execution records for all test cases
- 📈 Success rate statistics
- ⏱️ Execution time trends
- 🔍 Filter and search history records

### Usage Guide

#### Execute Tests from Orchestrator

1. Open the visual orchestrator for the test case
2. Click the "Run Test" ▶️ button in the top right corner
3. Observe the real-time execution process:
   - Green ✅: Success
   - Red ❌: Failed
   - Blue 🔵: Running
   - Gray ⚪: Waiting

4. Click any node to view detailed logs

#### View Execution History

1. Visit `/execution` page
2. View list of all execution records
3. Click any record to view details
4. Use filters to filter by status, time, etc.

#### Analyze Execution Results

**Successful Execution**:
- ✅ All assertions passed
- ✅ All API calls succeeded
- ✅ Variables correctly extracted and passed

**Failed Execution**:
- ❌ Click failed node to view error information
- 📋 Check request and response details
- 🔍 Analyze assertion failure reasons
- 🔄 Fix issues and rerun

### Real-time Monitoring Features

#### SSE Real-time Push

API 智能测试平台 uses Server-Sent Events technology:
- 📡 Zero-latency status updates
- 🔄 Automatic reconnection
- 💡 Low resource usage

#### Execution Status

Execution status for each node:
- `pending` - Waiting to execute
- `running` - Executing
- `success` - Execution successful
- `failed` - Execution failed
- `skipped` - Skipped execution

### Performance Monitoring

View detailed performance metrics:
- **DNS Lookup Time**
- **TCP Connection Time**
- **TLS Handshake Time**
- **Time to First Byte (TTFB)**
- **Content Download Time**
- **Total Response Time**

### Assertion Validation

Supports multiple assertion types:

#### 1. Status Code Assertion
```
Response status equals 200
Response status in [200, 201, 204]
```

#### 2. JSONPath Assertion
```
$.data.id exists
$.data.name equals "test"
$.data.count greaterThan 0
```

#### 3. Response Time Assertion
```
Response time lessThan 1000ms
```

#### 4. Custom Assertion
```
Regular expression matching
JSON Schema validation
Custom function validation
```

### Best Practices

#### 1. Use Assertions Wisely

- ✅ Verify key fields
- ✅ Check response status
- ✅ Verify data types
- ❌ Avoid over-assertion

#### 2. Review Detailed Logs

When tests fail:
1. View request details for failed nodes
2. Check if response content meets expectations
3. Verify assertion conditions are reasonable
4. Check if variable references are correct

#### 3. Performance Optimization

- Use parallel nodes to improve execution efficiency
- Set reasonable timeout values
- Avoid unnecessary wait nodes

#### 4. Execution History Management

- Regularly review execution trends
- Identify unstable tests
- Optimize cases with high failure rates

### Troubleshooting

#### Common Issues

**1. Execution Stuck**
- Check if executor service is running normally
- View executor logs: `logs/executor.log`
- Check if API endpoints are accessible

**2. Assertions Always Fail**
- Verify response data structure
- Check JSONPath expressions
- Confirm assertion conditions are correct

**3. Variable Reference Errors**
- Confirm prerequisite nodes executed successfully
- Check if variable names are correct
- Verify JSONPath extraction paths

**4. Long Response Times**
- Check network connection
- Optimize API performance
- Adjust timeout settings

### Technical Implementation

API 智能测试平台's execution engine:
- **Frontend**: React + SSE Client
- **Backend**: Python FastAPI
- **Communication**: Server-Sent Events
- **Storage**: SQLite + Prisma

Execution flow:
```
Frontend Trigger → API Routes → Python Executor → 
Execute Tests → SSE Push Status → Frontend Real-time Update → Save Results
```

