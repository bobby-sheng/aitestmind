"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, StopCircle, RotateCcw, Eye, Loader2, Clock, CheckCircle2, XCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

interface ExecutionRecord {
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
  triggeredBy?: string;
  triggerUser?: string;
}

export default function ExecutionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('execution');
  const tCommon = useTranslations('common');
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadExecutions();
  }, [page]);

  useEffect(() => {
    // 轮询更新执行中的记录
    const hasRunning = executions.some(e => e.status === 'running' || e.status === 'pending');
    if (hasRunning) {
      const interval = setInterval(() => {
        loadExecutions();
      }, 2000); // 2秒轮询一次

      return () => clearInterval(interval);
    }
  }, [executions]);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/executions/suite?page=${page}&pageSize=${pageSize}`);
      const result = await response.json();

      if (result.success) {
        setExecutions(result.data);
        setTotal(result.total);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('加载执行记录失败:', error);
      toast({
        title: t('loadFailed'),
        description: t('loadExecutionRecordsFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (executionId: string) => {
    router.push(`/execution/suite/${executionId}`);
  };

  const handleViewLogs = (executionId: string) => {
    router.push(`/execution/suite/${executionId}/logs`);
  };

  const handleStop = async (executionId: string) => {
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
        loadExecutions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('停止执行失败:', error);
      toast({
        title: t('operationFailed'),
        description: t('stopExecutionFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleRetry = async (executionId: string) => {
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
        // 不自动跳转，刷新列表即可
        loadExecutions();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('重试执行失败:', error);
      toast({
        title: t('retryFailed'),
        description: t('retryExecutionFailed'),
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600 hover:bg-green-700 text-white">{t('completed')}</Badge>;
      case 'running':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">{t('running')}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{t('pending')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('failed')}</Badge>;
      case 'stopped':
        return <Badge variant="outline">{t('stopped')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-gray-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'stopped':
        return <StopCircle className="h-5 w-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return t('minutesAgo', { minutes });
    if (hours < 24) return t('hoursAgo', { hours });
    return t('daysAgo', { days });
  };

  const calculateProgress = (execution: ExecutionRecord) => {
    if (execution.totalCases === 0) return 0;
    return Math.round(((execution.passedCases + execution.failedCases) / execution.totalCases) * 100);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full p-6">
      {/* 固定头部 */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="text-sm text-muted-foreground">
          {t('viewExecutionStatus')}
        </div>
        <Button onClick={loadExecutions} variant="outline" size="sm">
          {tCommon('refresh')}
        </Button>
      </div>

      {/* 分页控制栏（在内容上方） */}
      {total > pageSize && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {t('totalRecords', { total, totalPages, page })}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              {t('firstPage')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {t('prevPage')}
            </Button>
            <span className="text-sm px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
            >
              {t('nextPage')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              {t('lastPage')}
            </Button>
          </div>
        </div>
      )}

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto pr-2">
        {loading && executions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : executions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Play className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">{t('noExecutionRecords')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('goToTestSuites')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 pb-4">
            {executions.map((execution) => {
              const progress = calculateProgress(execution);
              const passRate = execution.totalCases > 0 
                ? Math.round((execution.passedCases / execution.totalCases) * 100) 
                : 0;

              return (
                <Card key={execution.id} className="transition-shadow hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(execution.status)}
                          <CardTitle>{execution.suiteName}</CardTitle>
                          {getStatusBadge(execution.status)}
                        </div>
                        <CardDescription className="mt-1 flex items-center gap-4">
                          <span>{t('startedAt')} {formatTime(execution.startTime)}</span>
                          {execution.duration && (
                            <span>{t('timeElapsed')} {(execution.duration / 1000).toFixed(2)}{t('seconds')}</span>
                          )}
                          {execution.triggeredBy && (
                            <span>
                              {t('triggerMethod')} {
                                execution.triggeredBy === 'manual' 
                                  ? t('manual') 
                                  : execution.triggeredBy === 'schedule' 
                                    ? t('schedule') 
                                    : execution.triggeredBy
                              }
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {(execution.status === 'running' || execution.status === 'pending') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleStop(execution.id)}
                          >
                            <StopCircle className="h-4 w-4 mr-1" />
                            {t('stop')}
                          </Button>
                        )}
                        {(execution.status === 'completed' || execution.status === 'failed' || execution.status === 'stopped') && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleRetry(execution.id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            {t('retry')}
                          </Button>
                        )}
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewLogs(execution.id)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          {t('viewLogs')}
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => handleViewDetails(execution.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('viewDetails')}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span>{t('progress')}: {progress}%</span>
                        <span>
                          <span className="text-green-600 font-medium">{execution.passedCases} {t('passed')}</span>
                          {" · "}
                          <span className="text-red-600 font-medium">{execution.failedCases} {t('failed')}</span>
                          {" · "}
                          <span className="text-muted-foreground">{t('total')} {execution.totalCases}</span>
                          {execution.status === 'completed' && (
                            <>
                              {" · "}
                              <span className="text-blue-600 font-medium">{t('passRate')} {passRate}%</span>
                            </>
                          )}
                        </span>
                      </div>
                      <Progress value={progress} />
                      
                      {/* 步骤统计 */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t('stepStatistics')}</span>
                        <span>
                          <span className="text-green-600">{execution.passedSteps} {t('passed')}</span>
                          {" · "}
                          <span className="text-red-600">{execution.failedSteps} {t('failed')}</span>
                          {" · "}
                          <span>{t('total')} {execution.totalSteps}</span>
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部分页控制栏（固定在底部） */}
      {total > pageSize && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {t('displayingRecords', { 
              start: (page - 1) * pageSize + 1, 
              end: Math.min(page * pageSize, total), 
              total 
            })}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              {t('firstPage')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {t('prevPage')}
            </Button>
            <span className="text-sm px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
            >
              {t('nextPage')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              {t('lastPage')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
