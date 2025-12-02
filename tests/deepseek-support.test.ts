/**
 * DeepSeek 支持测试
 * 验证 DeepSeek 可以使用 OpenAI 客户端
 */

import { createAIClient, type AIConfig } from '../lib/ai-client';
import { OpenAIClient } from '../lib/ai-providers/openai-client';

// Mock OpenAI SDK
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                role: 'assistant',
                content: 'Hello from DeepSeek!',
              },
            }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
        },
      },
    })),
  };
});

describe('DeepSeek Support', () => {
  test('应该支持 DeepSeek 提供商', () => {
    const config: AIConfig = {
      provider: 'deepseek',
      model: 'deepseek-chat',
      apiKey: 'sk-deepseek-test',
      baseUrl: 'https://api.deepseek.com/v1',
    };

    const client = createAIClient(config);

    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(OpenAIClient);

    console.log('✅ 测试通过：DeepSeek 提供商支持正确');
  });

  test('DeepSeek 应该能够发送聊天请求', async () => {
    const config: AIConfig = {
      provider: 'deepseek',
      model: 'deepseek-chat',
      apiKey: 'sk-deepseek-test',
      baseUrl: 'https://api.deepseek.com/v1',
    };

    const client = createAIClient(config);

    const response = await client.chat([
      { role: 'user', content: 'Hello' }
    ]);

    expect(response).toBeDefined();
    expect(response.content).toBe('Hello from DeepSeek!');

    console.log('✅ 测试通过：DeepSeek 可以发送聊天请求');
  });

  test('应该使用 DeepSeek 的 Base URL', () => {
    const config: AIConfig = {
      provider: 'deepseek',
      model: 'deepseek-chat',
      apiKey: 'sk-deepseek-test',
      baseUrl: 'https://api.deepseek.com/v1',
    };

    const client = createAIClient(config);
    const clientConfig = client.getConfig();

    expect(clientConfig.baseUrl).toBe('https://api.deepseek.com/v1');

    console.log('✅ 测试通过：DeepSeek Base URL 正确');
  });
});

