"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, FolderKanban, Edit, Trash2, History, FileText, Clock } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface TestSuite {
  id: string;
  name: string;
  description?: string;
  status: string;
  category?: string;
  testCaseCount: number;
  executionCount: number;
  lastExecution?: {
    time: string;
    status: string;
    passRate: number;
  };
  useGlobalSettings: boolean;
  createdAt: string;
  executionMode?: string;
  scheduleConfig?: string;
  scheduleStatus?: string;
  nextRunTime?: string;
  createdByUser?: { id: string; loginName: string };
  updatedByUser?: { id: string; loginName: string };
}

export default function TestSuitesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('testSuites');
  const tCommon = useTranslations('common');
  const tExecution = useTranslations('execution');
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    loadTestSuites();
  }, [page]);

  const loadTestSuites = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/test-suites?page=${page}&pageSize=${pageSize}`);
      const result = await response.json();
      
      if (result.success) {
        setTestSuites(result.data);
        setTotal(result.total || 0);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading test suites:', error);
      toast({
        title: t('loadFailed'),
        description: t('cannotLoadSuites'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    router.push('/test-suites/create');
  };

  const handleEdit = (id: string) => {
    router.push(`/test-suites/${id}/edit`);
  };

  const handleExecute = async (id: string, name: string) => {
    try {
      toast({
        title: t('startExecution'),
        description: `${t('executingSuite')} ${name}`,
      });

      const response = await fetch(`/api/test-suites/${id}/execute`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: t('executionStarted'),
          description: `${t('testSuite')} "${result.data.suiteName}" ${t('executionInProgress')}`,
        });
        // 不自动跳转，让用户留在当前页面
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error executing test suite:', error);
      toast({
        title: t('executionFailed'),
        description: error instanceof Error ? error.message : t('executionError'),
        variant: 'destructive',
      });
    }
  };

  const handleViewHistory = (id: string) => {
    router.push(`/test-suites/${id}/history`);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${t('confirmDelete')} "${name}" ？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/test-suites/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: t('deleteSuccess'),
        });
        // 如果当前页没有数据了，且不是第一页，则跳转到上一页
        if (testSuites.length === 1 && page > 1) {
          setPage(page - 1);
        } else {
          loadTestSuites();
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting test suite:', error);
      toast({
        title: t('deleteFailed'),
        variant: 'destructive',
      });
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex flex-col h-full p-6">
      {/* 固定头部 */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="text-sm text-muted-foreground">
          {t('pageDescription')}
        </div>
        <div className="flex gap-2">
          <Button onClick={loadTestSuites} variant="outline" size="sm">
            {tCommon('refresh')}
          </Button>
          <Button onClick={handleCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t('newTestSuite')}
          </Button>
        </div>
      </div>

      {/* 可滚动内容区域 */}
      <div className="flex-1 overflow-y-auto pr-2">
        {loading && testSuites.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-muted-foreground">{t('loading')}</div>
          </div>
        ) : testSuites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">{t('noTestSuites')}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {t('createFirstSuite')}
              </p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                {t('newTestSuite')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 pb-4">
            {testSuites.map((suite) => {
              let isOnceSchedule = false;
              let isOnceScheduleFinished = false;

              if (suite.executionMode === 'scheduled' && suite.scheduleConfig) {
                try {
                  const parsed = JSON.parse(suite.scheduleConfig);
                  isOnceSchedule = parsed?.type === 'once';
                } catch (e) {
                  // ignore parse error, fall back to default behavior
                }
              }

              if (isOnceSchedule) {
                const now = new Date();
                const nextRun = suite.nextRunTime
                  ? new Date(suite.nextRunTime)
                  : null;
                // 一次性调度：如果已经没有下次执行时间，或者下次执行时间已在当前时间之前，视为已完成
                if (!nextRun || nextRun <= now) {
                  isOnceScheduleFinished = true;
                }
              }

              return (
                <Card key={suite.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <FolderKanban className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{suite.name}</CardTitle>
                            <Badge variant="outline">
                              {suite.status === 'active'
                                ? t('statusPublished')
                                : t('statusDraft')}
                            </Badge>
                            {suite.executionMode === 'scheduled' && (
                              <Badge variant="default" className="gap-1">
                                <Clock className="h-3 w-3" />
                                {t('scheduleEnabled')}
                              </Badge>
                            )}
                            {suite.useGlobalSettings ? (
                              <Badge variant="secondary">
                                {t('globalConfig')}
                              </Badge>
                            ) : (
                              <Badge variant="default">
                                {t('independentConfig')}
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="mt-1">
                            {suite.testCaseCount} {t('casesCount')}
                            {suite.lastExecution && (
                              <>
                                {' '}
                                · {t('lastRun')}{' '}
                                {new Date(
                                  suite.lastExecution.time
                                ).toLocaleString()}
                              </>
                            )}
                            {(suite.createdByUser || suite.updatedByUser) && (
                              <span className="block mt-1 text-xs">
                                {suite.createdByUser && (
                                  <span>
                                    {tCommon('createdBy')}:{' '}
                                    {suite.createdByUser.username ||
                                      suite.createdByUser.loginName}
                                  </span>
                                )}
                                {suite.createdByUser && suite.updatedByUser && ' · '}
                                {suite.updatedByUser && (
                                  <span>
                                    {tCommon('updatedBy')}:{' '}
                                    {suite.updatedByUser.username ||
                                      suite.updatedByUser.loginName}
                                  </span>
                                )}
                              </span>
                            )}
                          </CardDescription>
                          {suite.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {suite.description}
                            </p>
                          )}
                          {suite.executionMode === 'scheduled' && (
                            <div className="flex items-center gap-1 mt-2 text-sm text-primary">
                              <Clock className="h-4 w-4" />
                              {isOnceSchedule && (suite.scheduleStatus === 'disabled' || isOnceScheduleFinished) ? (
                                <span className="text-muted-foreground">
                                  {t('onceScheduleCompleted')}
                                </span>
                              ) : suite.scheduleStatus === 'disabled' ? (
                                <span className="text-muted-foreground">
                                  {t('scheduleCompleted')}
                                </span>
                              ) : suite.scheduleStatus === 'paused' ? (
                                <>
                                  <span>
                                    {t('nextExecution')}:{' '}
                                    {suite.nextRunTime
                                      ? new Date(
                                          suite.nextRunTime
                                        ).toLocaleString()
                                      : '-'}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="ml-2"
                                  >
                                    {t('schedulePaused')}
                                  </Badge>
                                </>
                              ) : suite.nextRunTime ? (
                                <span>
                                  {t('nextExecution')}:{' '}
                                  {new Date(
                                    suite.nextRunTime
                                  ).toLocaleString()}
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {suite.lastExecution && (
                          <div className="text-right">
                            <div className="text-2xl font-bold">
                              {suite.lastExecution.passRate}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {t('passRate')}
                            </p>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(suite.id)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewHistory(suite.id)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDelete(suite.id, suite.name)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() =>
                              handleExecute(suite.id, suite.name)
                            }
                            disabled={suite.testCaseCount === 0}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部分页控制栏（固定在底部） */}
      {total > pageSize && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#e5e7eb] dark:border-[#4b5563] flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {tExecution('displayingRecords', { 
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
              {tExecution('firstPage')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              {tExecution('prevPage')}
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
              {tExecution('nextPage')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              {tExecution('lastPage')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
