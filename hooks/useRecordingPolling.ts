"use client";

import { useEffect, useRef } from "react";
import { CapturedApi, RecordingSession } from "@/types/har";

interface UseRecordingPollingOptions {
  isRecording: boolean;
  session: RecordingSession | null;
  interval?: number;
  onUpdate: (data: { summaries: CapturedApi[]; session: RecordingSession }) => void;
}

/**
 * 自定义Hook：录制状态轮询
 * 在录制过程中定期获取最新的捕获请求
 */
export function useRecordingPolling({
  isRecording,
  session,
  interval = 2000,
  onUpdate,
}: UseRecordingPollingOptions) {
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording && session) {
      // 启动轮询
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch('/api/recording/status');
          const data = await response.json();
          
          if (data.success && data.summaries) {
            onUpdate({
              summaries: data.summaries,
              session: data.session,
            });
          }
        } catch (error) {
          console.error('轮询失败:', error);
        }
      }, interval);
    }

    // 清理定时器
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isRecording, session, interval, onUpdate]);
}

