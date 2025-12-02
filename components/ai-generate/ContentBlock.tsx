'use client';

import { FileCheck } from 'lucide-react';

interface ContentBlockProps {
  content: string;
}

export function ContentBlock({ content }: ContentBlockProps) {
  // 检测是否是用例设计方案（包含"已为您设计"或"已为您生成"）
  const isTestCaseDesign = content.includes('已为您设计') || content.includes('已为您生成') || content.includes('测试用例');
  
  if (isTestCaseDesign) {
    return (
      <div className="rounded-lg border-2 border-primary bg-primary/10 p-5 my-2 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
            <FileCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg bg-card border border-border p-4 my-2">
      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}

