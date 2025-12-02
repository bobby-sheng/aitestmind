import { NextRequest } from 'next/server';
import { getMitmManager } from '@/lib/mitmproxy-manager';

/**
 * GET /api/mitm/stream
 * Server-Sent Events (SSE) 实时推送 mitmproxy 捕获的请求
 * 🔥 事件驱动方式（类似 Playwright）- 不使用轮询
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const manager = getMitmManager();
      
      // 创建 SSE 客户端对象
      const client = {
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('[SSE] 写入失败:', error);
          }
        },
      };

      // 注册客户端到 manager
      manager.addSSEClient(client);
      console.log('[SSE] 客户端已连接');

      // 发送初始连接消息
      client.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE 连接已建立' })}\n\n`);

      // 定期发送心跳，保持连接
      const heartbeatInterval = setInterval(() => {
        try {
          client.write(`data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`);
        } catch (error) {
          clearInterval(heartbeatInterval);
        }
      }, 15000); // 每15秒发送心跳

      // 清理函数
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        manager.removeSSEClient(client);
        console.log('[SSE] 客户端已断开');
      };

      // 监听连接关闭
      request.signal.addEventListener('abort', cleanup);

      // 返回清理函数
      return cleanup;
    },
    cancel() {
      console.log('[SSE] 流已取消');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // 禁用 Nginx 缓冲
    },
  });
}
