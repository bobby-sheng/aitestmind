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
                requestQuery: parseJsonField(apiData.requestQuery),
                requestBody: parseJsonField(apiData.requestBody),
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
    <div className="border border-[#e5e7eb] dark:border-[#4b5563] rounded-md p-3 space-y-2 max-h-60 overflow-y-auto bg-background">
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
                className="w-full justify-start h-auto py-2 hover:bg-muted/50"
                onClick={() => toggleNode(node.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 mr-1 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0" />
                )}
                <span className="font-medium text-sm">{node.id}</span>
                <span className="ml-2 text-xs text-muted-foreground truncate">
                  {nodeData.method} {nodeData.url}
                </span>
              </Button>

              {isExpanded && (() => {
                const apiInfo = apiInfoCache[nodeData.apiId];

                // 请求参数键：优先使用已配置的，兜底从API定义获取
                const pathParamKeys = (() => {
                  const configured = nodeData.requestConfig?.pathParams;
                  if (configured && Object.keys(configured).length > 0) return Object.keys(configured);
                  if (!apiInfo?.path) return [];
                  const matches = apiInfo.path.match(/\{(\w+)\}/g);
                  return matches ? matches.map((m: string) => m.slice(1, -1)) : [];
                })();
                const queryParamKeys = (() => {
                  const configured = nodeData.requestConfig?.queryParams;
                  if (configured && Object.keys(configured).length > 0) return Object.keys(configured);
                  return Object.keys(apiInfo?.requestQuery || {});
                })();
                const bodyKeys = (() => {
                  const configured = nodeData.requestConfig?.body;
                  if (configured && Object.keys(configured).length > 0) return Object.keys(configured);
                  return Object.keys(apiInfo?.requestBody || {});
                })();
                const hasRequestParams = pathParamKeys.length > 0 || queryParamKeys.length > 0 || bodyKeys.length > 0;

                return (
                <div className="ml-6 space-y-1">
                  {/* 请求参数 */}
                  {hasRequestParams && (
                    <>
                      <div className="text-xs font-semibold text-muted-foreground mt-2 mb-1 px-1">
                        📥 请求参数
                      </div>
                      <div className="ml-2 space-y-0.5">
                        {pathParamKeys.map((key) => (
                          <Button
                            key={`path-${key}`}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 text-xs hover:bg-muted/50 px-2"
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
                            <code className="text-xs font-mono text-foreground break-all text-left">
                              pathParams.{key}
                            </code>
                          </Button>
                        ))}
                        {queryParamKeys.map((key) => (
                          <Button
                            key={`query-${key}`}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 text-xs hover:bg-muted/50 px-2"
                            onClick={() =>
                              handleSelect(
                                buildVariablePath(
                                  node.id,
                                  'request.params',
                                  key
                                )
                              )
                            }
                          >
                            <code className="text-xs font-mono text-foreground break-all text-left">
                              queryParams.{key}
                            </code>
                          </Button>
                        ))}
                        {bodyKeys.map((key) => (
                          <Button
                            key={`body-${key}`}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 text-xs hover:bg-muted/50 px-2"
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
                            <code className="text-xs font-mono text-foreground break-all text-left">
                              body.{key}
                            </code>
                          </Button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* 响应参数 */}
                  <div className="text-xs font-semibold text-muted-foreground mt-3 mb-1 px-1">
                    📤 响应参数
                  </div>
                  <div className="ml-2 space-y-0.5">
                    {/* 从 API 库中获取的响应字段 */}
                    {apiInfo?.responseBody ? (
                      parseResponseFields(apiInfo.responseBody).map((fieldPath) => (
                        <Button
                          key={`response-${fieldPath}`}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start h-8 text-xs hover:bg-muted/50 px-2"
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
                          <code className="text-xs font-mono text-foreground break-all text-left">
                            response.{fieldPath}
                          </code>
                        </Button>
                      ))
                    ) : null}

                    {/* 始终显示 HTTP 状态码 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs border-t border-[#e5e7eb] dark:border-[#4b5563] mt-1 pt-1 hover:bg-muted/50 px-2"
                      onClick={() =>
                        handleSelect(
                          buildVariablePath(node.id, 'response', 'status')
                        )
                      }
                    >
                      <code className="text-xs font-mono text-muted-foreground">response.status (HTTP)</code>
                    </Button>
                  </div>
                </div>
                );
              })()}
            </div>
          );
        })
      )}

      {value && (
        <div className="mt-2 p-2 bg-muted rounded text-xs border border-[#e5e7eb] dark:border-[#4b5563]">
          <span className="text-muted-foreground">已选择：</span>
          <code className="ml-1 font-mono text-foreground break-all">{value}</code>
        </div>
      )}
    </div>
  );
}

