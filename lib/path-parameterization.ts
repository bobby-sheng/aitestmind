/**
 * 路径参数化工具
 * 自动识别路径中的硬编码 ID 并转换为参数占位符
 */

export interface ParameterizationResult {
  originalPath: string;
  parameterizedPath: string;
  parameters: Array<{
    name: string;
    value: string;
    position: number;
  }>;
  isParameterized: boolean;
}

/**
 * 参数化路径
 * 将路径中的硬编码 ID 替换为 {参数名} 占位符
 * 
 * @param path - 原始路径，如 '/api/v1/device/device-credential/3'
 * @returns 参数化结果
 * 
 * @example
 * ```ts
 * parameterizePath('/api/user/123')
 * // => { parameterizedPath: '/api/user/{id}', ... }
 * 
 * parameterizePath('/api/v1/device/device-credential/3')
 * // => { parameterizedPath: '/api/v1/device/device-credential/{id}', ... }
 * 
 * parameterizePath('/api/order/123/item/456')
 * // => { parameterizedPath: '/api/order/{orderId}/item/{itemId}', ... }
 * ```
 */
export function parameterizePath(path: string): ParameterizationResult {
  const result: ParameterizationResult = {
    originalPath: path,
    parameterizedPath: path,
    parameters: [],
    isParameterized: false,
  };

  // 如果路径已经包含参数占位符，直接返回
  if (path.includes('{') && path.includes('}')) {
    result.isParameterized = true;
    return result;
  }

  // 移除查询参数部分（只处理路径部分）
  const [pathPart, queryPart] = path.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  // 用于存储路径段和它们的类型
  const processedSegments: string[] = [];
  let paramCount = 0;

  segments.forEach((segment, index) => {
    // 检测是否为数字 ID（纯数字或以数字结尾的UUID）
    const isNumericId = /^\d+$/.test(segment);
    
    // 检测是否为 UUID 格式
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
    
    // 检测是否为 cuid 格式（如 cmi5kz7xw00061ybn3f5ioa6i）
    const isCuid = /^c[a-z0-9]{24}$/i.test(segment);

    if (isNumericId || isUuid || isCuid) {
      // 尝试根据前一个段推断参数名
      const previousSegment = segments[index - 1];
      let paramName = 'id';

      if (previousSegment) {
        // 如果前一个段是资源名称，使用它来命名参数
        // 例如: /api/user/123 → userId
        //      /api/order/123/item/456 → orderId, itemId
        const resourceName = previousSegment
          .replace(/-/g, '')  // 移除连字符
          .replace(/_/g, '');  // 移除下划线

        // 如果已经有同名的参数，添加序号
        const existingCount = result.parameters.filter(p => 
          p.name.startsWith(resourceName)
        ).length;

        if (existingCount > 0) {
          paramName = `${resourceName}Id${existingCount + 1}`;
        } else {
          paramName = `${resourceName}Id`;
        }
      } else if (paramCount > 0) {
        // 如果没有前一个段，使用通用命名
        paramName = `id${paramCount + 1}`;
      }

      // 记录参数信息
      result.parameters.push({
        name: paramName,
        value: segment,
        position: index,
      });

      processedSegments.push(`{${paramName}}`);
      paramCount++;
      result.isParameterized = true;
    } else {
      processedSegments.push(segment);
    }
  });

  // 重新组装路径
  result.parameterizedPath = '/' + processedSegments.join('/');

  // 如果有查询参数，添加回去
  if (queryPart) {
    result.parameterizedPath += '?' + queryPart;
  }

  return result;
}

/**
 * 批量参数化路径
 * 
 * @param paths - 路径数组
 * @returns 参数化结果数组
 */
export function parameterizePaths(paths: string[]): ParameterizationResult[] {
  return paths.map(path => parameterizePath(path));
}

/**
 * 检查路径是否需要参数化
 * 
 * @param path - 要检查的路径
 * @returns 是否需要参数化
 */
export function needsParameterization(path: string): boolean {
  // 如果已经有参数占位符，不需要
  if (path.includes('{') && path.includes('}')) {
    return false;
  }

  const [pathPart] = path.split('?');
  const segments = pathPart.split('/').filter(Boolean);

  // 检查是否有段落看起来像 ID
  return segments.some(segment => {
    return /^\d+$/.test(segment) ||  // 纯数字
           /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||  // UUID
           /^c[a-z0-9]{24}$/i.test(segment);  // cuid
  });
}

/**
 * 从参数化路径中提取参数名
 * 
 * @param path - 参数化路径，如 '/api/user/{userId}'
 * @returns 参数名数组，如 ['userId']
 */
export function extractParameterNames(path: string): string[] {
  const matches = path.match(/\{(\w+)\}/g);
  if (!matches) return [];
  
  return matches.map(match => match.slice(1, -1));
}

/**
 * 替换路径中的参数值
 * 
 * @param path - 参数化路径，如 '/api/user/{userId}'
 * @param params - 参数值对象，如 { userId: '123' }
 * @returns 替换后的路径，如 '/api/user/123'
 */
export function replacePathParameters(
  path: string,
  params: Record<string, string | number>
): string {
  let result = path;
  
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`{${key}}`, String(value));
  });
  
  return result;
}

