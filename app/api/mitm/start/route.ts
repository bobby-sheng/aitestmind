import { NextRequest, NextResponse } from 'next/server';
import { getMitmManager } from '@/lib/mitmproxy-manager';

/**
 * POST /api/mitm/start
 * 启动 mitmproxy 代理服务器（直接管理，无需 Flask）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { port } = body;

    const proxyPort = port || 8899;
    const manager = getMitmManager();

    // 直接启动 mitmproxy 进程
    const result = await manager.start(proxyPort);

    if (result.success && result.session) {
      const alreadyRunning = manager.isRunning();
      
      return NextResponse.json({
        success: true,
        session: result.session,
        port: proxyPort,
        certificatePath: manager.getCertificatePath(),
        alreadyRunning,
        message: alreadyRunning 
          ? 'mitmproxy 已经在运行，已恢复现有会话' 
          : 'mitmproxy 代理服务器已启动',
        instructions: {
          proxy: `配置浏览器代理为 localhost:${proxyPort}`,
          certificate: `安装 HTTPS 证书: ${manager.getCertificatePath()}`,
          manual: [
            '1. 打开浏览器代理设置',
            `2. 配置HTTP代理: localhost:${proxyPort}`,
            `3. 配置HTTPS代理: localhost:${proxyPort}`,
            '4. 安装 mitmproxy 证书（首次使用）',
            '5. 重启浏览器以使证书生效',
            '6. 开始浏览网站，所有请求将被捕获',
          ],
        },
      });
    } else {
      return NextResponse.json(
        {
          error: result.error || '启动 mitmproxy 失败',
          details: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Failed to start mitmproxy:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to start mitmproxy',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

