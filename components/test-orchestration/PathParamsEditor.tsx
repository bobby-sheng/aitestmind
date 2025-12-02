"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Edit2, Check, X, Variable, Type } from 'lucide-react';
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

interface PathParamsEditorProps {
  path: string; // 当前路径（可能包含占位符），如 /api/device/ha-group/{ha-groupId}
  originalPath: string; // API原始路径（真实值），如 /api/device/ha-group/a5494b3b-917f-4be0-b599-a99f2332ae87
  values: Record<string, ParamValue>;
  onChange: (values: Record<string, ParamValue>, newPath: string) => void;
  nodes: Node[];
  currentNodeId: string;
}

interface PathSegment {
  value: string; // 当前值（可能是占位符或实际值）
  originalValue: string; // 原始值（用于恢复）
  isParam: boolean;
  paramName?: string;
  index: number;
}

export default function PathParamsEditor({
  path,
  originalPath,
  values,
  onChange,
  nodes,
  currentNodeId,
}: PathParamsEditorProps) {
  const t = useTranslations('testOrchestration');
  const [segments, setSegments] = useState<PathSegment[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [paramName, setParamName] = useState('');
  const [showVarSelector, setShowVarSelector] = useState<string | null>(null);

  // 解析路径为段
  useEffect(() => {
    console.log('PathParamsEditor 接收到的数据:', { path, originalPath, values });
    
    const parts = path.split('/').filter(Boolean);
    const originalParts = originalPath.split('/').filter(Boolean);
    
    const initialSegments: PathSegment[] = parts.map((part, index) => {
      // 检查是否是占位符格式 {paramName}
      const match = part.match(/^\{(\w+)\}$/);
      if (match) {
        const paramName = match[1];
        // 从原始路径中获取对应位置的真实值
        const originalValue = originalParts[index] || part;
        console.log(`参数 ${paramName} 的原始值:`, originalValue);
        return {
          value: part, // 保持占位符显示
          originalValue, // 从原始路径提取的真实值
          isParam: true,
          paramName,
          index,
        };
      }
      
      // 如果不是占位符格式，静态值的原始值就是自己
      return {
        value: part,
        originalValue: part,
        isParam: false,
        paramName: undefined,
        index,
      };
    });
    
    setSegments(initialSegments);
  }, [path, originalPath, values]);

  // 智能建议参数名
  const suggestParamName = (segment: PathSegment, prevSegment?: PathSegment): string => {
    if (prevSegment) {
      // 如果前一段是名词，使用它作为参数名
      const commonNouns = ['user', 'device', 'group', 'order', 'product', 'item', 'api', 'ha-group', 'project'];
      const prev = prevSegment.value.toLowerCase();
      
      for (const noun of commonNouns) {
        if (prev.includes(noun)) {
          // 移除连字符，转为驼峰命名
          const camelNoun = prev.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          return `${camelNoun}Id`;
        }
      }
    }
    
    // 默认使用通用的id命名
    return 'id';
  };

  // 标记为参数
  const markAsParam = (index: number) => {
    const segment = segments[index];
    const prevSegment = index > 0 ? segments[index - 1] : undefined;
    let suggested = suggestParamName(segment, prevSegment);
    
    // 检查参数名是否已存在，如果存在则添加数字后缀
    const existingNames = segments
      .filter(s => s.isParam && s.paramName && s.index !== index)
      .map(s => s.paramName);
    
    if (existingNames.includes(suggested)) {
      let counter = 2;
      while (existingNames.includes(`${suggested}${counter}`)) {
        counter++;
      }
      suggested = `${suggested}${counter}`;
    }
    
    setEditingIndex(index);
    setParamName(suggested);
  };

  // 确认参数
  const confirmParam = (index: number) => {
    if (!paramName.trim()) return;
    
    const newSegments = [...segments];
    const segment = newSegments[index];
    
    newSegments[index] = {
      ...segment,
      isParam: true,
      paramName: paramName.trim(),
      // 保持originalValue不变，这样取消时可以恢复
    };
    setSegments(newSegments);
    setEditingIndex(null);
    setParamName('');
    
    // 更新values和path
    updatePathAndValues(newSegments);
  };

  // 取消参数标记
  const unmarkAsParam = (index: number) => {
    const segment = segments[index];
    
    console.log('取消参数标记:', {
      index,
      paramName: segment.paramName,
      currentValue: segment.value,
      originalValue: segment.originalValue,
    });
    
    const newSegments = [...segments];
    
    // 恢复为原始值
    newSegments[index] = {
      ...segment,
      value: segment.originalValue, // 恢复原始值
      isParam: false,
      paramName: undefined,
    };
    
    console.log('取消后:', newSegments[index]);
    
    setSegments(newSegments);
    
    // 更新values和path
    updatePathAndValues(newSegments);
  };

  // 更新路径和参数值
  const updatePathAndValues = (updatedSegments: PathSegment[]) => {
    // 构建新的路径模板
    const newPath = '/' + updatedSegments.map(seg => 
      seg.isParam && seg.paramName ? `{${seg.paramName}}` : seg.value
    ).join('/');
    
    console.log('更新路径:', {
      segments: updatedSegments.map(s => ({
        value: s.value,
        isParam: s.isParam,
        paramName: s.paramName,
      })),
      newPath,
    });
    
    // 构建参数值对象
    const newValues: Record<string, ParamValue> = {};
    updatedSegments.forEach(seg => {
      if (seg.isParam && seg.paramName) {
        // 使用originalValue作为默认值
        newValues[seg.paramName] = values[seg.paramName] || {
          valueType: 'fixed',
          value: seg.originalValue,
        };
      }
    });
    
    console.log('更新参数值:', newValues);
    
    onChange(newValues, newPath);
  };

  // 更新参数值
  const updateParamValue = (paramName: string, paramValue: ParamValue) => {
    const newValues = {
      ...values,
      [paramName]: paramValue,
    };
    
    // 不改变路径，只更新值
    onChange(newValues, path);
  };

  return (
    <div className="space-y-4">
      {/* 路径预览 */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">{t('pathStructure')}</Label>
        <div className="flex flex-wrap items-center gap-1 p-3 bg-muted rounded-md font-mono text-sm">
          <span className="text-muted-foreground">/</span>
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-1">
              {segment.isParam ? (
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors group"
                  onClick={() => unmarkAsParam(index)}
                  title={t('clickToUnmarkParam')}
                >
                  <Variable className="h-3 w-3 mr-1" />
                  {segment.paramName}
                  <X className="h-3 w-3 ml-1 group-hover:scale-110 transition-transform" />
                </Badge>
              ) : (
                <span 
                  className="px-2 py-0.5 rounded hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors border border-transparent hover:border-primary/20"
                  onClick={() => markAsParam(index)}
                  title={t('clickToMarkAsParam')}
                >
                  {segment.value}
                </span>
              )}
              {index < segments.length - 1 && (
                <span className="text-muted-foreground">/</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <span>💡</span>
          <div>
            <p>{t('pathParamTip1')}</p>
            <p>{t('pathParamTip2')}</p>
            <p>{t('pathParamTip3')}</p>
          </div>
        </div>
      </div>

      {/* 参数名编辑 */}
      {editingIndex !== null && (
        <div className="p-3 border rounded-md bg-background space-y-2">
          <Label className="text-sm">{t('parameterName')}</Label>
          <div className="flex gap-2">
            <Input
              placeholder={t('parameterNamePlaceholder')}
              value={paramName}
              onChange={(e) => setParamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmParam(editingIndex);
                } else if (e.key === 'Escape') {
                  setEditingIndex(null);
                  setParamName('');
                }
              }}
              className="h-8"
              autoFocus
            />
            <Button
              size="sm"
              className="h-8"
              onClick={() => confirmParam(editingIndex)}
              disabled={!paramName.trim()}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                setEditingIndex(null);
                setParamName('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* 参数值配置 */}
      {segments.filter(s => s.isParam && s.paramName).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">{t('parameterValueConfig')}</Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                console.log('全部取消参数标记');
                // 取消所有参数标记，恢复原始值
                const newSegments = segments.map(seg => {
                  if (seg.isParam) {
                    console.log(`取消参数: ${seg.paramName} -> 恢复为: ${seg.originalValue}`);
                  }
                  return {
                    ...seg,
                    value: seg.originalValue, // 恢复原始值
                    isParam: false,
                    paramName: undefined,
                  };
                });
                setSegments(newSegments);
                updatePathAndValues(newSegments);
              }}
            >
              <X className="h-3 w-3 mr-1" />
              {t('cancelAll')}
            </Button>
          </div>
          <div className="space-y-2">
            {segments
              .filter(s => s.isParam && s.paramName)
              .map((segment) => {
                const currentValue = values[segment.paramName!] || { 
                  valueType: 'fixed', 
                  value: segment.originalValue // 使用原始值作为默认
                };
                
                return (
                  <div
                    key={`${segment.index}-${segment.paramName}`}
                    className="grid grid-cols-12 gap-2 items-start p-2 rounded border bg-background"
                  >
                    {/* 参数名 */}
                    <div className="col-span-3 flex items-center h-8">
                      <span className="text-sm font-medium truncate" title={segment.paramName}>
                        {segment.paramName}
                      </span>
                    </div>

                    {/* 类型选择 */}
                    <div className="col-span-3">
                      <Select
                        value={currentValue.valueType}
                        onValueChange={(value: 'fixed' | 'variable') =>
                          updateParamValue(segment.paramName!, {
                            ...currentValue,
                            valueType: value,
                          })
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
                      {currentValue.valueType === 'fixed' ? (
                        <Input
                          placeholder={`${t('valueInputPlaceholder')} ${segment.paramName}`}
                          value={currentValue.value?.toString() || ''}
                          onChange={(e) =>
                            updateParamValue(segment.paramName!, {
                              ...currentValue,
                              value: e.target.value,
                            })
                          }
                          className="h-8 text-sm"
                        />
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-start h-8 text-xs"
                            onClick={() =>
                              setShowVarSelector(
                                showVarSelector === segment.paramName ? null : (segment.paramName || null)
                              )
                            }
                          >
                            <Variable className="h-3 w-3 mr-1.5" />
                            {currentValue.variable ? (
                              <code className="text-xs truncate">{currentValue.variable}</code>
                            ) : (
                              t('selectVariable')
                            )}
                          </Button>

                          {showVarSelector === segment.paramName && (
                            <div className="absolute z-10 top-full left-0 right-0 mt-1">
                              <VariableSelector
                                nodes={nodes}
                                currentNodeId={currentNodeId}
                                value={currentValue.variable}
                                onChange={(varPath) => {
                                  updateParamValue(segment.paramName!, {
                                    ...currentValue,
                                    variable: varPath,
                                  });
                                  setShowVarSelector(null);
                                }}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* 取消按钮 */}
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => unmarkAsParam(segment.index)}
                        title="取消参数标记"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

