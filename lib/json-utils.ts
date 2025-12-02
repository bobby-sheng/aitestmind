/**
 * JSON 序列化/反序列化工具函数
 * 用于处理数据库中 String 类型的 JSON 字段
 */

/**
 * 安全地解析 JSON 字符串
 * @param value - 可能是 JSON 字符串或已经是对象
 * @returns 解析后的对象，或 null
 */
export function safeJsonParse<T = any>(value: any): T | null {
  if (!value) {
    return null;
  }

  // 如果已经是对象，直接返回
  if (typeof value === 'object') {
    return value as T;
  }

  // 如果是字符串，尝试解析
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('JSON parse error:', error, 'value:', value.substring(0, 100));
      return null;
    }
  }

  return null;
}

/**
 * 安全地序列化为 JSON 字符串
 * @param value - 要序列化的值
 * @returns JSON 字符串，或 null
 */
export function safeJsonStringify(value: any): string | null {
  if (!value) {
    return null;
  }

  // 如果已经是字符串，直接返回
  if (typeof value === 'string') {
    // 验证是否是有效的 JSON
    try {
      JSON.parse(value);
      return value;
    } catch {
      // 不是有效的 JSON，序列化它
      return JSON.stringify(value);
    }
  }

  // 如果是对象，序列化
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.error('JSON stringify error:', error);
      return null;
    }
  }

  return null;
}

/**
 * 批量解析对象中的 JSON 字段
 * @param obj - 包含 JSON 字段的对象
 * @param fields - 需要解析的字段名数组
 * @returns 解析后的对象
 */
export function parseJsonFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of fields) {
    if (field in result) {
      result[field] = safeJsonParse(result[field]) as any;
    }
  }
  
  return result;
}

/**
 * 批量序列化对象中的字段为 JSON 字符串
 * @param obj - 包含需要序列化字段的对象
 * @param fields - 需要序列化的字段名数组
 * @returns 序列化后的对象
 */
export function stringifyJsonFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): T {
  const result = { ...obj };
  
  for (const field of fields) {
    if (field in result) {
      result[field] = safeJsonStringify(result[field]) as any;
    }
  }
  
  return result;
}

