"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Assertion } from '@/types/test-case';
import { Plus, Trash2, Variable } from 'lucide-react';
import { Node } from '@xyflow/react';
import VariableSelector from './VariableSelector';
import CurrentResponseFieldSelector from './CurrentResponseFieldSelector';

interface AssertionConfigProps {
  assertions: Assertion[];
  onChange: (assertions: Assertion[]) => void;
  nodes: Node[];
  currentNodeId: string;
  // 新增：是否是API节点内的断言（true: API节点内, false: 独立断言节点）
  isApiNodeContext?: boolean;
  // 新增：当前API ID（仅在 isApiNodeContext=true 时需要）
  currentApiId?: string;
  // 断言失败策略
  assertionFailureStrategy?: 'stopOnFailure' | 'continueAll';
  onStrategyChange?: (strategy: 'stopOnFailure' | 'continueAll') => void;
}

export default function AssertionConfig({
  assertions,
  onChange,
  nodes,
  currentNodeId,
  isApiNodeContext = false,
  currentApiId,
  assertionFailureStrategy = 'stopOnFailure',
  onStrategyChange,
}: AssertionConfigProps) {
  const t = useTranslations('assertionConfig');
  const [showFieldSelector, setShowFieldSelector] = useState<number | null>(null);
  const [showValueSelector, setShowValueSelector] = useState<number | null>(null);

  const addAssertion = () => {
    onChange([
      ...assertions,
      {
        id: `assertion_${Date.now()}`,
        field: '',
        operator: 'equals',
        expected: '',
        expectedType: 'auto',
      },
    ]);
  };

  const updateAssertion = (index: number, updates: Partial<Assertion>) => {
    const newAssertions = [...assertions];
    newAssertions[index] = { ...newAssertions[index], ...updates };
    onChange(newAssertions);
  };

  const removeAssertion = (index: number) => {
    onChange(assertions.filter((_, i) => i !== index));
  };

  const handleFieldVariableSelect = (index: number, variablePath: string) => {
    updateAssertion(index, { field: variablePath });
    setShowFieldSelector(null);
  };

  const handleValueVariableSelect = (index: number, variablePath: string) => {
    // 如果是API节点内的断言，期望值可以引用变量，格式为 ${变量路径}
    updateAssertion(index, { expected: `\${${variablePath}}` });
    setShowValueSelector(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{t('title')}</Label>
        <Button size="sm" variant="outline" onClick={addAssertion}>
          <Plus className="h-4 w-4 mr-1" />
          {t('addAssertion')}
        </Button>
      </div>

      {/* 断言失败策略 */}
      {assertions.length > 1 && onStrategyChange && (
        <div className="p-3 border rounded-md bg-muted/50">
          <Label className="text-xs font-medium mb-2 block">{t('failureStrategy')}</Label>
          <Select
            value={assertionFailureStrategy}
            onValueChange={(value: any) => onStrategyChange(value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stopOnFailure">
                {t('stopOnFailure')}
              </SelectItem>
              <SelectItem value="continueAll">
                {t('continueAll')}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            {assertionFailureStrategy === 'stopOnFailure' 
              ? t('stopOnFailureDesc')
              : t('continueAllDesc')}
          </p>
        </div>
      )}

      {assertions.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8 border-2 border-dashed rounded-md">
          {t('clickToAdd')}
        </div>
      ) : (
        <div className="space-y-4">
          {assertions.map((assertion, index) => (
            <div
              key={assertion.id || index}
              className="p-4 border rounded-md space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('assertionLabel')} {index + 1}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAssertion(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              {/* 字段 */}
              <div className="space-y-2">
                <Label className="text-xs">{t('fieldPath')}</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('fieldPlaceholder')}
                    value={assertion.field}
                    onChange={(e) =>
                      updateAssertion(index, { field: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowFieldSelector(showFieldSelector === index ? null : index)}
                    className="gap-1"
                  >
                    <Variable className="h-3.5 w-3.5" />
                    {t('selectBtn')}
                  </Button>
                </div>
                {showFieldSelector === index && (
                  <div className="border rounded-lg p-3 bg-background">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-medium">
                        {isApiNodeContext ? t('selectCurrentField') : t('selectVariable')}
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFieldSelector(null)}
                      >
                        {t('cancel')}
                      </Button>
                    </div>
                    {isApiNodeContext && currentApiId ? (
                      // API节点内的断言：只显示当前API的响应字段
                      <CurrentResponseFieldSelector
                        apiId={currentApiId}
                        value={assertion.field}
                        onChange={(value) => handleFieldVariableSelect(index, value)}
                      />
                    ) : (
                      // 独立断言节点：显示所有可用变量
                      <VariableSelector
                        nodes={nodes}
                        currentNodeId={currentNodeId}
                        value={assertion.field}
                        onChange={(value) => handleFieldVariableSelect(index, value)}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* 条件 */}
              <div className="space-y-2">
                <Label className="text-xs">{t('condition')}</Label>
                <Select
                  value={assertion.operator}
                  onValueChange={(value: any) =>
                    updateAssertion(index, { operator: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">{t('equals')}</SelectItem>
                    <SelectItem value="notEquals">{t('notEquals')}</SelectItem>
                    <SelectItem value="contains">{t('contains')}</SelectItem>
                    <SelectItem value="notContains">{t('notContains')}</SelectItem>
                    <SelectItem value="greaterThan">{t('greaterThan')}</SelectItem>
                    <SelectItem value="lessThan">{t('lessThan')}</SelectItem>
                    <SelectItem value="exists">{t('exists')}</SelectItem>
                    <SelectItem value="notExists">{t('notExists')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 期望值 */}
              {assertion.operator !== 'exists' &&
                assertion.operator !== 'notExists' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-xs">{t('expectedValue')}</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder={t('expectedPlaceholder')}
                          value={assertion.expected?.toString() || ''}
                          onChange={(e) =>
                            updateAssertion(index, { expected: e.target.value })
                          }
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowValueSelector(showValueSelector === index ? null : index)}
                          className="gap-1"
                        >
                          <Variable className="h-3.5 w-3.5" />
                          {t('selectBtn')}
                        </Button>
                      </div>
                      {showValueSelector === index && (
                        <div className="border rounded-lg p-3 bg-background">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-medium">{t('selectVariableAsValue')}</Label>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowValueSelector(null)}
                            >
                              {t('cancel')}
                            </Button>
                          </div>
                          <VariableSelector
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            value={assertion.expected?.toString() || ''}
                            onChange={(value) => handleValueVariableSelect(index, value)}
                          />
                        </div>
                      )}
                    </div>

                    {/* 期望值类型 */}
                    <div className="space-y-2">
                      <Label className="text-xs">{t('expectedType')}</Label>
                      <Select
                        value={assertion.expectedType || 'auto'}
                        onValueChange={(value: any) =>
                          updateAssertion(index, { expectedType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">{t('auto')}</SelectItem>
                          <SelectItem value="string">{t('string')}</SelectItem>
                          <SelectItem value="number">{t('number')}</SelectItem>
                          <SelectItem value="boolean">{t('boolean')}</SelectItem>
                          <SelectItem value="object">{t('object')}</SelectItem>
                          <SelectItem value="array">{t('array')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {t('expectedTypeDesc')}
                      </p>
                    </div>
                  </>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

