/**
 * 层级化智能API检索
 * 基于4层分类结构：Platform -> Component -> Feature -> API
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 检索结果接口
 */
interface SearchResult {
  id: string;
  name: string;
  description: string | null;
  method: string;
  path: string;
  platform: string | null;
  component: string | null;
  feature: string | null;
}

/**
 * 层级化搜索参数
 */
interface HierarchicalSearchParams {
  // 用户原始描述
  userQuery?: string;
  
  // 分层关键词（AI提取）
  platform?: string;
  component?: string;
  feature?: string;
  apiName?: string;
  
  // 辅助过滤
  method?: string; // HTTP方法
  limit?: number; // 返回结果数量限制
}

/**
 * 对搜索结果按层级匹配度评分排序
 * 匹配的层级越多分数越高，确保最相关的 API 排在前面
 */
function scoreAndSort(
  apis: SearchResult[],
  params: HierarchicalSearchParams,
  topN: number
): SearchResult[] {
  const scored = apis.map(api => {
    let score = 0;

    if (params.platform && api.platform && api.platform.includes(params.platform)) {
      score += 1;
    }
    if (params.component && api.component && api.component.includes(params.component)) {
      score += 1;
    }
    if (params.feature && api.feature && api.feature.includes(params.feature)) {
      score += 1;
    }
    if (params.apiName) {
      if (api.name && api.name.includes(params.apiName)) score += 1;
      if (api.path && api.path.includes(params.apiName)) score += 1;
      if (api.description && api.description.includes(params.apiName)) score += 1;
    }

    return { api, score };
  });

  // 按分数降序排列，相同分数保持数据库原始顺序（稳定排序）
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topN).map(item => item.api);
}

/**
 * 层级化智能搜索API
 *
 * @description
 * 基于4层分类结构进行智能搜索，自动从高到低匹配：
 * - 第1层：平台 (Platform)
 * - 第2层：组件 (Component)
 * - 第3层：功能 (Feature)
 * - 第4层：API名称
 *
 * 匹配策略：
 * 1. 优先匹配多层级 (分数更高)
 * 2. 完全匹配优于包含匹配
 * 3. 支持关键词模糊搜索
 *
 * @example
 * // 示例1: 提供完整层级
 * hierarchicalSearchApis({
 *   platform: 'inet',
 *   component: '高可用组',
 *   feature: '管理',
 *   apiName: '新增'
 * })
 *
 * // 示例2: 只提供部分层级
 * hierarchicalSearchApis({
 *   platform: 'inet',
 *   apiName: '查询实例列表'
 * })
 *
 * // 示例3: 使用原始用户查询
 * hierarchicalSearchApis({
 *   userQuery: '创建ECS云主机实例',
 *   method: 'POST'
 * })
 */
export async function hierarchicalSearchApis(
  params: HierarchicalSearchParams
): Promise<SearchResult[]> {
  try {
    // 最终返回给调用方的数量上限
    const resultLimit = params.limit || 15;
    // 数据库拉取时放宽上限，给评分排序留出足够候选集，避免匹配度高的 API 被截断
    const fetchLimit = Math.max(resultLimit * 3, 50);

    // 构建查询条件
    const where: any = {};

    // ========== 阶段1: 层级化精确查询 ==========

    // 如果提供了平台，优先按平台过滤
    if (params.platform) {
      where.OR = [
        { platform: { contains: params.platform } },
      ];
    }

    // 如果提供了组件，添加组件过滤
    if (params.component) {
      if (!where.OR) where.OR = [];
      where.OR.push(
        { component: { contains: params.component } }
      );
    }

    // 如果提供了功能，添加功能过滤
    if (params.feature) {
      if (!where.OR) where.OR = [];
      where.OR.push(
        { feature: { contains: params.feature } }
      );
    }

    // 如果提供了API名称，添加名称过滤
    if (params.apiName) {
      if (!where.OR) where.OR = [];
      where.OR.push(
        { name: { contains: params.apiName } },
        { path: { contains: params.apiName } },
        { description: { contains: params.apiName } }
      );
    }

    // ========== 阶段2: 原始查询关键词搜索 (fallback) ==========

    // 如果提供了原始查询且没有其他层级参数，使用全文搜索
    if (params.userQuery && !params.platform && !params.component && !params.feature && !params.apiName) {
      const keywords = params.userQuery.split(/\s+/).filter(k => k.length > 1);

      where.OR = keywords.flatMap(keyword => [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
        { path: { contains: keyword } },
        { platform: { contains: keyword } },
        { component: { contains: keyword } },
        { feature: { contains: keyword } },
      ]);
    }

    // HTTP方法过滤
    if (params.method) {
      where.method = params.method.toUpperCase();
    }

    // 执行数据库查询（拉取更多候选以便评分排序）
    const apis = await prisma.api.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      select: {
        id: true,
        name: true,
        description: true,
        method: true,
        path: true,
        platform: true,
        component: true,
        feature: true,
      },
      take: fetchLimit,
    });

    // 按层级匹配度评分排序，确保最相关的 API 排在前面
    return scoreAndSort(apis as SearchResult[], params, resultLimit);
  } catch (error) {
    console.error('[hierarchicalSearchApis] 检索失败:', error);
    
    // 返回空结果而不是抛出错误
    // 这样AI可以继续执行，而不会中断整个流程
    return [];
  }
}

/**
 * 智能提取层级关键词
 * 
 * @description
 * 从用户自然语言描述中提取4层分类关键词
 * 这个函数可以作为辅助工具，帮助AI更好地构造 hierarchicalSearchApis 的参数
 * 
 * @example
 * extractLayerKeywords('创建巡检平台凭证管理的新凭证')
 * // 返回: { platform: '巡检平台', component: '凭证管理', feature: '增删改查', apiName: '创建', method: 'POST' }
 */
export async function extractLayerKeywords(userQuery: string): Promise<{
  platform?: string;
  component?: string;
  feature?: string;
  apiName?: string;
  method?: string;
}> {
  // 常见HTTP方法关键词映射
  const methodKeywords: Record<string, string> = {
    '新增': 'POST',
    '创建': 'POST',
    '添加': 'POST',
    '注册': 'POST',
    '查询': 'GET',
    '获取': 'GET',
    '列表': 'GET',
    '详情': 'GET',
    '删除': 'DELETE',
    '移除': 'DELETE',
    '修改': 'PUT',
    '更新': 'PUT',
    '编辑': 'PUT',
  };
  
  const result: any = {};
  
  // 提取HTTP方法
  for (const [keyword, method] of Object.entries(methodKeywords)) {
    if (userQuery.includes(keyword)) {
      result.method = method;
      // 同时将动作关键词作为apiName
      if (!result.apiName) {
        result.apiName = keyword;
      }
      break;
    }
  }
  
  // 尝试提取"平台"关键词
  const platformMatch = userQuery.match(/([\u4e00-\u9fa5]+)平台/);
  if (platformMatch) {
    result.platform = platformMatch[1] + '平台';
  }
  
  // 尝试提取"管理"类组件
  const componentMatch = userQuery.match(/([\u4e00-\u9fa5]+)管理/);
  if (componentMatch) {
    result.component = componentMatch[1] + '管理';
  }
  
  return result;
}

