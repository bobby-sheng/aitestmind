"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ParamValue } from '@/types/test-case';
import { Plus, Trash2, Variable } from 'lucide-react';
import { Node } from '@xyflow/react';
import VariableSelector from './VariableSelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FormDataEditorProps {
  values: Record<string, ParamValue>;
  onChange: (values: Record<string, ParamValue>) => void;
  nodes: Node[];
  currentNodeId: string;
  contentType: 'form-data' | 'x-www-form-urlencoded';
}

export default function FormDataEditor({
  values,
  onChange,
  nodes,
  currentNodeId,
  contentType,
}: FormDataEditorProps) {
  // 将 values 转换为数组形式方便编辑
  const [entries, setEntries] = useState<Array<{ key: string; paramValue: ParamValue }>>(() => {
    // 初始化时直接从 values 创建 entries
    const initialEntries = Object.entries(values).map(([key, paramValue]) => ({
      key,
      paramValue,
    }));
    if (initialEntries.length === 0) {
      initialEntries.push({
        key: '',
        paramValue: { valueType: 'fixed', value: '' },
      });
    }
    return initialEntries;
  });
  const [showVarSelector, setShowVarSelector] = useState<string | null>(null);
  // 记录已初始化的 values 的 key，用于检测是否有新数据加载
  const [initializedKeys, setInitializedKeys] = useState<string>(() => Object.keys(values).sort().join(','));

  useEffect(() => {
    const currentKeys = Object.keys(values).sort().join(',');
    const valuesKeyCount = Object.keys(values).length;
    
    console.log('[FormDataEditor] useEffect 触发:', {
      valuesKeyCount,
      currentKeys,
      initializedKeys,
      entriesLength: entries.length,
      values,
    });
    
    // 初始化条件：
    // 1. values 有数据，且 keys 与上次初始化的不同（说明是从 API 仓库加载了新数据）
    // 2. 或者 entries 只有一个空条目，但 values 有数据
    const isEmptyEntries = entries.length === 1 && !entries[0].key.trim();
    const hasNewData = valuesKeyCount > 0 && currentKeys !== initializedKeys;
    
    console.log('[FormDataEditor] 初始化条件检查:', { isEmptyEntries, hasNewData, currentKeys, initializedKeys });
    
    if ((isEmptyEntries && valuesKeyCount > 0) || hasNewData) {
      const newEntries = Object.entries(values).map(([key, paramValue]) => ({
        key,
        paramValue,
      }));
      // 如果没有条目，添加一个空条目
      if (newEntries.length === 0) {
        newEntries.push({
          key: '',
          paramValue: { valueType: 'fixed', value: '' },
        });
      }
      setEntries(newEntries);
      setInitializedKeys(currentKeys);
      console.log('[FormDataEditor] ✅ 初始化 entries:', newEntries);
    } else {
      console.log('[FormDataEditor] ⏭️ 跳过初始化');
    }
  }, [values]);

  // 同步到父组件
  const syncToParent = (newEntries: Array<{ key: string; paramValue: ParamValue }>) => {
    const newValues: Record<string, ParamValue> = {};
    newEntries.forEach(({ key, paramValue }) => {
      if (key.trim()) {
        newValues[key.trim()] = paramValue;
      }
    });
    onChange(newValues);
  };

  const handleKeyChange = (index: number, newKey: string) => {
    const newEntries = [...entries];
    newEntries[index].key = newKey;
    setEntries(newEntries);
    syncToParent(newEntries);
  };

  const handleValueChange = (index: number, newValue: string) => {
    const newEntries = [...entries];
    newEntries[index].paramValue = {
      ...newEntries[index].paramValue,
      valueType: 'fixed',
      value: newValue,
    };
    setEntries(newEntries);
    syncToParent(newEntries);
  };

  const handleValueTypeChange = (index: number, valueType: 'fixed' | 'variable') => {
    const newEntries = [...entries];
    newEntries[index].paramValue = {
      ...newEntries[index].paramValue,
      valueType,
      value: valueType === 'fixed' ? '' : undefined,
      variable: valueType === 'variable' ? '' : undefined,
    };
    setEntries(newEntries);
    syncToParent(newEntries);
  };

  const handleVariableSelect = (index: number, variable: string) => {
    const newEntries = [...entries];
    newEntries[index].paramValue = {
      valueType: 'variable',
      variable,
      value: variable,
    };
    setEntries(newEntries);
    setShowVarSelector(null);
    syncToParent(newEntries);
  };

  const addEntry = () => {
    const newEntries = [
      ...entries,
      { key: '', paramValue: { valueType: 'fixed' as const, value: '' } },
    ];
    setEntries(newEntries);
  };

  const removeEntry = (index: number) => {
    if (entries.length === 1) {
      // 如果只剩一个条目，清空它而不是删除
      const newEntries = [{ key: '', paramValue: { valueType: 'fixed' as const, value: '' } }];
      setEntries(newEntries);
      syncToParent(newEntries);
      return;
    }
    const newEntries = entries.filter((_, i) => i !== index);
    setEntries(newEntries);
    syncToParent(newEntries);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        {contentType === 'form-data' 
          ? '编辑表单数据 (multipart/form-data)' 
          : '编辑表单数据 (application/x-www-form-urlencoded)'}
      </div>
      
      {/* 表头 */}
      <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
        <span>字段名</span>
        <span className="w-20 text-center">类型</span>
        <span>值</span>
        <span className="w-8"></span>
      </div>

      {/* 键值对列表 */}
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <div key={index} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
            <Input
              placeholder="字段名"
              value={entry.key}
              onChange={(e) => handleKeyChange(index, e.target.value)}
              className="h-9 text-sm"
            />
            <Select
              value={entry.paramValue.valueType}
              onValueChange={(v) => handleValueTypeChange(index, v as 'fixed' | 'variable')}
            >
              <SelectTrigger className="w-20 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">固定值</SelectItem>
                <SelectItem value="variable">变量</SelectItem>
              </SelectContent>
            </Select>
            
            {entry.paramValue.valueType === 'fixed' ? (
              <Input
                placeholder="值"
                value={entry.paramValue.value?.toString() || ''}
                onChange={(e) => handleValueChange(index, e.target.value)}
                className="h-9 text-sm"
              />
            ) : (
              <div className="relative">
                <Input
                  placeholder="选择变量"
                  value={entry.paramValue.variable || ''}
                  readOnly
                  className="h-9 text-sm pr-8 cursor-pointer bg-muted/50"
                  onClick={() => setShowVarSelector(`${index}`)}
                />
                <Variable 
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
                  onClick={() => setShowVarSelector(`${index}`)}
                />
                {showVarSelector === `${index}` && (
                  <div className="absolute z-50 mt-1 w-full">
                    <VariableSelector
                      nodes={nodes}
                      currentNodeId={currentNodeId}
                      value={entry.paramValue.variable || ''}
                      onChange={(variablePath) => handleVariableSelect(index, variablePath)}
                    />
                  </div>
                )}
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-8"
              onClick={() => removeEntry(index)}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      {/* 添加按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={addEntry}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        添加字段
      </Button>
    </div>
  );
}
