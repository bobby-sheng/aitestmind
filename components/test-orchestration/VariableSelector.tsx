"use client";

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FlowNode, ApiInfo } from '@/types/test-case';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Node } from '@xyflow/react';

interface VariableSelectorProps {
  nodes: Node[];
  currentNodeId: string;
  value?: string;
  onChange: (value: string) => void;
}

export default function VariableSelector({
  nodes,
  currentNodeId,
  value,
  onChange,
}: VariableSelectorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [apiInfoCache, setApiInfoCache] = useState<Record<string, ApiInfo>>({});

  // 获取当前节点之前的所有节点（只有这些节点的变量可用）
  const availableNodes = nodes.filter(
    (node): node is Node => node.id !== currentNodeId && node.type === 'api'
  );

  // 获取 API 信息
  useEffect(() => {
    const fetchApiInfos = async () => {
      const newCache: Record<string, ApiInfo> = {};
      
      for (const node of availableNodes) {
        const nodeData = node.data as any;
        if (nodeData.apiId && !apiInfoCache[nodeData.apiId]) {
          try {
            const response = await fetch(`/api/api-library/apis/${nodeData.apiId}`);
            const result = await response.json();
            if (result.success) {
              const apiData = result.data;
              
              // 解析 JSON 字符串字段
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

              newCache[nodeData.apiId] = {
                ...apiData,
                responseBody: parseJsonField(apiData.responseBody),
              };
            }
          } catch (error) {
            console.error('Error fetching API info:', error);
          }
        }
      }
      
      if (Object.keys(newCache).length > 0) {
        setApiInfoCache(prev => ({ ...prev, ...newCache }));
      }
    };

    fetchApiInfos();
  }, [availableNodes]);

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const buildVariablePath = (nodeId: string, category: string, path: string) => {
    return `${nodeId}.${category}.${path}`;
  };

  const handleSelect = (varPath: string) => {
    onChange(varPath);
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
          // 使用 [0] 表示数组元素
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

  return (
    <div className="border rounded-md p-3 space-y-2 max-h-60 overflow-y-auto">
      {availableNodes.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          暂无可用变量
        </div>
      ) : (
        availableNodes.map((node) => {
          const isExpanded = expandedNodes.has(node.id);
          const nodeData = node.data as any;

          return (
            <div key={node.id} className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-auto py-2"
                onClick={() => toggleNode(node.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-1" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1" />
                )}
                <span className="font-medium">{node.id}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {nodeData.method} {nodeData.url}
                </span>
              </Button>

              {isExpanded && (
                <div className="ml-6 space-y-1">
                  {/* 请求参数 */}
                  <div className="text-xs font-semibold text-muted-foreground mt-2">
                    📥 请求参数
                  </div>
                  <div className="ml-2 space-y-0.5">
                    {nodeData.requestConfig?.pathParams &&
                      Object.keys(nodeData.requestConfig.pathParams).map(
                        (key) => (
                          <Button
                            key={`path-${key}`}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-7 text-xs"
                            onClick={() =>
                              handleSelect(
                                buildVariablePath(
                                  node.id,
                                  'request.pathParams',
                                  key
                                )
                              )
                            }
                          >
                            <code className="text-xs">
                              pathParams.{key}
                            </code>
                          </Button>
                        )
                      )}
                    {nodeData.requestConfig?.queryParams &&
                      Object.keys(nodeData.requestConfig.queryParams).map(
                        (key) => (
                          <Button
                            key={`query-${key}`}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-7 text-xs"
                            onClick={() =>
                              handleSelect(
                                buildVariablePath(
                                  node.id,
                                  'request.queryParams',
                                  key
                                )
                              )
                            }
                          >
                            <code className="text-xs">
                              queryParams.{key}
                            </code>
                          </Button>
                        )
                      )}
                    {nodeData.requestConfig?.body &&
                      Object.keys(nodeData.requestConfig.body).map(
                        (key) => (
                          <Button
                            key={`body-${key}`}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-7 text-xs"
                            onClick={() =>
                              handleSelect(
                                buildVariablePath(
                                  node.id,
                                  'request.body',
                                  key
                                )
                              )
                            }
                          >
                            <code className="text-xs">
                              body.{key}
                            </code>
                          </Button>
                        )
                      )}
                  </div>

                  {/* 响应参数 */}
                  <div className="text-xs font-semibold text-muted-foreground mt-2">
                    📤 响应参数
                  </div>
                  <div className="ml-2 space-y-0.5">
                    {/* 从 API 库中获取的响应字段 */}
                    {(() => {
                      const apiInfo = apiInfoCache[nodeData.apiId];
                      if (apiInfo?.responseBody) {
                        const fields = parseResponseFields(apiInfo.responseBody);
                        return fields.map((fieldPath) => (
                          <Button
                            key={`response-${fieldPath}`}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-7 text-xs"
                            onClick={() =>
                              handleSelect(
                                buildVariablePath(
                                  node.id,
                                  'response',
                                  fieldPath
                                )
                              )
                            }
                          >
                            <code className="text-xs">
                              response.{fieldPath}
                            </code>
                          </Button>
                        ));
                      }
                      return null;
                    })()}
                    
                    {/* 始终显示 HTTP 状态码 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-7 text-xs border-t mt-1 pt-1"
                      onClick={() =>
                        handleSelect(
                          buildVariablePath(node.id, 'response', 'status')
                        )
                      }
                    >
                      <code className="text-xs text-muted-foreground">response.status (HTTP)</code>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {value && (
        <div className="mt-2 p-2 bg-muted rounded text-xs">
          <span className="text-muted-foreground">已选择：</span>
          <code className="ml-1 font-mono">{value}</code>
        </div>
      )}
    </div>
  );
}

