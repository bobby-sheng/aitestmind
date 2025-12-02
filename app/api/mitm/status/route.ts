import { NextRequest, NextResponse } from 'next/server';
import { getMitmManager } from '@/lib/mitmproxy-manager';

/**
 * GET /api/mitm/status
 * 获取 mitmproxy 状态
 */
export async function GET(request: NextRequest) {
  try {
    const manager = getMitmManager();
    const result = await manager.getStatus();

    return NextResponse.json({
      success: result.success,
      session: result.session,
      summaries: result.summaries,
      totalRequests: result.totalRequests,
    });
  } catch (error: any) {
    console.error('Failed to get mitmproxy status:', error);
    
    // 返回空状态（表示服务未运行）
    return NextResponse.json({
      success: false,
      session: null,
      summaries: [],
      totalRequests: 0,
    });
  }
}

