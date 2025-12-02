/**
 * 任务 10 测试：AI 功能集成测试
 * 测试从配置到生成的完整流程
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Task 10: AI Integration Tests', () => {
  let settingsId: string;
  let categoryId: string;
  let apiId: string;
  let deleteApiId: string;

  beforeAll(async () => {
    // 清理测试数据
    await prisma.testCase.deleteMany({
      where: { name: { contains: 'AI集成测试' } }
    });
    await prisma.api.deleteMany({
      where: { name: { contains: 'AI集成测试' } }
    });
    await prisma.category.deleteMany({
      where: { name: 'AI集成测试分类' }
    });

    // 创建测试分类
    const category = await prisma.category.create({
      data: {
        name: 'AI集成测试分类',
        description: '用于集成测试',
      }
    });
    categoryId = category.id;

    // 创建测试 API（创建）
    const api = await prisma.api.create({
      data: {
        name: 'AI集成测试-创建资源',
        description: '测试 AI 生成功能',
        method: 'POST',
        url: 'http://test.com/api/resource',
        path: '/api/resource/create',
        categoryId: categoryId,
        requestHeaders: '{}',
        requestQuery: '{}',
        requestBody: JSON.stringify({
          name: { type: 'string', required: true },
          description: { type: 'string', required: false },
        }),
        responseStatus: 200,
        responseHeaders: '{}',
        responseBody: JSON.stringify({
          success: true,
          data: {
            id: '123',
            name: 'test',
            createdAt: '2024-01-01T00:00:00Z',
          }
        }),
      }
    });
    apiId = api.id;

    // 创建测试 API（删除）
    const deleteApi = await prisma.api.create({
      data: {
        name: 'AI集成测试-删除资源',
        description: '测试删除功能',
        method: 'DELETE',
        url: 'http://test.com/api/resource/{id}',
        path: '/api/resource/{id}',
        categoryId: categoryId,
        requestHeaders: '{}',
        requestQuery: '{}',
        requestBody: '{}',
        responseStatus: 200,
        responseHeaders: '{}',
        responseBody: JSON.stringify({
          success: true,
        }),
      }
    });
    deleteApiId = deleteApi.id;

    console.log('✅ 测试数据准备完成');
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.testCase.deleteMany({
      where: { name: { contains: 'AI集成测试' } }
    });
    await prisma.api.deleteMany({
      where: { OR: [{ id: apiId }, { id: deleteApiId }] }
    });
    await prisma.category.deleteMany({
      where: { id: categoryId }
    });
    
    await prisma.$disconnect();
  });

  test('应该能够保存和加载 AI 配置', async () => {
    // 1. 创建配置（直接使用 Prisma）
    const settings = await prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        aiEnabled: true,
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        aiApiKey: 'test-key-integration',
        aiBaseUrl: 'https://api.openai.com/v1',
      },
      update: {
        aiEnabled: true,
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        aiApiKey: 'test-key-integration',
        aiBaseUrl: 'https://api.openai.com/v1',
      }
    });

    expect(settings).toBeTruthy();
    expect(settings.aiEnabled).toBe(true);
    expect(settings.aiProvider).toBe('openai');
    settingsId = settings.id;

    // 2. 读取配置
    const loadedSettings = await prisma.platformSettings.findUnique({
      where: { id: settingsId }
    });

    expect(loadedSettings).toBeTruthy();
    expect(loadedSettings!.aiEnabled).toBe(true);
    expect(loadedSettings!.aiProvider).toBe('openai');
    expect(loadedSettings!.aiModel).toBe('gpt-4');
    expect(loadedSettings!.aiApiKey).toBe('test-key-integration');

    console.log('✅ 测试通过：AI 配置保存和加载');
  });

  test('AI 配置应该支持多个提供商', async () => {
    const providers = ['openai', 'deepseek', 'claude', 'baidu', 'alibaba', 'zhipu', 'ollama'];

    for (const provider of providers) {
      const settings = await prisma.platformSettings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          aiEnabled: true,
          aiProvider: provider,
          aiModel: 'test-model',
          aiApiKey: `test-key-${provider}`,
        },
        update: {
          aiEnabled: true,
          aiProvider: provider,
          aiModel: 'test-model',
          aiApiKey: `test-key-${provider}`,
        }
      });

      expect(settings).toBeTruthy();
      expect(settings.aiProvider).toBe(provider);
    }

    console.log('✅ 测试通过：多个 AI 提供商支持');
  });

  test('工具函数应该能够正确搜索 API', async () => {
    const { searchApis } = require('../lib/ai-tools');

    // 搜索刚创建的测试 API
    const results = await searchApis({
      keyword: 'AI集成测试',
      category: 'AI集成测试分类',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe(apiId);
    expect(results[0].name).toBe('AI集成测试-创建资源');

    console.log('✅ 测试通过：API 搜索功能');
  });

  test('工具函数应该能够获取 API 详情', async () => {
    const { getApiDetail } = require('../lib/ai-tools');

    const detail = await getApiDetail(apiId);

    expect(detail.id).toBe(apiId);
    expect(detail.name).toBe('AI集成测试-创建资源');
    expect(detail.method).toBe('POST');
    expect(detail.requestBody).toBeTruthy();
    expect(detail.requestBody.name).toBeTruthy();
    expect(detail.requestBody.name.required).toBe(true);

    console.log('✅ 测试通过：获取 API 详情');
  });

  test('工具函数应该能够判断 API 是否会创建数据', async () => {
    const { smartSearchDeleteApi } = require('../lib/ai-tools');

    const result = await smartSearchDeleteApi({
      createApiId: apiId,
    });

    // 该 API 是 POST 方法，名称包含"创建"，响应体有 id，应该判断为会创建数据
    expect(result.needCleanup).toBe(true);

    console.log('✅ 测试通过：判断是否需要清理');
  });

  test('工具函数应该能够创建测试用例', async () => {
    const { createTestCases } = require('../lib/ai-tools');

    const testCases = [
      {
        name: 'AI集成测试-正常创建',
        description: '集成测试用例',
        category: 'AI集成测试分类',
        tags: ['集成测试', 'AI生成'],
        flowConfig: {
          nodes: [
            { id: 'start', type: 'start', position: { x: 100, y: 100 }, data: {} },
            {
              id: 'node_1',
              type: 'api',
              position: { x: 350, y: 100 },
              data: {
                apiId: apiId,
                name: 'AI集成测试-创建资源',
                method: 'POST',
                url: 'http://test.com/api/resource',
                requestConfig: {
                  body: {
                    name: { valueType: 'fixed', value: '测试名称' },
                  }
                },
                assertions: [
                  { field: 'status', operator: 'equals', expected: 200, expectedType: 'number' },
                  { field: 'data.id', operator: 'exists' },
                ],
                responseExtract: [
                  { path: 'data.id', variable: 'resourceId' }
                ]
              }
            },
            { id: 'end', type: 'end', position: { x: 600, y: 100 }, data: {} }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'node_1' },
            { id: 'e2', source: 'node_1', target: 'end' }
          ]
        }
      }
    ];

    const results = await createTestCases(testCases);

    expect(results.length).toBe(1);
    expect(results[0].name).toBe('AI集成测试-正常创建');
    expect(results[0].apiNodeCount).toBe(1);

    // 验证测试用例和步骤都已创建
    const savedTestCase = await prisma.testCase.findUnique({
      where: { id: results[0].id },
      include: { steps: true }
    });

    expect(savedTestCase).toBeTruthy();
    expect(savedTestCase!.steps.length).toBe(1);

    console.log('✅ 测试通过：创建测试用例');
  });

  test('完整流程测试：从配置到生成', async () => {
    // 这个测试模拟真实的用户流程：
    // 1. 配置 AI
    // 2. 搜索 API
    // 3. 获取详情
    // 4. 生成测试用例

    const { searchApis, getApiDetail, smartSearchDeleteApi, createTestCases } = require('../lib/ai-tools');

    // 1. 搜索 API
    const searchResults = await searchApis({
      keyword: '创建',
      category: 'AI集成测试分类',
    });
    expect(searchResults.length).toBeGreaterThan(0);

    // 2. 获取第一个 API 的详情
    const apiDetail = await getApiDetail(searchResults[0].id);
    expect(apiDetail).toBeTruthy();

    // 3. 判断是否需要清理
    const cleanupInfo = await smartSearchDeleteApi({
      createApiId: apiDetail.id,
    });
    expect(cleanupInfo.needCleanup).toBe(true);

    // 4. 生成测试用例
    const testCases = [
      {
        name: 'AI集成测试-完整流程',
        description: '完整流程测试',
        category: apiDetail.category,
        tags: ['集成测试'],
        flowConfig: {
          nodes: [
            { id: 'start', type: 'start', position: { x: 100, y: 100 }, data: {} },
            {
              id: 'node_1',
              type: 'api',
              position: { x: 350, y: 100 },
              data: {
                apiId: apiDetail.id,
                name: apiDetail.name,
                method: apiDetail.method,
                url: apiDetail.url,
                requestConfig: { body: { name: { valueType: 'fixed', value: '测试' } } },
                assertions: [{ field: 'status', operator: 'equals', expected: 200, expectedType: 'number' }],
              }
            },
            { id: 'end', type: 'end', position: { x: 600, y: 100 }, data: {} }
          ],
          edges: [
            { id: 'e1', source: 'start', target: 'node_1' },
            { id: 'e2', source: 'node_1', target: 'end' }
          ]
        }
      }
    ];

    const results = await createTestCases(testCases);
    expect(results.length).toBe(1);

    console.log('✅ 测试通过：完整流程测试');
  });

  test('边界情况：空关键词搜索', async () => {
    const { searchApis } = require('../lib/ai-tools');

    const results = await searchApis({});
    // 应该返回一些结果（最多10个）
    expect(results.length).toBeLessThanOrEqual(10);

    console.log('✅ 测试通过：空关键词搜索');
  });

  test('边界情况：不存在的 API ID', async () => {
    const { getApiDetail } = require('../lib/ai-tools');

    await expect(getApiDetail('non-existent-id')).rejects.toThrow('API 不存在');

    console.log('✅ 测试通过：不存在的 API ID');
  });

  test('性能测试：批量创建测试用例', async () => {
    const { createTestCases } = require('../lib/ai-tools');

    const testCases = Array.from({ length: 10 }, (_, i) => ({
      name: `AI集成测试-性能测试-${i}`,
      description: '性能测试用例',
      category: 'AI集成测试分类',
      tags: ['性能测试'],
      flowConfig: {
        nodes: [
          { id: 'start', type: 'start', position: { x: 100, y: 100 }, data: {} },
          { id: 'end', type: 'end', position: { x: 600, y: 100 }, data: {} }
        ],
        edges: [{ id: 'e1', source: 'start', target: 'end' }]
      }
    }));

    const startTime = Date.now();
    const results = await createTestCases(testCases);
    const endTime = Date.now();

    expect(results.length).toBe(10);
    const duration = endTime - startTime;
    console.log(`  ⏱️  批量创建 10 个用例耗时: ${duration}ms`);
    
    // 应该在合理时间内完成（5秒）
    expect(duration).toBeLessThan(5000);

    console.log('✅ 测试通过：批量创建性能');
  });
});

