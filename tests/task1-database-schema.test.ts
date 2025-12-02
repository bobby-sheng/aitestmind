/**
 * 任务 1 测试：数据库模型扩展
 * 测试 PlatformSettings 模型是否正确添加了 AI 配置字段
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Task 1: Database Schema - AI Config Fields', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('应该能够创建包含 AI 配置的 PlatformSettings 记录', async () => {
    // 清理测试数据
    await prisma.platformSettings.deleteMany({});

    // 创建测试记录
    const settings = await prisma.platformSettings.create({
      data: {
        // AI 配置
        aiEnabled: true,
        aiProvider: 'openai',
        aiModel: 'gpt-4-turbo-preview',
        aiApiKey: 'sk-test-123456',
        aiBaseUrl: 'https://api.openai.com/v1',
        aiTemperature: 0.7,
        aiMaxTokens: 4000,
        aiTopP: 1.0,
      },
    });

    // 验证
    expect(settings).toBeDefined();
    expect(settings.aiEnabled).toBe(true);
    expect(settings.aiProvider).toBe('openai');
    expect(settings.aiModel).toBe('gpt-4-turbo-preview');
    expect(settings.aiApiKey).toBe('sk-test-123456');
    expect(settings.aiBaseUrl).toBe('https://api.openai.com/v1');
    expect(settings.aiTemperature).toBe(0.7);
    expect(settings.aiMaxTokens).toBe(4000);
    expect(settings.aiTopP).toBe(1.0);

    console.log('✅ 测试通过：AI 配置字段已正确添加');
  });

  test('应该能够使用默认值创建 PlatformSettings', async () => {
    // 清理测试数据
    await prisma.platformSettings.deleteMany({});

    // 创建记录（不指定 AI 配置）
    const settings = await prisma.platformSettings.create({
      data: {},
    });

    // 验证默认值
    expect(settings.aiEnabled).toBe(false);
    expect(settings.aiProvider).toBe('openai');
    expect(settings.aiModel).toBe('gpt-4-turbo-preview');
    expect(settings.aiTemperature).toBe(0.7);
    expect(settings.aiMaxTokens).toBe(4000);
    expect(settings.aiTopP).toBe(1.0);
    expect(settings.aiApiKey).toBeNull();
    expect(settings.aiBaseUrl).toBeNull();

    console.log('✅ 测试通过：默认值正确');
  });

  test('应该能够更新 AI 配置', async () => {
    // 清理测试数据
    await prisma.platformSettings.deleteMany({});

    // 创建初始记录
    const settings = await prisma.platformSettings.create({
      data: {
        aiEnabled: false,
      },
    });

    // 更新 AI 配置
    const updated = await prisma.platformSettings.update({
      where: { id: settings.id },
      data: {
        aiEnabled: true,
        aiProvider: 'claude',
        aiModel: 'claude-3-5-sonnet-20241022',
        aiApiKey: 'sk-ant-test-456',
        aiTemperature: 0.8,
      },
    });

    // 验证更新
    expect(updated.aiEnabled).toBe(true);
    expect(updated.aiProvider).toBe('claude');
    expect(updated.aiModel).toBe('claude-3-5-sonnet-20241022');
    expect(updated.aiApiKey).toBe('sk-ant-test-456');
    expect(updated.aiTemperature).toBe(0.8);

    console.log('✅ 测试通过：AI 配置可以正确更新');
  });

  test('应该能够查询 AI 配置', async () => {
    // 清理测试数据
    await prisma.platformSettings.deleteMany({});

    // 创建测试记录
    await prisma.platformSettings.create({
      data: {
        aiEnabled: true,
        aiProvider: 'openai',
        aiModel: 'gpt-4o',
        aiApiKey: 'sk-test-789',
      },
    });

    // 查询
    const settings = await prisma.platformSettings.findFirst();

    // 验证
    expect(settings).toBeDefined();
    expect(settings!.aiEnabled).toBe(true);
    expect(settings!.aiProvider).toBe('openai');
    expect(settings!.aiModel).toBe('gpt-4o');
    expect(settings!.aiApiKey).toBe('sk-test-789');

    console.log('✅ 测试通过：AI 配置可以正确查询');
  });

  test('应该支持所有 AI 提供商', async () => {
    // 清理测试数据
    await prisma.platformSettings.deleteMany({});

    const providers = [
      { provider: 'openai', model: 'gpt-4-turbo-preview' },
      { provider: 'claude', model: 'claude-3-5-sonnet-20241022' },
      { provider: 'baidu', model: 'ERNIE-4.0-Turbo' },
      { provider: 'alibaba', model: 'qwen-max' },
      { provider: 'zhipu', model: 'glm-4-plus' },
      { provider: 'ollama', model: 'llama3.1:8b' },
    ];

    for (const { provider, model } of providers) {
      const settings = await prisma.platformSettings.create({
        data: {
          aiEnabled: true,
          aiProvider: provider,
          aiModel: model,
          aiApiKey: `test-key-${provider}`,
        },
      });

      expect(settings.aiProvider).toBe(provider);
      expect(settings.aiModel).toBe(model);
    }

    // 验证所有记录
    const all = await prisma.platformSettings.findMany();
    expect(all.length).toBe(providers.length);

    console.log('✅ 测试通过：所有 AI 提供商都支持');
  });

  test('应该能够同时保存环境配置和 AI 配置', async () => {
    // 清理测试数据
    await prisma.platformSettings.deleteMany({});

    // 创建包含环境配置和 AI 配置的记录
    const settings = await prisma.platformSettings.create({
      data: {
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
      },
    });

    // 验证
    expect(settings.baseUrl).toBe('https://api.example.com');
    expect(settings.authTokenEnabled).toBe(true);
    expect(settings.aiEnabled).toBe(true);
    expect(settings.aiProvider).toBe('openai');

    console.log('✅ 测试通过：环境配置和 AI 配置可以共存');
  });
});

