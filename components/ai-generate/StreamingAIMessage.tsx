'use client';

import { Sparkles } from 'lucide-react';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallsContainer } from './ToolCallsContainer';
import { ContentBlock } from './ContentBlock';
import { SummaryBlock } from './SummaryBlock';

export interface StreamBlock {
  id: string;
  type: 'thinking' | 'tool_call' | 'content' | 'summary' | 'error';
  content: string;
  data?: any;
  timestamp: number;
}

interface StreamingAIMessageProps {
  blocks: StreamBlock[];
  createdAt: string;
}

export function StreamingAIMessage({ blocks, createdAt }: StreamingAIMessageProps) {
  // 将 blocks 分组：tool_call 放在一起，其他类型保持原顺序
  const groupedBlocks: (StreamBlock | { type: 'tool_calls_group', toolCalls: StreamBlock[] })[] = [];
  let currentToolCalls: StreamBlock[] = [];

  blocks.forEach((block, index) => {
    if (block.type === 'tool_call') {
      currentToolCalls.push(block);
      
      // 如果是最后一个 block，或者下一个 block 不是 tool_call，则结束当前分组
      const isLast = index === blocks.length - 1;
      const nextIsNotToolCall = !isLast && blocks[index + 1].type !== 'tool_call';
      
      if (isLast || nextIsNotToolCall) {
        groupedBlocks.push({
          type: 'tool_calls_group',
          toolCalls: [...currentToolCalls]
        });
        currentToolCalls = [];
      }
    } else {
      groupedBlocks.push(block);
    }
  });

  return (
    <div className="flex gap-4 justify-start">
      {/* AI 头像 */}
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-md">
        <Sparkles className="w-5 h-5 text-primary-foreground" />
      </div>

      {/* 消息内容 */}
      <div className="flex-1 max-w-[80%]">
        <div className="space-y-2">
          {groupedBlocks.map((item, index) => {
            if ('toolCalls' in item) {
              // 工具调用组
              const toolCalls = item.toolCalls.map(block => ({
                id: block.id,
                tool: block.data?.tool || '',
                args: block.data?.args,
                result: block.data?.result,
                error: block.data?.error,
                duration: block.data?.duration,
                status: block.data?.status || 'running' as const,
                summary: block.data?.summary,
              }));

              return (
                <ToolCallsContainer
                  key={`tool-calls-${index}`}
                  toolCalls={toolCalls}
                  defaultCollapsed={true}
                />
              );
            }

            const block = item as StreamBlock;
            switch (block.type) {
              case 'thinking':
                return (
                  <ThinkingBlock
                    key={block.id}
                    content={block.content}
                    defaultCollapsed={false}
                  />
                );

              case 'content':
                return (
                  <ContentBlock
                    key={block.id}
                    content={block.content}
                  />
                );

              case 'summary':
                return (
                  <SummaryBlock
                    key={block.id}
                    content={block.content}
                    data={block.data}
                  />
                );

              case 'error':
                return (
                  <div
                    key={block.id}
                    className="rounded-lg border-2 border-destructive bg-destructive/10 p-4 my-2 shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      <p className="text-sm font-medium text-destructive">
                        {block.content}
                      </p>
                    </div>
                  </div>
                );

              default:
                return null;
            }
          })}
        </div>

        {/* 时间戳 */}
        <div className="text-xs text-muted-foreground mt-2">
          {new Date(createdAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

