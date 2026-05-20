"use client";

import { memo, useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { ParallelNodeData } from '@/types/test-case';
import { GitBranch, Settings, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ExecutionStatus {
  status?: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  startTime?: string;
  error?: string;
}

function ParallelNode({ data, selected, id }: NodeProps<ParallelNodeData>) {
  const t = useTranslations('nodes.parallel');
  const nodeData = data as unknown as (ParallelNodeData & { execution?: ExecutionStatus });
  const apiCount = nodeData.apis?.length || 0;
  const execution = nodeData.execution;
  
  // 检查是否正在拖拽API节点
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      const nodeType = e.dataTransfer?.types?.includes('application/reactflow');
      if (nodeType) {
        setIsDragOver(true);
      }
    };
    
    const handleDragLeave = () => {
      setIsDragOver(false);
    };
    
    const handleDrop = () => {
      setIsDragOver(false);
    };
    
    // 全局事件监听
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

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
    if (!execution?.status) return 'border-purple-500';
    
    switch (execution.status) {
      case 'running':
        return 'border-blue-500';
      case 'success':
        return 'border-green-500';
      case 'error':
        return 'border-red-500';
      default:
        return 'border-purple-500';
    }
  };

  // 处理删除节点
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const deleteEvent = new CustomEvent('node-delete', { 
      detail: { nodeId: id },
      bubbles: true 
    });
    document.dispatchEvent(deleteEvent);
  };

  return (
    <div
      className={`
        group min-w-[200px] rounded-lg border-2 bg-background shadow-md transition-all duration-200 relative
        ${selected ? 'border-primary' : getBorderColor()}
        ${isDragOver ? 'scale-105 border-purple-600 border-4 shadow-2xl bg-purple-50 dark:bg-purple-950' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 删除按钮 */}
      <button
        onClick={handleDelete}
        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-md hover:scale-110 z-10"
        title={t('delete')}
      >
        <Trash2 className="w-3 h-3" />
      </button>
      {/* 输入连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !w-3 !h-3"
      />

      {/* 节点内容 */}
      <div 
        className="relative p-4 space-y-3"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* 标题区域 */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10">
            {execution?.status ? getStatusIcon() : <GitBranch className="w-4 h-4 text-purple-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">
                {nodeData.name || t('unnamed')}
              </span>
              <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-700">
                {t('parallel')}
              </Badge>
            </div>
            {nodeData.description && (
              <p className="text-xs text-muted-foreground truncate">
                {nodeData.description}
              </p>
            )}
            {execution?.duration !== undefined && (
              <p className="text-xs text-muted-foreground">
                {t('duration')}: {(execution.duration / 1000).toFixed(2)}秒
              </p>
            )}
          </div>
        </div>

        {/* API 列表 */}
        {apiCount > 0 && (
          <div className="space-y-1.5 border-t border-[#e5e7eb] dark:border-[#4b5563] pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t('concurrentExec')}</span>
              <Badge variant="outline" className="text-xs">
                {apiCount} {t('apis')}
              </Badge>
            </div>
            <div className="space-y-1">
              {nodeData.apis.slice(0, 3).map((api) => (
                <div
                  key={api.id}
                  className="flex items-center gap-2 p-1.5 rounded bg-muted/50 text-xs"
                >
                  <Badge
                    variant="outline"
                    className={`
                      text-xs px-1.5 py-0 
                      ${api.method === 'GET' ? 'bg-blue-500/10 text-blue-700 border-blue-200' : ''}
                      ${api.method === 'POST' ? 'bg-green-500/10 text-green-700 border-green-200' : ''}
                      ${api.method === 'PUT' ? 'bg-yellow-500/10 text-yellow-700 border-yellow-200' : ''}
                      ${api.method === 'DELETE' ? 'bg-red-500/10 text-red-700 border-red-200' : ''}
                    `}
                  >
                    {api.method}
                  </Badge>
                  <span className="truncate flex-1">
                    {api.name || api.url}
                  </span>
                </div>
              ))}
              {apiCount > 3 && (
                <div className="text-xs text-center text-muted-foreground py-1">
                  {t('more')} {apiCount - 3} {t('moreItems')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {apiCount === 0 && (
          <div className="text-xs text-center text-muted-foreground py-2 border border-dashed rounded">
            {isDragOver ? (
              <span className="text-purple-600 font-medium">🎯 {t('dropToAdd')}</span>
            ) : (
              <span>{t('dragApiHere')}</span>
            )}
          </div>
        )}

        {/* 拖拽提示遮罩 */}
        {isDragOver && apiCount > 0 && (
          <div className="absolute inset-0 bg-purple-500/20 rounded-lg flex items-center justify-center pointer-events-none">
            <div className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg font-medium">
              🎯 {t('dropToAdd')}
            </div>
          </div>
        )}

        {/* 执行错误信息 */}
        {execution?.status === 'error' && execution.error && (
          <div className="text-xs p-2 bg-red-50 border border-red-200 rounded text-red-700">
            ❌ {execution.error}
          </div>
        )}

        {/* 失败策略 */}
        {nodeData.failureStrategy && (
          <div className="text-xs flex items-center gap-1.5 pt-1 border-t border-[#e5e7eb] dark:border-[#4b5563] text-muted-foreground">
            <Settings className="w-3 h-3" />
            <span>
              {t('failureStrategy')}: {nodeData.failureStrategy === 'stopAll' ? t('stopAll') : t('continueAll')}
            </span>
          </div>
        )}
      </div>

      {/* 输出连接点 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500 !w-3 !h-3"
      />
    </div>
  );
}

export default memo(ParallelNode);

