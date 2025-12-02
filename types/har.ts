/**
 * HAR (HTTP Archive) 数据结构定义
 * 完全符合 HAR 1.2 规范
 * 参考: http://www.softwareishard.com/blog/har-12-spec/
 */

// ==================== HAR 根结构 ====================
export interface HarFile {
  log: HarLog;
}

export interface HarLog {
  version: string; // HAR版本，通常是 "1.2"
  creator: HarCreator;
  browser?: HarBrowser;
  pages?: HarPage[];
  entries: HarEntry[];
  comment?: string;
}

// ==================== 创建者和浏览器信息 ====================
export interface HarCreator {
  name: string; // 工具名称
  version: string; // 工具版本
  comment?: string;
}

export interface HarBrowser {
  name: string; // 浏览器名称
  version: string; // 浏览器版本
  comment?: string;
}

// ==================== 页面信息 ====================
export interface HarPage {
  startedDateTime: string; // ISO 8601 格式的时间戳
  id: string; // 页面唯一标识符
  title: string; // 页面标题
  pageTimings: HarPageTimings;
  comment?: string;
}

export interface HarPageTimings {
  onContentLoad?: number; // DOMContentLoaded事件触发时间（毫秒）
  onLoad?: number; // Load事件触发时间（毫秒）
  comment?: string;
}

// ==================== 请求/响应条目 ====================
export interface HarEntry {
  pageref?: string; // 关联的页面ID
  startedDateTime: string; // ISO 8601 格式的时间戳
  time: number; // 总耗时（毫秒）
  request: HarRequest;
  response: HarResponse;
  cache: HarCache;
  timings: HarTimings;
  serverIPAddress?: string; // 服务器IP地址
  connection?: string; // TCP/IP连接ID
  comment?: string;
  // 扩展字段
  _resourceType?: string; // 资源类型：xhr, fetch, document, script, stylesheet, image等
  _priority?: string; // 请求优先级
  _initiator?: HarInitiator; // 请求发起者信息
}

// ==================== 请求信息 ====================
export interface HarRequest {
  method: string; // HTTP方法：GET, POST, PUT, DELETE等
  url: string; // 完整的请求URL
  httpVersion: string; // HTTP版本：HTTP/1.1, HTTP/2等
  cookies: HarCookie[];
  headers: HarHeader[];
  queryString: HarQueryString[];
  postData?: HarPostData;
  headersSize: number; // 请求头总大小（字节）
  bodySize: number; // 请求体大小（字节）
  comment?: string;
}

// ==================== 响应信息 ====================
export interface HarResponse {
  status: number; // HTTP状态码
  statusText: string; // HTTP状态文本
  httpVersion: string; // HTTP版本
  cookies: HarCookie[];
  headers: HarHeader[];
  content: HarContent;
  redirectURL: string; // 重定向URL
  headersSize: number; // 响应头总大小（字节）
  bodySize: number; // 响应体大小（字节）
  comment?: string;
  _transferSize?: number; // 实际传输大小（包括压缩）
  _error?: string; // 错误信息（如果请求失败）
}

// ==================== Cookie ====================
export interface HarCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string; // ISO 8601格式
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  comment?: string;
}

// ==================== Header ====================
export interface HarHeader {
  name: string;
  value: string;
  comment?: string;
}

// ==================== Query String ====================
export interface HarQueryString {
  name: string;
  value: string;
  comment?: string;
}

// ==================== POST Data ====================
export interface HarPostData {
  mimeType: string; // MIME类型
  text?: string; // POST数据文本（如果是文本格式）
  params?: HarParam[]; // POST参数（如果是表单）
  comment?: string;
}

export interface HarParam {
  name: string;
  value?: string;
  fileName?: string; // 文件上传时的文件名
  contentType?: string; // 文件MIME类型
  comment?: string;
}

// ==================== Response Content ====================
export interface HarContent {
  size: number; // 响应内容解压后的大小（字节）
  compression?: number; // 压缩节省的字节数
  mimeType: string; // MIME类型
  text?: string; // 响应内容文本
  encoding?: string; // 编码方式：base64等
  comment?: string;
}

// ==================== Cache ====================
export interface HarCache {
  beforeRequest?: HarCacheEntry; // 请求前的缓存状态
  afterRequest?: HarCacheEntry; // 请求后的缓存状态
  comment?: string;
}

export interface HarCacheEntry {
  expires?: string; // 缓存过期时间（ISO 8601）
  lastAccess: string; // 最后访问时间（ISO 8601）
  eTag: string; // ETag
  hitCount: number; // 命中次数
  comment?: string;
}

// ==================== Timings ====================
export interface HarTimings {
  blocked?: number; // 阻塞时间（毫秒）
  dns?: number; // DNS解析时间（毫秒）
  connect?: number; // TCP连接时间（毫秒）
  send: number; // 发送请求时间（毫秒）
  wait: number; // 等待响应时间（毫秒）
  receive: number; // 接收响应时间（毫秒）
  ssl?: number; // SSL/TLS握手时间（毫秒）
  comment?: string;
}

// ==================== 扩展字段 ====================
export interface HarInitiator {
  type: "parser" | "script" | "preload" | "other";
  url?: string;
  lineNumber?: number;
  stack?: any;
}

// ==================== 辅助类型 ====================

/**
 * 简化的API请求信息（用于前端展示）
 */
export interface ApiRequestSummary {
  id: string;
  name?: string; // API名称（可选）
  method: string;
  url: string;
  path: string;
  status: number;
  statusText: string;
  resourceType: string;
  time: number; // 耗时（毫秒）
  size: number; // 大小（字节）
  startedDateTime: string;
  headers: Record<string, string>; // 请求头
  queryParams: Record<string, string>;
  requestBody?: any;
  responseHeaders?: Record<string, string>; // 响应头
  responseBody?: any;
  mimeType: string;
}

/**
 * 捕获的API（用于前端展示，与ApiRequestSummary相同）
 */
export type CapturedApi = ApiRequestSummary;

/**
 * 录制会话信息
 */
export interface RecordingSession {
  id: string;
  url: string;
  startTime: string;
  endTime?: string;
  status: "recording" | "paused" | "stopped" | "error";
  browserContext?: string;
  capturedRequests: number;
  isPaused?: boolean; // 是否暂停中
  pausedAt?: string; // 暂停时间
  resumedAt?: string; // 恢复时间
  error?: string;
}

/**
 * 过滤选项
 */
export interface HarFilterOptions {
  resourceTypes?: string[]; // 资源类型过滤：xhr, fetch, document等
  methods?: string[]; // HTTP方法过滤
  statusCodes?: number[]; // 状态码过滤
  urlPattern?: string; // URL正则表达式
  minDuration?: number; // 最小耗时（毫秒）
  maxDuration?: number; // 最大耗时（毫秒）
  excludeStaticResources?: boolean; // 排除静态资源（图片、字体等）
}

/**
 * 敏感信息脱敏配置
 */
export interface SensitiveDataConfig {
  maskHeaders?: string[]; // 需要脱敏的请求头：Authorization, Cookie等
  maskQueryParams?: string[]; // 需要脱敏的查询参数：token, password等
  maskBodyFields?: string[]; // 需要脱敏的请求体字段
  maskCookies?: boolean; // 是否脱敏所有Cookie
  customMaskPattern?: RegExp; // 自定义脱敏正则
}

/**
 * HAR导出选项
 */
export interface HarExportOptions {
  includeResponseBody?: boolean; // 是否包含响应体
  includeRequestBody?: boolean; // 是否包含请求体
  prettify?: boolean; // 是否格式化JSON
  filter?: HarFilterOptions; // 过滤选项
  sensitiveData?: SensitiveDataConfig; // 脱敏配置
}

