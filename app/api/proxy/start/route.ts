import { NextRequest, NextResponse } from 'next/server';
import { getProxyRecorderInstance } from '@/lib/proxy-recorder';

/**
 * POST /api/proxy/start
 * 启动代理服务器录制
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { port } = body;

    const proxyPort = port || 8899;

    // 获取代理录制器实例
    const recorder = getProxyRecorderInstance();

    // 启动代理服务器
    const session = await recorder.startRecording(proxyPort);

    return NextResponse.json({
      success: true,
      session,
      port: proxyPort,
      message: '代理服务器已启动',
      instructions: {
        chrome: `打开 chrome://settings/?search=proxy 配置代理为 localhost:${proxyPort}`,
        firefox: `打开 about:preferences#general 配置代理为 localhost:${proxyPort}`,
        manual: [
          '1. 打开浏览器代理设置',
          `2. 配置HTTP代理: localhost:${proxyPort}`,
          `3. 配置HTTPS代理: localhost:${proxyPort}`,
          '4. 保存设置后，开始正常浏览网站',
          '5. 所有请求将被自动捕获',
        ],
      },
    });
  } catch (error: any) {
    console.error('Failed to start proxy:', error);
    return NextResponse.json(
      {
        error: 'Failed to start proxy server',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

