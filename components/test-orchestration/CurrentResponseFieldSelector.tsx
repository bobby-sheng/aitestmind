"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { ApiInfo } from '@/types/test-case';

interface CurrentResponseFieldSelectorProps {
  apiId: string;
  value?: string;
  onChange: (value: string) => void;
}

/**
 * 当前响应字段选择器
 * 专门用于API节点内的断言，只显示当前API的响应字段
 * 返回简单的字段路径，如 "message"、"data.token"，不包含 step_xxx.response 前缀
 */
export default function CurrentResponseFieldSelector({
  apiId,
  value,
  onChange,
}: CurrentResponseFieldSelectorProps) {
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['response']));

  // 获取API信息
  useEffect(() => {
    if (!apiId) return;

    const fetchApiInfo = async () => {
      try {
        const response = await fetch(`/api/api-library/apis/${apiId}`);
        const result = await response.json();
        if (result.success) {
          const apiData = result.data;
          
          // 解析JSON字段
          const parseJsonField = (field: any) => {
            if (!field) return null;
            if (typeof field === 'string') {
              try {
                return JSON.parse(field);
              } catch {
                return null;
              }
            }
            return field;
          };

          setApiInfo({
            ...apiData,
            responseBody: parseJsonField(apiData.responseBody),
          });
        }
      } catch (error) {
        console.error('Error fetching API info:', error);
      }
    };

    fetchApiInfo();
  }, [apiId]);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // 递归解析响应体结构，生成所有可用的路径
  const parseResponseFields = (obj: any, prefix: string = ''): string[] => {
    if (!obj || typeof obj !== 'object') return [];
    
    const fields: string[] = [];
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const currentPath = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        // 添加当前字段路径
        fields.push(currentPath);
        
        // 如果是数组，解析数组第一个元素的结构
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          const arrayItemPath = `${currentPath}[0]`;
          const arrayFields = parseResponseFields(value[0], arrayItemPath);
          fields.push(...arrayFields);
        }
        // 如果是对象（非数组），递归处理
        else if (value && typeof value === 'object' && !Array.isArray(value)) {
          const nestedFields = parseResponseFields(value, currentPath);
          fields.push(...nestedFields);
        }
      }
    }
    
    return fields;
  };

  const handleFieldSelect = (fieldPath: string) => {
    onChange(fieldPath);
  };

  return (
    <div className="border rounded-md p-3 space-y-2 max-h-60 overflow-y-auto bg-muted/30">
      {!apiInfo ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          加载中...
        </div>
      ) : (
        <div className="space-y-1">
          {/* HTTP 状态码 */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-muted-foreground px-2 py-1">
              🔢 HTTP 状态
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-7 text-xs"
              onClick={() => handleFieldSelect('status')}
            >
              <code className="text-xs">status</code>
              <span className="ml-2 text-muted-foreground">(HTTP状态码)</span>
            </Button>
          </div>

          {/* 响应体字段 */}
          {apiInfo.responseBody && (
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-auto py-2 font-semibold"
                onClick={() => toggleSection('response')}
              >
                {expandedSections.has('response') ? (
                  <ChevronDown className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" />
                )}
                <span className="text-xs">📤 响应字段</span>
              </Button>

              {expandedSections.has('response') && (
                <div className="ml-4 space-y-0.5">
                  {parseResponseFields(apiInfo.responseBody).map((fieldPath) => (
                    <Button
                      key={fieldPath}
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start h-7 text-xs ${
                        value === fieldPath ? 'bg-primary/10 text-primary' : ''
                      }`}
                      onClick={() => handleFieldSelect(fieldPath)}
                    >
                      <code className="text-xs">{fieldPath}</code>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!apiInfo.responseBody && (
            <div className="text-sm text-muted-foreground text-center py-4">
              暂无响应字段信息
            </div>
          )}
        </div>
      )}

      {value && (
        <div className="mt-2 p-2 bg-primary/5 rounded text-xs border border-primary/20">
          <span className="text-muted-foreground">已选择：</span>
          <code className="ml-1 font-mono text-primary">{value}</code>
        </div>
      )}

      <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
        💡 <strong>提示：</strong>这里只显示当前API的响应字段，用于断言当前节点的返回值
      </div>
    </div>
  );
}
















