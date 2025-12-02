import { NextRequest, NextResponse } from 'next/server';
import { getProxyRecorderInstance } from '@/lib/proxy-recorder';

/**
 * POST /api/proxy/pause
 * 暂停代理录制
 */
export async function POST(request: NextRequest) {
  try {
    const recorder = getProxyRecorderInstance();
    const session = recorder.pauseRecording();

    return NextResponse.json({
      success: true,
      session,
      message: 'Proxy recording paused',
    });
  } catch (error: any) {
    console.error('Failed to pause proxy:', error);
    return NextResponse.json(
      {
        error: 'Failed to pause proxy recording',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

