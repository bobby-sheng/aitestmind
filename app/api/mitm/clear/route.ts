import { NextRequest, NextResponse } from 'next/server';
import { getMitmManager } from '@/lib/mitmproxy-manager';

/**
 * POST /api/mitm/clear
 * 清空 mitmproxy 已捕获的数据（不停止录制）
 */
export async function POST(request: NextRequest) {
  try {
    const manager = getMitmManager();
    const result = await manager.clearCapturedData();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '已清空捕获数据',
      });
    } else {
      return NextResponse.json(
        {
          error: result.error || '清空数据失败',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Failed to clear captured data:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear captured data',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

