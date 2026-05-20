import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * 获取仪表盘统计数据
 * GET /api/dashboard/stats
 */
export async function GET(request: NextRequest) {
  try {
    // 计算时间范围
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 并行执行所有独立的数据库查询，显著提升性能
    const [
      totalApis,
      newApisThisWeek,
      totalTestCases,
      newTestCasesThisWeek,
      recentExecutions,
      latestExecution,
      recentRuns,
      trendExecutions
    ] = await Promise.all([
      // 1. API总数
      prisma.api.count(),
      
      // 本周新增API数
      prisma.api.count({
        where: {
          createdAt: { gte: weekAgo }
        }
      }),

      // 2. 测试用例总数
      prisma.testCase.count({
        where: {
          status: { not: "archived" }
        }
      }),
      
      // 本周新增测试用例
      prisma.testCase.count({
        where: {
          createdAt: { gte: weekAgo },
          status: { not: "archived" }
        }
      }),

      // 3. 执行成功率统计（基于最近30次执行）
      prisma.testSuiteExecution.findMany({
        where: {
          status: { in: ["completed", "failed"] }
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          status: true,
          passedCases: true,
          failedCases: true,
          totalCases: true,
          createdAt: true
        }
      }),

      // 4. 最近失败的用例数（最近一次执行中）
      prisma.testSuiteExecution.findFirst({
        where: {
          status: { in: ["completed", "failed"] }
        },
        orderBy: { createdAt: "desc" },
        select: { failedCases: true }
      }),

      // 5. 最近执行记录（最近10条）
      prisma.testSuiteExecution.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          suiteName: true,
          status: true,
          createdAt: true,
          startTime: true,
          endTime: true,
          passedCases: true,
          failedCases: true,
          totalCases: true,
          duration: true
        }
      }),

      // 6. 执行趋势数据（最近30天）
      prisma.testSuiteExecution.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: { in: ["completed", "failed"] }
        },
        orderBy: { createdAt: "asc" },
        select: {
          createdAt: true,
          passedCases: true,
          failedCases: true,
          totalCases: true
        }
      })
    ]);

    // 计算总体成功率
    let totalPassed = 0;
    let totalFailed = 0;
    recentExecutions.forEach(exec => {
      totalPassed += exec.passedCases;
      totalFailed += exec.failedCases;
    });
    
    const successRate = totalPassed + totalFailed > 0 
      ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)
      : "0.0";

    // 计算上周的成功率以对比
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const lastWeekExecutions = recentExecutions.filter(exec => 
      exec.createdAt >= twoWeeksAgo && exec.createdAt < weekAgo
    );
    
    let lastWeekPassed = 0;
    let lastWeekFailed = 0;
    lastWeekExecutions.forEach(exec => {
      lastWeekPassed += exec.passedCases;
      lastWeekFailed += exec.failedCases;
    });
    
    const lastWeekRate = lastWeekPassed + lastWeekFailed > 0
      ? (lastWeekPassed / (lastWeekPassed + lastWeekFailed)) * 100
      : 0;
    
    const rateChange = lastWeekRate > 0 
      ? (parseFloat(successRate) - lastWeekRate).toFixed(1)
      : "0.0";

    // 失败用例数
    const failedCases = latestExecution?.failedCases || 0;

    // 按日期分组统计趋势数据
    const trendData: Record<string, { date: string; total: number; passed: number; failed: number }> = {};
    
    trendExecutions.forEach(exec => {
      const dateKey = exec.createdAt.toISOString().split('T')[0];
      if (!trendData[dateKey]) {
        trendData[dateKey] = {
          date: dateKey,
          total: 0,
          passed: 0,
          failed: 0
        };
      }
      trendData[dateKey].total += exec.totalCases;
      trendData[dateKey].passed += exec.passedCases;
      trendData[dateKey].failed += exec.failedCases;
    });

    const trendArray = Object.values(trendData).map(item => ({
      ...item,
      successRate: item.total > 0 ? ((item.passed / item.total) * 100).toFixed(1) : "0"
    }));

    return NextResponse.json({
      success: true,
      data: {
        apiCount: {
          total: totalApis,
          weekGrowth: newApisThisWeek
        },
        testCaseCount: {
          total: totalTestCases,
          weekGrowth: newTestCasesThisWeek
        },
        successRate: {
          rate: successRate,
          change: rateChange
        },
        failedCases: {
          count: failedCases
        },
        recentRuns: recentRuns.map(run => ({
          id: run.id,
          name: run.suiteName,
          status: run.status,
          createdAt: run.createdAt,
          startTime: run.startTime,
          endTime: run.endTime,
          passedCases: run.passedCases,
          failedCases: run.failedCases,
          totalCases: run.totalCases,
          duration: run.duration
        })),
        trendData: trendArray
      }
    });
  } catch (error) {
    console.error("获取仪表盘统计数据失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: "获取仪表盘统计数据失败",
        message: error instanceof Error ? error.message : "未知错误"
      },
      { status: 500 }
    );
  }
}

