// URL参数解析工具

/**
 * 解析URL中的路径参数
 * @param url - 包含占位符的URL，如 "/api/user/{userId}/orders/{orderId}"
 * @returns 路径参数名称数组，如 ["userId", "orderId"]
 */
export function parsePathParams(url: string): string[] {
  const regex = /\{(\w+)\}/g;
  const matches = [...url.matchAll(regex)];
  return matches.map((m) => m[1]);
}

/**
 * 构建实际URL
 * @param template - URL模板，如 "/api/user/{userId}/orders"
 * @param pathParams - 路径参数值，如 { userId: "12345" }
 * @returns 实际URL，如 "/api/user/12345/orders"
 */
export function buildActualUrl(
  template: string,
  pathParams: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return pathParams[key] || `{${key}}`;
  });
}

/**
 * 构建完整URL（包含query参数）
 * @param baseUrl - 基础URL
 * @param queryParams - 查询参数
 * @returns 完整URL
 */
export function buildFullUrl(
  baseUrl: string,
  queryParams?: Record<string, string>
): string {
  if (!queryParams || Object.keys(queryParams).length === 0) {
    return baseUrl;
  }

  const queryString = Object.entries(queryParams)
    .filter(([_, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * 从JSON对象中提取值（支持路径）
 * @param obj - JSON对象
 * @param path - 路径，如 "data.user.name"
 * @returns 提取的值
 */
export function extractValueByPath(obj: any, path: string): any {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return undefined;
    }
  }

  return result;
}

