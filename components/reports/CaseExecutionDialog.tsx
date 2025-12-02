"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import FlowCanvas from '@/components/test-orchestration/FlowCanvas';

interface StepExecution {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: string;
  order: number;
  duration?: number;
  requestUrl?: string;
  requestMethod?: string;
  requestHeaders?: any;
  requestBody?: any;
  responseStatus?: number;
  responseHeaders?: any;
  responseBody?: any;
  responseTime?: number;
  assertionResults?: any[] | string;
  extractedVariables?: any | string;
  logs?: string;
  errorMessage?: string;
}

interface CaseExecution {
  id: string;
  testCaseId: string;
  testCaseName: string;
  testCaseSnapshot: any;
  status: string;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  duration?: number;
  startTime: string;
  endTime?: string;
  errorMessage?: string;
  stepExecutions: StepExecution[];
}

interface CaseExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseExecution: CaseExecution | null;
}

export default function CaseExecutionDialog({
  open,
  onOpenChange,
  caseExecution,
}: CaseExecutionDialogProps) {
  const t = useTranslations('execution');
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedStepExecution, setSelectedStepExecution] = useState<StepExecution | null>(null);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);

  useEffect(() => {
    if (caseExecution && caseExecution.testCaseSnapshot) {
      // 从快照中获取节点和边
      const snapshot = caseExecution.testCaseSnapshot;
      const flowNodes = snapshot.nodes || [];
      const flowEdges = snapshot.edges || [];

      // 给节点添加执行状态
      const nodesWithStatus = flowNodes.map((node: any) => {
        // 查找对应的步骤执行记录
        const stepExec = caseExecution.stepExecutions.find(
          (step) => step.nodeId === node.id
        );

        if (stepExec) {
          // 映射数据库状态到节点组件状态
          // 数据库: pending, running, success, failed, skipped
          // 节点组件: pending, running, success, error
          let nodeStatus = stepExec.status;
          if (stepExec.status === 'failed') {
            nodeStatus = 'error';
          }

          // 解析 JSON 字符串字段
          let assertions = stepExec.assertionResults;
          let extractedVars = stepExec.extractedVariables;
          
          try {
            if (typeof assertions === 'string' && assertions) {
              assertions = JSON.parse(assertions);
            }
          } catch (e) {
            console.warn('Failed to parse assertionResults:', e);
            assertions = [];
          }
          
          try {
            if (typeof extractedVars === 'string' && extractedVars) {
              extractedVars = JSON.parse(extractedVars);
            }
          } catch (e) {
            console.warn('Failed to parse extractedVariables:', e);
            extractedVars = {};
          }

          return {
            ...node,
            data: {
              ...node.data,
              execution: {
                status: nodeStatus,
                duration: stepExec.duration,
                error: stepExec.errorMessage,
                responseStatus: stepExec.responseStatus,
                assertions: assertions,
                extractedVariables: extractedVars,
              },
            },
          };
        }

        return node;
      });

      setNodes(nodesWithStatus);
      setEdges(flowEdges);
    }
  }, [caseExecution]);

  const handleNodeClick = async (node: any) => {
    // 查找对应的步骤执行记录
    const stepExec = caseExecution?.stepExecutions.find(
      (step) => step.nodeId === node.id
    );
    if (stepExec) {
      setSelectedStepExecution(stepExec);
      // 获取执行日志
      loadExecutionLogs(stepExec.id);
    }
  };

  const loadExecutionLogs = async (stepExecutionId: string) => {
    try {
      const response = await fetch(`/api/executions/logs?stepExecutionId=${stepExecutionId}`);
      const result = await response.json();
      
      if (result.success) {
        setExecutionLogs(result.data || []);
      } else {
        setExecutionLogs([]);
      }
    } catch (error) {
      console.error('Error loading execution logs:', error);
      setExecutionLogs([]);
    }
  };

  if (!caseExecution) return null;

  const passRate = caseExecution.totalSteps > 0
    ? Math.round((caseExecution.passedSteps / caseExecution.totalSteps) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {caseExecution.testCaseName}
            {caseExecution.status === 'passed' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : caseExecution.status === 'failed' ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-gray-400" />
            )}
          </DialogTitle>
          <DialogDescription>
            {t('steps')}: {caseExecution.passedSteps}/{caseExecution.totalSteps} {t('passed')}
            {caseExecution.duration && ` · ${t('timeElapsed')}: ${caseExecution.duration}${t('ms')}`}
            {` · ${t('passRate')}: ${passRate}%`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 h-[calc(95vh-8rem)]">
          {/* 左侧：流程图画布 */}
          <div className="col-span-2 border rounded-lg overflow-hidden bg-muted/20">
            <FlowCanvas
              initialNodes={nodes}
              initialEdges={edges}
              onNodeClick={handleNodeClick}
              onNodesChange={() => {}} // 只读模式
              onEdgesChange={() => {}} // 只读模式
              onNodeDrop={() => {}}
              onNodeConfig={() => {}}
              onPaneClick={() => setSelectedStepExecution(null)}
              selectedNodeId={selectedStepExecution?.nodeId}
            />
          </div>

          {/* 右侧：步骤执行详情 */}
          <div className="border rounded-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-muted/50">
              <h3 className="font-semibold">
                {selectedStepExecution ? t('stepExecutionDetails') : t('clickNodeToViewDetails')}
              </h3>
            </div>

            <ScrollArea className="flex-1">
              {selectedStepExecution ? (
                <div className="p-4 space-y-4">
                  {/* 请求信息 */}
                  {selectedStepExecution.requestUrl && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">{t('requestInfo')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>
                          <div className="text-muted-foreground mb-1">URL:</div>
                          <code className="text-xs bg-muted p-2 rounded block break-all">
                            {selectedStepExecution.requestMethod} {selectedStepExecution.requestUrl}
                          </code>
                        </div>
                        {selectedStepExecution.requestHeaders && Object.keys(selectedStepExecution.requestHeaders).length > 0 && (
                          <div>
                            <div className="text-muted-foreground mb-1">Headers:</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(selectedStepExecution.requestHeaders, null, 2)}
                            </pre>
                          </div>
                        )}
                        {selectedStepExecution.requestBody && (
                          <div>
                            <div className="text-muted-foreground mb-1">Body:</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(selectedStepExecution.requestBody, null, 2)}
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* 响应信息 */}
                  {selectedStepExecution.responseStatus && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">{t('responseInfo')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('statusCode')}:</span>
                          <Badge variant={selectedStepExecution.responseStatus < 400 ? 'default' : 'destructive'}>
                            {selectedStepExecution.responseStatus}
                          </Badge>
                        </div>
                        {selectedStepExecution.responseTime && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('responseTime')}:</span>
                            <span>{selectedStepExecution.responseTime}{t('ms')}</span>
                          </div>
                        )}
                        {selectedStepExecution.responseBody && (
                          <div>
                            <div className="text-muted-foreground mb-1">Body:</div>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                              {JSON.stringify(selectedStepExecution.responseBody, null, 2)}
                            </pre>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* 断言结果 */}
                  {(() => {
                    let assertions = selectedStepExecution.assertionResults;
                    // 确保 assertionResults 是数组类型
                    if (typeof assertions === 'string') {
                      try {
                        assertions = JSON.parse(assertions);
                      } catch (e) {
                        assertions = [];
                      }
                    }
                    if (!Array.isArray(assertions)) {
                      assertions = [];
                    }
                    
                    return assertions.length > 0 && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">{t('assertionResults')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {assertions.map((assertion: any, index: number) => (
                            <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                              {assertion.success ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                              )}
                              <div className="flex-1 text-xs">
                                <div className="font-medium">{assertion.message || assertion.type}</div>
                                {!assertion.success && assertion.error && (
                                  <div className="text-red-500 mt-1">{assertion.error}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* 变量提取 */}
                  {(() => {
                    let extractedVars = selectedStepExecution.extractedVariables;
                    // 确保 extractedVariables 是对象类型
                    if (typeof extractedVars === 'string') {
                      try {
                        extractedVars = JSON.parse(extractedVars);
                      } catch (e) {
                        extractedVars = {};
                      }
                    }
                    if (!extractedVars || typeof extractedVars !== 'object') {
                      extractedVars = {};
                    }
                    
                    return Object.keys(extractedVars).length > 0 && (
                      <Card>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">{t('extractedVariables')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                          {Object.entries(extractedVars).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-start p-2 bg-muted/50 rounded">
                              <code className="text-xs font-medium">{key}</code>
                              <code className="text-xs text-muted-foreground ml-2 break-all">
                                {typeof value === 'string' ? value : JSON.stringify(value)}
                              </code>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* 错误信息 */}
                  {selectedStepExecution.errorMessage && (
                    <Card className="border-red-200">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm text-red-600">{t('errorInfo')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
                          {selectedStepExecution.errorMessage}
                        </pre>
                      </CardContent>
                    </Card>
                  )}

                  {/* 执行日志 */}
                  {executionLogs && executionLogs.length > 0 && (
                    <Card>
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm">{t('executionLog')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-1">
                        {executionLogs.map((log, index) => (
                          <div
                            key={log.id || index}
                            className={`text-xs p-2 rounded ${
                              log.level === 'error'
                                ? 'bg-red-50 text-red-700'
                                : log.level === 'success'
                                ? 'bg-green-50 text-green-700'
                                : log.level === 'warning'
                                ? 'bg-yellow-50 text-yellow-700'
                                : 'bg-muted'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-muted-foreground whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-xs h-5 ${
                                  log.level === 'error'
                                    ? 'border-red-300 text-red-700'
                                    : log.level === 'success'
                                    ? 'border-green-300 text-green-700'
                                    : log.level === 'warning'
                                    ? 'border-yellow-300 text-yellow-700'
                                    : ''
                                }`}
                              >
                                {log.level}
                              </Badge>
                              <span className="flex-1">{log.message}</span>
                            </div>
                            {log.details && (
                              <pre className="mt-1 text-xs opacity-75 whitespace-pre-wrap">
                                {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {t('clickNodeOnCanvas')}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


