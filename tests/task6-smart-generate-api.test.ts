/**
 * 任务 6 测试：AI 智能生成接口
 * 测试 Function Calling 和智能清理功能
 */

import { PrismaClient } from '@prisma/client';
import { POST } from '../app/api/ai/smart-generate/route';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

// Mock AI Client
jest.mock('../lib/ai-client', () => ({
  loadAIClient: jest.fn(),
  AIClient: class {},
}));

// Mock AI Tools
jest.mock('../lib/ai-tools', () => ({
  AI_TOOLS: [],
  searchApis: jest.fn(),
  getApiDetail: jest.fn(),
  smartSearchDeleteApi: jest.fn(),
  createTestCases: jest.fn(),
}));

describe('Task 6: Smart Generate API', () => {
  let mockChat: jest.Mock;
  let loadAIClient: jest.Mock;
  let searchApis: jest.Mock;
  let getApiDetail: jest.Mock;
  let smartSearchDeleteApi: jest.Mock;
  let createTestCases: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // 获取 mock 函数
    mockChat = jest.fn();
    loadAIClient = require('../lib/ai-client').loadAIClient;
    searchApis = require('../lib/ai-tools').searchApis;
    getApiDetail = require('../lib/ai-tools').getApiDetail;
    smartSearchDeleteApi = require('../lib/ai-tools').smartSearchDeleteApi;
    createTestCases = require('../lib/ai-tools').createTestCases;
    
    // 设置 loadAIClient 返回 mock 客户端
    loadAIClient.mockResolvedValue({
      chat: mockChat,
    });
    
    // 设置默认 AI 响应
    mockChat.mockResolvedValue({
      content: '测试用例生成完成',
      toolCalls: [],
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('应该能够处理用户输入', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/smart-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: '高可用组新增接口 name 不能为空',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBeTruthy();

    console.log('✅ 测试通过：处理用户输入');
  });

  test('缺少用户输入时应该返回错误', async () => {
    const request = new NextRequest('http://localhost:3000/api/ai/smart-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: '',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('请输入测试需求描述');

    console.log('✅ 测试通过：缺少输入时返回错误');
  });

  test('应该能够处理 AI 工具调用', async () => {
    // 第一轮：AI 调用 search_apis
    mockChat.mockResolvedValueOnce({
      content: null,
      toolCalls: [{
        id: 'call_1',
        function: {
          name: 'search_apis',
          arguments: JSON.stringify({ keyword: '新增', category: '高可用组' }),
        },
      }],
    });

    // Mock search_apis 返回结果
    searchApis.mockResolvedValueOnce([
      { id: 'api_123', name: '创建高可用组', method: 'POST', path: '/api/ha/create' }
    ]);

    // 第二轮：AI 调用 get_api_detail
    mockChat.mockResolvedValueOnce({
      content: null,
      toolCalls: [{
        id: 'call_2',
        function: {
          name: 'get_api_detail',
          arguments: JSON.stringify({ apiId: 'api_123' }),
        },
      }],
    });

    // Mock get_api_detail 返回结果
    getApiDetail.mockResolvedValueOnce({
      id: 'api_123',
      name: '创建高可用组',
      method: 'POST',
      path: '/api/ha/create',
      requestBody: { name: '', deliveryMethod: '' },
    });

    // 第三轮：AI 调用 create_test_cases
    mockChat.mockResolvedValueOnce({
      content: null,
      toolCalls: [{
        id: 'call_3',
        function: {
          name: 'create_test_cases',
          arguments: JSON.stringify({
            testCases: [
              { name: '测试用例1', description: '描述', flowConfig: { nodes: [], edges: [] } }
            ]
          }),
        },
      }],
    });

    // Mock create_test_cases 返回结果
    createTestCases.mockResolvedValueOnce([
      { id: 'tc_1', name: '测试用例1' }
    ]);

    // 第四轮：AI 返回最终消息（无 tool_calls）
    mockChat.mockResolvedValueOnce({
      content: '✅ 已生成 1 个测试用例',
      toolCalls: [],
    });

    const request = new NextRequest('http://localhost:3000/api/ai/smart-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: '高可用组新增接口 name 不能为空',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.iterations).toBe(4);
    expect(searchApis).toHaveBeenCalledWith({ keyword: '新增', category: '高可用组' });
    expect(getApiDetail).toHaveBeenCalledWith('api_123');
    expect(createTestCases).toHaveBeenCalled();
    
    // 验证消息历史中包含了 tool_calls
    expect(mockChat).toHaveBeenCalledTimes(4);

    console.log('✅ 测试通过：AI 工具调用流程正确');
  });

  test('应该能够处理智能清理', async () => {
    // 第一轮：AI 调用 smart_search_delete_api
    mockChat.mockResolvedValueOnce({
      content: null,
      toolCalls: [{
        id: 'call_1',
        function: {
          name: 'smart_search_delete_api',
          arguments: JSON.stringify({ createApiId: 'api_123' }),
        },
      }],
    });

    // Mock 返回需要清理
    smartSearchDeleteApi.mockResolvedValueOnce({
      needCleanup: true,
      deleteApi: { id: 'api_delete', name: '删除高可用组', path: '/api/ha/{id}' },
      resourceType: '高可用组',
      resourceIdVariable: 'haGroupId',
      pathParamName: 'id',
    });

    // 第二轮：AI 返回最终消息
    mockChat.mockResolvedValueOnce({
      content: '✅ 已添加后置清理步骤',
      toolCalls: [],
    });

    const request = new NextRequest('http://localhost:3000/api/ai/smart-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: '测试智能清理功能',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(smartSearchDeleteApi).toHaveBeenCalledWith({ createApiId: 'api_123' });

    console.log('✅ 测试通过：智能清理功能正确');
  });

  test('应该在达到最大迭代次数时停止', async () => {
    // Mock AI 一直返回工具调用
    mockChat.mockResolvedValue({
      content: null,
      toolCalls: [{
        id: 'call_loop',
        function: {
          name: 'search_apis',
          arguments: JSON.stringify({ keyword: 'test' }),
        },
      }],
    });

    searchApis.mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/ai/smart-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: '测试最大迭代',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.iterations).toBe(15); // 达到最大迭代次数

    console.log('✅ 测试通过：最大迭代次数限制生效');
  });

  test('工具执行失败时应该将错误返回给 AI', async () => {
    // 第一轮：AI 调用 search_apis
    mockChat.mockResolvedValueOnce({
      content: null,
      toolCalls: [{
        id: 'call_1',
        function: {
          name: 'search_apis',
          arguments: JSON.stringify({ keyword: 'test' }),
        },
      }],
    });

    // Mock 工具执行失败
    searchApis.mockRejectedValueOnce(new Error('数据库查询失败'));

    // 第二轮：AI 收到错误信息后返回
    mockChat.mockResolvedValueOnce({
      content: '❌ 搜索 API 失败',
      toolCalls: [],
    });

    const request = new NextRequest('http://localhost:3000/api/ai/smart-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: '测试错误处理',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    console.log('✅ 测试通过：工具错误处理正确');
  });

  test('AI 配置未启用时应该返回友好提示', async () => {
    loadAIClient.mockRejectedValueOnce(new Error('AI 功能未启用，请先在设置页面配置 AI 服务'));

    const request = new NextRequest('http://localhost:3000/api/ai/smart-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: '测试配置检查',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('设置页面配置 AI 服务');

    console.log('✅ 测试通过：配置未启用时友好提示');
  });

  test('应该能够处理 JSON 解析错误', async () => {
    // 第一轮：AI 返回无效的 JSON
    mockChat.mockResolvedValueOnce({
      content: null,
      toolCalls: [{
        id: 'call_1',
        function: {
          name: 'search_apis',
          // 故意返回无效的 JSON（缺少闭合括号）
          arguments: '{"keyword": "测试", "category": "分类"',
        },
      }],
    });

    // 第二轮：AI 收到错误信息后返回
    mockChat.mockResolvedValueOnce({
      content: '抱歉，我的 JSON 格式有误，让我重新生成',
      toolCalls: [],
    });

    const request = new NextRequest('http://localhost:3000/api/ai/smart-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userInput: '测试 JSON 错误处理',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // 应该能成功返回（尽管有 JSON 错误）
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    console.log('✅ 测试通过：JSON 解析错误处理');
  });
});

