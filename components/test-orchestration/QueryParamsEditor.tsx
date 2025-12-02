"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Code, List, Variable, Type } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ParamValue } from '@/types/test-case';
import { Node } from '@xyflow/react';
import VariableSelector from './VariableSelector';
import { cn } from '@/lib/utils';

interface QueryParamsEditorProps {
  values: Record<string, ParamValue>;
  onChange: (values: Record<string, ParamValue>) => void;
  nodes: Node[];
  currentNodeId: string;
}

type ViewMode = 'keyvalue' | 'json';

interface QueryParamRow {
  key: string;
  valueType: 'fixed' | 'variable';
  value?: string;
  variable?: string;
  enabled: boolean;
}

export default function QueryParamsEditor({
  values,
  onChange,
  nodes,
  currentNodeId,
}: QueryParamsEditorProps) {
  const t = useTranslations('testOrchestration');
  const [viewMode, setViewMode] = useState<ViewMode>('keyvalue');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [showVarSelector, setShowVarSelector] = useState<string | null>(null);

  // 将values转换为QueryParamRow数组
  const valuesToRows = (vals: Record<string, ParamValue>): QueryParamRow[] => {
    if (!vals || typeof vals !== 'object') {
      return [];
    }
    return Object.entries(vals).map(([key, paramValue]) => ({
      key,
      valueType: paramValue.valueType,
      value: paramValue.value?.toString(),
      variable: paramValue.variable,
      enabled: true,
    }));
  };

  // 将QueryParamRow数组转换为values
  const rowsToValues = (rows: QueryParamRow[]): Record<string, ParamValue> => {
    const result: Record<string, ParamValue> = {};
    rows.forEach((row) => {
      if (row.key && row.enabled) {
        result[row.key] = {
          valueType: row.valueType,
          value: row.valueType === 'fixed' ? row.value : undefined,
          variable: row.valueType === 'variable' ? row.variable : undefined,
        };
      }
    });
    return result;
  };

  const [rows, setRows] = useState<QueryParamRow[]>(() => {
    const initialRows = valuesToRows(values);
    return initialRows.length > 0 ? initialRows : [{ key: '', valueType: 'fixed', value: '', enabled: true }];
  });

  // 添加新行
  const addRow = () => {
    const newRows = [...rows, { key: '', valueType: 'fixed' as const, value: '', enabled: true }];
    setRows(newRows);
  };

  // 删除行
  const removeRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
    onChange(rowsToValues(newRows));
  };

  // 更新行
  const updateRow = (index: number, updates: Partial<QueryParamRow>) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...updates };
    setRows(newRows);
    onChange(rowsToValues(newRows));
  };

  // 切换视图模式
  const handleViewModeChange = (mode: ViewMode) => {
    if (mode === 'json' && viewMode === 'keyvalue') {
      // 从键值对切换到JSON，转换当前数据
      const jsonObj: Record<string, any> = {};
      rows.forEach((row) => {
        if (row.key && row.enabled) {
          if (row.valueType === 'variable' && row.variable) {
            jsonObj[row.key] = `\${${row.variable}}`;
          } else if (row.value !== undefined) {
            jsonObj[row.key] = row.value;
          }
        }
      });
      setJsonText(JSON.stringify(jsonObj, null, 2));
      setJsonError('');
    } else if (mode === 'keyvalue' && viewMode === 'json') {
      // 从JSON切换到键值对，尝试解析JSON
      try {
        const parsed = JSON.parse(jsonText);
        const newRows: QueryParamRow[] = Object.entries(parsed).map(([key, value]) => {
          // 检测是否是变量引用格式 ${xxx}
          const strValue = String(value);
          const varMatch = strValue.match(/^\$\{(.+)\}$/);
          if (varMatch) {
            return {
              key,
              valueType: 'variable' as const,
              variable: varMatch[1],
              enabled: true,
            };
          }
          return {
            key,
            valueType: 'fixed' as const,
            value: strValue,
            enabled: true,
          };
        });
        setRows(newRows);
        onChange(rowsToValues(newRows));
        setJsonError('');
      } catch (e) {
        setJsonError(t('jsonParseError', { defaultValue: 'JSON 格式错误' }));
        return; // 不切换视图
      }
    }
    setViewMode(mode);
  };

  // 应用JSON更改
  const applyJsonChanges = () => {
    try {
      const parsed = JSON.parse(jsonText);
      const newRows: QueryParamRow[] = Object.entries(parsed).map(([key, value]) => {
        const strValue = String(value);
        const varMatch = strValue.match(/^\$\{(.+)\}$/);
        if (varMatch) {
          return {
            key,
            valueType: 'variable' as const,
            variable: varMatch[1],
            enabled: true,
          };
        }
        return {
          key,
          valueType: 'fixed' as const,
          value: strValue,
          enabled: true,
        };
      });
      setRows(newRows);
      onChange(rowsToValues(newRows));
      setJsonError('');
    } catch (e) {
      setJsonError(t('jsonParseError', { defaultValue: 'JSON 格式错误' }));
    }
  };

  return (
    <div className="space-y-3">
      {/* 视图切换 */}
      <div className="flex items-center gap-2">
        <Button
          variant={viewMode === 'keyvalue' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewModeChange('keyvalue')}
        >
          <List className="h-4 w-4 mr-1" />
          {t('keyValueMode', { defaultValue: '键值对' })}
        </Button>
        <Button
          variant={viewMode === 'json' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleViewModeChange('json')}
        >
          <Code className="h-4 w-4 mr-1" />
          {t('jsonMode', { defaultValue: 'JSON' })}
        </Button>
      </div>

      {/* 键值对视图 */}
      {viewMode === 'keyvalue' && (
        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={index} className="flex items-start gap-2">
              {/* 参数名 */}
              <Input
                placeholder={t('paramName', { defaultValue: '参数名' })}
                value={row.key}
                onChange={(e) => updateRow(index, { key: e.target.value })}
                className="flex-1"
              />

              {/* 值类型选择 */}
              <Select
                value={row.valueType}
                onValueChange={(value: 'fixed' | 'variable') =>
                  updateRow(index, { valueType: value, value: '', variable: '' })
                }
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">
                    <div className="flex items-center gap-1">
                      <Type className="h-3 w-3" />
                      <span>{t('fixed', { defaultValue: '固定值' })}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="variable">
                    <div className="flex items-center gap-1">
                      <Variable className="h-3 w-3" />
                      <span>{t('variable', { defaultValue: '变量' })}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* 值输入 */}
              {row.valueType === 'fixed' ? (
                <Input
                  placeholder={t('paramValue', { defaultValue: '参数值' })}
                  value={row.value || ''}
                  onChange={(e) => updateRow(index, { value: e.target.value })}
                  className="flex-1"
                />
              ) : (
                <div className="flex-1 relative">
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => setShowVarSelector(`query-${index}`)}
                  >
                    {row.variable || t('selectVariable', { defaultValue: '选择变量' })}
                  </Button>
                  {showVarSelector === `query-${index}` && (
                    <div className="absolute top-full left-0 z-50 mt-1 bg-background border rounded-lg shadow-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{t('selectVariable', { defaultValue: '选择变量' })}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowVarSelector(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <VariableSelector
                        nodes={nodes}
                        currentNodeId={currentNodeId}
                        value={row.variable}
                        onChange={(varPath: string) => {
                          updateRow(index, { variable: varPath });
                          setShowVarSelector(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 删除按钮 */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* 添加按钮 */}
          <Button variant="outline" size="sm" onClick={addRow} className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            {t('addQueryParam', { defaultValue: '添加参数' })}
          </Button>
        </div>
      )}

      {/* JSON 视图 */}
      {viewMode === 'json' && (
        <div className="space-y-2">
          <textarea
            className={cn(
              'w-full min-h-[200px] p-3 rounded-md border font-mono text-sm',
              'bg-background text-foreground',
              jsonError && 'border-red-500'
            )}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonError('');
            }}
            placeholder={`{\n  "page": "1",\n  "size": "20"\n}`}
          />
          {jsonError && <p className="text-sm text-red-500">{jsonError}</p>}
          <Button onClick={applyJsonChanges} className="w-full">
            {t('applyChanges', { defaultValue: '应用更改' })}
          </Button>
        </div>
      )}
    </div>
  );
}

