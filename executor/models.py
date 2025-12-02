"""
数据模型定义 - 对应 TypeScript 类型和数据库结构
"""
from typing import Optional, Dict, Any, List, Union, Literal
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ValueType(str, Enum):
    """参数值类型"""
    FIXED = "fixed"
    VARIABLE = "variable"


class NodeType(str, Enum):
    """节点类型"""
    START = "start"
    API = "api"
    WAIT = "wait"
    ASSERTION = "assertion"
    PARALLEL = "parallel"
    END = "end"


class TestCaseStatus(str, Enum):
    """测试用例状态"""
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class AssertionOperator(str, Enum):
    """断言操作符"""
    EQUALS = "equals"
    NOT_EQUALS = "notEquals"
    CONTAINS = "contains"
    NOT_CONTAINS = "notContains"
    GREATER_THAN = "greaterThan"
    LESS_THAN = "lessThan"
    EXISTS = "exists"
    NOT_EXISTS = "notExists"


class WaitType(str, Enum):
    """等待类型"""
    TIME = "time"
    CONDITION = "condition"


class ParamValue(BaseModel):
    """参数值配置"""
    valueType: ValueType
    value: Optional[Union[str, int, float, bool, list, dict]] = None  # 支持数组和对象类型
    variable: Optional[str] = None  # 变量引用路径
    template: Optional[str] = None  # 模板字符串


class RequestConfig(BaseModel):
    """请求配置"""
    pathParams: Optional[Dict[str, ParamValue]] = None
    queryParams: Optional[Dict[str, ParamValue]] = None
    headers: Optional[Dict[str, ParamValue]] = None
    body: Optional[Dict[str, Any]] = None  # 支持嵌套结构


class ResponseExtract(BaseModel):
    """响应提取配置"""
    path: str  # JSONPath 路径
    variable: str  # 变量名


class ExpectedType(str, Enum):
    """期望值类型"""
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"
    AUTO = "auto"  # 自动推断


class Assertion(BaseModel):
    """断言配置"""
    id: Optional[str] = None
    field: str  # 字段路径
    operator: AssertionOperator
    expected: Optional[Union[str, int, float, bool]] = None
    expectedType: ExpectedType = ExpectedType.AUTO  # 期望值类型，默认自动推断


class WaitCondition(BaseModel):
    """等待条件"""
    variable: str
    operator: Literal["equals", "notEquals", "exists"]
    expected: Optional[Union[str, int, float, bool]] = None


class WaitConfig(BaseModel):
    """等待配置"""
    type: WaitType
    value: Optional[int] = None  # 等待时间（毫秒）
    timeout: Optional[int] = 30000  # 条件等待的最大超时时间（毫秒），默认30秒
    checkInterval: Optional[int] = 2000  # 条件检查间隔（毫秒），默认2秒
    condition: Optional[WaitCondition] = None


class AssertionFailureStrategy(str, Enum):
    """断言失败策略"""
    STOP_ON_FAILURE = "stopOnFailure"  # 遇到失败就停止
    CONTINUE_ALL = "continueAll"  # 执行所有断言


class ApiNodeData(BaseModel):
    """API 节点数据"""
    apiId: str
    name: Optional[str] = None
    method: str
    url: str
    requestConfig: Optional[RequestConfig] = None
    responseExtract: Optional[List[ResponseExtract]] = None
    assertions: Optional[List[Assertion]] = None
    assertionFailureStrategy: AssertionFailureStrategy = AssertionFailureStrategy.STOP_ON_FAILURE
    wait: Optional[WaitConfig] = None
    isCleanup: bool = False  # 是否为后置清理节点


class ParallelApiConfig(BaseModel):
    """并发节点中的单个 API 配置（与 ApiNodeData 保持完全一致）"""
    id: str
    apiId: str
    name: Optional[str] = None
    method: str
    url: str
    requestConfig: Optional[RequestConfig] = None
    responseExtract: Optional[List[ResponseExtract]] = None
    assertions: Optional[List[Assertion]] = None
    assertionFailureStrategy: AssertionFailureStrategy = AssertionFailureStrategy.STOP_ON_FAILURE
    wait: Optional[WaitConfig] = None
    isCleanup: bool = False  # 是否为后置清理节点


class ParallelNodeData(BaseModel):
    """并发节点数据"""
    name: str
    description: Optional[str] = None
    apis: List[ParallelApiConfig]
    failureStrategy: Optional[Literal["stopAll", "continueAll"]] = "stopAll"
    isCleanup: bool = False  # 是否为后置清理节点


class FlowNode(BaseModel):
    """流程图节点"""
    id: str
    type: NodeType
    position: Dict[str, float]
    data: Dict[str, Any]  # 可以是 ApiNodeData 或 ParallelNodeData


class FlowEdge(BaseModel):
    """流程图边"""
    id: str
    source: str
    target: str
    type: Optional[str] = None


class FlowConfig(BaseModel):
    """流程图配置"""
    nodes: List[FlowNode]
    edges: List[FlowEdge]
    variables: Optional[Dict[str, Any]] = None


class TestStep(BaseModel):
    """测试步骤"""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    order: int
    nodeId: str
    apiId: Optional[str] = None
    type: NodeType
    config: Dict[str, Any]
    positionX: float = 0
    positionY: float = 0


class TestCase(BaseModel):
    """测试用例"""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    status: TestCaseStatus
    tags: Optional[List[str]] = None
    flowConfig: FlowConfig
    steps: Optional[List[TestStep]] = None
    executeCount: int = 0
    successCount: int = 0
    failCount: int = 0
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None


class ExecutionResult(BaseModel):
    """执行结果"""
    success: bool
    testCaseId: str
    testCaseName: str
    startTime: datetime
    endTime: Optional[datetime] = None
    duration: Optional[float] = None  # 秒
    totalSteps: int
    executedSteps: int
    passedSteps: int
    failedSteps: int
    steps: List[Dict[str, Any]] = []
    error: Optional[str] = None
    variables: Dict[str, Any] = {}


class StepExecutionResult(BaseModel):
    """步骤执行结果"""
    stepId: str
    stepName: str
    nodeId: str
    nodeType: NodeType
    success: bool
    startTime: datetime
    endTime: Optional[datetime] = None
    duration: Optional[float] = None  # 秒
    request: Optional[Dict[str, Any]] = None
    response: Optional[Dict[str, Any]] = None
    assertions: Optional[List[Dict[str, Any]]] = None
    extractedVariables: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

