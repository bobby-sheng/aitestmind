/**
 * AI 智能生成测试用例 API - SSE 流式版本
 * 支持 Function Calling，自动搜索 API 并生成测试用例
 */

import { NextRequest } from 'next/server';
import { loadAIClient, type AIMessage } from '@/lib/ai-client';
import { getSystemPrompt } from '@/lib/ai-prompts/system-prompt';
import { 
  AI_TOOLS,
  getApiDetail,
  smartSearchDeleteApi,
  assembleAndCreateTestCases,
  hierarchicalSearchApis,
} from '@/lib/ai-tools';

// 定义消息类型
type StreamMessageType = 'thinking' | 'tool_call' | 'content' | 'summary' | 'error';

interface StreamMessage {
  type: StreamMessageType;
  content: string;
  data?: any;
}

// 发送 SSE 消息
function sendSSE(controller: ReadableStreamDefaultController, message: StreamMessage) {
  const data = `data: ${JSON.stringify(message)}\n\n`;
  controller.enqueue(new TextEncoder().encode(data));
}

// 尝试修复常见的 JSON 格式错误
function tryFixJSON(jsonStr: string): string {
  let fixed = jsonStr.trim();
  
  // 1. 移除尾随逗号（数组和对象）
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  
  // 2. 修复缺少逗号的情况（对象属性之间）
  // 这个比较难处理，因为可能误判，暂时跳过
  
  // 3. 移除注释（单行和多行）
  fixed = fixed.replace(/\/\/.*$/gm, '');
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 4. 移除 undefined
  fixed = fixed.replace(/:\s*undefined\s*([,}])/g, ': null$1');
  
  // 5. 修复括号不对称问题
  fixed = fixBrackets(fixed);
  
  return fixed;
}

// 修复括号不对称问题
function fixBrackets(jsonStr: string): string {
  // 统计各种括号的数量
  const brackets = {
    '{': 0,
    '}': 0,
    '[': 0,
    ']': 0,
  };
  
  // 是否在字符串中（避免误判字符串内的括号）
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < jsonStr.length; i++) {
    const char = jsonStr[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString && (char === '{' || char === '}' || char === '[' || char === ']')) {
      brackets[char as keyof typeof brackets]++;
    }
  }
  
  let fixed = jsonStr;
  
  // 修复缺失的闭合括号
  const missingCurly = brackets['{'] - brackets['}'];
  const missingSquare = brackets['['] - brackets[']'];
  
  if (missingCurly > 0) {
    console.log(`  🔧 检测到缺失 ${missingCurly} 个 '}'，自动补全`);
    fixed += '}'.repeat(missingCurly);
  } else if (missingCurly < 0) {
    console.log(`  🔧 检测到多余 ${-missingCurly} 个 '}'，尝试移除`);
    // 从末尾移除多余的 }
    for (let i = 0; i < -missingCurly; i++) {
      const lastIndex = fixed.lastIndexOf('}');
      if (lastIndex !== -1) {
        fixed = fixed.substring(0, lastIndex) + fixed.substring(lastIndex + 1);
      }
    }
  }
  
  if (missingSquare > 0) {
    console.log(`  🔧 检测到缺失 ${missingSquare} 个 ']'，自动补全`);
    fixed += ']'.repeat(missingSquare);
  } else if (missingSquare < 0) {
    console.log(`  🔧 检测到多余 ${-missingSquare} 个 ']'，尝试移除`);
    // 从末尾移除多余的 ]
    for (let i = 0; i < -missingSquare; i++) {
      const lastIndex = fixed.lastIndexOf(']');
      if (lastIndex !== -1) {
        fixed = fixed.substring(0, lastIndex) + fixed.substring(lastIndex + 1);
      }
    }
  }
  
  return fixed;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  // 创建 SSE 流
  const stream = new ReadableStream({
    async start(controller) {
  try {
    const { userInput, testType = 'api' } = await request.json();

    if (!userInput || !userInput.trim()) {
          sendSSE(controller, {
            type: 'error',
            content: '请输入测试需求描述',
          });
          controller.close();
          return;
        }

        // 发送初始思考消息
        const thinkingMessage = testType === 'e2e' 
          ? '正在分析您的业务流程...' 
          : '正在分析您的测试需求...';
        sendSSE(controller, {
          type: 'thinking',
          content: thinkingMessage,
        });

    // 加载 AI 客户端
    const client = await loadAIClient();
        
        // 根据测试类型获取对应的 System Prompt
        const systemPrompt = getSystemPrompt(testType as 'api' | 'e2e');

    const messages: AIMessage[] = [
      { role: 'user', content: userInput }
    ];

    // Function Calling 循环
    let continueLoop = true;
    let iterationCount = 0;
        const maxIterations = 15;
        const createdTestCases: any[] = [];

    while (continueLoop && iterationCount < maxIterations) {
      iterationCount++;

      console.log(`\n🔄 第 ${iterationCount} 轮对话`);

      // 调用 AI
      const response = await client.chat(
        [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        AI_TOOLS
      );

      // 检查是否有工具调用
      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log(`📞 AI 调用了 ${response.toolCalls.length} 个工具`);

            // 如果有 AI 的思考或内容，先发送
            // 区分思考内容和设计方案：
            // - 如果调用的是 create_test_cases，之前的内容是设计方案，使用 content 类型
            // - 否则是思考过程，使用 thinking 类型
            if (response.content) {
              const isCreatingTestCases = response.toolCalls.some(tc => tc.function.name === 'create_test_cases');
              
              sendSSE(controller, {
                type: isCreatingTestCases ? 'content' : 'thinking',
                content: response.content,
              });
            }

            // 添加包含 tool_calls 的 assistant 消息
        messages.push({
          role: 'assistant',
          content: response.content || null,
          tool_calls: response.toolCalls,
        });

        // 处理所有工具调用
        for (const toolCall of response.toolCalls) {
          const functionName = toolCall.function.name;
          const rawArguments = toolCall.function.arguments;
          
          console.log(`  🔧 调用工具: ${functionName}`);

          let functionArgs: any;
          try {
            // 先打印原始参数，帮助调试
            console.log(`  📝 原始参数 (前 500 字符): ${rawArguments.substring(0, 500)}`);
            
            functionArgs = JSON.parse(rawArguments);
          } catch (parseError: any) {
            console.error(`  ❌ JSON 解析失败: ${parseError.message}`);
            
            // 尝试修复 JSON
            try {
              console.log(`  🔧 尝试修复 JSON...`);
              const fixedJson = tryFixJSON(rawArguments);
              functionArgs = JSON.parse(fixedJson);
              console.log(`  ✅ JSON 修复成功！`);
              
              sendSSE(controller, {
                type: 'tool_call',
                content: 'warning',
                data: {
                  tool: functionName,
                  message: 'JSON 格式有误但已自动修复',
                },
              });
            } catch (fixError: any) {
              console.error(`  ❌ JSON 修复失败: ${fixError.message}`);
              console.error(`  📄 完整参数内容:\n${rawArguments}`);
                  
                  sendSSE(controller, {
                    type: 'error',
                    content: `参数解析失败: ${parseError.message}。AI 生成的 JSON 格式不正确，请重试。`,
                  });
              
              // 告诉 AI 参数格式有问题，让它重新生成
              messages.push({
                role: 'tool',
                content: JSON.stringify({ 
                  error: `JSON 格式错误: ${parseError.message}。请检查 JSON 格式是否正确，特别注意：
1. 数组元素之间要有逗号：[{...}, {...}]
2. 对象属性要用双引号：{"key": "value"}
3. 不要有尾随逗号：[1, 2, 3] 而不是 [1, 2, 3,]
4. 确保所有括号都正确闭合
5. 如果内容太长，请分批调用 create_test_cases，每次只传 1-2 个测试用例`,
                  hint: '建议：将测试用例分批创建，每次调用 create_test_cases 只传入 1-2 个用例',
                }),
                tool_call_id: toolCall.id,
              });
                  continue;
                }
              }

              // 发送工具调用开始消息
              sendSSE(controller, {
                type: 'tool_call',
                content: 'start',
                data: {
                  tool: functionName,
                  args: functionArgs,
                  status: 'running',
                },
              });

          let functionResult: any;
              const startTime = Date.now();

          try {
            // 执行对应的工具函数
            if (functionName === 'hierarchical_search_apis') {
              functionResult = await hierarchicalSearchApis(functionArgs);
              console.log(`    ✅ 层级检索找到 ${functionResult.length} 个 API`);
              
              // 显示匹配结果（带4层分类信息）
              if (functionResult.length > 0) {
                console.log(`    📊 匹配结果:`);
                functionResult.slice(0, 5).forEach((api: any, idx: number) => {
                  const layers = [api.platform, api.component, api.feature].filter(Boolean).join(' > ');
                  console.log(`      ${idx + 1}. ${api.name} [${api.method}]`);
                  console.log(`         分类: ${layers || '未分类'}`);
                });
              }
                  
              // 发送工具调用结果
              sendSSE(controller, {
                type: 'tool_call',
                content: 'success',
                data: {
                  tool: functionName,
                  args: functionArgs,
                  result: functionResult,
                  duration: Date.now() - startTime,
                  status: 'success',
                  summary: `层级检索找到 ${functionResult.length} 个匹配的 API`,
                },
              });
            } else if (functionName === 'get_api_detail') {
              functionResult = await getApiDetail(functionArgs.apiId);
              console.log(`    ✅ 获取 API: ${functionResult.name}`);
                  
                  sendSSE(controller, {
                    type: 'tool_call',
                    content: 'success',
                    data: {
                      tool: functionName,
                      args: functionArgs,
                      result: functionResult,
                      duration: Date.now() - startTime,
                      status: 'success',
                      summary: `获取 API 详情: ${functionResult.name}`,
                    },
                  });

            } else if (functionName === 'smart_search_delete_api') {
              functionResult = await smartSearchDeleteApi(functionArgs);
                  
                  let summary = '';
              if (functionResult.needCleanup) {
                    summary = `找到删除 API: ${functionResult.deleteApi.name}`;
                    console.log(`    ✅ ${summary}`);
              } else {
                    summary = functionResult.reason;
                    console.log(`    ⚠️ ${summary}`);
                  }
                  
                  sendSSE(controller, {
                    type: 'tool_call',
                    content: 'success',
                    data: {
                      tool: functionName,
                      args: functionArgs,
                      result: functionResult,
                      duration: Date.now() - startTime,
                      status: 'success',
                      summary,
                    },
                  });

            } else if (functionName === 'assemble_and_create_test_cases') {
              console.log('\n' + '='.repeat(120));
              console.log('🔧 [Route] 调用 assemble_and_create_test_cases');
              console.log('='.repeat(120));
              console.log('📥 [Route] 完整参数:', JSON.stringify(functionArgs, null, 2));
              console.log('='.repeat(120) + '\n');
              
              // 调用函数并传入进度回调
              functionResult = await assembleAndCreateTestCases({
                ...functionArgs,
                onProgress: (progress) => {
                  console.log(`📊 [Route] 进度更新: ${progress.step}/${progress.totalSteps} - ${progress.message}`);
                  if (progress.detail) {
                    console.log(`   💡 详情: ${progress.detail}`);
                  }
                  
                  // 发送进度消息到前端
                  sendSSE(controller, {
                    type: 'tool_call',
                    content: 'progress',
                    data: {
                      tool: functionName,
                      progress: {
                        step: progress.step,
                        totalSteps: progress.totalSteps,
                        percentage: Math.round((progress.step / progress.totalSteps) * 100),
                        message: progress.message,
                        detail: progress.detail,
                      },
                      status: 'running',
                    },
                  });
                },
              });
              
              console.log('\n' + '='.repeat(120));
              console.log('✅ [Route] assemble_and_create_test_cases 执行完成');
              console.log('📤 [Route] 返回结果:', JSON.stringify(functionResult, null, 2));
              console.log('='.repeat(120) + '\n');
              
              createdTestCases.push(...functionResult.created);
              console.log(`    ✅ ${functionResult.message}`);
                  
                  sendSSE(controller, {
                    type: 'tool_call',
                    content: 'success',
                    data: {
                      tool: functionName,
                      args: functionArgs,
                      result: functionResult,
                      duration: Date.now() - startTime,
                      status: 'success',
                      summary: functionResult.message,
                    },
                  });

            } else {
              functionResult = { error: '未知的工具' };
                  
                  sendSSE(controller, {
                    type: 'tool_call',
                    content: 'error',
                    data: {
                      tool: functionName,
                      args: functionArgs,
                      error: '未知的工具',
                      duration: Date.now() - startTime,
                      status: 'error',
                    },
                  });
                }

          } catch (error: any) {
            console.error(`    ❌ 工具执行失败: ${error.message}`);
            functionResult = { error: error.message };
                
                sendSSE(controller, {
                  type: 'tool_call',
                  content: 'error',
                  data: {
                    tool: functionName,
                    args: functionArgs,
                    error: error.message,
                    duration: Date.now() - startTime,
                    status: 'error',
                  },
                });
          }

          // 将工具执行结果添加到消息列表
          messages.push({
            role: 'tool',
            content: JSON.stringify(functionResult),
            tool_call_id: toolCall.id,
          });
        }

      } else {
        // AI 没有调用工具，说明已经完成
            const finalContent = response.content || '测试用例生成完成';
            
            // 发送最终内容
            sendSSE(controller, {
              type: 'content',
              content: finalContent,
            });

        // 添加最终的 assistant 响应
        messages.push({
          role: 'assistant',
              content: finalContent,
            });

            // 发送总结
            sendSSE(controller, {
              type: 'summary',
              content: '执行完成',
              data: {
                iterations: iterationCount,
                testCasesCreated: createdTestCases.length,
                testCases: createdTestCases.map(tc => ({
                  id: tc.id,
                  name: tc.name,
                })),
              },
        });

        continueLoop = false;
        console.log('✅ AI 完成生成');
      }
    }

    if (iterationCount >= maxIterations) {
      console.warn('⚠️ 达到最大迭代次数');
          sendSSE(controller, {
            type: 'error',
            content: '达到最大迭代次数，生成可能不完整',
          });
        }

        controller.close();

  } catch (error: any) {
    console.error('❌ AI 生成失败:', error);

    // 友好的错误提示
    let errorMessage = error.message;

    if (error.message.includes('AI 功能未启用')) {
      errorMessage = 'AI 功能未启用，请先在设置页面配置 AI 服务';
    } else if (error.message.includes('API Key 未配置')) {
      errorMessage = 'AI API Key 未配置，请先在设置页面配置';
    } else if (error.message.includes('OpenAI API Key 无效')) {
      errorMessage = 'AI API Key 无效，请检查配置';
    }

        sendSSE(controller, {
          type: 'error',
          content: errorMessage,
        });

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
  }
