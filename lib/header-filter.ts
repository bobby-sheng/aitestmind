/**
 * 请求头过滤工具
 * 用于过滤掉浏览器自动生成的、不重要的请求头
 */

/**
 * 应该被过滤掉的请求头列表（不区分大小写）
 */
const UNNECESSARY_HEADERS = new Set([
  // 浏览器标识
  'user-agent',
  
  // 来源和引用
  'referer',
  'origin', // 某些情况下需要保留,但大多数测试场景不需要
  
  // 语言和编码偏好
  'accept-language',
  'accept-encoding',
  
  // 缓存控制
  'cache-control',
  'pragma',
  'if-modified-since',
  'if-none-match',
  
  // 连接控制
  'connection',
  'keep-alive',
  'upgrade-insecure-requests',
  
  // 浏览器安全相关 (sec-* 开头的会在下面单独处理)
  'dnt', // Do Not Track
  'te', // Transfer-Encoding
  
  // 其他不必要的头
  'host', // 会根据URL自动添加
  'content-length', // 会根据body自动计算
  'accept-charset',
]);

/**
 * 应该保留的请求头前缀模式（不区分大小写）
 */
const KEEP_HEADER_PREFIXES = [
  'x-', // 自定义头,通常是业务相关
];

/**
 * 应该过滤的请求头前缀模式（不区分大小写）
 */
const FILTER_HEADER_PREFIXES = [
  'sec-', // Security headers (sec-fetch-*, sec-ch-*, etc.)
];

/**
 * 始终保留的重要请求头（不区分大小写）
 */
const IMPORTANT_HEADERS = new Set([
  'authorization',
  'content-type',
  'cookie',
  'x-csrf-token',
  'x-requested-with',
  'api-key',
  'apikey',
]);

/**
 * 过滤请求头,去除浏览器自动生成的、不重要的头
 * 
 * @param headers - 原始请求头对象
 * @returns 过滤后的请求头对象
 */
export function filterHeaders(headers: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  
  for (const [name, value] of Object.entries(headers)) {
    const lowerName = name.toLowerCase();
    
    // 1. 优先保留重要的请求头
    if (IMPORTANT_HEADERS.has(lowerName)) {
      filtered[name] = value;
      continue;
    }
    
    // 2. 保留自定义头 (x-* 开头)
    if (KEEP_HEADER_PREFIXES.some(prefix => lowerName.startsWith(prefix))) {
      filtered[name] = value;
      continue;
    }
    
    // 3. 过滤安全头 (sec-* 开头)
    if (FILTER_HEADER_PREFIXES.some(prefix => lowerName.startsWith(prefix))) {
      continue;
    }
    
    // 4. 过滤不必要的头
    if (UNNECESSARY_HEADERS.has(lowerName)) {
      continue;
    }
    
    // 5. 简化 accept 头
    if (lowerName === 'accept') {
      // 如果是通用的accept,可以简化或去除
      // 只保留明确指定的类型
      if (value.includes('application/json')) {
        filtered[name] = 'application/json';
      } else if (!value.includes('*/*')) {
        // 如果不是通配符,保留原值
        filtered[name] = value;
      }
      // 如果是 */* 这种通配符,则不保留
      continue;
    }
    
    // 6. 其他头默认保留
    filtered[name] = value;
  }
  
  return filtered;
}

/**
 * 过滤响应头,去除不重要的头
 * 
 * @param headers - 原始响应头对象
 * @returns 过滤后的响应头对象
 */
export function filterResponseHeaders(headers: Record<string, string>): Record<string, string> {
  const filtered: Record<string, string> = {};
  
  // 响应头中应该保留的重要头
  const importantResponseHeaders = new Set([
    'content-type',
    'content-length',
    'cache-control',
    'etag',
    'last-modified',
    'location',
    'set-cookie',
    'www-authenticate',
    'access-control-allow-origin',
    'access-control-allow-credentials',
    'access-control-allow-methods',
    'access-control-allow-headers',
  ]);
  
  // 应该过滤的响应头
  const unnecessaryResponseHeaders = new Set([
    'date',
    'server',
    'x-powered-by',
    'vary',
    'connection',
    'keep-alive',
    'transfer-encoding',
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options',
    'x-xss-protection',
    'referrer-policy',
    'content-security-policy',
  ]);
  
  for (const [name, value] of Object.entries(headers)) {
    const lowerName = name.toLowerCase();
    
    // 保留重要的响应头
    if (importantResponseHeaders.has(lowerName)) {
      filtered[name] = value;
      continue;
    }
    
    // 保留自定义头 (x-* 开头,但排除安全相关的)
    if (lowerName.startsWith('x-') && !unnecessaryResponseHeaders.has(lowerName)) {
      filtered[name] = value;
      continue;
    }
    
    // 过滤不必要的响应头
    if (unnecessaryResponseHeaders.has(lowerName)) {
      continue;
    }
    
    // 其他头默认保留
    filtered[name] = value;
  }
  
  return filtered;
}

/**
 * 根据白名单过滤请求头
 * 只保留白名单中指定的请求头key
 * 
 * @param headers - 原始请求头对象
 * @param allowedHeadersStr - 允许的请求头白名单（逗号分隔的字符串）
 * @returns 过滤后的请求头对象
 */
export function filterHeadersByWhitelist(
  headers: Record<string, string>,
  allowedHeadersStr?: string | null
): Record<string, string> {
  // 如果没有配置白名单，返回所有请求头
  if (!allowedHeadersStr || allowedHeadersStr.trim() === '') {
    return headers;
  }

  // 解析白名单：逗号分隔，转为小写，去除空格
  const allowedHeaders = allowedHeadersStr
    .split(',')
    .map(h => h.trim().toLowerCase())
    .filter(h => h.length > 0);

  if (allowedHeaders.length === 0) {
    return headers;
  }

  const filtered: Record<string, string> = {};

  // 只保留白名单中的请求头
  for (const [name, value] of Object.entries(headers)) {
    const lowerName = name.toLowerCase();
    if (allowedHeaders.includes(lowerName)) {
      filtered[name] = value;
    }
  }

  return filtered;
}

/**
 * 获取过滤统计信息
 * 
 * @param originalHeaders - 原始请求头
 * @param filteredHeaders - 过滤后的请求头
 * @returns 统计信息
 */
export function getFilterStats(
  originalHeaders: Record<string, string>,
  filteredHeaders: Record<string, string>
): {
  total: number;
  kept: number;
  removed: number;
  removedHeaders: string[];
} {
  const originalKeys = Object.keys(originalHeaders);
  const filteredKeys = Object.keys(filteredHeaders);
  const removedHeaders = originalKeys.filter(key => !filteredKeys.includes(key));
  
  return {
    total: originalKeys.length,
    kept: filteredKeys.length,
    removed: removedHeaders.length,
    removedHeaders,
  };
}

