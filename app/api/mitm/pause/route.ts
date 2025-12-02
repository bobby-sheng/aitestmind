import { NextRequest, NextResponse } from 'next/server';
import { getMitmManager } from '@/lib/mitmproxy-manager';

/**
 * POST /api/mitm/pause
 * 暂停 mitmproxy 录制
 */
export async function POST(request: NextRequest) {
  try {
    const manager = getMitmManager();
    const result = await manager.pause();

    if (result.success) {
      return NextResponse.json({
        success: true,
        session: result.session,
        message: 'mitmproxy 录制已暂停',
      });
    } else {
      return NextResponse.json(
        {
          error: result.error || '暂停失败',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Failed to pause mitmproxy:', error);
    return NextResponse.json(
      {
        error: 'Failed to pause mitmproxy',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
