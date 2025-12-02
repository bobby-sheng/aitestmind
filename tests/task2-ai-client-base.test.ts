/**
 * 任务 2 测试：统一 AI 客户端基础框架
 * 测试 AIClient 基础类和配置加载功能
 */

import { PrismaClient } from '@prisma/client';
import { 
  AIClient, 
  createAIClient, 
  loadAIConfig, 
  loadAIClient,
  type AIConfig,
  type AIMessage 
} from '../lib/ai-client';

const prisma = new PrismaClient();

describe('Task 2: AI Client Base Framework', () => {
  beforeEach(async () => {
    // 清理测试数据
    await prisma.platformSettings.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test('应该能够创建 AI 客户端实例', () => {
    const config: AIConfig = {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      apiKey: 'sk-test-123',
      temperature: 0.7,
      maxTokens: 4000,
      topP: 1.0,
    };

    const client = new AIClient(config);

    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(AIClient);

    console.log('✅ 测试通过：AI 客户端实例创建成功');
  });

  test('应该能够通过工厂函数创建客户端', () => {
    const config: AIConfig = {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      apiKey: 'sk-test-123',
    };

    const client = createAIClient(config);

    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(AIClient);

    console.log('✅ 测试通过：工厂函数创建客户端成功');
  });

  test('应该能够获取配置信息（不包含 API Key）', () => {
    const config: AIConfig = {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      apiKey: 'sk-test-123-secret',
      baseUrl: 'https://api.openai.com/v1',
      temperature: 0.8,
      maxTokens: 2000,
      topP: 0.9,
    };

    const client = new AIClient(config);
    const configInfo = client.getConfig();

    expect(configInfo.provider).toBe('openai');
    expect(configInfo.model).toBe('gpt-4-turbo-preview');
    expect(configInfo.baseUrl).toBe('https://api.openai.com/v1');
    expect(configInfo.temperature).toBe(0.8);
    expect(configInfo.maxTokens).toBe(2000);
    expect(configInfo.topP).toBe(0.9);
    expect(configInfo).not.toHaveProperty('apiKey'); // 不应该包含 API Key

    console.log('✅ 测试通过：配置信息获取正确，API Key 已隐藏');
  });

  test('应该能够从数据库加载 AI 配置', async () => {
    // 创建测试配置
    await prisma.platformSettings.create({
      data: {
        aiEnabled: true,
        aiProvider: 'openai',
        aiModel: 'gpt-4-turbo-preview',
        aiApiKey: 'sk-test-database-key',
        aiBaseUrl: 'https://api.openai.com/v1',
        aiTemperature: 0.7,
        aiMaxTokens: 4000,
        aiTopP: 1.0,
      },
    });

    // 加载配置
    const config = await loadAIConfig();

    expect(config).toBeDefined();
    expect(config.provider).toBe('openai');
    expect(config.model).toBe('gpt-4-turbo-preview');
    expect(config.apiKey).toBe('sk-test-database-key');
    expect(config.baseUrl).toBe('https://api.openai.com/v1');
    expect(config.temperature).toBe(0.7);
    expect(config.maxTokens).toBe(4000);
    expect(config.topP).toBe(1.0);

    console.log('✅ 测试通过：从数据库加载配置成功');
  });

  test('AI 功能未启用时应该抛出错误', async () => {
    // 创建禁用 AI 的配置
    await prisma.platformSettings.create({
      data: {
        aiEnabled: false,
        aiProvider: 'openai',
        aiModel: 'gpt-4-turbo-preview',
        aiApiKey: 'sk-test-123',
      },
    });

    // 尝试加载配置
    await expect(loadAIConfig()).rejects.toThrow('AI 功能未启用');

    console.log('✅ 测试通过：AI 功能未启用时正确抛出错误');
  });

  test('API Key 未配置时应该抛出错误', async () => {
    // 创建没有 API Key 的配置
    await prisma.platformSettings.create({
      data: {
        aiEnabled: true,
        aiProvider: 'openai',
        aiModel: 'gpt-4-turbo-preview',
        aiApiKey: null,
      },
    });

    // 尝试加载配置
    await expect(loadAIConfig()).rejects.toThrow('AI API Key 未配置');

    console.log('✅ 测试通过：API Key 未配置时正确抛出错误');
  });

  test('未找到平台设置时应该抛出错误', async () => {
    // 确保数据库中没有设置记录
    await prisma.platformSettings.deleteMany({});

    // 尝试加载配置
    await expect(loadAIConfig()).rejects.toThrow('未找到平台设置');

    console.log('✅ 测试通过：未找到平台设置时正确抛出错误');
  });

  test('应该能够通过 loadAIClient 直接创建客户端', async () => {
    // 创建测试配置
    await prisma.platformSettings.create({
      data: {
        aiEnabled: true,
        aiProvider: 'claude',
        aiModel: 'claude-3-5-sonnet-20241022',
        aiApiKey: 'sk-ant-test-456',
        aiTemperature: 0.8,
      },
    });

    // 加载客户端
    const client = await loadAIClient();

    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(AIClient);

    const config = client.getConfig();
    expect(config.provider).toBe('claude');
    expect(config.model).toBe('claude-3-5-sonnet-20241022');

    console.log('✅ 测试通过：loadAIClient 创建客户端成功');
  });

  test('chat 方法应该在基类中抛出错误', async () => {
    const config: AIConfig = {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      apiKey: 'sk-test-123',
    };

    const client = new AIClient(config);

    const messages: AIMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    // 基类的 chat 方法应该抛出错误
    await expect(client.chat(messages)).rejects.toThrow('chat() 方法需要在子类中实现');

    console.log('✅ 测试通过：基类 chat 方法正确抛出错误');
  });

  test('应该支持不同的 AI 提供商配置', async () => {
    const providers = [
      { provider: 'openai', model: 'gpt-4-turbo-preview', apiKey: 'sk-openai' },
      { provider: 'claude', model: 'claude-3-5-sonnet-20241022', apiKey: 'sk-ant-claude' },
      { provider: 'baidu', model: 'ERNIE-4.0-Turbo', apiKey: 'baidu-key:secret' },
      { provider: 'alibaba', model: 'qwen-max', apiKey: 'sk-alibaba' },
      { provider: 'zhipu', model: 'glm-4-plus', apiKey: 'zhipu-key' },
      { provider: 'ollama', model: 'llama3.1:8b', apiKey: 'no-key-needed' },
    ];

    for (const providerConfig of providers) {
      const client = createAIClient(providerConfig as AIConfig);
      expect(client).toBeDefined();
      
      const config = client.getConfig();
      expect(config.provider).toBe(providerConfig.provider);
      expect(config.model).toBe(providerConfig.model);
    }

    console.log('✅ 测试通过：所有 AI 提供商配置都支持');
  });
});

