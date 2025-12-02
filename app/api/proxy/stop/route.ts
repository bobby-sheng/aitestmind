import { NextRequest, NextResponse } from 'next/server';
import { getProxyRecorderInstance } from '@/lib/proxy-recorder';

/**
 * POST /api/proxy/stop
 * 停止代理服务器录制
 */
export async function POST(request: NextRequest) {
  try {
    const recorder = getProxyRecorderInstance();

    // 获取会话信息
    const session = recorder.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No active proxy session' },
        { status: 400 }
      );
    }

    // 获取捕获的请求摘要
    const summaries = recorder.getRequestSummaries();

    // 停止代理服务器
    const harData = await recorder.stopRecording();

    return NextResponse.json({
      success: true,
      session,
      harData,
      summaries,
      totalRequests: summaries.length,
      message: 'Proxy recording stopped successfully',
    });
  } catch (error: any) {
    console.error('Failed to stop proxy:', error);
    return NextResponse.json(
      {
        error: 'Failed to stop proxy server',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

