'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface ThinkingBlockProps {
  content: string;
  defaultCollapsed?: boolean;
}

export function ThinkingBlock({ content, defaultCollapsed = false }: ThinkingBlockProps) {
  const t = useTranslations('aiGenerate');
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // 将内容按行分割，用于更好的显示
  const contentLines = content.split('\n').filter(line => line.trim());

  return (
    <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 my-2">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-primary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-primary" />
        )}
        <Brain className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium text-foreground">
          {isCollapsed ? t('thinkingProcessExpanded') : t('thinkingProcess')}
        </span>
        {!isCollapsed && contentLines.length > 1 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {contentLines.length} {t('steps')}
          </span>
        )}
      </button>
      
      {!isCollapsed && (
        <div className="mt-3 pl-7 space-y-2">
          {contentLines.map((line, index) => (
            <div 
              key={index}
              className="text-sm text-muted-foreground leading-relaxed flex gap-2"
            >
              <span className="text-primary font-medium flex-shrink-0">{index + 1}.</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

