import { NextRequest, NextResponse } from 'next/server';
import { getRecorderInstance } from '@/lib/playwright-recorder';

/**
 * POST /api/recording/resume
 * 继续Playwright录制
 */
export async function POST(request: NextRequest) {
  try {
    const recorder = getRecorderInstance();

    // 继续录制
    const session = recorder.resumeRecording();

    return NextResponse.json({
      success: true,
      session,
      message: 'Recording resumed successfully',
    });
  } catch (error: any) {
    console.error('Failed to resume recording:', error);
    return NextResponse.json(
      {
        error: 'Failed to resume recording',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

