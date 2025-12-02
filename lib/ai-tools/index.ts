/**
 * AI 工具函数
 * 提供给 AI 调用的各种工具
 */

import { PrismaClient } from '@prisma/client';
import { OrchestrationPlan } from '@/types/orchestration';
import { assembleTestCases, type ApiMetadata } from './assembler';
import { hierarchicalSearchApis, extractLayerKeywords } from './hierarchical-search';

const prisma = new PrismaClient();

// 导出层级检索函数
export { hierarchicalSearchApis, extractLayerKeywords };

/**
 * 获取 API 详细信息
 */
export async function getApiDetail(apiId: string) {
  const api = await prisma.api.findUnique({
    where: { id: apiId },
    include: {
      category: true,
      tags: {
        include: {
          tag: true
        }
      }
    }
  });

  if (!api) {
    throw new Error('API 不存在');
  }

  // 解析 JSON 字段
  // ⚠️ 注意：不返回 requestHeaders 和 responseHeaders，它们包含大量冗余数据（如长 JWT token）
  // 这些数据会导致 AI 输出超出 token 限制，且对生成测试用例没有帮助
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    method: api.method,
    url: api.url,
    path: api.path,
    category: api.category?.name,
    tags: api.tags.map(t => t.tag.name),
    requestQuery: api.requestQuery ? JSON.parse(api.requestQuery) : null,
    requestBody: api.requestBody ? JSON.parse(api.requestBody) : null,
    responseStatus: api.responseStatus,
    responseBody: api.responseBody ? JSON.parse(api.responseBody) : null,
  };
}

/**
 * 判断 API 是否会创建数据
 */
function willCreateData(api: any): boolean {
  let score = 0;

  if (api.method === 'POST' || api.method === 'PUT') score += 1;

  const createKeywords = ['创建', '新增', '添加', '注册', '保存', 'create', 'add', 'register', 'save'];
  if (createKeywords.some(keyword => api.name?.includes(keyword))) score += 1;

  const createPaths = ['/create', '/add', '/register', '/save', '/new'];
  if (createPaths.some(path => api.path?.includes(path))) score += 1;

  if (api.responseBody) {
    const bodyStr = JSON.stringify(api.responseBody);
    if (bodyStr.includes('"id"')) score += 1;
  }

  return score >= 2;
}

/**
 * 从 API 中提取资源类型
 */
function extractResourceType(api: any): string {
  if (api.category) return api.category;

  const pathMatch = api.path?.match(/\/api\/([^\/]+)\//);
  if (pathMatch) return pathMatch[1];

  const nameMatch = api.name?.match(/创建(.+)|新增(.+)|添加(.+)/);
  if (nameMatch) return nameMatch[1] || nameMatch[2] || nameMatch[3];

  return '资源';
}

/**
 * 智能搜索删除 API
 */
export async function smartSearchDeleteApi(params: {
  createApiId: string;
}) {
  const createApi = await getApiDetail(params.createApiId);
  
  if (!willCreateData(createApi)) {
    return { 
      needCleanup: false, 
      reason: '该 API 不会创建数据，无需清理' 
    };
  }

  const resourceType = extractResourceType(createApi);
  
  // 策略 1: 按分类 + 删除关键词
  let deleteApis = await prisma.api.findMany({
    where: {
      category: createApi.category ? {
        name: { contains: resourceType }
      } : undefined,
      OR: [
        { name: { contains: '删除' } },
        { name: { contains: 'delete' } },
        { path: { contains: '/delete' } },
        { method: 'DELETE' },
      ]
    },
    include: {
      category: true
    },
    take: 5
  });

  if (deleteApis.length === 0) {
    // 策略 2: 按 DELETE 方法 + 路径匹配
    const pathPrefix = createApi.path.replace(/\/create.*/, '');
    deleteApis = await prisma.api.findMany({
      where: {
        method: 'DELETE',
        path: {
          contains: pathPrefix
        }
      },
      include: {
        category: true
      },
      take: 5
    });
  }

  if (deleteApis.length > 0) {
    const deleteApi = deleteApis[0];
    
    // 提取路径参数名（如 /api/resource/{id} → id）
    const pathParamMatch = deleteApi.path?.match(/\{(\w+)\}/);
    const pathParamName = pathParamMatch ? pathParamMatch[1] : 'id';
    
    return {
      needCleanup: true,
      deleteApi: {
        id: deleteApi.id,
        name: deleteApi.name,
        method: deleteApi.method,
        path: deleteApi.path,
      },
      resourceType,
      resourceIdVariable: `${resourceType.replace(/[^a-zA-Z0-9]/g, '')}Id`,
      pathParamName,
    };
  }

  return {
    needCleanup: false,
    reason: '未找到对应的删除 API',
  };
}

/**
 * 创建测试用例
 */
export async function createTestCases(testCases: any[]) {
  const created = await Promise.all(
    testCases.map(async (testCase: any) => {
      // 确保 flowConfig 中的所有节点都有 data 字段
      const flowConfig = testCase.flowConfig;
      if (flowConfig && flowConfig.nodes) {
        flowConfig.nodes = flowConfig.nodes.map((node: any) => {
          // 如果节点没有 data 字段，添加空对象
          if (!node.data) {
            node.data = {};
          }
          return node;
        });
      }
      
      // 1. 创建 TestCase
      const tc = await prisma.testCase.create({
        data: {
          name: testCase.name,
          description: testCase.description,
          status: 'draft',
          category: testCase.category,
          tags: JSON.stringify(testCase.tags || []),
          flowConfig: JSON.stringify(flowConfig),
        },
      });

      // 2. 创建 TestSteps
      const apiNodes = testCase.flowConfig.nodes.filter((n: any) => n.type === 'api');
      if (apiNodes.length > 0) {
        const steps = apiNodes.map((node: any, index: number) => ({
          testCaseId: tc.id,
          name: node.data.name,
          order: index + 1,
          nodeId: node.id,
          apiId: node.data.apiId,
          type: node.type,
          config: JSON.stringify(node.data),
          positionX: node.position.x,
          positionY: node.position.y,
        }));

        await prisma.testStep.createMany({
          data: steps,
        });
      }

      return {
        id: tc.id,
        name: tc.name,
        nodeCount: testCase.flowConfig.nodes.length,
        apiNodeCount: apiNodes.length,
      };
    })
  );

  return created;
}

/**
 * 组装并创建测试用例（新方法）
 * AI 只需要提供编排指令，后端自动查询 API 详情并组装完整结构
 */
/**
 * 进度回调函数类型
 */
export type ProgressCallback = (progress: {
  step: number;
  totalSteps: number;
  message: string;
  detail?: string;
}) => void;

export async function assembleAndCreateTestCases(params: {
  orchestrationPlan: OrchestrationPlan;
  onProgress?: ProgressCallback;
}) {
  const { orchestrationPlan, onProgress } = params;
  
  console.log('\n' + '▓'.repeat(120));
  console.log('🤖 [AI Tools] 收到编排指令，开始自动组装测试用例');
  console.log('▓'.repeat(120));
  
  console.log('📥 [AI Tools] AI 编排指令 (完整):', JSON.stringify(orchestrationPlan, null, 2));
  console.log(`\n📊 [AI Tools] 测试用例数量: ${orchestrationPlan.testCases.length}`);

  // 收集所有需要的 API ID
  console.log('\n🔍 [AI Tools] 第 1 步: 收集所有需要的 API ID');
  onProgress?.({
    step: 1,
    totalSteps: 4,
    message: '📋 收集 API 信息',
    detail: `正在分析 ${orchestrationPlan.testCases.length} 个测试用例...`
  });
  
  const apiIds = new Set<string>();
  for (const testCase of orchestrationPlan.testCases) {
    console.log(`  📋 测试用例: ${testCase.name}`);
    for (const node of testCase.nodes) {
      if (node.type === 'api') {
        const apiId = (node as any).apiId;
        apiIds.add(apiId);
        console.log(`    ➕ 节点 ${node.id} 需要 API: ${apiId}`);
      }
    }
  }
  
  console.log(`\n✅ [AI Tools] 收集完成，共需要 ${apiIds.size} 个不同的 API`);
  console.log('📋 [AI Tools] API ID 列表:', Array.from(apiIds));
  
  onProgress?.({
    step: 1,
    totalSteps: 4,
    message: '✅ API 收集完成',
    detail: `找到 ${apiIds.size} 个不同的 API`
  });

  // 批量查询 API 详情
  console.log('\n🔍 [AI Tools] 第 2 步: 批量查询 API 详情');
  onProgress?.({
    step: 2,
    totalSteps: 4,
    message: '🔍 查询 API 详情',
    detail: `需要查询 ${apiIds.size} 个 API...`
  });
  
  const apiCache = new Map<string, ApiMetadata>();
  let querySuccess = 0;
  let queryFailed = 0;
  const apiIdsArray = Array.from(apiIds);
  
  for (let i = 0; i < apiIdsArray.length; i++) {
    const apiId = apiIdsArray[i];
    try {
      console.log(`  🔎 查询 API: ${apiId}...`);
      const apiDetail = await getApiDetail(apiId);
      apiCache.set(apiId, apiDetail as ApiMetadata);
      console.log(`    ✅ 成功: ${apiDetail.name} (${apiDetail.method} ${apiDetail.path})`);
      querySuccess++;
      
      // 发送进度更新
      onProgress?.({
        step: 2,
        totalSteps: 4,
        message: `🔍 查询 API (${querySuccess}/${apiIds.size})`,
        detail: `${apiDetail.name} - ${apiDetail.method} ${apiDetail.path}`
      });
    } catch (error) {
      console.error(`    ❌ 失败: ${error}`);
      queryFailed++;
      throw new Error(`API ${apiId} 不存在或查询失败: ${error}`);
    }
  }
  
  console.log(`\n✅ [AI Tools] API 查询完成: 成功 ${querySuccess} 个, 失败 ${queryFailed} 个`);
  console.log('🗄️ [AI Tools] API 缓存大小:', apiCache.size);
  
  onProgress?.({
    step: 2,
    totalSteps: 4,
    message: '✅ API 查询完成',
    detail: `成功查询 ${querySuccess} 个 API`
  });

  // 使用组装引擎生成完整的测试用例结构
  console.log('\n🔧 [AI Tools] 第 3 步: 调用组装引擎生成完整测试用例');
  onProgress?.({
    step: 3,
    totalSteps: 4,
    message: '🔧 组装测试用例',
    detail: `正在组装 ${orchestrationPlan.testCases.length} 个测试用例...`
  });
  
  const assembledTestCases = await assembleTestCases(
    orchestrationPlan, 
    apiCache,
    (assemblerProgress) => {
      // 转发组装引擎的进度到外部
      onProgress?.({
        step: 3,
        totalSteps: 4,
        message: `🔧 组装测试用例 (${assemblerProgress.current}/${assemblerProgress.total})`,
        detail: assemblerProgress.testCaseName
      });
    }
  );
  console.log(`✅ [AI Tools] 组装完成，生成了 ${assembledTestCases.length} 个测试用例`);
  
  onProgress?.({
    step: 3,
    totalSteps: 4,
    message: '✅ 组装完成',
    detail: `成功组装 ${assembledTestCases.length} 个测试用例`
  });

  // 保存到数据库
  console.log('\n💾 [AI Tools] 第 4 步: 保存到数据库');
  onProgress?.({
    step: 4,
    totalSteps: 4,
    message: '💾 保存到数据库',
    detail: `正在保存 ${assembledTestCases.length} 个测试用例...`
  });
  
  const created = await createTestCases(assembledTestCases);
  console.log(`✅ [AI Tools] 保存成功，已创建 ${created.length} 个测试用例`);
  
  created.forEach((tc, index) => {
    console.log(`  ${index + 1}. ${tc.name} (ID: ${tc.id})`);
  });

  console.log('\n' + '▓'.repeat(120));
  console.log(`🎉 [AI Tools] 全部完成！成功创建 ${created.length} 个测试用例`);
  console.log('▓'.repeat(120) + '\n');
  
  onProgress?.({
    step: 4,
    totalSteps: 4,
    message: '🎉 全部完成',
    detail: `成功创建 ${created.length} 个测试用例`
  });

  return {
    success: true,
    created,
    message: `成功创建 ${created.length} 个测试用例`,
  };
}

/**
 * 工具定义（用于 Function Calling）
 */
export const AI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "hierarchical_search_apis",
      description: "基于4层分类结构的层级化智能API检索。支持从平台->组件->功能->API名称的层级匹配，匹配度越高分数越高。当无法提取层级时，使用userQuery参数进行全文关键词搜索。",
      parameters: {
        type: "object",
        properties: {
          platform: {
            type: "string",
            description: "第1层：平台名称，从用户描述中提取系统或平台名称"
          },
          component: {
            type: "string",
            description: "第2层：组件名称，从用户描述中提取业务模块或组件名称"
          },
          feature: {
            type: "string",
            description: "第3层：功能名称，从用户描述中提取功能领域或业务场景"
          },
          apiName: {
            type: "string",
            description: "第4层：API动作名称，提取具体操作动词（如：新增、创建、查询、列表、删除、修改等）"
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            description: "HTTP 方法（可选）"
          },
          userQuery: {
            type: "string",
            description: "用户原始查询（当无法提取层级关键词时使用，作为全文关键词搜索的fallback）"
          },
          limit: {
            type: "number",
            description: "返回结果数量限制，默认15"
          }
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_api_detail",
      description: "获取指定 API 的完整信息，包括请求参数、响应示例等",
      parameters: {
        type: "object",
        properties: {
          apiId: {
            type: "string",
            description: "API 的唯一 ID"
          }
        },
        required: ["apiId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "smart_search_delete_api",
      description: "智能搜索对应的删除 API，用于后置清理。只在判断会创建数据时调用。",
      parameters: {
        type: "object",
        properties: {
          createApiId: {
            type: "string",
            description: "创建 API 的 ID"
          }
        },
        required: ["createApiId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "assemble_and_create_test_cases",
      description: "【推荐使用】根据编排指令自动组装并创建测试用例。AI 只需要输出轻量级的编排指令，后端会自动查询 API 详情并生成完整的测试用例结构（包括 flowConfig、节点位置、ParamValue 格式等）。",
      parameters: {
        type: "object",
        properties: {
          orchestrationPlan: {
            type: "object",
            description: "编排指令，包含测试用例列表。后端会根据 nodes 中的 apiId 自动查询 API 详情，AI 不需要传递 apiDetails。",
            properties: {
              testCases: {
                type: "array",
                description: "测试用例列表",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "用例名称" },
                    description: { type: "string", description: "用例描述" },
                    category: { type: "string", description: "分类" },
                    tags: { 
                      type: "array", 
                      items: { type: "string" },
                      description: "标签列表"
                    },
                    nodes: {
                      type: "array",
                      description: "节点列表（不包含 start 和 end）",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string", description: "节点 ID，必须以 step_ 开头" },
                          type: { type: "string", enum: ["api", "assertion"], description: "节点类型" },
                          apiId: { type: "string", description: "API ID（api 节点必填，后端会自动查询该 API 的详情）" },
                          params: {
                            type: "object",
                            description: "参数配置（可选）",
                            properties: {
                              body: { type: "object", description: "请求体参数，直接写业务值" },
                              pathParams: { type: "object", description: "路径参数" },
                              queryParams: { type: "object", description: "查询参数" },
                              headers: { type: "object", description: "请求头" }
                            }
                          },
                          variableRefs: {
                            type: "array",
                            description: "变量引用列表",
                            items: {
                              type: "object",
                              properties: {
                                paramPath: { type: "string", description: "参数路径，如 'pathParams.id'" },
                                sourceNode: { type: "string", description: "源节点 ID，如 'step_1'" },
                                sourcePath: { type: "string", description: "源数据路径，如 'response.data.id'" }
                              },
                              required: ["paramPath", "sourceNode", "sourcePath"]
                            }
                          },
                          assertions: {
                            type: "array",
                            description: "断言列表",
                            items: { type: "object" }
                          },
                          isCleanup: { type: "boolean", description: "是否为清理节点" }
                        },
                        required: ["id", "type"]
                      }
                    },
                    edges: {
                      type: "array",
                      description: "边列表（执行顺序）",
                      items: {
                        type: "object",
                        properties: {
                          from: { type: "string", description: "起始节点 ID" },
                          to: { type: "string", description: "目标节点 ID" }
                        },
                        required: ["from", "to"]
                      }
                    }
                  },
                  required: ["name", "nodes", "edges"]
                }
              }
            },
            required: ["testCases"]
          }
        },
        required: ["orchestrationPlan"],
      },
    },
  },
];


