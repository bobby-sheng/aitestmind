import { NextRequest } from 'next/server';
import { getRecorderInstance } from '@/lib/playwright-recorder';

/**
 * GET /api/recording/stream
 * Server-Sent Events (SSE) 实时推送录制更新
 */
export async function GET(request: NextRequest) {
  // 创建 SSE 响应
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      const recorder = getRecorderInstance();
      
      // 创建 SSE 客户端对象
      const client = {
        write: (data: string) => {
          try {
            controller.enqueue(encoder.encode(data));
          } catch (error) {
            console.error('SSE 写入失败:', error);
          }
        },
      };

      // 注册客户端
      recorder.addSSEClient(client);

      // 发送初始连接消息
      client.write(`: connected\n\n`);

      // 定期发送心跳，保持连接
      const heartbeatInterval = setInterval(() => {
        try {
          client.write(`: heartbeat\n\n`);
        } catch (error) {
          clearInterval(heartbeatInterval);
        }
      }, 15000); // 每15秒发送心跳

      // 清理函数
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        recorder.removeSSEClient(client);
      };

      // 监听连接关闭
      request.signal.addEventListener('abort', cleanup);

      // 返回清理函数
      return cleanup;
    },
    cancel() {
      // 连接关闭时的清理
      console.log('SSE 连接已关闭');
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

