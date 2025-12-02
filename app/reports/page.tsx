import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, TrendingUp, TrendingDown } from "lucide-react";

export default function ReportsPage() {
  const reports = [
    {
      id: 1,
      name: "核心功能回归测试报告",
      date: "2024-01-15 14:30",
      passRate: 96,
      total: 25,
      passed: 24,
      failed: 1,
      trend: "up"
    },
    {
      id: 2,
      name: "支付模块测试报告",
      date: "2024-01-15 10:20",
      passRate: 100,
      total: 12,
      passed: 12,
      failed: 0,
      trend: "up"
    },
    {
      id: 3,
      name: "用户认证测试报告",
      date: "2024-01-14 16:45",
      passRate: 87.5,
      total: 8,
      passed: 7,
      failed: 1,
      trend: "down"
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          查看测试执行结果和趋势分析
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总报告数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-xs text-muted-foreground">
              本月生成
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均通过率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-muted-foreground">
              +3.2% 较上月
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">失败用例</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              需要修复
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <Badge variant={report.passRate >= 95 ? "default" : report.passRate >= 80 ? "secondary" : "destructive"}>
                      {report.passRate}% 通过
                    </Badge>
                    {report.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {report.date} · {report.total} 个用例
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    导出
                  </Button>
                  <Button size="sm">查看详情</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-green-600">✓ {report.passed} 通过</span>
                <span className="text-red-600">✗ {report.failed} 失败</span>
                <span className="text-muted-foreground">
                  耗时: {Math.floor(Math.random() * 10) + 1}分钟
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

