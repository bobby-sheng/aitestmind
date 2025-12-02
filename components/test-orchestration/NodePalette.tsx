"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NodeType } from '@/types/test-case';
import { Network, Clock, CheckCircle, Flag, GitBranch, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface NodePaletteProps {
  onAddNode: (nodeType: NodeType) => void;
}

export default function NodePalette({ onAddNode }: NodePaletteProps) {
  const [collapsed, setCollapsed] = useState(false);
  const t = useTranslations('nodePalette');
  
  const nodeTypes = [
    {
      type: 'api' as NodeType,
      labelKey: 'api',
      descriptionKey: 'api',
      icon: Network,
      colorStyle: { color: 'hsl(var(--chart-1))' },
      bgColorClass: 'hover:bg-accent/50',
      bgColorStyle: { backgroundColor: 'hsl(var(--chart-1) / 0.1)' },
    },
    {
      type: 'parallel' as NodeType,
      labelKey: 'parallel',
      descriptionKey: 'parallel',
      icon: GitBranch,
      colorStyle: { color: 'hsl(var(--chart-2))' },
      bgColorClass: 'hover:bg-accent/50',
      bgColorStyle: { backgroundColor: 'hsl(var(--chart-2) / 0.1)' },
    },
    {
      type: 'wait' as NodeType,
      labelKey: 'delay',
      descriptionKey: 'delay',
      icon: Clock,
      colorStyle: { color: 'hsl(var(--chart-3))' },
      bgColorClass: 'hover:bg-accent/50',
      bgColorStyle: { backgroundColor: 'hsl(var(--chart-3) / 0.1)' },
    },
    {
      type: 'assertion' as NodeType,
      labelKey: 'assert',
      descriptionKey: 'assert',
      icon: CheckCircle,
      colorStyle: { color: 'hsl(var(--chart-4))' },
      bgColorClass: 'hover:bg-accent/50',
      bgColorStyle: { backgroundColor: 'hsl(var(--chart-4) / 0.1)' },
    },
    {
      type: 'end' as NodeType,
      labelKey: 'condition',
      descriptionKey: 'condition',
      icon: Flag,
      colorStyle: { color: 'hsl(var(--chart-5))' },
      bgColorClass: 'hover:bg-accent/50',
      bgColorStyle: { backgroundColor: 'hsl(var(--chart-5) / 0.1)' },
    },
  ];

  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  if (collapsed) {
    return (
      <div className="w-12 h-full bg-muted/50 border-r flex flex-col items-center py-4 gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(false)}
          className="p-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        {nodeTypes.map((nodeType) => {
          const Icon = nodeType.icon;
          return (
            <div
              key={nodeType.type}
              draggable
              onDragStart={(event) => onDragStart(event, nodeType.type)}
              className="cursor-move"
            >
              <Button
                variant="ghost"
                size="sm"
                className="p-2"
                title={t(nodeType.labelKey as any)}
              >
                <Icon className="h-5 w-5" style={nodeType.colorStyle} />
              </Button>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-64 h-full bg-muted/50 border-r flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <h3 className="font-semibold text-sm">{t('title')}</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(true)}
          className="p-2 h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* 节点列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="text-xs text-muted-foreground mb-4">
        {t('dragTip')}
        </div>
        
        {nodeTypes.map((nodeType) => {
          const Icon = nodeType.icon;
          return (
            <Card
              key={nodeType.type}
              draggable
              onDragStart={(event) => onDragStart(event, nodeType.type)}
              className={`p-3 cursor-move transition-all ${nodeType.bgColorClass} border-2 hover:border-primary hover:shadow-md`}
              style={nodeType.bgColorStyle}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-background/80" style={nodeType.colorStyle}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{t(nodeType.labelKey as any)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t(nodeType.descriptionKey as any)}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        
      </div>

    </div>
  );
}

