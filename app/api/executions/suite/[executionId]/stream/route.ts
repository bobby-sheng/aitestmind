import { prisma } from '@/lib/prisma';

// GET /api/executions/suite/[executionId]/stream - SSE流（实时推送执行进度）
// 优化：只查聚合统计 + 用例摘要（不含 stepExecutions），增量推送，2s 轮询
export async function GET(
  request: Request,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const { executionId } = await params;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendSSE = (data: any) => {
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          // stream already closed
        }
      };

      try {
        const execution = await prisma.testSuiteExecution.findUnique({
          where: { id: executionId },
          include: {
            suite: { select: { id: true, name: true } },
          },
        });

        if (!execution) {
          sendSSE({ type: 'error', data: { message: 'Execution not found' } });
          controller.close();
          return;
        }

        sendSSE({
          type: 'init',
          data: {
            executionId: execution.id,
            suiteId: execution.suiteId,
            suiteName: execution.suiteName,
            status: execution.status,
            totalCases: execution.totalCases,
            totalSteps: execution.totalSteps,
            startTime: execution.startTime,
          },
        });

        const pollInterval = 2000;
        const maxDuration = 3600000;
        const startTime = Date.now();
        let lastFingerprint = '';

        const poll = async () => {
          try {
            if (Date.now() - startTime > maxDuration) {
              sendSSE({ type: 'timeout', data: { message: 'Execution timeout' } });
              controller.close();
              return;
            }

            const currentExecution = await prisma.testSuiteExecution.findUnique({
              where: { id: executionId },
              select: {
                status: true,
                passedCases: true,
                failedCases: true,
                passedSteps: true,
                failedSteps: true,
                totalCases: true,
                totalSteps: true,
                endTime: true,
                duration: true,
                caseExecutions: {
                  select: {
                    id: true,
                    testCaseId: true,
                    testCaseName: true,
                    status: true,
                    order: true,
                    passedSteps: true,
                    failedSteps: true,
                    totalSteps: true,
                    duration: true,
                  },
                  orderBy: { order: 'asc' },
                },
              },
            });

            if (!currentExecution) {
              controller.close();
              return;
            }

            const fingerprint = `${currentExecution.status}|${currentExecution.passedCases}|${currentExecution.failedCases}|${currentExecution.passedSteps}|${currentExecution.failedSteps}|${currentExecution.caseExecutions.map((c: any) => `${c.id}:${c.status}`).join(',')}`;

            if (fingerprint !== lastFingerprint) {
              lastFingerprint = fingerprint;

              sendSSE({
                type: 'update',
                data: {
                  status: currentExecution.status,
                  passedCases: currentExecution.passedCases,
                  failedCases: currentExecution.failedCases,
                  passedSteps: currentExecution.passedSteps,
                  failedSteps: currentExecution.failedSteps,
                  caseExecutions: currentExecution.caseExecutions.map((ce: any) => ({
                    id: ce.id,
                    testCaseId: ce.testCaseId,
                    testCaseName: ce.testCaseName,
                    status: ce.status,
                    order: ce.order,
                    passedSteps: ce.passedSteps,
                    failedSteps: ce.failedSteps,
                    totalSteps: ce.totalSteps,
                    duration: ce.duration,
                    stepExecutions: [],
                  })),
                },
              });
            }

            if (
              currentExecution.status === 'completed' ||
              currentExecution.status === 'failed' ||
              currentExecution.status === 'stopped'
            ) {
              sendSSE({
                type: 'complete',
                data: {
                  status: currentExecution.status,
                  endTime: currentExecution.endTime,
                  duration: currentExecution.duration,
                  totalCases: currentExecution.totalCases,
                  passedCases: currentExecution.passedCases,
                  failedCases: currentExecution.failedCases,
                },
              });
              controller.close();
              return;
            }

            setTimeout(poll, pollInterval);
          } catch (error) {
            console.error('Error in SSE poll:', error);
            sendSSE({
              type: 'error',
              data: { message: error instanceof Error ? error.message : 'Unknown error' },
            });
            controller.close();
          }
        };

        poll();
      } catch (error) {
        console.error('Error starting SSE stream:', error);
        sendSSE({
          type: 'error',
          data: { message: error instanceof Error ? error.message : 'Unknown error' },
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

