import { NextRequest, NextResponse } from 'next/server';
import { getMitmManager } from '@/lib/mitmproxy-manager';

/**
 * POST /api/mitm/stop
 * 停止 mitmproxy 代理服务器
 */
export async function POST(request: NextRequest) {
  try {
    const manager = getMitmManager();
    const result = await manager.stop();

    if (result.success) {
      return NextResponse.json({
        success: true,
        session: null,
        harData: result.harData,
        summaries: result.summaries || [],
        totalRequests: result.summaries?.length || 0,
        message: 'mitmproxy 已停止',
      });
    } else {
      return NextResponse.json(
        {
          error: result.error || '停止 mitmproxy 失败',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Failed to stop mitmproxy:', error);
    return NextResponse.json(
      {
        error: 'Failed to stop mitmproxy',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

