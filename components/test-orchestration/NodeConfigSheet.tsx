"use client";

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FlowNode, ApiNodeData, ParallelNodeData, ApiInfo, ParamValue, PathParams } from '@/types/test-case';
import { parsePathParams, buildActualUrl, buildFullUrl } from '@/lib/utils/url-parser';
import JsonEditorWithVariables from './JsonEditorWithVariables';
import AssertionConfig from './AssertionConfig';
import WaitConfig from './WaitConfig';
import ParallelConfig from './ParallelConfig';
import VariableSelector from './VariableSelector';
import HeadersEditor from './HeadersEditor';
import PathParamsEditor from './PathParamsEditor';
import QueryParamsEditor from './QueryParamsEditor';
import { Save, Variable, Type, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Node } from '@xyflow/react';
import { useTranslations } from 'next-intl';

interface NodeConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: FlowNode | null;
  nodes: Node[];
  onSave: (nodeId: string, data: any) => void;
}

export default function NodeConfigSheet({
  open,
  onOpenChange,
  node,
  nodes,
  onSave,
}: NodeConfigSheetProps) {
  const t = useTranslations('nodeConfig');
  const tCommon = useTranslations('common');
  const [nodeData, setNodeData] = useState<any>(null);
  const [apiInfo, setApiInfo] = useState<ApiInfo | null>(null);
  const [pathParams, setPathParams] = useState<PathParams>({});
  const [queryParams, setQueryParams] = useState<Record<string, ParamValue>>({});
  const [headers, setHeaders] = useState<Record<string, ParamValue>>({});
  const [body, setBody] = useState<Record<string, any>>({});
  const [bodyJsonText, setBodyJsonText] = useState<string>('{}'); // JSON 文本
  const [showVarSelector, setShowVarSelector] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('');

  useEffect(() => {
    if (!node || !open) return;
    
    if (node.type === 'api') {
      const data = node.data as ApiNodeData;
      console.log('🔍 打开API节点配置:', {
        nodeId: node.id,
        apiId: data.apiId,
        wait: data.wait,
        assertions: data.assertions,
        assertionFailureStrategy: data.assertionFailureStrategy,
      });
      setNodeData(data);

      // 先加载已保存的配置
      const savedPathParams = data.requestConfig?.pathParams || {};
      const savedQueryParams = data.requestConfig?.queryParams || {};
      const savedHeaders = data.requestConfig?.headers || {};
      const savedBody = data.requestConfig?.body || {};
      
      setPathParams(savedPathParams);
      setQueryParams(savedQueryParams);
      setHeaders(savedHeaders);
      setBody(savedBody);

      // 初始化 bodyJsonText
      // 递归转换嵌套的 ParamValue 结构为 JSON 显示格式
      const convertBodyToJson = (bodyData: any): string => {
        try {
          const convertValue = (value: any): any => {
            // 处理数组
            if (Array.isArray(value)) {
              return value.map((item) => convertValue(item));
            }
            
            // 处理 ParamValue 格式
            if (value && typeof value === 'object' && 'valueType' in value) {
              const paramValue = value as ParamValue;
              if (paramValue.valueType === 'variable') {
                return `\${${paramValue.variable || paramValue.value}}`;
              } else {
                // 对于 fixed 类型，递归处理其值（因为 value 可能是对象或数组）
                return convertValue(paramValue.value);
              }
            }
            
            // 处理普通对象（递归处理）
            if (value && typeof value === 'object') {
              const result: any = {};
              Object.entries(value).forEach(([k, v]) => {
                result[k] = convertValue(v);
              });
              return result;
            }
            
            // 基本类型直接返回
            return value;
          };
          
          const jsonObj = convertValue(bodyData);
          return JSON.stringify(jsonObj, null, 2);
        } catch (e) {
          console.error('[convertBodyToJson] 转换失败:', e);
          return '{}';
        }
      };
      setBodyJsonText(convertBodyToJson(savedBody));

      // 加载API详情
      if (data.apiId) {
        fetchApiInfo(data.apiId, data, savedPathParams, savedQueryParams, savedHeaders, savedBody);
      }
    } else if (node.type === 'wait' || node.type === 'assertion' || node.type === 'parallel') {
      // 等待、断言和并发节点也支持配置
      setNodeData(node.data as any);
    }
  }, [node, open]);

  // 从 URL 中解析查询参数
  const parseUrlQueryParams = (url: string): Record<string, string> => {
    const queryParams: Record<string, string> = {};
    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const queryString = url.substring(queryIndex + 1);
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        queryParams[key] = value;
      });
    }
    return queryParams;
  };

  // 从 URL 中移除查询参数，只保留路径部分
  const getPathWithoutQuery = (url: string): string => {
    const queryIndex = url.indexOf('?');
    return queryIndex !== -1 ? url.substring(0, queryIndex) : url;
  };

  const fetchApiInfo = async (
    apiId: string, 
    nodeData: ApiNodeData,
    savedPathParams: PathParams,
    savedQueryParams: Record<string, ParamValue>,
    savedHeaders: Record<string, ParamValue>,
    savedBody: any
  ) => {
    try {
      console.log('🔄 开始获取API信息:', {
  
        nodeDataWait: nodeData.wait,
        nodeDataAssertions: nodeData.assertions,
      });
      const response = await fetch(`/api/api-library/apis/${apiId}`);
      const result = await response.json();
      if (result.success) {
        const apiData = result.data;
        
        // 解析JSON字符串为对象
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

        // 处理所有JSON字段
        const processedApiInfo = {
          ...apiData,
          requestHeaders: parseJsonField(apiData.requestHeaders),
          requestQuery: parseJsonField(apiData.requestQuery),
          requestBody: parseJsonField(apiData.requestBody),
          responseBody: parseJsonField(apiData.responseBody),
        };

        setApiInfo(processedApiInfo);
        
        // 从 URL 中解析查询参数
        const urlQueryParams = parseUrlQueryParams(apiData.path);
        console.log('从 URL 解析出的查询参数:', urlQueryParams);
        
        // 移除查询参数，只保留路径部分
        const cleanPath = getPathWithoutQuery(apiData.path);
        
        // 优先使用已保存的配置路径（可能包含占位符），否则使用清理后的路径
        const savedUrl = nodeData.url || '';
        const pathToUse = savedUrl.includes('{') ? savedUrl : cleanPath;
        console.log('初始化路径:', { savedUrl, apiPath: apiData.path, cleanPath, pathToUse });
        setCurrentPath(pathToUse);
        
        // 初始化路径参数（只在savedPathParams为空时初始化）
        if (Object.keys(savedPathParams).length === 0) {
          const pathParamNames = parsePathParams(pathToUse);
          const initialPathParams: PathParams = {};
          pathParamNames.forEach((paramName) => {
            initialPathParams[paramName] = {
              valueType: 'fixed',
              value: '',
            };
          });
          if (Object.keys(initialPathParams).length > 0) {
            setPathParams(initialPathParams);
          }
        }

        // 自动填充Query参数（如果已保存的配置为空）
        if (Object.keys(savedQueryParams).length === 0) {
          const initialQueryParams: Record<string, ParamValue> = {};
          
          // 1. 首先从 URL 中解析的查询参数填充
          Object.entries(urlQueryParams).forEach(([key, value]) => {
            initialQueryParams[key] = {
              valueType: 'fixed',
              value: value,
            };
          });
          
          // 2. 然后从 requestQuery 填充（如果存在且 URL 中没有）
          if (processedApiInfo.requestQuery) {
            Object.entries(processedApiInfo.requestQuery).forEach(([key, value]) => {
              if (!initialQueryParams[key]) {
                initialQueryParams[key] = {
                  valueType: 'fixed',
                  value: value as string | number | boolean,
                };
              }
            });
          }
          
          console.log('初始化查询参数:', initialQueryParams);
          setQueryParams(initialQueryParams);
        }

        // 自动填充请求体（如果已保存的配置为空）
        if (processedApiInfo.requestBody && Object.keys(savedBody).length === 0) {
          const initialBody: Record<string, ParamValue> = {};
          
          // 递归填充嵌套对象
          const fillBodyRecursive = (obj: any, prefix: string = '') => {
            // 🔧 处理空对象：保留空对象结构
            if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && Object.keys(obj).length === 0) {
              initialBody[prefix || 'root'] = {
                valueType: 'fixed',
                value: {} as object,
              };
              return;
            }
            
            // 🔧 处理空数组：保留空数组结构
            if (Array.isArray(obj) && obj.length === 0) {
              initialBody[prefix || 'root'] = {
                valueType: 'fixed',
                value: [] as any[],
              };
              return;
            }
            
            Object.entries(obj).forEach(([key, value]) => {
              const fullKey = prefix ? `${prefix}.${key}` : key;
              
              // 如果是简单类型，直接填充
              if (typeof value !== 'object' || value === null) {
                initialBody[fullKey] = {
                  valueType: 'fixed',
                  value: value as string | number | boolean,
                };
              }
              // 如果是对象（非数组），递归处理
              else if (!Array.isArray(value)) {
                // 🔧 空对象特殊处理
                if (Object.keys(value).length === 0) {
                  initialBody[fullKey] = {
                    valueType: 'fixed',
                    value: {} as object,
                  };
                } else {
                  fillBodyRecursive(value, fullKey);
                }
              }
              // 数组类型处理
              else {
                // 🔧 空数组特殊处理
                if ((value as any[]).length === 0) {
                  initialBody[fullKey] = {
                    valueType: 'fixed',
                    value: [] as any[],
                  };
                } else {
                  initialBody[fullKey] = {
                    valueType: 'fixed',
                    value: JSON.stringify(value),
                  };
                }
              }
            });
          };
          
          fillBodyRecursive(processedApiInfo.requestBody);
          setBody(initialBody);
          
          // 同时初始化 JSON 文本
          const convertBodyToJson = (bodyData: Record<string, any>) => {
            try {
              const convertValue = (value: any): any => {
                // 处理数组
                if (Array.isArray(value)) {
                  return value.map((item) => convertValue(item));
                }
                
                // 处理 ParamValue 格式
                if (value && typeof value === 'object' && 'valueType' in value) {
                  const paramValue = value as ParamValue;
                  if (paramValue.valueType === 'variable') {
                    return `\${${paramValue.variable || paramValue.value}}`;
                  } else {
                    // 对于 fixed 类型，递归处理其值
                    return convertValue(paramValue.value);
                  }
                }
                
                // 处理普通对象（递归处理）
                if (value && typeof value === 'object') {
                  const result: any = {};
                  Object.entries(value).forEach(([k, v]) => {
                    result[k] = convertValue(v);
                  });
                  return result;
                }
                
                // 基本类型直接返回
                return value;
              };
              
              const jsonObj = convertValue(bodyData);
              return JSON.stringify(jsonObj, null, 2);
            } catch (e) {
              console.error('[convertBodyToJson] 转换失败:', e);
              return '{}';
            }
          };
          setBodyJsonText(convertBodyToJson(initialBody));
        }

        // 自动填充请求头（如果已保存的配置为空）
        if (processedApiInfo.requestHeaders && Object.keys(savedHeaders).length === 0) {
          const initialHeaders: Record<string, ParamValue> = {};
          Object.entries(processedApiInfo.requestHeaders).forEach(([key, value]) => {
            // 过滤掉一些不需要的自动生成的请求头
            const skipHeaders = ['host', 'connection', 'content-length', 'accept-encoding'];
            if (!skipHeaders.includes(key.toLowerCase())) {
              initialHeaders[key] = {
                valueType: 'fixed',
                value: value as string | number | boolean,
              };
            }
          });
          setHeaders(initialHeaders);
        }
        
        console.log('✅ API信息获取完成，nodeData未被修改');
      }
    } catch (error) {
      console.error('❌ Error fetching API info:', error);
    }
  };

  const handleSave = () => {
    if (!node || !nodeData) return;

    let updatedData: any;

    // 根据节点类型处理保存逻辑
    if (node.type === 'api') {
      const finalUrl = currentPath.includes('{') ? currentPath : (nodeData as ApiNodeData).url;
      
      // 🔧 第1步：将扁平化的 body 重建为嵌套结构
      console.log('[Body处理] 第1步 - 扁平化body:', body);
      const nestedBody = reconstructNestedBody(body);
      console.log('[Body处理] 第2步 - 重建嵌套结构:', nestedBody);
      
      // 🔧 第2步：规范化 body 中的值
      const normalizedBody = normalizeBodyValues(nestedBody);
      console.log('[Body处理] 第3步 - 规范化后:', normalizedBody);
      
      updatedData = {
        ...nodeData,
        url: finalUrl,
        requestConfig: {
          pathParams,
          queryParams,
          headers,
          body: normalizedBody,
        },
      };
      console.log('💾 保存API节点配置:', {
        nodeId: node.id,
        currentPath,
        savedUrl: finalUrl,
        pathParams,
        normalizedBody,
        wait: updatedData.wait,
        assertions: updatedData.assertions,
        assertionFailureStrategy: updatedData.assertionFailureStrategy,
        isCleanup: updatedData.isCleanup, // 添加日志输出
      });
      console.log('📝 完整的 updatedData:', updatedData);
    } else {
      // 对于等待节点、断言节点和并发节点，直接保存 nodeData
      updatedData = nodeData;
      console.log('💾 保存节点配置:', {
        nodeId: node.id,
        nodeType: node.type,
        data: updatedData,
      });
    }

    onSave(node.id, updatedData);
    onOpenChange(false);
  };

  // 规范化 body 值的辅助函数
  // 将扁平化路径（如 "filters.0.value"）重建为嵌套 JSON 结构
  const reconstructNestedBody = (flatBody: Record<string, any>): any => {
    // 如果 body 为空，返回空对象
    if (!flatBody || Object.keys(flatBody).length === 0) {
      return {};
    }
    
    // 特殊处理：如果只有 "root" 键，说明顶层是非对象值
    if (Object.keys(flatBody).length === 1 && 'root' in flatBody) {
      return flatBody['root'];
    }
    
    const result: any = {};
    
    // 按路径长度排序，确保父路径先于子路径处理
    const sortedEntries = Object.entries(flatBody).sort(([a], [b]) => {
      return a.split('.').length - b.split('.').length;
    });
    
    sortedEntries.forEach(([path, value]) => {
      const keys = path.split('.');
      let current: any = result;
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const isLast = i === keys.length - 1;
        
        // 检查key是否是数字（数组索引）
        const isArrayIndex = /^\d+$/.test(key);
        
        if (isLast) {
          // 最后一个key，直接赋值
          if (isArrayIndex) {
            const index = parseInt(key, 10);
            // current 应该是数组
            if (!Array.isArray(current)) {
              console.error('Expected array but got:', typeof current, current);
            }
            // 确保数组有足够的长度
            while (current.length <= index) {
              current.push(undefined);
            }
            current[index] = value;
          } else {
            current[key] = value;
          }
        } else {
          // 不是最后一个key，需要继续深入
          const nextKey = keys[i + 1];
          const isNextArrayIndex = /^\d+$/.test(nextKey);
          
          if (isArrayIndex) {
            // 当前key是数组索引
            const index = parseInt(key, 10);
            
            // 确保 current 是数组
            if (!Array.isArray(current)) {
              console.error('Expected array but got:', typeof current);
            }
            
            // 确保数组有足够的长度
            while (current.length <= index) {
              current.push(undefined);
            }
            
            // 如果该位置没有值，初始化
            if (current[index] === undefined) {
              current[index] = isNextArrayIndex ? [] : {};
            }
            
            current = current[index];
          } else {
            // 当前key是对象键
            if (!(key in current)) {
              current[key] = isNextArrayIndex ? [] : {};
            }
            
            current = current[key];
          }
        }
      }
    });
    
    return result;
  };

  // 保持原始 API 的数据类型，不强制序列化（递归处理嵌套结构）
  const normalizeBodyValues = (body: any): any => {
    // 处理数组
    if (Array.isArray(body)) {
      return body.map((item) => normalizeBodyValues(item));
    }
    
    // 处理对象
    if (body && typeof body === 'object') {
      // 如果已经是 ParamValue 格式，直接返回
      if ('valueType' in body && 'value' in body) {
        return body;
      }
      
      // 否则，递归处理对象的每个属性
      const normalized: Record<string, any> = {};
      Object.entries(body).forEach(([key, value]) => {
        normalized[key] = normalizeBodyValues(value);
      });
      return normalized;
    }
    
    // 基本类型（string/number/boolean/null）
    return {
      valueType: 'fixed',
      value: body,
    };
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-500',
      POST: 'bg-green-500',
      PUT: 'bg-yellow-500',
      DELETE: 'bg-red-500',
      PATCH: 'bg-purple-500',
    };
    return colors[method] || 'bg-gray-500';
  };

  // 构建预览URL
  const buildPreviewUrl = () => {
    if (!apiInfo) return '';

    // 解析路径参数值
    const pathParamValues: Record<string, string> = {};
    Object.entries(pathParams).forEach(([key, paramValue]) => {
      if (paramValue.valueType === 'fixed' && paramValue.value) {
        pathParamValues[key] = paramValue.value.toString();
      } else if (paramValue.valueType === 'variable' && paramValue.variable) {
        pathParamValues[key] = `{${paramValue.variable}}`;
      }
    });

    // 使用 currentPath（不含查询参数）而不是 apiInfo.path
    const urlWithPathParams = buildActualUrl(currentPath, pathParamValues);

    // 解析查询参数
    const queryParamValues: Record<string, string> = {};
    Object.entries(queryParams).forEach(([key, paramValue]) => {
      if (paramValue.valueType === 'fixed' && paramValue.value) {
        queryParamValues[key] = paramValue.value.toString();
      } else if (paramValue.valueType === 'variable' && paramValue.variable) {
        queryParamValues[key] = `{${paramValue.variable}}`;
      }
    });

    return buildFullUrl(urlWithPathParams, queryParamValues);
  };

  if (!node || !nodeData) return null;

  const getSheetTitle = () => {
    if (node?.type === 'api') return t('apiNodeTitle');
    if (node?.type === 'parallel') return t('parallelNodeTitle');
    if (node?.type === 'wait') return t('waitNodeTitle');
    if (node?.type === 'assertion') return t('assertionNodeTitle');
    return t('nodeConfigTitle');
  };

  const getSheetDescription = () => {
    if (node?.type === 'api') return t('apiNodeDescription');
    if (node?.type === 'parallel') return t('parallelNodeDescription');
    if (node?.type === 'wait') return t('waitNodeDescription');
    if (node?.type === 'assertion') return t('assertionNodeDescription');
    return '';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{getSheetTitle()}</SheetTitle>
          <SheetDescription>{getSheetDescription()}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* API基本信息 */}
          {node?.type === 'api' && nodeData && (
            <>
              <div className="space-y-3 p-4 border rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <Badge className={`${getMethodColor((nodeData as ApiNodeData).method)} text-white`}>
                    {(nodeData as ApiNodeData).method}
                  </Badge>
                  <span className="font-mono text-sm">{(nodeData as ApiNodeData).url}</span>
                </div>
                {apiInfo?.description && (
                  <p className="text-sm text-muted-foreground">
                    {apiInfo.description}
                  </p>
                )}
              </div>
              
              {/* 后置清理开关 */}
              <div className="flex items-start gap-3 p-4 border rounded-md bg-muted/50">
                <Trash2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cleanup-switch" className="text-sm font-semibold cursor-pointer">
                      {t('cleanupNode')}
                    </Label>
                    <Switch
                      id="cleanup-switch"
                      checked={(nodeData as ApiNodeData).isCleanup || false}
                      onCheckedChange={(checked) => {
                        setNodeData((prev: any) => ({ ...prev, isCleanup: checked }));
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('cleanupNodeDesc')}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* URL预览 */}
          {node?.type === 'api' && apiInfo && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t('actualUrlPreview')}</Label>
              <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
                {buildPreviewUrl()}
              </div>
            </div>
          )}

          {/* 根据节点类型显示不同的配置 */}
          {node?.type === 'api' && (
            <Tabs defaultValue="params" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="params">{t('requestParams')}</TabsTrigger>
                <TabsTrigger value="headers">{t('requestHeaders')}</TabsTrigger>
                <TabsTrigger value="extract">{t('expectedResponse')}</TabsTrigger>
                <TabsTrigger value="assertions">{t('assertions')}</TabsTrigger>
                <TabsTrigger value="wait">{t('wait')}</TabsTrigger>
              </TabsList>

            {/* 参数配置 */}
            <TabsContent value="params" className="space-y-6 mt-4">
              {/* 路径参数 - 使用新的编辑器 */}
              {apiInfo && currentPath && (
                <PathParamsEditor
                  path={currentPath}
                  originalPath={apiInfo.path}
                  values={pathParams}
                  onChange={(newValues, newPath) => {
                    setPathParams(newValues);
                    setCurrentPath(newPath);
                  }}
                  nodes={nodes}
                  currentNodeId={node.id}
                />
              )}

              {/* 查询参数 */}
              {((apiInfo?.requestQuery && Object.keys(apiInfo.requestQuery).length > 0) || 
                Object.keys(queryParams).length > 0) && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t('queryParams')}</Label>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mb-2">
                    {t('queryParamsDesc')}
                  </div>
                  <QueryParamsEditor
                    values={queryParams}
                    onChange={setQueryParams}
                    nodes={nodes}
                    currentNodeId={node.id}
                  />
                </div>
              )}

              {/* 请求体 - 只要 API 有请求体定义或已配置 body 就显示 */}
              {((apiInfo?.requestBody !== null && apiInfo?.requestBody !== undefined) || 
                (body && Object.keys(body).length > 0)) && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">{t('requestBody')}</Label>
                  <JsonEditorWithVariables
                    initialJson={bodyJsonText}
                    values={body}
                    onChange={(jsonText, variables) => {
                      setBodyJsonText(jsonText);
                      setBody(variables);
                    }}
                    nodes={nodes}
                    currentNodeId={node.id}
                  />
                </div>
              )}

              {/* 如果没有任何参数 */}
              {!currentPath &&
               (!apiInfo?.requestQuery || Object.keys(apiInfo.requestQuery).length === 0) &&
               (!apiInfo?.requestBody || Object.keys(apiInfo.requestBody).length === 0) &&
               (!body || Object.keys(body).length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  {t('noParams')}
                </div>
              )}
            </TabsContent>

            {/* 请求头配置 */}
            <TabsContent value="headers" className="space-y-4 mt-4">
              <HeadersEditor
                values={headers}
                onChange={setHeaders}
                nodes={nodes}
                currentNodeId={node.id}
              />
            </TabsContent>

            {/* 预期返回 */}
            <TabsContent value="extract" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label className="text-sm font-semibold">{t('expectedResponseData')}</Label>
                <div className="text-sm text-muted-foreground">
                  {t('expectedResponseDesc')}
                </div>
                
                {apiInfo?.responseBody ? (
                  <div className="space-y-2">
                    {/* JSON格式显示 */}
                    <div className="p-4 bg-muted rounded-md border">
                      <pre className="text-xs overflow-auto max-h-96 font-mono">
                        {typeof apiInfo.responseBody === 'string' 
                          ? (() => {
                              try {
                                return JSON.stringify(JSON.parse(apiInfo.responseBody), null, 2);
                              } catch {
                                return apiInfo.responseBody;
                              }
                            })()
                          : JSON.stringify(apiInfo.responseBody, null, 2)
                        }
                      </pre>
                    </div>

                    {/* 变量引用说明 */}
                    <div className="p-3 bg-accent/50 rounded-md text-xs border border-border">
                      <p className="font-medium text-foreground mb-2">
                        {t('howToReference')}
                      </p>
                      <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                        <li>{t('referenceExample1')} <code className="bg-muted px-1 rounded text-foreground">节点ID.response.字段路径</code></li>
                        <li>{t('referenceExample2')}<code className="bg-muted px-1 rounded text-foreground">step_1.response.data.token</code></li>
                        <li>{t('referenceExample3')}<code className="bg-muted px-1 rounded text-foreground">step_1.response.data.user.id</code></li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('noResponseData')}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* 断言配置 */}
            <TabsContent value="assertions" className="mt-4">
              <AssertionConfig
                assertions={nodeData.assertions || []}
                onChange={(assertions) =>
                  setNodeData((prev: any) => ({ ...prev, assertions }))
                }
                nodes={nodes}
                currentNodeId={node.id}
                isApiNodeContext={true}
                currentApiId={(nodeData as any).apiId}
                assertionFailureStrategy={(nodeData as any).assertionFailureStrategy || 'stopOnFailure'}
                onStrategyChange={(strategy) =>
                  setNodeData((prev: any) => ({ ...prev, assertionFailureStrategy: strategy }))
                }
              />
            </TabsContent>

            {/* 等待配置 */}
            <TabsContent value="wait" className="mt-4">
              <WaitConfig
                config={
                  (nodeData as ApiNodeData)?.wait || {
                    type: 'time',
                    value: 0,
                  }
                }
                onChange={(wait) => {
                  console.log('⏱️ 更新API节点等待配置:', wait);
                  setNodeData((prev: any) => ({ ...prev, wait }));
                }}
                nodes={nodes}
                currentNodeId={node.id}
                isApiNodeContext={true}
                currentApiId={(nodeData as any).apiId}
              />
            </TabsContent>
          </Tabs>
          )}

          {/* 等待节点配置 */}
          {node?.type === 'wait' && nodeData && (
            <WaitConfig
              config={
                (nodeData as any).wait || {
                  type: 'time',
                  value: 0,
                }
              }
              onChange={(wait) => setNodeData((prev: any) => ({ ...prev, wait }))}
              nodes={nodes}
              currentNodeId={node.id}
              isApiNodeContext={false}
            />
          )}

          {/* 断言节点配置 */}
          {node?.type === 'assertion' && nodeData && (
            <AssertionConfig
              assertions={(nodeData as any).assertions || []}
              onChange={(assertions) => setNodeData((prev: any) => ({ ...prev, assertions }))}
              nodes={nodes}
              currentNodeId={node.id}
              isApiNodeContext={false}
              assertionFailureStrategy={(nodeData as any).assertionFailureStrategy || 'stopOnFailure'}
              onStrategyChange={(strategy) =>
                setNodeData((prev: any) => ({ ...prev, assertionFailureStrategy: strategy }))
              }
            />
          )}

          {/* 并发节点配置 */}
          {node?.type === 'parallel' && nodeData && (
            <ParallelConfig
              data={nodeData as ParallelNodeData}
              onChange={(data) => setNodeData((prev: any) => ({ ...prev, ...data }))}
              nodes={nodes}
              currentNodeId={node.id}
            />
          )}

          {/* 保存按钮 */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              {t('saveConfig')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

