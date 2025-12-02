"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, CheckCircle2, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { useTranslations, useLocale } from "next-intl";

interface DashboardStats {
  apiCount: {
    total: number;
    weekGrowth: number;
  };
  testCaseCount: {
    total: number;
    weekGrowth: number;
  };
  successRate: {
    rate: string;
    change: string;
  };
  failedCases: {
    count: number;
  };
  recentRuns: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
    passedCases: number;
    failedCases: number;
    totalCases: number;
  }>;
  trendData: Array<{
    date: string;
    total: number;
    passed: number;
    failed: number;
    successRate: string;
  }>;
}

export default function Home() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      } else {
        console.error(t('fetchDataFailed'), result.error);
      }
    } catch (error) {
      console.error(t('fetchDataFailed'), error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true,
        locale: locale === 'zh' ? zhCN : enUS
      });
    } catch {
      return t('unknownTime');
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, { text: string; color: string }> = {
      completed: { text: t('statusPassed'), color: 'text-green-600' },
      failed: { text: t('statusFailed'), color: 'text-red-600' },
      running: { text: t('statusRunning'), color: 'text-blue-600' },
      pending: { text: t('statusPending'), color: 'text-yellow-600' },
      stopped: { text: t('statusStopped'), color: 'text-gray-600' }
    };
    return statusMap[status] || { text: status, color: 'text-gray-600' };
  };

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-muted-foreground">{tCommon('loading')}</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex-1 space-y-4 p-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-muted-foreground">{tCommon('noData')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-6">
      
      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('apiTotal')}
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apiCount.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.apiCount.weekGrowth > 0 && '+'}
              {stats.apiCount.weekGrowth} {t('weekGrowth')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('testCasesTotal')}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.testCaseCount.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.testCaseCount.weekGrowth > 0 && '+'}
              {stats.testCaseCount.weekGrowth} {t('weekGrowth')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('successRate')}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.rate}%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {parseFloat(stats.successRate.change) >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-green-600">+{stats.successRate.change}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-red-600">{stats.successRate.change}%</span>
                </>
              )}
              <span>{t('comparedToLastWeek')}</span>
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('failedCases')}
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.failedCases.count}</div>
            <p className="text-xs text-muted-foreground">
              {stats.failedCases.count > 0 ? t('needAttention') : t('runningWell')}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* 图表和最近执行 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>{t('executionTrend')}</CardTitle>
            <CardDescription>{t('executionTrendDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {stats.trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    stroke="var(--border)"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                    stroke="var(--border)"
                  />
                  <Tooltip 
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--popover-foreground)',
                    }}
                    itemStyle={{
                      color: 'var(--popover-foreground)',
                    }}
                    labelStyle={{
                      color: 'var(--popover-foreground)',
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: 'var(--foreground)' }}
                    iconType="line"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="passed" 
                    stroke="#22c55e" 
                    name={t('passed')}
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="failed" 
                    stroke="#ef4444" 
                    name={t('failed')}
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3b82f6" 
                    name={t('total')}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                {t('noExecutionData')}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>{t('recentExecutions')}</CardTitle>
            <CardDescription>
              {t('recentExecutionsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {stats.recentRuns.length > 0 ? (
                stats.recentRuns.slice(0, 5).map((run) => {
                  const statusInfo = getStatusText(run.status);
                  return (
                    <div className="flex items-center" key={run.id}>
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium leading-none">
                          {run.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatTimeAgo(run.createdAt)}
                        </p>
                        {run.totalCases > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {t('passed')} {run.passedCases}/{run.totalCases}
                          </p>
                        )}
                      </div>
                      <div className="ml-auto font-medium">
                        <span className={statusInfo.color}>{statusInfo.text}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground text-center py-8">
                  {t('noExecutionRecords')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
