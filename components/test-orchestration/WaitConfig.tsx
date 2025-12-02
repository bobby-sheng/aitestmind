"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WaitConfig as WaitConfigType } from '@/types/test-case';
import { Variable } from 'lucide-react';
import { Node } from '@xyflow/react';
import VariableSelector from './VariableSelector';
import CurrentResponseFieldSelector from './CurrentResponseFieldSelector';

interface WaitConfigProps {
  config: WaitConfigType;
  onChange: (config: WaitConfigType) => void;
  nodes: Node[];
  currentNodeId: string;
  // 新增：是否是API节点内的等待（true: API节点内, false: 独立等待节点）
  isApiNodeContext?: boolean;
  // 新增：当前API ID（仅在 isApiNodeContext=true 时需要）
  currentApiId?: string;
}

export default function WaitConfig({ 
  config, 
  onChange, 
  nodes, 
  currentNodeId,
  isApiNodeContext = false,
  currentApiId 
}: WaitConfigProps) {
  const t = useTranslations('waitConfig');
  const [showVariableSelector, setShowVariableSelector] = useState(false);
  const [showValueSelector, setShowValueSelector] = useState(false);

  const handleVariableSelect = (variablePath: string) => {
    // API节点内的等待直接使用简单字段名（如 "message"）
    // 后端会自动识别并使用当前响应上下文
    onChange({
      ...config,
      condition: {
        ...config.condition,
        variable: variablePath,
        operator: config.condition?.operator || 'equals',
      },
    });
    setShowVariableSelector(false);
  };

  const handleValueSelect = (variablePath: string) => {
    onChange({
      ...config,
      condition: {
        ...config.condition!,
        expected: `\${${variablePath}}`,
      },
    });
    setShowValueSelector(false);
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-semibold">{t('title')}</Label>

      {/* 等待类型 */}
      <div className="space-y-2">
        <Label className="text-xs">{t('waitType')}</Label>
        <Select
          value={config.type}
          onValueChange={(value: 'time' | 'condition') =>
            onChange({ ...config, type: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="time">{t('waitTime')}</SelectItem>
            <SelectItem value="condition">{t('waitCondition')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 等待时间 */}
      {config.type === 'time' && (
        <div className="space-y-2">
          <Label className="text-xs">{t('timeLabel')}</Label>
          <Input
            type="number"
            placeholder={t('timePlaceholder')}
            value={config.value || ''}
            onChange={(e) =>
              onChange({ ...config, value: parseInt(e.target.value) || 0 })
            }
          />
          <p className="text-xs text-muted-foreground">
            {config.value ? `${(config.value / 1000).toFixed(2)} ${t('seconds')}` : ''}
          </p>
        </div>
      )}

      {/* 等待条件 */}
      {config.type === 'condition' && (
        <div className="space-y-3">
          {/* 超时时间 */}
          <div className="space-y-2">
            <Label className="text-xs">{t('maxWaitTime')}</Label>
            <Input
              type="number"
              placeholder={t('maxWaitTimePlaceholder')}
              value={config.timeout || 30000}
              onChange={(e) =>
                onChange({ ...config, timeout: parseInt(e.target.value) || 30000 })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('maxWaitTimeDesc')}
            </p>
          </div>

          {/* 检查间隔 */}
          <div className="space-y-2">
            <Label className="text-xs">{t('checkInterval')}</Label>
            <Input
              type="number"
              placeholder={t('checkIntervalPlaceholder')}
              value={config.checkInterval || 2000}
              onChange={(e) =>
                onChange({ ...config, checkInterval: parseInt(e.target.value) || 2000 })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('checkIntervalDesc')}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t('variable')}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t('variablePlaceholder')}
                value={config.condition?.variable || ''}
                onChange={(e) =>
                  onChange({
                    ...config,
                    condition: {
                      ...config.condition,
                      variable: e.target.value,
                      operator: config.condition?.operator || 'equals',
                    },
                  })
                }
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowVariableSelector(!showVariableSelector)}
                className="gap-1"
              >
                <Variable className="h-3.5 w-3.5" />
                {t('selectBtn')}
              </Button>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t('variableTip')} <code className="bg-muted px-1 rounded">message</code>{t('variableTip2')} <code className="bg-muted px-1 rounded">step_1.response.message</code>）
            </p>
            {showVariableSelector && (
              <div className="border rounded-lg p-3 bg-background">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs font-medium">
                    {isApiNodeContext ? t('selectCurrentField') : t('selectVariable')}
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowVariableSelector(false)}
                  >
                    {t('cancel')}
                  </Button>
                </div>
                {isApiNodeContext && currentApiId ? (
                  // API节点内的等待：只显示当前API的响应字段
                  <CurrentResponseFieldSelector
                    apiId={currentApiId}
                    value={config.condition?.variable || ''}
                    onChange={handleVariableSelect}
                  />
                ) : (
                  // 独立等待节点：显示所有之前节点的变量
                <VariableSelector
                  nodes={nodes}
                  currentNodeId={currentNodeId}
                  value={config.condition?.variable || ''}
                  onChange={handleVariableSelect}
                />
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t('condition')}</Label>
            <Select
              value={config.condition?.operator || 'equals'}
              onValueChange={(value: any) =>
                onChange({
                  ...config,
                  condition: {
                    ...config.condition,
                    variable: config.condition?.variable || '',
                    operator: value,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">{t('equals')}</SelectItem>
                <SelectItem value="notEquals">{t('notEquals')}</SelectItem>
                <SelectItem value="exists">{t('exists')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.condition?.operator !== 'exists' && (
            <div className="space-y-2">
              <Label className="text-xs">{t('expectedValue')}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t('expectedPlaceholder')}
                  value={config.condition?.expected?.toString() || ''}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      condition: {
                        ...config.condition!,
                        expected: e.target.value,
                      },
                    })
                  }
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowValueSelector(!showValueSelector)}
                  className="gap-1"
                >
                  <Variable className="h-3.5 w-3.5" />
                  {t('selectBtn')}
                </Button>
              </div>
              {showValueSelector && (
                <div className="border rounded-lg p-3 bg-background">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs font-medium">{t('selectVariableAsValue')}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowValueSelector(false)}
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                  <VariableSelector
                    nodes={nodes}
                    currentNodeId={currentNodeId}
                    value={config.condition?.expected?.toString() || ''}
                    onChange={handleValueSelect}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

