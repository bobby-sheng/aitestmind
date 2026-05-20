/**
 * 测试用例组装引擎
 * 根据 AI 的编排指令 + API 元数据，自动生成完整的测试用例结构
 */

import {
  OrchestrationPlan,
  TestCasePlan,
  NodePlan,
  ApiNodePlan,
  AssertionNodePlan,
  VariableReference,
} from '@/types/orchestration';
import {
  TestCase,
  FlowConfig,
  FlowNode,
  FlowEdge,
  ApiNodeData,
  Assertion,
  ParamValue,
  RequestConfig,
} from '@/types/test-case';

/**
 * API 元数据（从 get_api_detail 获取）
 */
export interface ApiMetadata {
  id: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  path: string;
  category?: string;
  tags?: string[];
  requestHeaders?: Record<string, any>;
  requestMimeType?: string; // 请求内容类型，如 "application/json"、"multipart/form-data"
  requestQuery?: Record<string, any>;
  requestBody?: Record<string, any>;
  responseStatus?: number;
  responseHeaders?: Record<string, any>;
  responseBody?: Record<string, any>;
}

/**
 * 将简单值转换为 ParamValue 格式
 */
function toParamValue(value: any): ParamValue {
  return {
    valueType: 'fixed',
    value,
  };
}

/**
 * 递归转换对象/数组为 ParamValue 格式
 */
function transformToParamValue(obj: any): any {
  if (obj === null || obj === undefined) {
    return { valueType: 'fixed', value: obj };
  }

  if (Array.isArray(obj)) {
    // 数组类型：保持数组格式，只在最外层包装 ParamValue
    return {
      valueType: 'fixed',
      value: obj,
    };
  }

  if (typeof obj === 'object') {
    // 对象类型：递归处理每个字段
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // 如果已经是 ParamValue 格式，直接使用
      if (
        value &&
        typeof value === 'object' &&
        'valueType' in value &&
        ('value' in value || 'variable' in value)
      ) {
        result[key] = value;
      } else {
        // 简单类型（string/number/boolean）或复杂类型（array/object）
        result[key] = {
          valueType: 'fixed',
          value,
        };
      }
    }
    return result;
  }

  // 基本类型
  return {
    valueType: 'fixed',
    value: obj,
  };
}

/**
 * 设置嵌套路径的值
 * 例如：setNestedValue(obj, "pathParams.id", value) 会设置 obj.pathParams.id = value
 */
function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }

  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}

/**
 * 处理变量引用
 * 将 AI 指定的变量引用应用到 requestConfig 中
 */
function applyVariableReferences(
  requestConfig: RequestConfig,
  variableRefs: VariableReference[]
): void {
  for (const ref of variableRefs) {
    // 构造变量引用路径：{源节点ID}.{数据路径}
    const variablePath = `${ref.sourceNode}.${ref.sourcePath}`;

    // 创建 ParamValue 对象
    const paramValue: ParamValue = {
      valueType: 'variable',
      variable: variablePath,
    };

    // 如果有模板，添加到 ParamValue
    if (ref.template) {
      paramValue.template = ref.template;
      console.log(`  📋 [组装引擎] 变量引用带模板: ${ref.paramPath} = ${ref.template.replace('{value}', variablePath)}`);
    }

    // 设置到 requestConfig 的对应路径
    setNestedValue(requestConfig, ref.paramPath, paramValue);
  }
}

/**
 * 将 MIME 类型转换为 ContentType 枚举值
 */
function mimeTypeToContentType(mimeType?: string): 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw' | 'none' | undefined {
  if (!mimeType) return undefined;
  
  const lowerMime = mimeType.toLowerCase();
  if (lowerMime.includes('application/json')) return 'json';
  if (lowerMime.includes('multipart/form-data')) return 'form-data';
  if (lowerMime.includes('application/x-www-form-urlencoded')) return 'x-www-form-urlencoded';
  if (lowerMime.includes('text/')) return 'raw';
  
  return undefined;
}

/**
 * 构建 API 节点的 requestConfig
 */
function buildRequestConfig(
  api: ApiMetadata,
  nodePlan: ApiNodePlan
): RequestConfig {
  console.log(`\n🔧 [组装引擎] 构建 requestConfig - 节点: ${nodePlan.id}, API: ${api.name}`);
  
  const requestConfig: RequestConfig = {
    pathParams: {},
    queryParams: {},
    headers: {},
    body: {},
  };

  // 1. 首先从 API 元数据中提取默认值（这是录制时保存的原始数据）
  console.log('📋 [组装引擎] 从 API 元数据提取默认参数');
  
  // 1.1 提取默认请求头
  if (api.requestHeaders && typeof api.requestHeaders === 'object') {
    requestConfig.headers = transformToParamValue(api.requestHeaders);
    console.log('  ✅ 默认 headers 已填充');
  }
  
  // 1.2 提取默认查询参数
  if (api.requestQuery && typeof api.requestQuery === 'object') {
    requestConfig.queryParams = transformToParamValue(api.requestQuery);
    console.log('  ✅ 默认 queryParams 已填充');
  }
  
  // 1.3 提取默认请求体（包括 form-data 表单数据）
  if (api.requestBody && typeof api.requestBody === 'object') {
    requestConfig.body = transformToParamValue(api.requestBody);
    console.log('  ✅ 默认 body 已填充');
  }
  
  // 1.4 设置内容类型（json/form-data/x-www-form-urlencoded 等）
  const contentType = mimeTypeToContentType(api.requestMimeType);
  if (contentType) {
    requestConfig.contentType = contentType;
    console.log(`  ✅ contentType 已设置: ${contentType} (原始: ${api.requestMimeType})`);
  }

  // 2. 处理 AI 指定的参数值（会覆盖/合并默认值）
  if (nodePlan.params) {
    console.log('📝 [组装引擎] AI 指定的参数:', JSON.stringify(nodePlan.params, null, 2));
    
    if (nodePlan.params.pathParams) {
      requestConfig.pathParams = transformToParamValue(nodePlan.params.pathParams);
      console.log('  ✅ pathParams 已转换为 ParamValue 格式');
    }
    if (nodePlan.params.queryParams) {
      // 合并 AI 指定的 queryParams 到默认值（AI 指定的优先）
      const aiQueryParams = transformToParamValue(nodePlan.params.queryParams);
      requestConfig.queryParams = {
        ...requestConfig.queryParams,
        ...aiQueryParams,
      };
      console.log('  ✅ AI 指定的 queryParams 已合并');
    }
    if (nodePlan.params.headers) {
      // 合并 AI 指定的 headers 到默认 headers（AI 指定的优先）
      const aiHeaders = transformToParamValue(nodePlan.params.headers);
      requestConfig.headers = {
        ...requestConfig.headers,
        ...aiHeaders,
      };
      console.log('  ✅ AI 指定的 headers 已合并');
    }
    if (nodePlan.params.body) {
      // 合并 AI 指定的 body 到默认 body（AI 指定的优先）
      const aiBody = transformToParamValue(nodePlan.params.body);
      requestConfig.body = {
        ...requestConfig.body,
        ...aiBody,
      };
      console.log('  ✅ AI 指定的 body 已合并');
    }
  }

  // 3. 应用变量引用（覆盖对应字段）
  if (nodePlan.variableRefs && nodePlan.variableRefs.length > 0) {
    console.log(`\n🔗 [组装引擎] 应用 ${nodePlan.variableRefs.length} 个变量引用:`);
    nodePlan.variableRefs.forEach((ref, index) => {
      console.log(`  ${index + 1}. ${ref.paramPath} ← ${ref.sourceNode}.${ref.sourcePath}`);
    });
    
    applyVariableReferences(requestConfig, nodePlan.variableRefs);
    console.log('  ✅ 变量引用已应用');
  }

  console.log('📦 [组装引擎] 最终 requestConfig:', JSON.stringify(requestConfig, null, 2));
  
  return requestConfig;
}

/**
 * 为缺少断言的 API 节点生成默认断言
 */
function generateDefaultAssertions(api: ApiMetadata, nodePlan: ApiNodePlan): Assertion[] {
  return [
    {
      field: 'status',
      operator: 'equals',
      expected: 200,
      expectedType: 'number',
    },
  ];
}

/**
 * 确保断言列表至少包含 status 校验；如果为空则自动生成默认断言
 */
function ensureAssertions(
  assertions: Assertion[] | undefined,
  api: ApiMetadata,
  nodePlan: ApiNodePlan
): Assertion[] {
  if (!assertions || assertions.length === 0) {
    const defaults = generateDefaultAssertions(api, nodePlan);
    console.log(`  ⚠️ [组装引擎] 节点 ${nodePlan.id} 缺少断言，已自动补充 ${defaults.length} 条默认断言`);
    return defaults;
  }

  const hasStatusAssertion = assertions.some(
    a => a.field === 'status' || a.field === 'responseStatus'
  );
  if (!hasStatusAssertion) {
    const statusAssertion: Assertion = {
      field: 'status',
      operator: 'equals',
      expected: 200,
      expectedType: 'number',
    };
    console.log(`  ⚠️ [组装引擎] 节点 ${nodePlan.id} 缺少 status 断言，已自动补充`);
    return [statusAssertion, ...assertions];
  }

  return assertions;
}

/**
 * 构建 API 节点
 */
function buildApiNode(
  nodePlan: ApiNodePlan,
  api: ApiMetadata,
  position: { x: number; y: number }
): FlowNode {
  const requestConfig = buildRequestConfig(api, nodePlan);
  const finalAssertions = ensureAssertions(nodePlan.assertions, api, nodePlan);

  const nodeData: ApiNodeData = {
    apiId: api.id,
    name: api.name,
    method: api.method,
    url: api.path,
    requestConfig,
    assertions: finalAssertions,
    responseExtract: [],
    wait: nodePlan.wait,
    isCleanup: nodePlan.isCleanup || false,
  };

  // 如果有等待配置，记录日志
  if (nodePlan.wait) {
    if (nodePlan.wait.type === 'time') {
      console.log(`  ⏱️ [组装引擎] 节点包含时间等待: ${nodePlan.wait.value}ms`);
    } else if (nodePlan.wait.type === 'condition') {
      console.log(`  ⏱️ [组装引擎] 节点包含条件等待: ${nodePlan.wait.condition?.variable} ${nodePlan.wait.condition?.operator} ${nodePlan.wait.condition?.expected}`);
    }
  }

  return {
    id: nodePlan.id,
    type: 'api',
    position,
    data: nodeData,
  };
}

/**
 * 构建断言节点
 */
function buildAssertionNode(
  nodePlan: AssertionNodePlan,
  position: { x: number; y: number }
): FlowNode {
  return {
    id: nodePlan.id,
    type: 'assertion',
    position,
    data: {
      assertions: nodePlan.assertions,
    },
  };
}

/**
 * 计算节点位置
 * 自动横向排列节点
 */
function calculateNodePositions(nodeCount: number): Array<{ x: number; y: number }> {
  const baseX = 100;
  const baseY = 100;
  const xOffset = 250;

  return Array.from({ length: nodeCount }, (_, i) => ({
    x: baseX + i * xOffset,
    y: baseY,
  }));
}

/**
 * 组装单个测试用例
 */
export async function assembleTestCase(
  testCasePlan: TestCasePlan,
  apiCache: Map<string, ApiMetadata>
): Promise<TestCase> {
  console.log('\n' + '='.repeat(80));
  console.log(`🚀 [组装引擎] 开始组装测试用例: ${testCasePlan.name}`);
  console.log('='.repeat(80));
  console.log('📋 [组装引擎] 测试用例计划:', JSON.stringify(testCasePlan, null, 2));
  
  // 计算所有节点的位置（包括 start 和 end）
  const totalNodeCount = 2 + testCasePlan.nodes.length; // start + nodes + end
  const positions = calculateNodePositions(totalNodeCount);
  console.log(`\n📍 [组装引擎] 计算节点位置: 共 ${totalNodeCount} 个节点 (start + ${testCasePlan.nodes.length} 个业务节点 + end)`);

  // 构建节点列表
  const nodes: FlowNode[] = [];

  // 1. 添加 start 节点
  nodes.push({
    id: 'start',
    type: 'start',
    position: positions[0],
    data: {},
  });
  console.log('  ✅ start 节点已添加');

  // 2. 添加业务节点
  console.log(`\n🔨 [组装引擎] 开始构建 ${testCasePlan.nodes.length} 个业务节点:`);
  for (let i = 0; i < testCasePlan.nodes.length; i++) {
    const nodePlan = testCasePlan.nodes[i];
    const position = positions[i + 1];
    
    console.log(`\n  📦 [组装引擎] 节点 ${i + 1}/${testCasePlan.nodes.length}:`);
    console.log(`     ID: ${nodePlan.id}`);
    console.log(`     类型: ${nodePlan.type}`);

    if (nodePlan.type === 'api') {
      const apiNodePlan = nodePlan as ApiNodePlan;
      const api = apiCache.get(apiNodePlan.apiId);

      if (!api) {
        console.error(`❌ [组装引擎] API ${apiNodePlan.apiId} 的元数据不存在！`);
        throw new Error(`API ${apiNodePlan.apiId} 的元数据不存在`);
      }

      console.log(`     API: ${api.name} (${api.method} ${api.path})`);
      const apiNode = buildApiNode(apiNodePlan, api, position);
      nodes.push(apiNode);
      console.log(`  ✅ API 节点 ${nodePlan.id} 已构建`);
    } else if (nodePlan.type === 'assertion') {
      const assertionNodePlan = nodePlan as AssertionNodePlan;
      console.log(`     断言数量: ${assertionNodePlan.assertions.length}`);
      nodes.push(buildAssertionNode(assertionNodePlan, position));
      console.log(`  ✅ 断言节点 ${nodePlan.id} 已构建`);
    }
  }

  // 3. 添加 end 节点
  nodes.push({
    id: 'end',
    type: 'end',
    position: positions[positions.length - 1],
    data: {},
  });
  console.log('\n  ✅ end 节点已添加');

  // 4. 构建边
  const edges: FlowEdge[] = testCasePlan.edges.map((edgePlan, index) => ({
    id: `e${index + 1}`,
    source: edgePlan.from,
    target: edgePlan.to,
  }));
  
  console.log(`\n🔗 [组装引擎] 构建边: 共 ${edges.length} 条`);
  edges.forEach((edge, index) => {
    console.log(`  ${index + 1}. ${edge.source} → ${edge.target}`);
  });

  // 5. 构建 flowConfig
  const flowConfig: FlowConfig = {
    nodes,
    edges,
  };

  // 6. 返回完整测试用例
  const testCase: TestCase = {
    name: testCasePlan.name,
    description: testCasePlan.description,
    status: 'draft',
    tags: testCasePlan.tags || [],
    flowConfig,
  };
  
  console.log('\n✨ [组装引擎] 测试用例组装完成!');
  console.log('📦 [组装引擎] 最终测试用例结构:', JSON.stringify(testCase, null, 2));
  console.log('='.repeat(80) + '\n');
  
  return testCase;
}

/**
 * 进度回调函数类型
 */
export type AssemblerProgressCallback = (progress: {
  current: number;
  total: number;
  testCaseName: string;
  message: string;
}) => void;

/**
 * 组装多个测试用例
 */
export async function assembleTestCases(
  orchestrationPlan: OrchestrationPlan,
  apiCache: Map<string, ApiMetadata>,
  onProgress?: AssemblerProgressCallback
): Promise<TestCase[]> {
  console.log('\n' + '█'.repeat(100));
  console.log('🎯 [组装引擎] 开始批量组装测试用例');
  console.log('█'.repeat(100));
  console.log(`📊 [组装引擎] 总计: ${orchestrationPlan.testCases.length} 个测试用例`);
  console.log(`🗄️ [组装引擎] API 缓存: ${apiCache.size} 个 API`);
  
  const apiList = Array.from(apiCache.values());
  console.log('📋 [组装引擎] 可用的 API:');
  apiList.forEach((api, index) => {
    console.log(`  ${index + 1}. ${api.name} (${api.method} ${api.path}) - ID: ${api.id}`);
  });
  
  const testCases: TestCase[] = [];
  const total = orchestrationPlan.testCases.length;

  for (let i = 0; i < total; i++) {
    const testCasePlan = orchestrationPlan.testCases[i];
    console.log(`\n🔄 [组装引擎] 处理测试用例 ${i + 1}/${total}: ${testCasePlan.name}`);
    
    // 发送进度回调
    onProgress?.({
      current: i + 1,
      total,
      testCaseName: testCasePlan.name,
      message: `正在组装 "${testCasePlan.name}"...`
    });
    
    const testCase = await assembleTestCase(testCasePlan, apiCache);
    testCases.push(testCase);
    
    console.log(`✅ [组装引擎] 测试用例 ${i + 1} 已完成`);
  }

  console.log('\n' + '█'.repeat(100));
  console.log(`🎉 [组装引擎] 所有测试用例组装完成! 共 ${testCases.length} 个`);
  console.log('█'.repeat(100) + '\n');
  
  return testCases;
}

