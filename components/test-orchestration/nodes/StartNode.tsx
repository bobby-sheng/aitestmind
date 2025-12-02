"use client";

import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function StartNode() {
  const t = useTranslations('nodes');
  
  return (
    <div className="px-4 py-3 shadow-md rounded-lg bg-primary text-primary-foreground border-2 border-primary">
      <div className="flex items-center gap-2">
        <Play className="h-5 w-5" />
        <div className="font-semibold">{t('start')}</div>
      </div>
      {/* 四个方向的连接点 */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className="w-3 h-3 !bg-primary"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3 h-3 !bg-primary"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-3 h-3 !bg-primary"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className="w-3 h-3 !bg-primary"
      />
    </div>
  );
}

