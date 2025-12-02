'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolCallBlock } from './ToolCallBlock';
import { useTranslations } from 'next-intl';

interface ToolCall {
  id: string;
  tool: string;
  args: any;
  result?: any;
  error?: string;
  duration?: number;
  status: 'running' | 'success' | 'error';
  summary?: string;
}

interface ToolCallsContainerProps {
  toolCalls: ToolCall[];
  defaultCollapsed?: boolean;
}

export function ToolCallsContainer({ 
  toolCalls, 
  defaultCollapsed = true 
}: ToolCallsContainerProps) {
  const t = useTranslations('aiGenerate');
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  if (toolCalls.length === 0) return null;

  const runningCount = toolCalls.filter(tc => tc.status === 'running').length;
  const successCount = toolCalls.filter(tc => tc.status === 'success').length;
  const errorCount = toolCalls.filter(tc => tc.status === 'error').length;

  // 是否所有工具都已完成
  const allCompleted = runningCount === 0;

  return (
    <div className={cn(
      'rounded-lg border-2 my-3 transition-all duration-200',
      allCompleted 
        ? 'border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10' 
        : 'border-primary/50 bg-gradient-to-br from-primary/10 to-primary/20'
    )}>
      {/* 头部 - 可点击折叠 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-primary/5 transition-colors"
      >
        {/* 图标 */}
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm',
          allCompleted ? 'bg-primary/20' : 'bg-primary/30'
        )}>
          <Wrench className={cn(
            'w-4 h-4',
            allCompleted ? 'text-primary' : 'text-primary animate-pulse'
          )} />
        </div>

        {/* 标题和统计 */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground">
              🔧 {t('toolCalls')}
            </h3>
            <span className="text-xs text-muted-foreground">
              {toolCalls.length} {t('toolCallsCount')}
            </span>
          </div>
          
          {/* 状态统计 */}
          <div className="flex items-center gap-3 mt-1">
            {runningCount > 0 && (
              <span className="text-xs text-primary flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
                {runningCount} {t('executing')}
              </span>
            )}
            {successCount > 0 && (
              <span className="text-xs text-primary flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-primary" />
                {successCount} {t('success')}
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-destructive" />
                {errorCount} {t('failed')}
              </span>
            )}
          </div>
        </div>

        {/* 展开/折叠图标 */}
        <div className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* 工具调用列表 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {toolCalls.map((toolCall) => (
            <ToolCallBlock
              key={toolCall.id}
              tool={toolCall.tool}
              args={toolCall.args}
              result={toolCall.result}
              error={toolCall.error}
              duration={toolCall.duration}
              status={toolCall.status}
              summary={toolCall.summary}
            />
          ))}
        </div>
      )}
    </div>
  );
}

