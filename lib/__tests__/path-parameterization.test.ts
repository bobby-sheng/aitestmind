/**
 * 路径参数化工具测试
 */

import {
  parameterizePath,
  parameterizePaths,
  needsParameterization,
  extractParameterNames,
  replacePathParameters,
} from '../path-parameterization';

describe('parameterizePath', () => {
  it('应该参数化包含数字ID的路径', () => {
    const result = parameterizePath('/api/user/123');
    expect(result.parameterizedPath).toBe('/api/user/{userId}');
    expect(result.isParameterized).toBe(true);
    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0]).toEqual({
      name: 'userId',
      value: '123',
      position: 2,
    });
  });

  it('应该参数化路径 /api/v1/device/device-credential/3', () => {
    const result = parameterizePath('/api/v1/device/device-credential/3');
    expect(result.parameterizedPath).toBe('/api/v1/device/device-credential/{devicecredentialId}');
    expect(result.isParameterized).toBe(true);
    expect(result.parameters).toHaveLength(1);
    expect(result.parameters[0].value).toBe('3');
  });

  it('应该参数化包含 UUID 的路径', () => {
    const result = parameterizePath('/api/order/550e8400-e29b-41d4-a716-446655440000');
    expect(result.parameterizedPath).toBe('/api/order/{orderId}');
    expect(result.isParameterized).toBe(true);
  });

  it('应该参数化包含 CUID 的路径', () => {
    const result = parameterizePath('/api/credential/cmi5kz7xw00061ybn3f5ioa6i');
    expect(result.parameterizedPath).toBe('/api/credential/{credentialId}');
    expect(result.isParameterized).toBe(true);
  });

  it('应该参数化包含多个ID的路径', () => {
    const result = parameterizePath('/api/order/123/item/456');
    expect(result.parameterizedPath).toBe('/api/order/{orderId}/item/{itemId}');
    expect(result.isParameterized).toBe(true);
    expect(result.parameters).toHaveLength(2);
  });

  it('应该保留查询参数', () => {
    const result = parameterizePath('/api/user/123?page=1&size=20');
    expect(result.parameterizedPath).toBe('/api/user/{userId}?page=1&size=20');
    expect(result.isParameterized).toBe(true);
  });

  it('不应该修改已经参数化的路径', () => {
    const result = parameterizePath('/api/user/{userId}');
    expect(result.parameterizedPath).toBe('/api/user/{userId}');
    expect(result.isParameterized).toBe(true);
    expect(result.parameters).toHaveLength(0);
  });

  it('不应该修改不包含ID的路径', () => {
    const result = parameterizePath('/api/users');
    expect(result.parameterizedPath).toBe('/api/users');
    expect(result.isParameterized).toBe(false);
    expect(result.parameters).toHaveLength(0);
  });

  it('不应该将非ID的数字参数化', () => {
    const result = parameterizePath('/api/v1/users');
    expect(result.parameterizedPath).toBe('/api/v1/users');
    expect(result.isParameterized).toBe(false);
  });
});

describe('parameterizePaths', () => {
  it('应该批量参数化多个路径', () => {
    const paths = [
      '/api/user/123',
      '/api/order/456',
      '/api/products',
    ];
    const results = parameterizePaths(paths);
    
    expect(results).toHaveLength(3);
    expect(results[0].parameterizedPath).toBe('/api/user/{userId}');
    expect(results[1].parameterizedPath).toBe('/api/order/{orderId}');
    expect(results[2].parameterizedPath).toBe('/api/products');
  });
});

describe('needsParameterization', () => {
  it('应该识别需要参数化的路径', () => {
    expect(needsParameterization('/api/user/123')).toBe(true);
    expect(needsParameterization('/api/order/550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(needsParameterization('/api/credential/cmi5kz7xw00061ybn3f5ioa6i')).toBe(true);
  });

  it('应该识别不需要参数化的路径', () => {
    expect(needsParameterization('/api/users')).toBe(false);
    expect(needsParameterization('/api/user/{userId}')).toBe(false);
    expect(needsParameterization('/api/v1/products')).toBe(false);
  });
});

describe('extractParameterNames', () => {
  it('应该提取参数名', () => {
    expect(extractParameterNames('/api/user/{userId}')).toEqual(['userId']);
    expect(extractParameterNames('/api/order/{orderId}/item/{itemId}')).toEqual(['orderId', 'itemId']);
  });

  it('应该处理没有参数的路径', () => {
    expect(extractParameterNames('/api/users')).toEqual([]);
  });
});

describe('replacePathParameters', () => {
  it('应该替换路径参数', () => {
    const result = replacePathParameters('/api/user/{userId}', { userId: '123' });
    expect(result).toBe('/api/user/123');
  });

  it('应该替换多个参数', () => {
    const result = replacePathParameters(
      '/api/order/{orderId}/item/{itemId}',
      { orderId: '123', itemId: '456' }
    );
    expect(result).toBe('/api/order/123/item/456');
  });

  it('应该处理数字参数', () => {
    const result = replacePathParameters('/api/user/{userId}', { userId: 123 });
    expect(result).toBe('/api/user/123');
  });
});

