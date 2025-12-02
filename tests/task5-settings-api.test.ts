/**
 * 任务 5 测试：AI 配置 CRUD API
 * 测试设置的获取和保存功能
 */

import { PrismaClient } from '@prisma/client';
import { GET, PUT } from '../app/api/settings/route';
import { NextRequest } from 'next/server';

const prisma = new PrismaClient();

describe('Task 5: Settings CRUD API', () => {
  beforeEach(async () => {
    // 清理测试数据
    await prisma.platformSettings.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('GET 应该能够获取设置（不存在时自动创建）', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.settings).toBeDefined();
    expect(data.settings.aiEnabled).toBe(false); // 默认值
    expect(data.settings.aiProvider).toBe('openai'); // 默认值

    console.log('✅ 测试通过：GET 获取设置成功');
  });

  test('GET 应该能够获取已存在的设置', async () => {
    // 先创建设置
    await prisma.platformSettings.create({
      data: {
        aiEnabled: true,
        aiProvider: 'claude',
        aiModel: 'claude-3-5-sonnet-20241022',
        aiApiKey: 'sk-test-key',
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.settings.aiEnabled).toBe(true);
    expect(data.settings.aiProvider).toBe('claude');
    expect(data.settings.aiModel).toBe('claude-3-5-sonnet-20241022');

    console.log('✅ 测试通过：GET 获取已存在的设置');
  });

  test('PUT 应该能够创建新设置', async () => {
    const newSettings = {
      aiEnabled: true,
      aiProvider: 'openai',
      aiModel: 'gpt-4-turbo-preview',
      aiApiKey: 'sk-new-key',
      aiTemperature: 0.8,
      aiMaxTokens: 2000,
    };

    const request = new NextRequest('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newSettings),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.settings.aiEnabled).toBe(true);
    expect(data.settings.aiProvider).toBe('openai');
    expect(data.settings.aiModel).toBe('gpt-4-turbo-preview');
    expect(data.settings.aiTemperature).toBe(0.8);
    expect(data.settings.aiMaxTokens).toBe(2000);

    console.log('✅ 测试通过：PUT 创建新设置成功');
  });

  test('PUT 应该能够更新已存在的设置', async () => {
    // 先创建设置
    await prisma.platformSettings.create({
      data: {
        aiEnabled: false,
        aiProvider: 'openai',
        aiModel: 'gpt-3.5-turbo',
      },
    });

    // 更新设置
    const updates = {
      aiEnabled: true,
      aiModel: 'gpt-4-turbo-preview',
      aiApiKey: 'sk-updated-key',
    };

    const request = new NextRequest('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.settings.aiEnabled).toBe(true);
    expect(data.settings.aiProvider).toBe('openai'); // 保持原值
    expect(data.settings.aiModel).toBe('gpt-4-turbo-preview'); // 已更新
    expect(data.settings.aiApiKey).toBe('sk-updated-key'); // 已更新

    console.log('✅ 测试通过：PUT 更新已存在的设置');
  });

  test('PUT 应该支持部分更新', async () => {
    // 先创建设置
    await prisma.platformSettings.create({
      data: {
        aiEnabled: true,
        aiProvider: 'openai',
        aiModel: 'gpt-4-turbo-preview',
        aiApiKey: 'sk-original-key',
        aiTemperature: 0.7,
      },
    });

    // 只更新部分字段
    const updates = {
      aiTemperature: 0.9,
    };

    const request = new NextRequest('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.settings.aiEnabled).toBe(true); // 未变
    expect(data.settings.aiProvider).toBe('openai'); // 未变
    expect(data.settings.aiModel).toBe('gpt-4-turbo-preview'); // 未变
    expect(data.settings.aiApiKey).toBe('sk-original-key'); // 未变
    expect(data.settings.aiTemperature).toBe(0.9); // 已更新

    console.log('✅ 测试通过：PUT 支持部分更新');
  });

  test('PUT 应该能够同时更新环境配置和 AI 配置', async () => {
    const settings = {
      // 环境配置
      baseUrl: 'https://api.example.com',
      authTokenEnabled: true,
      authTokenKey: 'Authorization',
      authTokenValue: 'Bearer test-token',
      
      // AI 配置
      aiEnabled: true,
      aiProvider: 'openai',
      aiModel: 'gpt-4-turbo-preview',
      aiApiKey: 'sk-test-123',
    };

    const request = new NextRequest('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    // 验证环境配置
    expect(data.settings.baseUrl).toBe('https://api.example.com');
    expect(data.settings.authTokenEnabled).toBe(true);
    
    // 验证 AI 配置
    expect(data.settings.aiEnabled).toBe(true);
    expect(data.settings.aiProvider).toBe('openai');

    console.log('✅ 测试通过：环境配置和 AI 配置可以同时更新');
  });

  test('PUT 应该支持所有 AI 提供商', async () => {
    const providers = [
      { provider: 'openai', model: 'gpt-4-turbo-preview' },
      { provider: 'claude', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'baidu', model: 'ERNIE-4.0-Turbo' },
      { provider: 'alibaba', model: 'qwen-max' },
      { provider: 'zhipu', model: 'glm-4-plus' },
      { provider: 'ollama', model: 'llama3.1:8b' },
      { provider: 'deepseek', model: 'deepseek-chat' },
    ];

    for (const { provider, model } of providers) {
      const settings = {
        aiEnabled: true,
        aiProvider: provider,
        aiModel: model,
        aiApiKey: `test-key-${provider}`,
      };

      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.settings.aiProvider).toBe(provider);
      expect(data.settings.aiModel).toBe(model);
    }

    console.log('✅ 测试通过：所有 AI 提供商都支持');
  });

  test('应该能够禁用 AI 功能', async () => {
    // 先启用 AI
    await prisma.platformSettings.create({
      data: {
        aiEnabled: true,
        aiProvider: 'openai',
        aiModel: 'gpt-4-turbo-preview',
        aiApiKey: 'sk-test-key',
      },
    });

    // 禁用 AI
    const updates = {
      aiEnabled: false,
    };

    const request = new NextRequest('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.settings.aiEnabled).toBe(false);
    // 其他配置应该保留
    expect(data.settings.aiProvider).toBe('openai');
    expect(data.settings.aiModel).toBe('gpt-4-turbo-preview');

    console.log('✅ 测试通过：AI 功能可以禁用');
  });
});

