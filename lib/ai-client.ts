/**
 * 统一 AI 客户端
 * 支持多种 AI 服务提供商，提供统一的接口
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============== 类型定义 ==============

export interface AIConfig {
  provider: string; // openai, claude, baidu, alibaba, zhipu, ollama
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: AIToolCall[];
}

export interface AITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export interface AIToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface AIResponse {
  content: string | null;
  toolCalls: AIToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============== 统一 AI 客户端 ==============

export class AIClient {
  protected config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * 发送聊天请求（子类需要实现）
   */
  async chat(messages: AIMessage[], tools?: AITool[]): Promise<AIResponse> {
    throw new Error('chat() 方法需要在子类中实现');
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.chat([
        { role: 'user', content: 'Hello, this is a connection test. Please respond with "Connection successful".' }
      ]);

      if (response.content && response.content.includes('success')) {
        return { success: true };
      } else if (response.content) {
        return { success: true }; // 只要有响应就算成功
      } else {
        return { success: false, error: '未收到响应' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取配置信息（用于调试）
   */
  getConfig(): Partial<AIConfig> {
    return {
      provider: this.config.provider,
      model: this.config.model,
      baseUrl: this.config.baseUrl,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      topP: this.config.topP,
      // 不返回 apiKey
    };
  }
}

// ============== AI 客户端工厂 ==============

/**
 * 创建 AI 客户端实例
 */
export function createAIClient(config: AIConfig): AIClient {
  switch (config.provider) {
    case 'openai':
    case 'deepseek':
      // OpenAI 和 DeepSeek 使用相同的客户端（API 格式兼容）
      const { OpenAIClient } = require('./ai-providers/openai-client');
      return new OpenAIClient(config);
    
    // 其他提供商暂时返回基础类
    case 'claude':
    case 'baidu':
    case 'alibaba':
    case 'zhipu':
    case 'ollama':
      return new AIClient(config);
    
    default:
      throw new Error(`不支持的 AI 提供商: ${config.provider}`);
  }
}

/**
 * 从数据库加载 AI 配置
 */
export async function loadAIConfig(): Promise<AIConfig> {
  const settings = await prisma.platformSettings.findFirst();

  if (!settings) {
    throw new Error('未找到平台设置');
  }

  if (!settings.aiEnabled) {
    throw new Error('AI 功能未启用，请先在设置页面启用');
  }

  if (!settings.aiApiKey) {
    throw new Error('AI API Key 未配置，请先在设置页面配置');
  }

  return {
    provider: settings.aiProvider,
    model: settings.aiModel,
    apiKey: settings.aiApiKey,
    baseUrl: settings.aiBaseUrl || undefined,
    temperature: settings.aiTemperature,
    maxTokens: settings.aiMaxTokens,
    topP: settings.aiTopP,
  };
}

/**
 * 从配置对象加载 AI 客户端
 */
export async function loadAIClient(): Promise<AIClient> {
  const config = await loadAIConfig();
  return createAIClient(config);
}

