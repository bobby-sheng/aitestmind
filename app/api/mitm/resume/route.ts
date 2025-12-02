import { NextRequest, NextResponse } from 'next/server';
import { getMitmManager } from '@/lib/mitmproxy-manager';

/**
 * POST /api/mitm/resume
 * 继续 mitmproxy 录制
 */
export async function POST(request: NextRequest) {
  try {
    const manager = getMitmManager();
    const result = await manager.resume();

    if (result.success) {
      return NextResponse.json({
        success: true,
        session: result.session,
        message: 'mitmproxy 录制已继续',
      });
    } else {
      return NextResponse.json(
        {
          error: result.error || '继续录制失败',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Failed to resume mitmproxy:', error);
    return NextResponse.json(
      {
        error: 'Failed to resume mitmproxy',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
