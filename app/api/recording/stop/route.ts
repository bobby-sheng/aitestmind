import { NextRequest, NextResponse } from 'next/server';
import { getRecorderInstance, clearRecorderInstance } from '@/lib/playwright-recorder';

/**
 * POST /api/recording/stop
 * 停止Playwright录制并获取HAR数据
 */
export async function POST(request: NextRequest) {
  try {
    const recorder = getRecorderInstance();

    // 停止录制并获取HAR数据
    const harData = await recorder.stopRecording();
    const session = recorder.getSession();
    const summaries = recorder.getRequestSummaries();

    // 清理实例
    clearRecorderInstance();

    return NextResponse.json({
      success: true,
      session,
      harData,
      summaries,
      message: 'Recording stopped successfully',
    });
  } catch (error: any) {
    console.error('Failed to stop recording:', error);
    return NextResponse.json(
      {
        error: 'Failed to stop recording',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

