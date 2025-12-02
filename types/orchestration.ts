/**
 * AI 编排指令类型定义
 * AI 只需要输出轻量级的编排指令，后端代码负责组装完整的测试用例结构
 */

import { Assertion, WaitConfig } from './test-case';

/**
 * 变量引用配置
 * 描述一个参数需要引用另一个节点的数据
 */
export interface VariableReference {
  /** 参数路径，如 "pathParams.id"、"headers.Authorization"、"body.username" */
  paramPath: string;
  /** 源节点 ID，如 "step_1"、"step_login" */
  sourceNode: string;
  /** 源节点中的数据路径，如 "response.data.id"、"response.data.token" */
  sourcePath: string;
  /** 可选：值模板，如 "Bearer {value}" */
  template?: string;
}

/**
 * 节点参数配置（简化版）
 * AI 只需要指定业务值，不需要关心 ParamValue 的格式
 */
export interface NodeParams {
  /** 请求体参数，直接写业务值 */
  body?: Record<string, any>;
  /** 路径参数，key 是路径参数名 */
  pathParams?: Record<string, any>;
  /** 查询参数 */
  queryParams?: Record<string, any>;
  /** 请求头 */
  headers?: Record<string, any>;
}

/**
 * API 节点编排配置
 */
export interface ApiNodePlan {
  /** 节点 ID，必须以 step_ 开头，如 "step_1"、"step_2" */
  id: string;
  /** 节点类型 */
  type: 'api';
  /** 使用的 API ID（从 get_api_detail 获取） */
  apiId: string;
  /** 参数配置（可选，如果所有参数都是引用变量，可以不填） */
  params?: NodeParams;
  /** 变量引用配置 */
  variableRefs?: VariableReference[];
  /** 断言配置 */
  assertions?: Assertion[];
  /** 等待配置（可选） */
  wait?: WaitConfig;
  /** 是否为后置清理节点 */
  isCleanup?: boolean;
}

/**
 * 断言节点编排配置
 */
export interface AssertionNodePlan {
  /** 节点 ID */
  id: string;
  /** 节点类型 */
  type: 'assertion';
  /** 断言配置 */
  assertions: Assertion[];
}

/**
 * 节点编排配置（联合类型）
 */
export type NodePlan = ApiNodePlan | AssertionNodePlan;

/**
 * 流程边
 */
export interface EdgePlan {
  /** 起始节点 ID */
  from: string;
  /** 目标节点 ID */
  to: string;
}

/**
 * 测试用例编排配置
 */
export interface TestCasePlan {
  /** 用例名称 */
  name: string;
  /** 用例描述 */
  description?: string;
  /** 分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 节点列表 */
  nodes: NodePlan[];
  /** 边列表（执行顺序） */
  edges: EdgePlan[];
}

/**
 * 完整的编排计划
 */
export interface OrchestrationPlan {
  /** 测试用例列表 */
  testCases: TestCasePlan[];
}

