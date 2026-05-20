/**
 * API 库相关类型定义
 * 包含四层分类结构
 */

/**
 * 导入来源
 */
export type ImportSource = 'manual' | 'har';

/**
 * 请求体内容类型
 */
export type RequestBodyType = 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';

/**
 * 请求体内容类型选项（用于UI展示）
 */
export const REQUEST_BODY_TYPES: { value: RequestBodyType; label: string; mimeType: string }[] = [
  { value: 'none', label: '无请求体', mimeType: '' },
  { value: 'json', label: 'JSON', mimeType: 'application/json' },
  { value: 'form-data', label: 'Form Data (multipart/form-data)', mimeType: 'multipart/form-data' },
  { value: 'x-www-form-urlencoded', label: 'Form URL Encoded', mimeType: 'application/x-www-form-urlencoded' },
  { value: 'raw', label: '原始文本', mimeType: 'text/plain' },
];

/**
 * 根据 MIME 类型获取请求体类型
 */
export function getBodyTypeFromMimeType(mimeType?: string): RequestBodyType {
  if (!mimeType) return 'none';
  const lowerMimeType = mimeType.toLowerCase();
  if (lowerMimeType.includes('application/json') || lowerMimeType === 'json') return 'json';
  if (lowerMimeType.includes('multipart/form-data') || lowerMimeType === 'form-data') return 'form-data';
  // 支持多种 urlencoded 格式的匹配
  if (lowerMimeType.includes('x-www-form-urlencoded') || 
      lowerMimeType.includes('urlencoded') ||
      lowerMimeType === 'x-www-form-urlencoded') return 'x-www-form-urlencoded';
  if (lowerMimeType.includes('text/') || lowerMimeType === 'raw') return 'raw';
  return 'json'; // 默认为 JSON
}

/**
 * 根据请求体类型获取 MIME 类型
 */
export function getMimeTypeFromBodyType(bodyType: RequestBodyType): string {
  const found = REQUEST_BODY_TYPES.find(t => t.value === bodyType);
  return found?.mimeType || 'application/json';
}

/**
 * API 四层分类结构
 * Platform (平台) -> Component (组件) -> Feature (功能) -> API (API动作)
 */
export interface ApiFourLayerClassification {
  platform?: string;
  component?: string;
  feature?: string;
  /**
   * 子功能（第4层，可选）
   * 说明：目前数据库中没有单独的 subFeature 字段，
   * 实际入库时会将「功能 > 子功能」编码到 feature 字段中。
   * 该字段主要用于前端选择和筛选体验，以及与部分接口返回保持类型一致。
   */
  subFeature?: string;
}

/**
 * API 基础信息（数据库模型）
 */
export interface ApiInfo extends ApiFourLayerClassification {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;

  // 基本信息
  name: string;
  description?: string;
  method: string;
  url: string;
  path: string;
  domain?: string;

  // 分类和标签（保留向后兼容）
  categoryId?: string;
  category?: Category;
  tags?: ApiTag[];

  // 导入来源
  importSource: ImportSource;

  // 请求信息
  requestHeaders?: string; // JSON字符串
  requestQuery?: string; // JSON字符串
  requestBody?: string; // JSON字符串
  requestMimeType?: string;

  // 响应信息
  responseStatus?: number;
  responseHeaders?: string; // JSON字符串
  responseBody?: string; // JSON字符串
  responseMimeType?: string;

  // 性能指标
  responseTime?: number;
  responseSize?: number;

  // 元数据
  resourceType?: string;
  startedDateTime?: string;

  // 原始数据
  rawHarEntry?: any; // JSON

  // 状态标记
  isStarred: boolean;
  isArchived: boolean;
}

/**
 * 分类信息
 */
export interface Category {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  _count?: {
    apis: number;
  };
}

/**
 * 标签信息
 */
export interface Tag {
  id: string;
  createdAt: Date | string;
  name: string;
  color?: string;
  _count?: {
    apis: number;
  };
}

/**
 * API 和标签的关联
 */
export interface ApiTag {
  id: string;
  apiId: string;
  tagId: string;
  api?: ApiInfo;
  tag?: Tag;
}

/**
 * API 筛选条件
 */
export interface ApiFilter extends ApiFourLayerClassification {
  categoryId?: string;
  method?: string;
  search?: string;
  isStarred?: boolean;
  isArchived?: boolean;
  importSource?: ImportSource;
  tags?: string[];
}

/**
 * API 列表查询结果
 */
export interface ApiListResult {
  data: ApiInfo[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 四层树节点
 */
export interface FourLayerTreeNode {
  type: 'platform' | 'component' | 'feature';
  name: string;
  count: number;
  children?: FourLayerTreeNode[];
  fullPath: ApiFourLayerClassification;
}

/**
 * API 创建/更新数据
 */
export interface ApiCreateData {
  name: string;
  description?: string;
  method: string;
  url: string;
  
  // 四层分类
  platform?: string;
  component?: string;
  feature?: string;
  
  // 分类和标签（向后兼容）
  categoryId?: string;
  tags?: string[];
  
  // 请求信息
  requestHeaders?: Record<string, any>;
  requestQuery?: Record<string, any>;
  requestBody?: any;
  requestMimeType?: string;
  
  // 响应信息
  responseStatus?: number;
  responseHeaders?: Record<string, any>;
  responseBody?: any;
  responseMimeType?: string;
  
  // 导入来源
  importSource?: ImportSource;
}

export interface ApiUpdateData extends Partial<ApiCreateData> {
  isStarred?: boolean;
  isArchived?: boolean;
}





