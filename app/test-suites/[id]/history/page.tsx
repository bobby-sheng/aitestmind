"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, Calendar, Clock, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface ExecutionRecord {
  id: string;
  startTime: string;
  endTime?: string;
  status: string;
  totalCases: number;
  passedCases: number;
  failedCases: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  duration?: number;
  triggeredBy: string;
  environmentSnapshot: any;
}

interface HistoryData {
  executions: ExecutionRecord[];
  stats: {
    total: number;
    completed: number;
    failed: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export default function TestSuiteHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('testSuites');
  const suiteId = params.id as string;

  const [suite, setSuite] = useState<any>(null);
  const [history, setHistory] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadSuite();
    loadHistory();
  }, [suiteId, page]);

  const loadSuite = async () => {
    try {
      const response = await fetch(`/api/test-suites/${suiteId}`);
      const result = await response.json();

      if (result.success) {
        setSuite(result.data);
      }
    } catch (error) {
      console.error('Error loading suite:', error);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/test-suites/${suiteId}/executions?page=${page}&pageSize=10`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const result = await response.json();

      if (result.success) {
        setHistory(result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      toast({
        title: t('loadFailed'),
        description: t('cannotLoadHistory'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (executionId: string) => {
    router.push(`/execution/suite/${executionId}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">{t('completed')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{t('failed')}</Badge>;
      case 'running':
        return <Badge className="bg-blue-500">{t('running')}</Badge>;
      case 'stopped':
        return <Badge variant="secondary">{t('stopped')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading && !history) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-8 pt-6 pb-8">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t('executionHistory')}</h2>
              <p className="text-muted-foreground mt-1">
                {suite?.name || t('testSuite')}
              </p>
            </div>
          </div>
        </div>

        {/* 统计卡片 */}
        {history && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('totalExecutions')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{history.stats?.total || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('successCount')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {history.stats?.completed || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('failureCount')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {history.stats?.failed || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 执行记录列表 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('executionRecords')}</CardTitle>
            <CardDescription>
              {history ? t('recordsCount', { count: history.pagination.total }) : t('loading')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!history || history.executions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t('noExecutionRecords')}
              </div>
            ) : (
              <div className="space-y-3">
                {history.executions.map((execution) => {
                  const passRate = execution.totalCases > 0
                    ? Math.round((execution.passedCases / execution.totalCases) * 100)
                    : 0;

                  return (
                    <div
                      key={execution.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {new Date(execution.startTime).toLocaleString()}
                            </span>
                            {getStatusBadge(execution.status)}
                            {execution.environmentSnapshot?.source && (
                              <Badge variant="outline">
                                {execution.environmentSnapshot.source === 'global'
                                  ? t('globalConfig')
                                  : t('independentConfig')}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                            <div>
                              <div className="text-xs text-muted-foreground">{t('casePassRate')}</div>
                              <div className="text-lg font-bold">
                                {passRate}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {execution.passedCases}/{execution.totalCases}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-muted-foreground">{t('stepStats')}</div>
                              <div className="text-lg font-bold">
                                {execution.passedSteps}/{execution.totalSteps}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t('failedCount', { count: execution.failedSteps })}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-muted-foreground">{t('executionDuration')}</div>
                              <div className="text-lg font-bold">
                                {formatDuration(execution.duration)}
                              </div>
                            </div>

                            <div>
                              <div className="text-xs text-muted-foreground">{t('triggerMethod')}</div>
                              <div className="text-sm">
                                {execution.triggeredBy === 'manual' 
                                  ? t('manualExecution') 
                                  : execution.triggeredBy === 'schedule' 
                                    ? t('scheduledMode') 
                                    : execution.triggeredBy}
                              </div>
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(execution.id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {t('viewDetails')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 分页 */}
            {history && history.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  {t('previousPage')}
                </Button>
                <span className="text-sm">
                  {t('pageInfo', { page: history.pagination.page, total: history.pagination.totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === history.pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  {t('nextPage')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


