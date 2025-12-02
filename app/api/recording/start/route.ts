import { NextRequest, NextResponse } from 'next/server';
import { getRecorderInstance } from '@/lib/playwright-recorder';

/**
 * POST /api/recording/start
 * 启动Playwright录制
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // 验证URL格式
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // 获取录制器实例
    const recorder = getRecorderInstance();

    // 启动录制
    const session = await recorder.startRecording(url);

    return NextResponse.json({
      success: true,
      session,
      message: 'Recording started successfully',
    });
  } catch (error: any) {
    console.error('Failed to start recording:', error);
    
    // 检测是否是 Playwright 未安装的错误
    const isPlaywrightNotInstalled = 
      error.message?.includes('Executable doesn\'t exist') ||
      error.message?.includes('browserType.launch') ||
      error.message?.includes('Chromium.app');
    
    if (isPlaywrightNotInstalled) {
      return NextResponse.json(
        {
          success: false,
          error: 'Playwright Chromium 未安装',
          errorType: 'PLAYWRIGHT_NOT_INSTALLED',
          details: error.message,
          installCommand: 'npx playwright install chromium',
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start recording',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

