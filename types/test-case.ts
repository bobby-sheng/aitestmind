// 测试用例相关类型定义

export type TestCaseStatus = 'draft' | 'active' | 'archived';

export type NodeType = 'start' | 'api' | 'wait' | 'assertion' | 'parallel' | 'end';

export type ValueType = 'fixed' | 'variable';

// 请求配置中的参数值
export interface ParamValue {
  valueType: ValueType;
  value?: string | number | boolean | object | any[]; // 支持空对象 {} 和空数组 []
  variable?: string; // 变量引用路径，如 "step_1.response.data.token"
  template?: string; // 模板，如 "Bearer {value}"
}

// 路径参数配置
export interface PathParams {
  [key: string]: ParamValue;
}

// 查询参数配置
export interface QueryParams {
  [key: string]: ParamValue;
}

// 请求头配置
export interface Headers {
  [key: string]: ParamValue;
}

// 请求体配置（递归支持嵌套对象）
export interface BodyConfig {
  [key: string]: ParamValue | BodyConfig;
}

// 请求配置
export interface RequestConfig {
  pathParams?: PathParams;
  queryParams?: QueryParams;
  headers?: Headers;
  body?: BodyConfig;
}

// 响应提取变量
export interface ResponseExtract {
  path: string; // JSONPath，如 "data.token"
  variable: string; // 变量名，如 "loginToken"
}

// 断言配置
export interface Assertion {
  id?: string;
  field: string; // 字段路径，如 "status" 或 "data.userId"
  operator: 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists';
  expected?: string | number | boolean;
  expectedType?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'auto'; // 期望值类型，默认 'auto'
}

// 等待配置
export interface WaitConfig {
  type: 'time' | 'condition';
  value?: number; // 等待时间（毫秒）
  timeout?: number; // 条件等待的最大超时时间（毫秒），默认30000
  checkInterval?: number; // 条件检查间隔（毫秒），默认2000
  condition?: {
    variable: string; // 等待的变量
    operator: 'equals' | 'notEquals' | 'exists';
    expected?: string | number | boolean;
  };
}

// API节点数据配置
export interface ApiNodeData {
  apiId: string;
  name?: string; // API名称
  method: string;
  url: string;
  requestConfig?: RequestConfig;
  responseExtract?: ResponseExtract[];
  assertions?: Assertion[];
  assertionFailureStrategy?: 'stopOnFailure' | 'continueAll'; // 断言失败策略：遇到失败停止 或 执行所有，默认 'stopOnFailure'
  wait?: WaitConfig;
  isCleanup?: boolean; // 是否为后置清理节点，默认 false
}

// 并发节点中的单个API配置（与 ApiNodeData 保持完全一致）
export interface ParallelApiConfig {
  id: string; // 唯一标识（生成的随机ID）
  apiId: string; // API库中的ID
  name?: string; // 自定义名称
  method: string;
  url: string;
  requestConfig?: RequestConfig;
  responseExtract?: ResponseExtract[]; // 响应提取配置
  assertions?: Assertion[];
  assertionFailureStrategy?: 'stopOnFailure' | 'continueAll'; // 断言失败策略
  wait?: WaitConfig; // 等待配置
  isCleanup?: boolean; // 是否为后置清理节点（并行节点中的单个API不使用此字段）
}

// 并发节点数据配置
export interface ParallelNodeData {
  name: string; // 节点名称，如 "前置准备" 或 "后置清理"
  description?: string; // 节点描述
  apis: ParallelApiConfig[]; // 并发执行的API列表
  failureStrategy?: 'stopAll' | 'continueAll'; // 失败策略：停止所有 或 继续所有
  isCleanup?: boolean; // 是否为后置清理节点，默认 false
}

// 流程图节点
export interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: ApiNodeData | ParallelNodeData | Record<string, any>;
}

// 流程图边
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

// 完整流程图配置
export interface FlowConfig {
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables?: Record<string, any>; // 全局变量
}

// 测试步骤
export interface TestStep {
  id?: string;
  name: string;
  description?: string;
  order: number;
  nodeId: string;
  apiId?: string;
  type: NodeType;
  config: ApiNodeData | Record<string, any>;
  positionX: number;
  positionY: number;
  createdAt?: string;
  updatedAt?: string;
}

// 测试用例
export interface TestCase {
  id?: string;
  name: string;
  description?: string;
  status: TestCaseStatus;
  tags?: string[];
  flowConfig: FlowConfig;
  steps?: TestStep[];
  executeCount?: number;
  successCount?: number;
  failCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// API信息（从API仓库获取）
export interface ApiInfo {
  id: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  path: string;
  categoryId?: string;
  category?: {
    id: string;
    name: string;
    color?: string;
    description?: string;
  };
  tags?: Array<{
    id: string;
    tagId: string;
    tag: {
      id: string;
      name: string;
      color?: string;
    };
  }>;
  requestHeaders?: Record<string, any>;
  requestQuery?: Record<string, any>;
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
  responseStatus?: number;
}

