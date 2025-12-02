"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2, Eye, StopCircle, RotateCcw, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import CaseExecutionDialog from '@/components/reports/CaseExecutionDialog';

interface ExecutionData {
  id: string;
  suiteId: string;
  suiteName: string;
  status: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  environmentSnapshot: any;
  caseExecutions: CaseExecution[];
}

interface CaseExecution {
  id: string;
  testCaseId: string;
  testCaseName: string;
  testCaseSnapshot: any;
  status: string;
  order: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  duration?: number;
  startTime: string;
  endTime?: string;
  errorMessage?: string;
  stepExecutions: StepExecution[];
}

interface StepExecution {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: string;
  order: number;
  duration?: number;
}

export default function SuiteExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('execution');
  const tCommon = useTranslations('common');
  const executionId = params.executionId as string;

  const [execution, setExecution] = useState<ExecutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
  const [selectedCase, setSelectedCase] = useState<CaseExecution | null>(null);
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [isStoppingOrRetrying, setIsStoppingOrRetrying] = useState(false);

  useEffect(() => {
    loadExecution();
  }, [executionId]);

  useEffect(() => {
    // 如果执行中，轮询更新
    if (execution && (execution.status === 'pending' || execution.status === 'running')) {
      const interval = setInterval(() => {
        loadExecution();
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [execution?.status]);

  const loadExecution = async () => {
    try {
      const response = await fetch(`/api/executions/suite/${executionId}`);
      const result = await response.json();

      if (result.success) {
        setExecution(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading execution:', error);
      toast({
        title: t('loadFailed'),
        description: t('loadExecutionDetailsFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCase = (caseId: string) => {
    const newExpanded = new Set(expandedCases);
    if (newExpanded.has(caseId)) {
      newExpanded.delete(caseId);
    } else {
      newExpanded.add(caseId);
    }
    setExpandedCases(newExpanded);
  };

  const handleViewCase = (caseExec: CaseExecution) => {
    setSelectedCase(caseExec);
    setShowCaseDialog(true);
  };

  const handleStop = async () => {
    if (!execution) return;
    
    setIsStoppingOrRetrying(true);
    try {
      const response = await fetch(`/api/executions/suite/${executionId}/stop`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: t('operationSuccess'),
          description: t('executionStopped'),
        });
        loadExecution(); // 重新加载数据
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('停止执行失败:', error);
      toast({
        title: t('operationFailed'),
        description: error.message || t('stopExecutionFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsStoppingOrRetrying(false);
    }
  };

  const handleRetry = async () => {
    if (!execution) return;
    
    setIsStoppingOrRetrying(true);
    try {
      const response = await fetch(`/api/executions/suite/${executionId}/retry`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: t('retryStarted'),
          description: t('newExecutionCreated'),
        });
        // 跳转到新的执行详情页面（详情页面的重试保留跳转）
        router.push(`/execution/suite/${result.data.executionId}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('重试执行失败:', error);
      toast({
        title: t('retryFailed'),
        description: error.message || t('retryExecutionFailed'),
        variant: 'destructive',
      });
    } finally {
      setIsStoppingOrRetrying(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'passed':
      case 'success':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">{t('success')}</Badge>;
      case 'failed':
      case 'error':
        return <Badge variant="destructive">{t('failed')}</Badge>;
      case 'running':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">{t('running')}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{t('pending')}</Badge>;
      case 'stopped':
        return <Badge variant="outline">{t('stopped')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'passed':
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-400" />;
      case 'stopped':
        return <StopCircle className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!execution) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-lg font-medium">{t('executionNotFound')}</p>
          <Button onClick={() => router.back()} className="mt-4">
            {tCommon('back')}
          </Button>
        </div>
      </div>
    );
  }

  const passRate = execution.totalCases > 0
    ? Math.round((execution.passedCases / execution.totalCases) * 100)
    : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-6 pb-8">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {tCommon('back')}
            </Button>
            <div className="text-sm text-muted-foreground">
              {execution.suiteName}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(execution.status)}
            
            {/* 查看日志按钮 */}
            <Button
              variant="outline"
              onClick={() => router.push(`/execution/suite/${executionId}/logs`)}
            >
              <FileText className="h-4 w-4 mr-2" />
              {t('viewLogs')}
            </Button>
            
            {/* 停止按钮 */}
            {(execution.status === 'running' || execution.status === 'pending') && (
              <Button
                variant="outline"
                onClick={handleStop}
                disabled={isStoppingOrRetrying}
              >
                {isStoppingOrRetrying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('stopping')}
                  </>
                ) : (
                  <>
                    <StopCircle className="h-4 w-4 mr-2" />
                    {t('stopExecution')}
                  </>
                )}
              </Button>
            )}

            {/* 重试按钮 */}
            {(execution.status === 'completed' || execution.status === 'failed' || execution.status === 'stopped') && (
              <Button
                variant="outline"
                onClick={handleRetry}
                disabled={isStoppingOrRetrying}
              >
                {isStoppingOrRetrying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('retrying')}
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('retryExecution')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* 概览信息 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('executionTime')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {execution.duration ? `${(execution.duration / 1000).toFixed(2)}${t('seconds')}` : '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(execution.startTime).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('caseStatistics')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {execution.passedCases}/{execution.totalCases}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('passRate')} {passRate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('stepStatistics')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {execution.passedSteps}/{execution.totalSteps}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('failed')} {execution.failedSteps}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{t('executionProgress')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={passRate} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {execution.passedCases + execution.failedCases}/{execution.totalCases} {t('completed')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 用例执行列表 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('caseExecutionDetails')}</CardTitle>
            <CardDescription>
              {t('totalCases', { count: execution.totalCases })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {execution.caseExecutions.map((caseExec) => (
              <div key={caseExec.id} className="border rounded-lg overflow-hidden">
                <div
                  className="p-4 hover:bg-muted/50 cursor-pointer flex items-center justify-between"
                  onClick={() => toggleCase(caseExec.id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(caseExec.status)}
                    <div className="flex-1">
                      <div className="font-medium">{caseExec.testCaseName}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('steps')}: {caseExec.passedSteps}/{caseExec.totalSteps}
                        {caseExec.duration && ` · ${t('timeElapsed')}: ${(caseExec.duration / 1000).toFixed(2)}${t('seconds')}`}
                      </div>
                      {caseExec.errorMessage && (
                        <div className="text-sm text-red-500 mt-1">
                          {caseExec.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(caseExec.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewCase(caseExec);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {t('viewCanvas')}
                    </Button>
                    <Button variant="ghost" size="sm">
                      {expandedCases.has(caseExec.id) ? t('collapse') : t('expand')}
                    </Button>
                  </div>
                </div>

                {/* 步骤列表 */}
                {expandedCases.has(caseExec.id) && caseExec.stepExecutions && (
                  <div className="border-t bg-muted/20 p-4 space-y-2">
                    {caseExec.stepExecutions.map((step) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-3 p-2 bg-background rounded"
                      >
                        {getStatusIcon(step.status)}
                        <div className="flex-1">
                          <div className="text-sm font-medium">{step.nodeName}</div>
                          <div className="text-xs text-muted-foreground">
                            {step.nodeType}
                            {step.duration && ` · ${(step.duration / 1000).toFixed(2)}s`}
                          </div>
                        </div>
                        {getStatusBadge(step.status)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 环境配置 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('environmentSnapshot')}</CardTitle>
            <CardDescription>
              {t('executionEnvironmentConfig')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{t('configSource')}:</span>
                <Badge variant={execution.environmentSnapshot.source === 'global' ? 'secondary' : 'default'}>
                  {execution.environmentSnapshot.source === 'global' ? t('globalConfig') : t('independentConfig')}
                </Badge>
              </div>
              {execution.environmentSnapshot.config?.baseUrl && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Base URL:</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {execution.environmentSnapshot.config.baseUrl}
                  </code>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 用例执行画布对话框 */}
      <CaseExecutionDialog
        open={showCaseDialog}
        onOpenChange={setShowCaseDialog}
        caseExecution={selectedCase}
      />
    </div>
  );
}

