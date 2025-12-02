"use client";

import { useEffect, useRef } from "react";
import { CapturedApi, RecordingSession } from "@/types/har";

interface UseRecordingSSEOptions {
  isRecording: boolean;
  enabled?: boolean;
  mode?: 'browser' | 'proxy' | 'mitmproxy'; // 录制模式
  onNewRequest: (request: CapturedApi) => void;
  onSessionUpdate: (session: RecordingSession) => void;
  onError?: (error: Event) => void;
}

/**
 * 自定义Hook：使用 Server-Sent Events 实时接收录制更新
 */
export function useRecordingSSE({
  isRecording,
  enabled = true,
  mode = 'browser',
  onNewRequest,
  onSessionUpdate,
  onError,
}: UseRecordingSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 使用 ref 保存最新的回调函数，避免依赖变化导致 SSE 重连
  const onNewRequestRef = useRef(onNewRequest);
  const onSessionUpdateRef = useRef(onSessionUpdate);
  const onErrorRef = useRef(onError);
  
  // 同步更新 ref
  useEffect(() => {
    onNewRequestRef.current = onNewRequest;
    onSessionUpdateRef.current = onSessionUpdate;
    onErrorRef.current = onError;
  }, [onNewRequest, onSessionUpdate, onError]);

  useEffect(() => {
    // 如果未启用或未在录制，不建立连接
    if (!enabled || !isRecording) {
      // 清理现有连接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    // 建立 SSE 连接
    const connectSSE = () => {
      try {
        // 根据模式选择不同的 SSE 端点
        const streamUrl = mode === 'mitmproxy' 
          ? '/api/mitm/stream' 
          : mode === 'proxy'
          ? '/api/proxy/stream'
          : '/api/recording/stream';
        
        const eventSource = new EventSource(streamUrl);
        eventSourceRef.current = eventSource;

        // 连接打开
        eventSource.onopen = () => {
          console.log(`✅ SSE 连接已建立 (${streamUrl})`);
        };

        // 接收消息
        eventSource.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            if (message.type === 'new-request') {
              // 新请求捕获
              console.log('📥 SSE 收到新请求:', message.data.method, message.data.url);
              onNewRequestRef.current(message.data);
            } else if (message.type === 'session-update') {
              // 会话状态更新（暂停/继续等）
              console.log('📥 SSE 会话更新:', message.session.capturedRequests, '个请求');
              onSessionUpdateRef.current(message.session);
            } else if (message.type === 'heartbeat') {
              // 心跳消息（不打印太多日志）
              console.debug('💓 SSE 心跳');
            } else if (message.type === 'connected') {
              console.log('📡 SSE:', message.message);
            }
          } catch (error) {
            console.error('解析 SSE 消息失败:', error);
          }
        };

        // 连接错误
        eventSource.onerror = (error) => {
          console.error('SSE 连接错误:', error);
          onErrorRef.current?.(error);

          // 关闭当前连接
          eventSource.close();
          eventSourceRef.current = null;

          // 如果仍在录制，尝试重连（5秒后）
          if (isRecording) {
            console.log('5秒后尝试重新连接...');
            reconnectTimeoutRef.current = setTimeout(() => {
              connectSSE();
            }, 5000);
          }
        };
      } catch (error) {
        console.error('创建 SSE 连接失败:', error);
      }
    };

    // 建立连接
    connectSSE();

    // 清理函数
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  // 注意：onNewRequest 和 onSessionUpdate 使用 useCallback 包裹，引用保持稳定
  // 只在 isRecording、enabled、mode 改变时重新建立连接
  }, [isRecording, enabled, mode]);

  return {
    connected: eventSourceRef.current?.readyState === 1, // 1 = OPEN
  };
}

