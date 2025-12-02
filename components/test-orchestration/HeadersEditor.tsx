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

interface HeadersEditorProps {
  values: Record<string, ParamValue>;
  onChange: (values: Record<string, ParamValue>) => void;
  nodes: Node[];
  currentNodeId: string;
}

type ViewMode = 'keyvalue' | 'json';

interface HeaderRow {
  key: string;
  valueType: 'fixed' | 'variable';
  value?: string;
  variable?: string;
  enabled: boolean;
}

export default function HeadersEditor({
  values,
  onChange,
  nodes,
  currentNodeId,
}: HeadersEditorProps) {
  const t = useTranslations('testOrchestration');
  const [viewMode, setViewMode] = useState<ViewMode>('keyvalue');
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [showVarSelector, setShowVarSelector] = useState<string | null>(null);

  // 将values转换为HeaderRow数组
  const valuesToRows = (vals: Record<string, ParamValue>): HeaderRow[] => {
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

  // 将HeaderRow数组转换为values
  const rowsToValues = (rows: HeaderRow[]): Record<string, ParamValue> => {
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

  const [rows, setRows] = useState<HeaderRow[]>(() => {
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
  const updateRow = (index: number, updates: Partial<HeaderRow>) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], ...updates };
    setRows(newRows);
    onChange(rowsToValues(newRows));
  };

  // 切换到JSON模式
  const switchToJson = () => {
    const jsonObj: Record<string, any> = {};
    rows.forEach((row) => {
      if (row.key && row.enabled) {
        if (row.valueType === 'fixed') {
          jsonObj[row.key] = row.value || '';
        } else {
          jsonObj[row.key] = `{{${row.variable || ''}}}`;
        }
      }
    });
    setJsonText(JSON.stringify(jsonObj, null, 2));
    setJsonError('');
    setViewMode('json');
  };

  // 切换到键值对模式
  const switchToKeyValue = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError(t('jsonMustBeObject'));
        return;
      }

      const newRows: HeaderRow[] = Object.entries(parsed).map(([key, value]) => {
        // 检查是否是变量引用格式 {{variable}}
        if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
          return {
            key,
            valueType: 'variable' as const,
            variable: value.slice(2, -2),
            enabled: true,
          };
        }
        return {
          key,
          valueType: 'fixed' as const,
          value: String(value),
          enabled: true,
        };
      });

      setRows(newRows);
      onChange(rowsToValues(newRows));
      setJsonError('');
      setViewMode('keyvalue');
    } catch (error) {
      setJsonError(t('invalidJsonFormat'));
    }
  };

  // 常用请求头快捷添加
  const commonHeaders = [
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Authorization', value: 'Bearer {token}' },
    { key: 'Accept', value: 'application/json' },
    { key: 'User-Agent', value: 'MyApp/1.0' },
  ];

  const addCommonHeader = (header: { key: string; value: string }) => {
    const newRows = [...rows, { 
      key: header.key, 
      valueType: 'fixed' as const, 
      value: header.value, 
      enabled: true 
    }];
    setRows(newRows);
    onChange(rowsToValues(newRows));
  };

  return (
    <div className="space-y-4">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {rows.filter(r => r.enabled && r.key).length} {t('headers')}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 border rounded-md p-0.5 bg-muted">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-3 transition-all",
              viewMode === 'keyvalue' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              if (viewMode === 'json') {
                switchToKeyValue();
              }
            }}
          >
            <List className="h-3.5 w-3.5 mr-1.5" />
            {t('keyValue')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-3 transition-all",
              viewMode === 'json' 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => {
              if (viewMode === 'keyvalue') {
                switchToJson();
              }
            }}
          >
            <Code className="h-3.5 w-3.5 mr-1.5" />
            {t('json')}
          </Button>
        </div>
      </div>

      {/* 键值对模式 */}
      {viewMode === 'keyvalue' && (
        <div className="space-y-3">
          {/* 表头 */}
          <div className="grid grid-cols-12 gap-2 px-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-3">{t('key')}</div>
            <div className="col-span-3">{t('type')}</div>
            <div className="col-span-5">{t('value')}</div>
            <div className="col-span-1"></div>
          </div>

          {/* 请求头行 */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {rows.map((row, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-start p-2 rounded border bg-background">
                {/* 键名 */}
                <div className="col-span-3">
                  <Input
                    placeholder={t('keyPlaceholder')}
                    value={row.key}
                    onChange={(e) => updateRow(index, { key: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>

                {/* 类型选择 */}
                <div className="col-span-3">
                  <Select
                    value={row.valueType}
                    onValueChange={(value: 'fixed' | 'variable') =>
                      updateRow(index, { valueType: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">
                        <div className="flex items-center gap-1.5">
                          <Type className="h-3 w-3" />
                          {t('fixedValue')}
                        </div>
                      </SelectItem>
                      <SelectItem value="variable">
                        <div className="flex items-center gap-1.5">
                          <Variable className="h-3 w-3" />
                          {t('variable')}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 值输入 */}
                <div className="col-span-5 relative">
                  {row.valueType === 'fixed' ? (
                    <Input
                      placeholder={t('valuePlaceholder')}
                      value={row.value || ''}
                      onChange={(e) => updateRow(index, { value: e.target.value })}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start h-8 text-xs"
                        onClick={() =>
                          setShowVarSelector(showVarSelector === `${index}` ? null : `${index}`)
                        }
                      >
                        <Variable className="h-3 w-3 mr-1.5" />
                        {row.variable ? (
                          <code className="text-xs truncate">{row.variable}</code>
                        ) : (
                          t('selectVariable')
                        )}
                      </Button>

                      {showVarSelector === `${index}` && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1">
                          <VariableSelector
                            nodes={nodes}
                            currentNodeId={currentNodeId}
                            value={row.variable}
                            onChange={(varPath) => {
                              updateRow(index, { variable: varPath });
                              setShowVarSelector(null);
                            }}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* 删除按钮 */}
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => removeRow(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 添加按钮 */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={addRow}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addHeader')}
          </Button>

          {/* 常用请求头快捷添加 */}
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('quickAddCommonHeaders')}</p>
            <div className="flex flex-wrap gap-2">
              {commonHeaders.map((header) => (
                <Button
                  key={header.key}
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addCommonHeader(header)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {header.key}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* JSON模式 */}
      {viewMode === 'json' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <textarea
              className={cn(
                "w-full min-h-[300px] p-4 rounded-md text-sm font-mono border",
                "bg-slate-950 text-slate-50 focus:outline-none focus:ring-2 focus:ring-primary",
                jsonError && "border-red-500 focus:ring-red-500"
              )}
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonError('');
              }}
              placeholder={`{
  "Content-Type": "application/json",
  "Authorization": "Bearer {{loginToken}}",
  "Accept": "application/json"
}`}
              style={{
                fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                whiteSpace: 'pre',
                tabSize: 2,
              }}
            />
            {jsonError && (
              <p className="text-sm text-red-500">{jsonError}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewMode('keyvalue');
                setJsonError('');
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={switchToKeyValue}
            >
              {t('applyJson')}
            </Button>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md text-xs">
            <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              {t('jsonFormatHelp')}
            </p>
            <ul className="space-y-1 text-blue-800 dark:text-blue-200 list-disc list-inside">
              <li>{t('jsonFormatTip1')}</li>
              <li>{t('jsonFormatTip2')} <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{`{{variableName}}`}</code> {t('jsonFormatTip2').endsWith('format') ? 'format' : ''}</li>
              <li>{t('jsonFormatTip3')}<code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{`"Authorization": "Bearer {{loginToken}}"`}</code></li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

