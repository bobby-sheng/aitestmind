"use client";

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { CheckCircle, Settings, AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ExecutionStatus {
  status?: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  error?: string;
  assertions?: any[];
}

export default function AssertionNode({ data, selected, id }: NodeProps) {
  const t = useTranslations('nodes.assertion');
  const nodeData = data as any;
  const assertionCount = nodeData?.assertions?.length || 0;
  const execution = nodeData?.execution as ExecutionStatus | undefined;
  const [isHovered, setIsHovered] = useState(false);

  // 获取状态图标
  const getStatusIcon = () => {
    if (!execution?.status || execution.status === 'pending') return null;
    
    switch (execution.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  // 获取边框颜色
  const getBorderColor = () => {
    if (!execution?.status) {
      return selected ? 'border-primary' : 'border-border';
    }
    
    switch (execution.status) {
      case 'running':
        return 'border-blue-500 shadow-blue-200';
      case 'success':
        return 'border-green-500 shadow-green-200';
      case 'error':
        return 'border-red-500 shadow-red-200';
      default:
        return selected ? 'border-primary' : 'border-border';
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    if (!execution?.status) return null;
    
    switch (execution.status) {
      case 'running':
        return <span className="text-blue-500">{t('executing')}</span>;
      case 'success':
        return <span className="text-green-500">{t('success')}</span>;
      case 'error':
        return <span className="text-red-500">{t('failed')}</span>;
      default:
        return null;
    }
  };

  // 不在节点内处理点击，完全交给 React Flow
  
  return (
    <>
      {/* 节点主体 */}
      <div 
        className={`relative px-4 py-3 shadow-lg rounded-lg bg-card border-2 transition-all min-w-[150px] select-none ${getBorderColor()} ${
          selected ? 'ring-2 ring-primary/20' : 'hover:border-primary'
        }`}
        style={{ 
          pointerEvents: 'all',
          userSelect: 'none'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {!execution?.status ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              getStatusIcon()
            )}
            <div className="font-medium text-sm">{t('assertion')}</div>
          </div>
          
          {/* 显示配置状态或执行状态 */}
          <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
            {execution?.status ? (
              <div className="flex flex-col gap-1">
                {getStatusText()}
                {execution.duration !== undefined && (
                  <span className="text-muted-foreground">
                    {t('duration')}: {(execution.duration / 1000).toFixed(2)}秒
                  </span>
                )}
              </div>
            ) : (
              <>
                {assertionCount > 0 ? (
                  <span>{assertionCount} {t('rules')}</span>
                ) : (
                  <span className="flex items-center gap-1 text-orange-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {t('unconfigured')}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-3 h-3 !bg-border hover:!bg-primary transition-colors"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 !bg-border hover:!bg-primary transition-colors"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-3 h-3 !bg-border hover:!bg-primary transition-colors"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3 h-3 !bg-border hover:!bg-primary transition-colors"
      />
    </>
  );
}

