import { NextRequest, NextResponse } from 'next/server';
import { getRecorderInstance } from '@/lib/playwright-recorder';

/**
 * POST /api/recording/pause
 * 暂停Playwright录制
 */
export async function POST(request: NextRequest) {
  try {
    const recorder = getRecorderInstance();

    // 暂停录制
    const session = recorder.pauseRecording();

    return NextResponse.json({
      success: true,
      session,
      message: 'Recording paused successfully',
    });
  } catch (error: any) {
    console.error('Failed to pause recording:', error);
    return NextResponse.json(
      {
        error: 'Failed to pause recording',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

