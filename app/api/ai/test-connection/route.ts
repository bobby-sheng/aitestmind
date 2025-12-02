/**
 * AI 测试连接 API
 * 用于验证 AI 配置是否正确
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAIClient, type AIConfig } from '@/lib/ai-client';

export async function POST(request: NextRequest) {
  try {
    // 获取配置信息
    const config: AIConfig = await request.json();

    // 验证必填字段
    if (!config.provider) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少 AI 提供商配置',
        },
        { status: 400 }
      );
    }

    if (!config.model) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少 AI 模型配置',
        },
        { status: 400 }
      );
    }

    if (!config.apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: '缺少 API Key',
        },
        { status: 400 }
      );
    }

    // 创建客户端
    const client = createAIClient(config);

    // 测试连接
    const result = await client.testConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'AI 连接测试成功！',
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || '连接失败',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('AI 连接测试失败:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || '连接测试失败',
      },
      { status: 500 }
    );
  }
}

