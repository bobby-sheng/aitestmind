"use client";

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Maximize2, 
  Minimize2, 
  Download, 
  Trash2, 
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Terminal
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface LogEntry {
  id: string;
  timestamp: string;
  level: string;
  type?: string;
  message: string;
  details?: any;
  nodeId?: string;
  nodeName?: string;
  stepExecutionId?: string;
  caseExecutionId?: string;
  suiteExecutionId?: string;
}

interface ExecutionLogConsoleProps {
  executionId: string;
  status: string; // pending, running, completed, failed
  autoScroll?: boolean;
  className?: string;
}

export default function ExecutionLogConsole({
  executionId,
  status,
  autoScroll = true,
  className
}: ExecutionLogConsoleProps) {
  const t = useTranslations('execution');
  const tCommon = useTranslations('common');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // 加载日志
  useEffect(() => {
    if (status === 'running' || status === 'pending') {
      // 执行中：使用 SSE 实时推送
      connectSSE();
    } else {
      // 执行完成：从数据库读取
      loadLogsFromDatabase();
    }

    return () => {
      disconnectSSE();
    };
  }, [executionId, status]);

  // 连接 SSE
  const connectSSE = () => {
    console.log('[日志控制台] 连接SSE流:', executionId);
    
    try {
      const eventSource = new EventSource(
        `/api/executions/suite/${executionId}/logs/stream`
      );

      eventSource.onopen = () => {
        console.log('[日志控制台] SSE连接已建立');
        setIsConnected(true);
        setIsLoading(false);
      };

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleSSEMessage(message);
        } catch (error) {
          console.error('[日志控制台] 解析SSE消息失败:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[日志控制台] SSE连接错误:', error);
        setIsConnected(false);
        eventSource.close();
        
        // 如果连接失败，尝试从数据库加载
        setTimeout(() => {
          loadLogsFromDatabase();
        }, 1000);
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      console.error('[日志控制台] 创建SSE连接失败:', error);
      loadLogsFromDatabase();
    }
  };

  // 断开 SSE
  const disconnectSSE = () => {
    if (eventSourceRef.current) {
      console.log('[日志控制台] 断开SSE连接');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  };

  // 处理 SSE 消息
  const handleSSEMessage = (message: any) => {
    const { type, data } = message;

    switch (type) {
      case 'init':
        // 初始化，加载历史日志
        if (data.logs && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
        break;

      case 'log':
        // 新增日志（去重）
        setLogs((prev) => {
          // 检查是否已存在
          if (prev.some(log => log.id === data.id)) {
            return prev;
          }
          return [...prev, data];
        });
        break;

      case 'complete':
        // 执行完成
        console.log('[日志控制台] 执行完成');
        disconnectSSE();
        break;

      case 'error':
        // 执行错误
        console.error('[日志控制台] 执行错误:', data);
        disconnectSSE();
        break;
    }
  };

  // 从数据库加载日志
  const loadLogsFromDatabase = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/execution-logs?suiteExecutionId=${executionId}&limit=10000`
      );
      const result = await response.json();

      if (result.success) {
        setLogs(result.logs || []);
      } else {
        console.error('[日志控制台] 加载日志失败:', result.error);
      }
    } catch (error) {
      console.error('[日志控制台] 加载日志异常:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 下载日志
  const downloadLogs = () => {
    const logText = logs
      .map((log) => {
        const time = new Date(log.timestamp).toLocaleString();
        const details = log.details ? `\n${JSON.stringify(log.details, null, 2)}` : '';
        return `[${time}] [${log.level.toUpperCase()}] ${log.message}${details}`;
      })
      .join('\n\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-${executionId}-logs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 清空日志（仅前端）
  const clearLogs = () => {
    setLogs([]);
  };

  // 刷新日志
  const refreshLogs = () => {
    if (status === 'running' || status === 'pending') {
      disconnectSSE();
      connectSSE();
    } else {
      loadLogsFromDatabase();
    }
  };

  // 获取日志级别图标
  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Terminal className="h-4 w-4 text-gray-500" />;
    }
  };

  // 获取日志级别颜色
  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  // 渲染日志条目
  const renderLogEntry = (log: LogEntry, index: number) => {
    const isCollapsed = !isExpanded && index < logs.length - 100;

    if (isCollapsed && index === logs.length - 101) {
      return (
        <div key={`expand-${index}`} className="py-2 px-3 text-center border-y">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="text-xs"
          >
            {t('showAllEarlierLogs', { count: logs.length - 100 })}
          </Button>
        </div>
      );
    }

    if (isCollapsed) {
      return null;
    }

    return (
      <div
        key={log.id}
        className={cn(
          'py-1 px-3 font-mono text-xs hover:bg-muted/50 transition-colors',
          'border-l-2',
          log.level === 'error' ? 'border-l-red-500' : 
          log.level === 'success' ? 'border-l-green-500' :
          log.level === 'warning' ? 'border-l-yellow-500' :
          'border-l-transparent'
        )}
      >
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground select-none">
            {formatTime(log.timestamp)}
          </span>
          <div className="flex items-center gap-1">
            {getLevelIcon(log.level)}
          </div>
          <span className={cn('font-medium select-none', getLevelColor(log.level))}>
            [{log.level.toUpperCase()}]
          </span>
          {log.nodeName && (
            <Badge variant="outline" className="text-xs">
              {log.nodeName}
            </Badge>
          )}
          <span className="flex-1 break-all">{log.message}</span>
        </div>
        {log.details && (
          <div className="mt-1 ml-24 p-2 bg-muted rounded text-xs overflow-x-auto">
            <pre>{JSON.stringify(log.details, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <div>
              <CardTitle className="text-lg">{t('executionLog')}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {isConnected && (
                  <Badge variant="outline" className="text-xs">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    {t('realTimeStreaming')}
                  </Badge>
                )}
                {!isConnected && !isLoading && (
                  <span>{t('totalLogs', { count: logs.length })}</span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {logs.length > 100 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <>
                    <Minimize2 className="h-4 w-4 mr-1" />
                    {t('collapse')}
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 mr-1" />
                    {t('full')}
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={downloadLogs}>
              <Download className="h-4 w-4 mr-1" />
              {t('export')}
            </Button>
            {!isConnected && (
              <Button variant="outline" size="sm" onClick={refreshLogs}>
                {tCommon('refresh')}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Terminal className="h-12 w-12 mb-2 opacity-20" />
            <p className="text-sm">{t('noLogs')}</p>
          </div>
        ) : (
          <ScrollArea
            className="h-[600px] bg-muted/30"
            ref={scrollRef}
          >
            <div className="divide-y divide-border">
              {logs.map((log, index) => renderLogEntry(log, index))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

