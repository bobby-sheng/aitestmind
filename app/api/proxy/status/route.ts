import { NextRequest, NextResponse } from 'next/server';
import { getProxyRecorderInstance } from '@/lib/proxy-recorder';

/**
 * GET /api/proxy/status
 * 获取代理录制状态（不停止录制）
 */
export async function GET(request: NextRequest) {
  try {
    const recorder = getProxyRecorderInstance();

    const session = recorder.getSession();
    if (!session) {
      return NextResponse.json({
        success: false,
        session: null,
        summaries: [],
        totalRequests: 0,
      });
    }

    const summaries = recorder.getRequestSummaries();

    return NextResponse.json({
      success: true,
      session,
      summaries,
      totalRequests: summaries.length,
    });
  } catch (error: any) {
    console.error('Failed to get proxy status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get proxy status',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

