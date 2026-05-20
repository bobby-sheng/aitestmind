#!/usr/bin/env python3
"""
生成时序图脚本

该脚本可以生成项目流程的时序图，支持多种输出格式。
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def generate_mermaid_diagrams():
    """生成 Mermaid 格式的时序图代码"""
    
    diagrams = {
        "test_suite_execution": """
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
""",
        
        "single_test_case_execution": """
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
""",
        
        "node_execution": """
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
"""
    }
    
    return diagrams


def save_diagrams_to_files(output_dir: Path):
    """保存时序图代码到文件"""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    diagrams = generate_mermaid_diagrams()
    
    for name, diagram_code in diagrams.items():
        file_path = output_dir / f"{name}.mmd"
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(diagram_code)
        print(f"[OK] 已生成: {file_path}")
    
    print(f"\n[INFO] 所有时序图已保存到: {output_dir}")


def print_diagrams():
    """打印时序图代码到控制台"""
    diagrams = generate_mermaid_diagrams()
    
    for name, diagram_code in diagrams.items():
        print(f"\n{'='*60}")
        print(f"时序图: {name}")
        print(f"{'='*60}")
        print(diagram_code)


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description='生成项目流程时序图')
    parser.add_argument(
        '--output-dir',
        type=str,
        default='docs/sequence-diagrams',
        help='输出目录（默认: docs/sequence-diagrams）'
    )
    parser.add_argument(
        '--print',
        action='store_true',
        help='打印时序图代码到控制台'
    )
    
    args = parser.parse_args()
    
    if args.print:
        print_diagrams()
    else:
        output_dir = Path(args.output_dir)
        save_diagrams_to_files(output_dir)
        print("\n[INFO] 提示: 使用 --print 参数可以查看时序图代码")


if __name__ == '__main__':
    main()
