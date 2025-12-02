'use client';

import { Wrench, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface ToolCallBlockProps {
  tool: string;
  args: any;
  result?: any;
  error?: string;
  duration?: number;
  status: 'running' | 'success' | 'error';
  summary?: string;
}

export function ToolCallBlock({
  tool,
  args,
  result,
  error,
  duration,
  status,
  summary,
}: ToolCallBlockProps) {
  const t = useTranslations('aiGenerate');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const TOOL_NAMES: Record<string, string> = {
    hierarchical_search_apis: t('toolHierarchicalSearchApis'),
    get_api_detail: t('toolGetApiDetail'),
    smart_search_delete_api: t('toolSmartSearchDeleteApi'),
    create_test_cases: t('toolCreateTestCases'),
    assemble_and_create_test_cases: t('toolAssembleAndCreateTestCases'),
  };
  
  const toolName = TOOL_NAMES[tool] || tool;

  return (
    <div
      className={cn(
        'rounded-lg border p-4 my-2',
        status === 'success' && 'border-primary bg-primary/10',
        status === 'running' && 'border-primary/50 bg-primary/5',
        status === 'error' && 'border-destructive bg-destructive/10'
      )}
    >
      {/* 头部 */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            status === 'success' && 'bg-primary/20',
            status === 'running' && 'bg-primary/10',
            status === 'error' && 'bg-destructive/20'
          )}
        >
          {status === 'running' && <Wrench className="w-4 h-4 text-primary animate-pulse" />}
          {status === 'success' && <CheckCircle2 className="w-4 h-4 text-primary" />}
          {status === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm text-foreground">
              {toolName}
            </h4>
            {status === 'running' && (
              <span className="text-xs text-primary animate-pulse">
                {t('executing')}
              </span>
            )}
            {duration && status !== 'running' && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {duration}ms
              </span>
            )}
          </div>

          {/* 摘要 */}
          {summary && (
            <p
              className={cn(
                'text-sm mt-1',
                status === 'success' && 'text-foreground',
                status === 'error' && 'text-destructive'
              )}
            >
              {summary}
            </p>
          )}

          {/* 错误信息 */}
          {error && (
            <p className="text-sm mt-1 text-destructive">
              ❌ {error}
            </p>
          )}

          {/* 展开按钮 */}
          {(args || result) && status !== 'running' && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                'flex items-center gap-1 text-xs mt-2 hover:opacity-80 transition-opacity',
                status === 'success' && 'text-primary',
                status === 'error' && 'text-destructive'
              )}
            >
              {isExpanded ? (
                <>
                  <ChevronDown className="w-3 h-3" />
                  {t('collapseDetails')}
                </>
              ) : (
                <>
                  <ChevronRight className="w-3 h-3" />
                  {t('viewDetails')}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 详情 */}
      {isExpanded && (
        <div className="mt-3 pl-11 space-y-3">
          {/* 参数 */}
          {args && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">
                📥 {t('inputParams')}
              </div>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto border border-border">
                <code>{JSON.stringify(args, null, 2)}</code>
              </pre>
            </div>
          )}

          {/* 结果 */}
          {result && status === 'success' && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">
                📤 {t('returnResult')}
              </div>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto border border-border">
                <code>{JSON.stringify(result, null, 2)}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

