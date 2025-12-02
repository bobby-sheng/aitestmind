import { NextRequest, NextResponse } from 'next/server';
import { getProxyRecorderInstance } from '@/lib/proxy-recorder';

/**
 * POST /api/proxy/resume
 * 继续代理录制
 */
export async function POST(request: NextRequest) {
  try {
    const recorder = getProxyRecorderInstance();
    const session = recorder.resumeRecording();

    return NextResponse.json({
      success: true,
      session,
      message: 'Proxy recording resumed',
    });
  } catch (error: any) {
    console.error('Failed to resume proxy:', error);
    return NextResponse.json(
      {
        error: 'Failed to resume proxy recording',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

