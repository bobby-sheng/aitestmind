"use client";

import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { ApiNodeData } from '@/types/test-case';
import { AlertCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ExecutionStatus {
  status?: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  error?: string;
  request?: any;
  response?: any;
  assertions?: any[];
  extractedVariables?: any;
}

export default function ApiNode({ data, selected, id }: NodeProps) {
  const t = useTranslations('nodes.api');
  const nodeData = data as unknown as (ApiNodeData & { execution?: ExecutionStatus });
  
  // 添加默认值保护
  const method = nodeData?.method || 'GET';
  const name = nodeData?.name || t('unnamed');
  const url = nodeData?.url || t('unconfigured');
  const assertions = nodeData?.assertions || [];
  const execution = nodeData?.execution;
  
  // 调试：每次渲染时输出执行状态
  console.log(`[ApiNode渲染] nodeId: ${id}, execution.status: ${execution?.status}, hasExecution: ${!!execution}`);
  
  // 检查是否已配置
  const hasConfig = nodeData?.requestConfig && (
    Object.keys(nodeData.requestConfig.pathParams || {}).length > 0 ||
    Object.keys(nodeData.requestConfig.queryParams || {}).length > 0 ||
    Object.keys(nodeData.requestConfig.headers || {}).length > 0 ||
    Object.keys(nodeData.requestConfig.body || {}).length > 0
  );
  
  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-500',
      POST: 'bg-green-500',
      PUT: 'bg-yellow-500',
      DELETE: 'bg-red-500',
      PATCH: 'bg-purple-500',
    };
    return colors[method] || 'bg-gray-500';
  };

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

  // 不在节点内处理点击，完全交给 React Flow

  return (
    <>
      {/* 节点主体 */}
      <div 
        className={`relative px-4 py-3 shadow-lg rounded-lg bg-card border-2 transition-all min-w-[200px] max-w-[300px] select-none ${getBorderColor()}`}
        style={{ 
          pointerEvents: 'all',
          userSelect: 'none'
        }}
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge className={`${getMethodColor(method)} text-white text-xs px-2`}>
              {method}
            </Badge>
            <div className="font-medium text-sm truncate flex-1" title={name}>
              {name}
            </div>
          </div>
          
          {/* 显示配置状态或执行状态 */}
          {!execution?.status ? (
            <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
              {hasConfig ? (
                <span>{t('configured')}{assertions.length > 0 ? ` · ${assertions.length} ${t('assertions')}` : ''}</span>
              ) : (
                <span className="flex items-center gap-1 text-orange-500">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {t('unconfigured')}
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs space-y-1">
              {/* 执行状态 */}
              {execution.status === 'running' && (
                <div className="text-blue-600 font-medium">{t('executing')}</div>
              )}
              {execution.status === 'success' && (
                <>
                  <div className="text-green-600 font-medium">{t('success')}</div>
                  {execution.duration !== undefined && (
                    <div className="text-muted-foreground">
                      {t('duration')}: {(execution.duration / 1000).toFixed(2)}秒
                    </div>
                  )}
                </>
              )}
              {execution.status === 'error' && (
                <>
                  <div className="text-red-600 font-medium">{t('failed')}</div>
                  {execution.duration !== undefined && (
                    <div className="text-muted-foreground">
                      {t('duration')}: {(execution.duration / 1000).toFixed(2)}秒
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 四个方向的连接点 */}
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

