/**
 * 任务 4 测试：测试连接 API
 * 测试 AI 连接验证功能
 */

import { POST } from '../app/api/ai/test-connection/route';
import { NextRequest } from 'next/server';

// Mock AI Client
jest.mock('../lib/ai-client', () => ({
  createAIClient: jest.fn().mockReturnValue({
    testConnection: jest.fn().mockResolvedValue({ success: true }),
  }),
}));

describe('Task 4: Test Connection API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('应该能够成功测试连接', async () => {
    const config = {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      apiKey: 'sk-test-123',
    };

    const request = new NextRequest('http://localhost:3000/api/ai/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('AI 连接测试成功！');

    console.log('✅ 测试通过：连接测试成功');
  });

  test('缺少 provider 时应该返回 400 错误', async () => {
    const config = {
      model: 'gpt-4-turbo-preview',
      apiKey: 'sk-test-123',
    };

    const request = new NextRequest('http://localhost:3000/api/ai/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('缺少 AI 提供商配置');

    console.log('✅ 测试通过：缺少 provider 时返回正确错误');
  });

  test('缺少 model 时应该返回 400 错误', async () => {
    const config = {
      provider: 'openai',
      apiKey: 'sk-test-123',
    };

    const request = new NextRequest('http://localhost:3000/api/ai/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('缺少 AI 模型配置');

    console.log('✅ 测试通过：缺少 model 时返回正确错误');
  });

  test('缺少 apiKey 时应该返回 400 错误', async () => {
    const config = {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
    };

    const request = new NextRequest('http://localhost:3000/api/ai/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('缺少 API Key');

    console.log('✅ 测试通过：缺少 apiKey 时返回正确错误');
  });

  test('连接失败时应该返回错误信息', async () => {
    // Mock 连接失败
    const { createAIClient } = require('../lib/ai-client');
    createAIClient.mockReturnValueOnce({
      testConnection: jest.fn().mockResolvedValue({
        success: false,
        error: 'API Key 无效',
      }),
    });

    const config = {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      apiKey: 'sk-invalid-key',
    };

    const request = new NextRequest('http://localhost:3000/api/ai/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('API Key 无效');

    console.log('✅ 测试通过：连接失败时返回正确错误信息');
  });

  test('应该处理异常情况', async () => {
    // Mock 抛出异常
    const { createAIClient } = require('../lib/ai-client');
    createAIClient.mockImplementationOnce(() => {
      throw new Error('创建客户端失败');
    });

    const config = {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      apiKey: 'sk-test-123',
    };

    const request = new NextRequest('http://localhost:3000/api/ai/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toContain('创建客户端失败');

    console.log('✅ 测试通过：异常情况处理正确');
  });

  test('应该支持所有 AI 提供商', async () => {
    const providers = [
      'openai',
      'claude',
      'baidu',
      'alibaba',
      'zhipu',
      'ollama',
      'deepseek',
    ];

    for (const provider of providers) {
      const config = {
        provider,
        model: 'test-model',
        apiKey: 'test-key',
      };

      const request = new NextRequest('http://localhost:3000/api/ai/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    }

    console.log('✅ 测试通过：所有 AI 提供商都支持');
  });
});

