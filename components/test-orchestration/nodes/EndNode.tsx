"use client";

import { Handle, Position } from '@xyflow/react';
import { Flag } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function EndNode() {
  const t = useTranslations('nodes');
  
  return (
    <div className="px-4 py-3 shadow-md rounded-lg bg-green-500 text-white border-2 border-green-600">
      <div className="flex items-center gap-2">
        <Flag className="h-5 w-5" />
        <div className="font-semibold">{t('end')}</div>
      </div>
      {/* 只有输入连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-3 h-3 !bg-green-600"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 !bg-green-600"
      />
    </div>
  );
}

