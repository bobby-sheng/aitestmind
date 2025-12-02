/**
 * OpenAI 适配器
 * 支持 GPT 系列模型
 */

import OpenAI from 'openai';
import { AIClient, type AIConfig, type AIMessage, type AITool, type AIResponse } from '../ai-client';

export class OpenAIClient extends AIClient {
  private openai: OpenAI;

  constructor(config: AIConfig) {
    super(config);

    this.openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || 'https://api.openai.com/v1',
    });
  }

  /**
   * 发送聊天请求
   */
  async chat(messages: AIMessage[], tools?: AITool[]): Promise<AIResponse> {
    try {
      // 转换消息格式
      const openaiMessages = messages.map(msg => {
        if (msg.role === 'tool') {
          // OpenAI 的工具结果格式
          return {
            role: 'tool' as const,
            tool_call_id: msg.tool_call_id!,
            content: msg.content || '',
          };
        }
        
        if (msg.role === 'assistant' && msg.tool_calls) {
          // assistant 消息包含 tool_calls
          return {
            role: 'assistant' as const,
            content: msg.content,
            tool_calls: msg.tool_calls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments,
              },
            })),
          };
        }
        
        return {
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content || '',
        };
      });

      // 调用 OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: openaiMessages as any,
        tools: tools as any,
        tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
        temperature: this.config.temperature || 0.7,
        max_tokens: this.config.maxTokens || 4000,
        top_p: this.config.topP || 1.0,
      });

      // 检查是否因为 token 限制被截断
      if (completion.choices[0].finish_reason === 'length') {
        console.warn('⚠️ AI 响应因 token 限制被截断，建议增加 maxTokens 配置');
      }

      const choice = completion.choices[0];
      const message = choice.message;

      // 转换响应格式
      return {
        content: message.content,
        toolCalls: message.tool_calls?.map(tc => ({
          id: tc.id,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })) || [],
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: any) {
      // 处理 OpenAI 特定的错误
      if (error.status === 401) {
        throw new Error('OpenAI API Key 无效或已过期');
      } else if (error.status === 429) {
        throw new Error('OpenAI API 请求频率超限，请稍后再试');
      } else if (error.status === 500) {
        throw new Error('OpenAI 服务器错误，请稍后再试');
      }

      throw new Error(`OpenAI API 调用失败: ${error.message}`);
    }
  }
}

