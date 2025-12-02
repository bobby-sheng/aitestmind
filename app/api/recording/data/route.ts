import { NextRequest, NextResponse } from 'next/server';
import { getRecorderInstance } from '@/lib/playwright-recorder';

/**
 * GET /api/recording/data
 * 获取当前捕获的HAR数据（不停止录制）
 */
export async function GET(request: NextRequest) {
  try {
    const recorder = getRecorderInstance();
    const session = recorder.getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No active recording session' },
        { status: 404 }
      );
    }

    const harData = recorder.getHarData();
    const summaries = recorder.getRequestSummaries();

    return NextResponse.json({
      success: true,
      session,
      harData,
      summaries,
      totalRequests: summaries.length,
    });
  } catch (error: any) {
    console.error('Failed to get recording data:', error);
    return NextResponse.json(
      {
        error: 'Failed to get recording data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

