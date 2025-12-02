"use client";

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  RuntimeFunction, 
  getFunctionsByCategory, 
  searchFunctions,
  FunctionParameter
} from '@/lib/plugins/runtime-functions';
import { Search, FunctionSquare, ChevronRight } from 'lucide-react';

interface FunctionSelectorProps {
  onSelect: (functionSyntax: string) => void;
}

export default function FunctionSelector({ onSelect }: FunctionSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFunction, setSelectedFunction] = useState<RuntimeFunction | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, any>>({});

  // 获取分类函数或搜索结果
  const functionsToShow = useMemo(() => {
    if (searchQuery.trim()) {
      return { 搜索结果: searchFunctions(searchQuery) };
    }
    return getFunctionsByCategory();
  }, [searchQuery]);

  const handleSelectFunction = (func: RuntimeFunction) => {
    setSelectedFunction(func);
    // 初始化参数默认值
    const defaults: Record<string, any> = {};
    func.parameters.forEach(param => {
      if (param.default !== undefined) {
        defaults[param.name] = param.default;
      }
    });
    setParamValues(defaults);
  };

  const handleInsertFunction = () => {
    if (!selectedFunction) return;

    let syntax = selectedFunction.id;

    // 构建参数列表
    if (selectedFunction.parameters.length > 0) {
      const params = selectedFunction.parameters.map(param => {
        const value = paramValues[param.name];
        if (value === undefined || value === '') {
          // 使用默认值或空
          return param.default !== undefined ? formatParamValue(param.default, param.type) : '';
        }
        return formatParamValue(value, param.type);
      }).filter(Boolean); // 移除空参数

      syntax = `${syntax}(${params.join(', ')})`;
    } else {
      syntax = `${syntax}()`;
    }

    // 完整语法：${{函数调用}}
    const fullSyntax = `\${{${syntax}}}`;
    onSelect(fullSyntax);
    
    // 重置状态
    setSelectedFunction(null);
    setParamValues({});
  };

  const formatParamValue = (value: any, type: string): string => {
    if (type === 'string') {
      return `"${value}"`;
    }
    return String(value);
  };

  const getParamInputType = (type: string): string => {
    switch (type) {
      case 'number':
        return 'number';
      case 'boolean':
        return 'checkbox';
      default:
        return 'text';
    }
  };

  return (
    <div className="grid grid-cols-2 gap-4 h-[400px]">
      {/* 左侧：函数列表 */}
      <div className="space-y-3 border-r pr-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索函数..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="h-[340px]">
          <div className="space-y-4">
            {Object.entries(functionsToShow).map(([category, functions]) => (
              <div key={category} className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground px-2">
                  {category}
                </div>
                <div className="space-y-1">
                  {functions.map((func) => (
                    <button
                      key={func.id}
                      onClick={() => handleSelectFunction(func)}
                      className={`
                        w-full text-left px-3 py-2 rounded-md text-sm
                        hover:bg-accent hover:text-accent-foreground
                        transition-colors
                        ${selectedFunction?.id === func.id ? 'bg-accent text-accent-foreground' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FunctionSquare className="h-4 w-4 text-primary" />
                          <span className="font-medium">{func.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 ml-6">
                        {func.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* 右侧：函数详情和参数配置 */}
      <div className="space-y-4">
        {selectedFunction ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FunctionSquare className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">{selectedFunction.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedFunction.description}
              </p>
              <Badge variant="outline" className="text-xs">
                {selectedFunction.category}
              </Badge>
            </div>

            {/* 参数配置 */}
            {selectedFunction.parameters.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">参数配置</Label>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3 pr-3">
                    {selectedFunction.parameters.map((param) => (
                      <div key={param.name} className="space-y-1.5">
                        <Label htmlFor={param.name} className="text-xs">
                          {param.name}
                          {param.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        <Input
                          id={param.name}
                          type={getParamInputType(param.type)}
                          value={paramValues[param.name] ?? param.default ?? ''}
                          onChange={(e) => {
                            const value = param.type === 'number' 
                              ? Number(e.target.value) 
                              : e.target.value;
                            setParamValues({
                              ...paramValues,
                              [param.name]: value,
                            });
                          }}
                          placeholder={param.default !== undefined ? String(param.default) : ''}
                          className="h-8 text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          {param.description}
                          {param.default !== undefined && ` (默认: ${param.default})`}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* 示例 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">示例</Label>
              <div className="bg-muted p-3 rounded-md">
                <code className="text-xs font-mono">{selectedFunction.example}</code>
              </div>
            </div>

            {/* 插入按钮 */}
            <Button
              onClick={handleInsertFunction}
              className="w-full"
              size="sm"
            >
              插入函数
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            ← 从左侧选择一个函数
          </div>
        )}
      </div>
    </div>
  );
}

