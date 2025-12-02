"use client";

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { getExecutorUrl } from '@/lib/config';

interface ParallelApiLog {
  apiId: string;
  apiName: string;
  method: string;
  url: string;
  success: boolean;
  request?: any;
  response?: any;
  assertions?: any[];
  extractedVariables?: any;
  error?: string;
}

interface StepLog {
  stepIndex: number;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'error';
  startTime?: string;
  endTime?: string;
  duration?: number;
  request?: any;
  response?: any;
  extractedVariables?: any;
  assertions?: any[];
  error?: string;
  // 并发节点专用：每个API的详细日志
  parallelLogs?: ParallelApiLog[];
}

interface ExecutionLogPanelProps {
  testCaseId: string;
  isExecuting: boolean;
  onExecutionComplete?: (success: boolean) => void;
  onCurrentNodeChange?: (nodeId: string | null) => void;
  onNodeStatusUpdate?: (nodeId: string, status: 'pending' | 'running' | 'success' | 'error', executionData?: any) => void;
  onStatsChange?: (stats: { total: number; executed: number; passed: number; failed: number }) => void;
}

export default function ExecutionLogPanel({
  testCaseId,
  isExecuting,
  onExecutionComplete,
  onCurrentNodeChange,
  onNodeStatusUpdate,
  onStatsChange
}: ExecutionLogPanelProps) {
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [stats, setStats] = useState({
    total: 0,
    executed: 0,
    passed: 0,
    failed: 0
  });
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const isExecutingRef = useRef(false);
  const executionIdRef = useRef<string | null>(null); // 当前执行的唯一ID
  const messageBufferRef = useRef<string>(''); // SSE消息缓冲区，用于处理被分片的消息

  // 使用 useEffect 监听 stats 变化，避免在渲染期间调用回调
  useEffect(() => {
    onStatsChange?.(stats);
  }, [stats, onStatsChange]);

  // 开始执行时连接 SSE
  useEffect(() => {
    if (isExecuting && testCaseId && !isExecutingRef.current) {
      console.log('[执行管理] 准备开始执行，当前状态:', { isExecuting, testCaseId, isExecutingRef: isExecutingRef.current });
      isExecutingRef.current = true;
      startExecution();
    } else if (!isExecuting && isExecutingRef.current) {
      // 如果外部 isExecuting 变为 false，重置内部状态
      console.log('[执行管理] 外部执行状态已停止，重置内部状态');
      isExecutingRef.current = false;
    }

    // 注意：不要使用清理函数，因为会导致执行中断
    // 改为在执行完成和组件卸载时清理
  }, [isExecuting, testCaseId]);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      console.log('[执行管理] 组件卸载，清理资源');
      if (readerRef.current) {
        readerRef.current.cancel().catch(e => console.log('[执行管理] 取消读取器失败:', e));
        readerRef.current = null;
      }
      executionIdRef.current = null;
      isExecutingRef.current = false;
      messageBufferRef.current = ''; // 清空消息缓冲区
    };
  }, []);

  const startExecution = async () => {
    // 生成新的执行ID
    const newExecutionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    executionIdRef.current = newExecutionId;
    console.log('[执行开始] testCaseId:', testCaseId, '执行ID:', newExecutionId);
    
    // 如果有旧的连接，先关闭
    if (readerRef.current) {
      console.log('[执行开始] 发现旧连接，先关闭...');
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.log('[执行开始] 关闭旧连接失败（可能已关闭）:', e);
      }
      readerRef.current = null;
    }
    
    // 清空之前的日志和缓冲区
    setStepLogs([]);
    setExpandedSteps(new Set());
    setStats({ total: 0, executed: 0, passed: 0, failed: 0 });
    messageBufferRef.current = ''; // 清空消息缓冲区

    // 使用心跳机制代替固定超时
    // 只要收到任何消息就重置心跳，只有长时间（3分钟）没收到任何消息才超时
    let heartbeatTimeoutId: NodeJS.Timeout | undefined;
    const HEARTBEAT_TIMEOUT = 180000; // 3分钟无消息才超时
    
    const resetHeartbeat = () => {
      if (heartbeatTimeoutId) {
        clearTimeout(heartbeatTimeoutId);
      }
      heartbeatTimeoutId = setTimeout(() => {
        console.error('[心跳超时] 3分钟内没有收到任何消息');
        if (readerRef.current) {
          readerRef.current.cancel();
          readerRef.current = null;
        }
        isExecutingRef.current = false;
        onExecutionComplete?.(false);
        alert('连接超时：3分钟内没有收到服务器响应，请检查后端服务是否正常运行');
      }, HEARTBEAT_TIMEOUT);
    };
    
    // 初始化心跳
    resetHeartbeat();

    try {
      console.log('[SSE] 开始连接到后端...');
      
      // 获取执行器 URL（从环境变量）
      const executorUrl = getExecutorUrl();
      const streamUrl = `${executorUrl}/api/execute/stream`;
      console.log('[SSE] 连接地址:', streamUrl);
      
      // 使用 fetch 发起 POST 请求获取 SSE 流
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCaseId: testCaseId,
        }),
      });

      console.log('[SSE] 响应状态:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SSE] 请求失败:', errorText);
        throw new Error(`启动执行失败: ${response.status} ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法获取响应流');
      }

      console.log('[SSE] 开始读取流数据...');
      readerRef.current = reader;
      let lastMessageTime = Date.now();
      const currentExecutionId = newExecutionId; // 捕获当前执行ID

      // 读取 SSE 流
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('[SSE] 流读取完成，执行ID:', currentExecutionId);
            if (heartbeatTimeoutId) {
              clearTimeout(heartbeatTimeoutId);
            }
            break;
          }

          // 收到消息，重置心跳
          resetHeartbeat();
          lastMessageTime = Date.now();
          const chunk = decoder.decode(value, { stream: true });
          
          // 性能优化：只在开发模式下输出详细日志
          if (process.env.NODE_ENV === 'development') {
            console.log('[SSE] 收到数据块，大小:', chunk.length, 'bytes');
          }
          
          // 将新的chunk添加到缓冲区
          // 性能优化：如果缓冲区过大（>100KB），可能有问题，清空并报错
          if (messageBufferRef.current.length > 100000) {
            console.error('[SSE] 消息缓冲区过大，可能存在问题，清空缓冲区');
            messageBufferRef.current = '';
          }
          messageBufferRef.current += chunk;
          
          // 尝试处理缓冲区中的完整消息
          let processingBuffer = messageBufferRef.current;
          let processedIndex = 0;
          
          // 查找所有完整的 SSE 消息（以 \n\n 结尾）
          while (true) {
            // 查找下一个 data: 开始位置
            const dataStart = processingBuffer.indexOf('data: ', processedIndex);
            if (dataStart === -1) {
              // 没有更多的 data: 标记
              break;
            }
            
            // 查找这个 data: 行的结束位置（\n）
            const lineEnd = processingBuffer.indexOf('\n', dataStart);
            if (lineEnd === -1) {
              // 这一行还不完整，保留到缓冲区
              break;
            }
            
            // 提取完整的一行
            const line = processingBuffer.substring(dataStart, lineEnd);
            const data = line.slice(6); // 移除 "data: " 前缀
            
            // 尝试解析JSON
            if (data.trim()) {
              try {
                const message = JSON.parse(data);
                
                // 只处理当前执行ID的消息
                if (executionIdRef.current === currentExecutionId) {
                  handleSSEMessage(message, currentExecutionId);
                }
                
                // 如果收到完成或错误消息，清除心跳超时
                if (message.type === 'complete' || message.type === 'error') {
                  if (heartbeatTimeoutId) {
                    clearTimeout(heartbeatTimeoutId);
                  }
                }
                
                // 标记这条消息已处理
                processedIndex = lineEnd + 1;
              } catch (e) {
                // JSON解析失败，说明消息还不完整
                if (process.env.NODE_ENV === 'development') {
                  console.log('[SSE] JSON不完整，等待更多数据... 当前长度:', data.length);
                }
                // 不移动processedIndex，保留这条消息等待更多数据
                break;
              }
            } else {
              // 空数据行，跳过
              processedIndex = lineEnd + 1;
            }
          }
          
          // 保留未处理的部分到缓冲区
          if (processedIndex > 0) {
            messageBufferRef.current = processingBuffer.substring(processedIndex);
          }
        }
      } catch (error) {
        if (heartbeatTimeoutId) {
          clearTimeout(heartbeatTimeoutId);
        }
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('[SSE] 读取流失败:', error);
        }
      } finally {
        if (heartbeatTimeoutId) {
          clearTimeout(heartbeatTimeoutId);
        }
        readerRef.current = null;
        isExecutingRef.current = false;
        console.log('[SSE] 连接关闭');
      }
    } catch (error: any) {
      if (heartbeatTimeoutId) {
        clearTimeout(heartbeatTimeoutId);
      }
      const executorUrl = getExecutorUrl();
      console.error('[SSE] 启动执行失败:', error);
      alert(`执行失败: ${error.message}\n\n请检查：\n1. 后端执行器服务是否正常运行\n2. 执行器地址是否正确: ${executorUrl}\n3. 网络连接是否正常\n\n提示：\n- 本地开发: 运行 python3.12 executor/main.py\n- 服务器部署: 检查 NEXT_PUBLIC_EXECUTOR_URL 环境变量配置`);
      onExecutionComplete?.(false);
      isExecutingRef.current = false;
    }
  };

  const handleSSEMessage = (message: any, executionId: string) => {
    const { type, data } = message;
    
    // 性能优化：只在开发模式下输出详细日志
    if (process.env.NODE_ENV === 'development') {
      console.log('[前端SSE] 接收到消息:', type, data?.nodeId);
    }

    switch (type) {
      case 'start':
        setStats(prev => ({ ...prev, total: data.totalSteps }));
        break;

      case 'step_start':
        if (process.env.NODE_ENV === 'development') {
          console.log('[前端SSE] step_start -', data.nodeId);
        }
        onCurrentNodeChange?.(data.nodeId);
        
        // 更新节点状态为执行中，携带执行ID
        onNodeStatusUpdate?.(data.nodeId, 'running', {
          startTime: data.startTime,
          executionId: executionId  // 添加执行ID
        });
        
        // 添加或更新步骤日志
        setStepLogs(prev => {
          const existing = prev.find(s => s.nodeId === data.nodeId);
          if (existing) {
            return prev.map(s => 
              s.nodeId === data.nodeId 
                ? { ...s, status: 'running', startTime: data.startTime }
                : s
            );
          }
          
          return [...prev, {
            stepIndex: data.stepIndex,
            nodeId: data.nodeId,
            nodeName: data.nodeName,
            nodeType: data.nodeType,
            status: 'running',
            startTime: data.startTime
          }];
        });
        
        // 步骤默认折叠，用户可以手动点击展开
        // setExpandedSteps(prev => new Set([...prev, data.stepIndex]));
        break;

      case 'step_complete':
        if (process.env.NODE_ENV === 'development') {
          console.log('[前端SSE] step_complete -', data.nodeId);
        }
        setStats(prev => ({
          ...prev,
          executed: prev.executed + 1,
          passed: prev.passed + 1
        }));
        
        // 提取并发节点的 logs
        const parallelLogs = data.response?.logs || null;
        onNodeStatusUpdate?.(data.nodeId, 'success', {
          duration: data.duration,
          request: data.request,
          response: data.response,
          assertions: data.assertions,
          extractedVariables: data.extractedVariables,
          executionId: executionId  // 添加执行ID
        });
        
        setStepLogs(prev => {
          const updated = prev.map(s => 
            s.nodeId === data.nodeId
              ? {
                  ...s,
                  status: 'success' as const,
                  endTime: data.endTime,
                  duration: data.duration,
                  request: data.request,
                  response: data.response,
                  extractedVariables: data.extractedVariables,
                  assertions: data.assertions,
                  parallelLogs: parallelLogs  // 添加并发API日志
                }
              : s
          );
          return updated;
        });
        break;

      case 'step_error':
        if (process.env.NODE_ENV === 'development') {
          console.log('[前端SSE] step_error -', data.nodeId, data.error);
        }
        setStats(prev => ({
          ...prev,
          executed: prev.executed + 1,
          failed: prev.failed + 1
        }));
        
        // 提取并发节点的 logs
        const errorParallelLogs = data.response?.logs || null;
        onNodeStatusUpdate?.(data.nodeId, 'error', {
          duration: data.duration,
          error: data.error,
          request: data.request,
          response: data.response,
          assertions: data.assertions,
          executionId: executionId  // 添加执行ID
        });
        
        setStepLogs(prev => {
          const updated = prev.map(s => 
            s.nodeId === data.nodeId
              ? {
                  ...s,
                  status: 'error' as const,
                  endTime: data.endTime,
                  duration: data.duration,
                  request: data.request,
                  response: data.response,
                  assertions: data.assertions,
                  error: data.error,
                  parallelLogs: errorParallelLogs  // 添加并发API日志
                }
              : s
          );
          return updated;
        });
        break;

      case 'error':
        console.error('[前端SSE] 执行错误:', data.error);
        onCurrentNodeChange?.(null);
        // error 事件不调用 onExecutionComplete，只有 complete 事件才调用
        break;
        
      case 'complete':
        if (process.env.NODE_ENV === 'development') {
          console.log('[前端SSE] 执行完成');
        }
        
        // 如果是完成消息且包含节点状态映射，强制更新所有节点状态
        if (data.nodeStatuses) {
          Object.entries(data.nodeStatuses).forEach(([nodeId, statusInfo]: [string, any]) => {
            if (statusInfo.executed) {
              onNodeStatusUpdate?.(nodeId, statusInfo.status, { executionId });  // 添加执行ID
            }
          });
          
          // 同时更新日志面板中的状态
          setStepLogs(prev => {
            return prev.map(log => {
              const nodeStatus = data.nodeStatuses[log.nodeId];
              if (nodeStatus && nodeStatus.executed) {
                console.log(`[前端SSE] 同步更新日志状态 ${log.nodeId}: ${log.status} -> ${nodeStatus.status}`);
                return {
                  ...log,
                  status: nodeStatus.status
                };
              }
              return log;
            });
          });
        }
        
        onCurrentNodeChange?.(null);
        console.log('[前端SSE] 调用 onExecutionComplete, success:', data.success);
        onExecutionComplete?.(data.success);
        isExecutingRef.current = false;
        console.log('[前端SSE] 执行状态已重置，isExecutingRef:', isExecutingRef.current);
        break;
    }
  };

  const toggleStep = (stepIndex: number) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepIndex)) {
        newSet.delete(stepIndex);
      } else {
        newSet.add(stepIndex);
      }
      return newSet;
    });
  };

  const getStatusIcon = (status: StepLog['status']) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: StepLog['status']) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />执行中</Badge>;
      case 'success':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">成功</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">失败</Badge>;
      default:
        return <Badge variant="outline">等待中</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* 步骤列表 - 独立滚动区域 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-4 pb-16 space-y-3">
          {stepLogs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {isExecuting ? '等待执行开始...' : '点击"运行测试"开始执行'}
            </div>
          ) : (
            stepLogs.map((step) => {
              const isExpanded = expandedSteps.has(step.stepIndex);
              
              return (
                <Card key={step.nodeId} className={`overflow-hidden transition-colors ${
                  step.status === 'error' ? 'border-red-200 bg-red-50/50' :
                  step.status === 'success' ? 'border-green-200 bg-green-50/50' :
                  step.status === 'running' ? 'border-blue-200 bg-blue-50/50' :
                  'border-gray-200'
                }`}>
                  {/* 步骤头部 */}
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleStep(step.stepIndex)}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(step.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">步骤 {step.stepIndex}</span>
                          <span className="text-sm text-muted-foreground">|</span>
                          <span className="text-sm">
                            {step.nodeType === 'assertion' ? '断言节点' : 
                             step.nodeType === 'wait' ? '等待节点' : 
                             step.nodeName}
                          </span>
                        </div>
                        {step.duration !== undefined && (
                          <div className="text-xs text-muted-foreground mt-1">
                            耗时: {step.duration.toFixed(2)}秒
                          </div>
                        )}
                      </div>
                      {getStatusBadge(step.status)}
                      {isExpanded ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </div>
                  </div>

                  {/* 步骤详情（可折叠） */}
                  {isExpanded && (
                    <div className="border-t bg-background px-4 py-3 space-y-3 text-sm">
                      {/* 等待节点的详细信息 */}
                      {step.nodeType === 'wait' && (
                        <div>
                          <div className="font-medium mb-2 flex items-center gap-2">
                            <span className="text-yellow-600">⏱️</span> 等待配置
                          </div>
                          <div className="pl-6 space-y-2 text-xs">
                            {step.request && step.request.wait && (
                              <>
                                <div>
                                  <span className="text-muted-foreground">等待类型:</span>
                                  <Badge variant="outline" className="ml-2">
                                    {step.request.wait.type === 'time' ? '时间等待' : '条件等待'}
                                  </Badge>
                                </div>
                                {step.request.wait.type === 'time' ? (
                                  <div>
                                    <span className="text-muted-foreground">等待时长:</span>
                                    <code className="ml-2 bg-muted px-2 py-0.5 rounded">
                                      {step.request.wait.value}ms
                                    </code>
                                  </div>
                                ) : (
                                  <>
                                    {/* 条件等待详情 */}
                                    <div>
                                      <span className="text-muted-foreground">等待条件:</span>
                                      {step.request.wait.condition ? (
                                        <div className="mt-1 p-2 bg-muted rounded">
                                          <div className="text-xs">
                                            {step.request.wait.condition.variable && (
                                              <span className="font-medium">{step.request.wait.condition.variable}</span>
                                            )}
                                            {step.request.wait.condition.operator && (
                                              <span> {step.request.wait.condition.operator === 'equals' ? '等于' : 
                                                       step.request.wait.condition.operator === 'notEquals' ? '不等于' : 
                                                       '存在'} </span>
                                            )}
                                            {step.request.wait.condition.expected !== undefined && (
                                              <code className="bg-background px-1 py-0.5 rounded">
                                                {JSON.stringify(step.request.wait.condition.expected)}
                                              </code>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="mt-1 p-2 bg-muted rounded text-xs text-muted-foreground">
                                          未配置条件
                                        </div>
                                      )}
                                    </div>
                                    {step.request.wait.timeout !== undefined && (
                                      <div>
                                        <span className="text-muted-foreground">超时时间:</span>
                                        <code className="ml-2 bg-muted px-2 py-0.5 rounded">
                                          {step.request.wait.timeout}ms
                                        </code>
                                      </div>
                                    )}
                                    {step.request.wait.checkInterval !== undefined && (
                                      <div>
                                        <span className="text-muted-foreground">检查间隔:</span>
                                        <code className="ml-2 bg-muted px-2 py-0.5 rounded">
                                          {step.request.wait.checkInterval}ms
                                        </code>
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 请求信息 */}
                      {step.request && step.nodeType !== 'wait' && (
                        <div>
                          <div className="font-medium mb-2 flex items-center gap-2">
                            <span className="text-blue-600">📤</span> 请求信息
                          </div>
                          <div className="pl-6 space-y-1 text-xs">
                            <div><span className="text-muted-foreground">方法:</span> <Badge variant="outline">{step.request.method}</Badge></div>
                            <div><span className="text-muted-foreground">URL:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded">{step.request.url}</code></div>
                            {step.request.headers && Object.keys(step.request.headers).length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">请求头 ({Object.keys(step.request.headers).length})</summary>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                  {JSON.stringify(step.request.headers, null, 2)}
                                </pre>
                              </details>
                            )}
                            {step.request.json && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">请求体</summary>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                  {JSON.stringify(step.request.json, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 响应信息 */}
                      {step.response && (
                        <div>
                          <div className="font-medium mb-2 flex items-center gap-2">
                            <span className="text-green-600">📥</span> 响应信息
                          </div>
                          <div className="pl-6 space-y-1 text-xs">
                            <div>
                              <span className="text-muted-foreground">状态码:</span> 
                              <Badge variant={step.response.status >= 200 && step.response.status < 300 ? "outline" : "destructive"} className="ml-2">
                                {step.response.status}
                              </Badge>
                            </div>
                            {step.response.body && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">响应体</summary>
                                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-60">
                                  {JSON.stringify(step.response.body, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 提取的变量 */}
                      {step.extractedVariables && Object.keys(step.extractedVariables).length > 0 && (
                        <div>
                          <div className="font-medium mb-2 flex items-center gap-2">
                            <span className="text-purple-600">📦</span> 提取的变量
                          </div>
                          <div className="pl-6 space-y-1 text-xs">
                            {Object.entries(step.extractedVariables).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-muted-foreground">{key}:</span> 
                                <code className="ml-2 text-xs bg-muted px-1 py-0.5 rounded">
                                  {String(value).length > 50 ? String(value).substring(0, 50) + '...' : String(value)}
                                </code>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 断言结果 */}
                      {step.assertions && step.assertions.length > 0 && (
                        <div>
                          <div className="font-medium mb-2 flex items-center gap-2">
                            <span className="text-yellow-600">✓</span> 断言结果
                          </div>
                          <div className="pl-6 space-y-2 text-xs">
                            {step.assertions.map((assertion: any, idx: number) => (
                              <div 
                                key={idx} 
                                className={`p-2 rounded ${assertion.success ? 'bg-green-50' : 'bg-red-50'}`}
                              >
                                <div className="flex items-center gap-2">
                                  {assertion.success ? 
                                    <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  }
                                  <span className={assertion.success ? 'text-green-700' : 'text-red-700'}>
                                    {assertion.field} {assertion.operator} {JSON.stringify(assertion.expected)}
                                  </span>
                                </div>
                                {!assertion.success && (
                                  <div className="ml-6 mt-1 text-red-600">
                                    实际值: {JSON.stringify(assertion.actual)}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 错误信息 */}
                      {step.error && (
                        <div>
                          <div className="font-medium mb-2 flex items-center gap-2 text-red-600">
                            <XCircle className="h-4 w-4" /> 错误信息
                          </div>
                          <div className="pl-6 text-xs">
                            <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 whitespace-pre-wrap break-words">
                              {step.error}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 并发节点：显示每个API的日志 */}
                      {step.nodeType === 'parallel' && step.parallelLogs && step.parallelLogs.length > 0 && (
                        <div className="border-t pt-3 mt-3">
                          <div className="font-medium mb-3 flex items-center gap-2">
                            <span className="text-purple-600">🔀</span> 并发 API 执行详情
                            <Badge variant="outline" className="text-xs">
                              {step.parallelLogs.length} 个 API
                            </Badge>
                          </div>
                          <div className="space-y-3">
                            {step.parallelLogs.map((apiLog: ParallelApiLog, apiIdx: number) => (
                              <div 
                                key={apiLog.apiId} 
                                className={`border rounded-lg p-3 ${
                                  apiLog.success ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'
                                }`}
                              >
                                {/* API 头部 */}
                                <div className="flex items-center gap-2 mb-2">
                                  {apiLog.success ? 
                                    <CheckCircle2 className="h-4 w-4 text-green-600" /> : 
                                    <XCircle className="h-4 w-4 text-red-600" />
                                  }
                                  <Badge variant="outline" className="text-xs">
                                    {apiLog.method}
                                  </Badge>
                                  <span className="text-sm font-medium flex-1">
                                    {apiLog.apiName}
                                  </span>
                                  <Badge variant={apiLog.success ? "outline" : "destructive"} className="text-xs">
                                    {apiLog.success ? '成功' : '失败'}
                                  </Badge>
                                </div>

                                {/* API 详情 */}
                                <div className="pl-6 space-y-2 text-xs">
                                  {/* URL */}
                                  <div>
                                    <span className="text-muted-foreground">URL:</span>
                                    <code className="ml-2 bg-muted px-1 py-0.5 rounded text-xs">
                                      {apiLog.url}
                                    </code>
                                  </div>

                                  {/* 请求信息 */}
                                  {apiLog.request && (
                                    <details>
                                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                        📤 请求信息
                                      </summary>
                                      <div className="pl-4 mt-2 space-y-1">
                                        {apiLog.request.headers && Object.keys(apiLog.request.headers).length > 0 && (
                                          <details>
                                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                              请求头 ({Object.keys(apiLog.request.headers).length})
                                            </summary>
                                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                              {JSON.stringify(apiLog.request.headers, null, 2)}
                                            </pre>
                                          </details>
                                        )}
                                        {apiLog.request.json && (
                                          <details>
                                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                              请求体
                                            </summary>
                                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                              {JSON.stringify(apiLog.request.json, null, 2)}
                                            </pre>
                                          </details>
                                        )}
                                      </div>
                                    </details>
                                  )}

                                  {/* 响应信息 */}
                                  {apiLog.response && (
                                    <details>
                                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                        📥 响应信息
                                      </summary>
                                      <div className="pl-4 mt-2 space-y-1">
                                        <div>
                                          <span className="text-muted-foreground">状态码:</span>
                                          <Badge 
                                            variant={apiLog.response.status >= 200 && apiLog.response.status < 300 ? "outline" : "destructive"} 
                                            className="ml-2 text-xs"
                                          >
                                            {apiLog.response.status}
                                          </Badge>
                                        </div>
                                        {apiLog.response.body && (
                                          <details>
                                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                              响应体
                                            </summary>
                                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-60">
                                              {JSON.stringify(apiLog.response.body, null, 2)}
                                            </pre>
                                          </details>
                                        )}
                                      </div>
                                    </details>
                                  )}

                                  {/* 提取的变量 */}
                                  {apiLog.extractedVariables && Object.keys(apiLog.extractedVariables).length > 0 && (
                                    <div>
                                      <span className="text-muted-foreground">📦 提取的变量:</span>
                                      <div className="pl-4 mt-1 space-y-1">
                                        {Object.entries(apiLog.extractedVariables).map(([key, value]) => (
                                          <div key={key}>
                                            <span className="text-muted-foreground">{key}:</span>
                                            <code className="ml-2 bg-muted px-1 py-0.5 rounded">
                                              {String(value).length > 50 ? String(value).substring(0, 50) + '...' : String(value)}
                                            </code>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* 断言结果 */}
                                  {apiLog.assertions && apiLog.assertions.length > 0 && (
                                    <div>
                                      <span className="text-muted-foreground">✓ 断言结果:</span>
                                      <div className="pl-4 mt-1 space-y-1">
                                        {apiLog.assertions.map((assertion: any, idx: number) => (
                                          <div 
                                            key={idx} 
                                            className={`p-1.5 rounded ${assertion.success ? 'bg-green-100' : 'bg-red-100'}`}
                                          >
                                            <div className="flex items-center gap-1">
                                              {assertion.success ? 
                                                <CheckCircle2 className="h-3 w-3 text-green-600" /> : 
                                                <XCircle className="h-3 w-3 text-red-600" />
                                              }
                                              <span className={assertion.success ? 'text-green-700' : 'text-red-700'}>
                                                {assertion.field} {assertion.operator} {JSON.stringify(assertion.expected)}
                                              </span>
                                            </div>
                                            {!assertion.success && (
                                              <div className="ml-4 text-red-600">
                                                实际值: {JSON.stringify(assertion.actual)}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* 错误信息 */}
                                  {apiLog.error && (
                                    <div className="p-2 bg-red-100 border border-red-300 rounded text-red-700">
                                      ❌ {apiLog.error}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
