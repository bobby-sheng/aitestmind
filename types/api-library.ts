/**
 * API 库相关类型定义
 * 包含四层分类结构
 */

/**
 * 导入来源
 */
export type ImportSource = 'manual' | 'har';

/**
 * API 四层分类结构
 * Platform (平台) -> Component (组件) -> Feature (功能) -> API (API动作)
 */
export interface ApiFourLayerClassification {
  platform?: string;
  component?: string;
  feature?: string;
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





