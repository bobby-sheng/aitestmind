/**
 * 任务 3 测试：OpenAI 适配器
 * 测试 OpenAIClient 的基本功能和错误处理
 */

import { createAIClient, type AIConfig, type AIMessage } from '../lib/ai-client';
import { OpenAIClient } from '../lib/ai-providers/openai-client';

// Mock OpenAI SDK
const mockCreate = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
  };
});

describe('Task 3: OpenAI Client Adapter', () => {
  const mockConfig: AIConfig = {
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    apiKey: 'sk-test-mock-key',
    baseUrl: 'https://api.openai.com/v1',
    temperature: 0.7,
    maxTokens: 4000,
    topP: 1.0,
  };

  beforeEach(() => {
    // 重置 Mock 并设置默认响应
    mockCreate.mockClear();
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          role: 'assistant',
          content: 'Hello! This is a test response.',
          tool_calls: null,
        },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 8,
        total_tokens: 18,
      },
    });
  });

  test('应该能够创建 OpenAI 客户端实例', () => {
    const client = new OpenAIClient(mockConfig);

    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(OpenAIClient);

    console.log('✅ 测试通过：OpenAI 客户端实例创建成功');
  });

  test('工厂函数应该返回 OpenAI 客户端', () => {
    const client = createAIClient(mockConfig);

    expect(client).toBeDefined();
    expect(client).toBeInstanceOf(OpenAIClient);

    console.log('✅ 测试通过：工厂函数正确返回 OpenAI 客户端');
  });

  test('应该能够发送聊天请求', async () => {
    const client = new OpenAIClient(mockConfig);

    const messages: AIMessage[] = [
      { role: 'user', content: 'Hello, how are you?' }
    ];

    const response = await client.chat(messages);

    expect(response).toBeDefined();
    expect(response.content).toBe('Hello! This is a test response.');
    expect(response.toolCalls).toEqual([]);
    expect(response.usage).toBeDefined();
    expect(response.usage!.totalTokens).toBe(18);

    console.log('✅ 测试通过：聊天请求成功');
  });

  test('应该能够处理系统消息', async () => {
    const client = new OpenAIClient(mockConfig);

    const messages: AIMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello!' }
    ];

    const response = await client.chat(messages);

    expect(response).toBeDefined();
    expect(response.content).toBeTruthy();

    console.log('✅ 测试通过：系统消息处理正确');
  });

  test('应该能够处理工具调用响应', async () => {
    // Mock 工具调用响应
    mockCreate.mockResolvedValueOnce({
      choices: [{
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: 'call_123',
            type: 'function',
            function: {
              name: 'search_apis',
              arguments: '{"keyword":"test"}',
            },
          }],
        },
        finish_reason: 'tool_calls',
      }],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 20,
        total_tokens: 70,
      },
    });

    const client = new OpenAIClient(mockConfig);

    const messages: AIMessage[] = [
      { role: 'user', content: 'Search for APIs' }
    ];

    const tools = [{
      type: 'function' as const,
      function: {
        name: 'search_apis',
        description: 'Search APIs',
        parameters: { type: 'object', properties: {} },
      },
    }];

    const response = await client.chat(messages, tools);

    expect(response.toolCalls).toHaveLength(1);
    expect(response.toolCalls[0].function.name).toBe('search_apis');
    expect(response.toolCalls[0].function.arguments).toBe('{"keyword":"test"}');

    console.log('✅ 测试通过：工具调用响应处理正确');
  });

  test('应该能够处理工具结果消息', async () => {
    const client = new OpenAIClient(mockConfig);

    const messages: AIMessage[] = [
      { role: 'user', content: 'Search APIs' },
      { role: 'assistant', content: null },
      { 
        role: 'tool', 
        content: JSON.stringify([{ id: '1', name: 'Test API' }]),
        tool_call_id: 'call_123'
      },
    ];

    const response = await client.chat(messages);

    expect(response).toBeDefined();

    console.log('✅ 测试通过：工具结果消息处理正确');
  });

  test('应该正确处理 401 错误（API Key 无效）', async () => {
    mockCreate.mockRejectedValueOnce({
      status: 401,
      message: 'Invalid API Key',
    });

    const client = new OpenAIClient(mockConfig);
    const messages: AIMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    await expect(client.chat(messages)).rejects.toThrow('OpenAI API Key 无效或已过期');

    console.log('✅ 测试通过：401 错误处理正确');
  });

  test('应该正确处理 429 错误（请求频率超限）', async () => {
    mockCreate.mockRejectedValueOnce({
      status: 429,
      message: 'Rate limit exceeded',
    });

    const client = new OpenAIClient(mockConfig);
    const messages: AIMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    await expect(client.chat(messages)).rejects.toThrow('OpenAI API 请求频率超限');

    console.log('✅ 测试通过：429 错误处理正确');
  });

  test('应该正确处理 500 错误（服务器错误）', async () => {
    mockCreate.mockRejectedValueOnce({
      status: 500,
      message: 'Internal server error',
    });

    const client = new OpenAIClient(mockConfig);
    const messages: AIMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    await expect(client.chat(messages)).rejects.toThrow('OpenAI 服务器错误');

    console.log('✅ 测试通过：500 错误处理正确');
  });

  test('应该正确处理其他错误', async () => {
    mockCreate.mockRejectedValueOnce(
      new Error('Unknown error')
    );

    const client = new OpenAIClient(mockConfig);
    const messages: AIMessage[] = [
      { role: 'user', content: 'Hello' }
    ];

    await expect(client.chat(messages)).rejects.toThrow('OpenAI API 调用失败');

    console.log('✅ 测试通过：其他错误处理正确');
  });

  test('应该使用配置的参数', async () => {
    const customConfig: AIConfig = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'sk-test',
      temperature: 0.5,
      maxTokens: 2000,
      topP: 0.9,
    };

    const client = new OpenAIClient(customConfig);
    const messages: AIMessage[] = [
      { role: 'user', content: 'Test' }
    ];

    await client.chat(messages);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        temperature: 0.5,
        max_tokens: 2000,
        top_p: 0.9,
      })
    );

    console.log('✅ 测试通过：配置参数应用正确');
  });
});

