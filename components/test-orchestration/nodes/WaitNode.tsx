"use client";

import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ExecutionStatus {
  status?: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  error?: string;
}

export default function WaitNode({ data, selected, id }: NodeProps) {
  const t = useTranslations('nodes.wait');
  const nodeData = data as any & { execution?: ExecutionStatus };
  const waitTime = nodeData?.wait?.value || 0;
  const waitType = nodeData?.wait?.type || 'time';
  const execution = nodeData?.execution;
  const [isHovered, setIsHovered] = useState(false);

  // 获取状态图标
  const getStatusIcon = () => {
    if (!execution?.status || execution.status === 'pending') {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    }
    
    switch (execution.status) {
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  // 获取边框颜色
  const getBorderColor = () => {
    if (!execution?.status) return 'border-border hover:border-primary';
    
    switch (execution.status) {
      case 'running':
        return 'border-blue-500';
      case 'success':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      default:
        return 'border-border hover:border-primary';
    }
  };

  // 不在节点内处理点击，完全交给 React Flow
  
  return (
    <>
      {/* 节点主体 */}
      <div 
        className={`relative px-4 py-3 shadow-lg rounded-lg bg-card border-2 transition-all min-w-[150px] select-none ${
          selected ? 'border-primary ring-2 ring-primary/20' : getBorderColor()
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
            {getStatusIcon()}
            <div className="font-medium text-sm">{t('wait')}</div>
          </div>
          
          {/* 显示配置状态 */}
          <div className="text-xs text-muted-foreground">
            {waitType === 'time' ? (
              <span>{waitTime}ms</span>
            ) : (
              <span>{t('conditionWait')}</span>
            )}
          </div>

          {/* 执行时长 */}
          {execution?.duration !== undefined && (
            <div className="text-xs text-muted-foreground">
              {t('duration')}: {(execution.duration / 1000).toFixed(2)}秒
            </div>
          )}

          {/* 错误信息 */}
          {execution?.status === 'error' && execution.error && (
            <div className="text-xs p-2 bg-red-50 border border-red-200 rounded text-red-700 mt-2">
              ❌ {execution.error}
            </div>
          )}
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

