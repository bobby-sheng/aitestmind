import { prisma } from '@/lib/prisma';

// GET /api/executions/suite/[executionId]/stream - SSE流（实时推送执行进度）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const { executionId } = await params;

  // 创建SSE流
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      // SSE消息发送函数
      const sendSSE = (data: any) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // 发送初始状态
        const execution = await prisma.testSuiteExecution.findUnique({
          where: { id: executionId },
          include: {
            suite: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!execution) {
          sendSSE({
            type: 'error',
            data: { message: 'Execution not found' },
          });
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

        // 轮询执行状态
        const pollInterval = 500; // 500ms
        const maxDuration = 3600000; // 1小时超时
        const startTime = Date.now();

        const poll = async () => {
          try {
            // 检查超时
            if (Date.now() - startTime > maxDuration) {
              sendSSE({
                type: 'timeout',
                data: { message: 'Execution timeout' },
              });
              controller.close();
              return;
            }

            // 获取最新执行状态
            const currentExecution = await prisma.testSuiteExecution.findUnique({
              where: { id: executionId },
              include: {
                caseExecutions: {
                  include: {
                    stepExecutions: {
                      orderBy: { order: 'asc' },
                    },
                  },
                  orderBy: { order: 'asc' },
                },
              },
            });

            if (!currentExecution) {
              controller.close();
              return;
            }

            // 发送状态更新
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
                  stepExecutions: ce.stepExecutions.map((se: any) => ({
                    id: se.id,
                    nodeId: se.nodeId,
                    nodeName: se.nodeName,
                    nodeType: se.nodeType,
                    status: se.status,
                    order: se.order,
                    duration: se.duration,
                  })),
                })),
              },
            });

            // 如果执行完成，关闭流
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

            // 继续轮询
            setTimeout(poll, pollInterval);
          } catch (error) {
            console.error('Error in SSE poll:', error);
            sendSSE({
              type: 'error',
              data: {
                message: error instanceof Error ? error.message : 'Unknown error',
              },
            });
            controller.close();
          }
        };

        // 开始轮询
        poll();
      } catch (error) {
        console.error('Error starting SSE stream:', error);
        sendSSE({
          type: 'error',
          data: {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
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

