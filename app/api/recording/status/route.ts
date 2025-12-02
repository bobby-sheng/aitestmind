import { NextRequest, NextResponse } from 'next/server';
import { getRecorderInstance } from '@/lib/playwright-recorder';

/**
 * GET /api/recording/status
 * 获取当前录制状态和已捕获的请求
 */
export async function GET(request: NextRequest) {
  try {
    const recorder = getRecorderInstance();
    const session = recorder.getSession();

    if (!session) {
      return NextResponse.json({
        success: false,
        session: null,
        message: 'No active recording session',
      });
    }

    // 获取请求摘要
    const summaries = recorder.getRequestSummaries();

    return NextResponse.json({
      success: true,
      session,
      summaries,
      totalRequests: summaries.length,
    });
  } catch (error: any) {
    console.error('Failed to get recording status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get recording status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

