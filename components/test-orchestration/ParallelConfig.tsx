"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ParallelNodeData, ParallelApiConfig, ApiInfo, ParamValue, PathParams } from '@/types/test-case';
import { Plus, Trash2, Settings, ChevronDown, ChevronRight, Loader2, Eraser } from 'lucide-react';
import { parsePathParams } from '@/lib/utils/url-parser';
import { Node } from '@xyflow/react';
import JsonEditorWithVariables from './JsonEditorWithVariables';
import PathParamsEditor from './PathParamsEditor';
import HeadersEditor from './HeadersEditor';
import AssertionConfig from './AssertionConfig';
import ApiSelectorDialog from './ApiSelectorDialog';
import WaitConfig from './WaitConfig';
import { Switch } from '@/components/ui/switch';

interface ParallelConfigProps {
  data: ParallelNodeData;
  onChange: (data: ParallelNodeData) => void;
  nodes: Node[];
  currentNodeId: string;
}

export default function ParallelConfig({ data, onChange, nodes, currentNodeId }: ParallelConfigProps) {
  const t = useTranslations('parallelConfig');
  const tNode = useTranslations('nodeConfig');
  const [showApiSelector, setShowApiSelector] = useState(false);
  const [expandedApis, setExpandedApis] = useState<Set<string>>(new Set());
  const [apiInfoCache, setApiInfoCache] = useState<Record<string, ApiInfo>>({});

  // 获取API详情
  useEffect(() => {
    const fetchApiInfos = async () => {
      const apiIds = data.apis?.map(api => api.apiId) || [];
      const missingIds = apiIds.filter(id => !apiInfoCache[id]);
      
      if (missingIds.length === 0) return;
      
      const newCache = { ...apiInfoCache };
      
      for (const apiId of missingIds) {
        try {
          const response = await fetch(`/api/api-library/apis/${apiId}`);
          const result = await response.json();
          if (result.success) {
            const apiData = result.data;
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
            
            newCache[apiId] = {
              ...apiData,
              requestHeaders: parseJsonField(apiData.requestHeaders),
              requestQuery: parseJsonField(apiData.requestQuery),
              requestBody: parseJsonField(apiData.requestBody),
              responseBody: parseJsonField(apiData.responseBody),
            };
          }
        } catch (error) {
          console.error('Error fetching API info:', error);
        }
      }
      
      setApiInfoCache(newCache);
    };
    
    fetchApiInfos();
  }, [data.apis]);

  const handleAddApi = async (api: ApiInfo) => {
    // 获取API详情以填充默认配置
    try {
      const response = await fetch(`/api/api-library/apis/${api.id}`);
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

        const processedApiInfo = {
          ...apiData,
          requestHeaders: parseJsonField(apiData.requestHeaders),
          requestQuery: parseJsonField(apiData.requestQuery),
          requestBody: parseJsonField(apiData.requestBody),
          responseBody: parseJsonField(apiData.responseBody),
        };

        // 初始化路径参数
        const pathParamNames = parsePathParams(apiData.path);
        const initialPathParams: PathParams = {};
        pathParamNames.forEach((paramName) => {
          initialPathParams[paramName] = {
            valueType: 'fixed',
            value: '',
          };
        });

        // 初始化查询参数
        const initialQueryParams: Record<string, ParamValue> = {};
        if (processedApiInfo.requestQuery) {
          Object.entries(processedApiInfo.requestQuery).forEach(([key, value]) => {
            initialQueryParams[key] = {
              valueType: 'fixed',
              value: value as string | number | boolean,
            };
          });
        }

        // 初始化请求体（递归填充嵌套对象）
        const initialBody: Record<string, ParamValue> = {};
        if (processedApiInfo.requestBody) {
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
              
              if (typeof value !== 'object' || value === null) {
                initialBody[fullKey] = {
                  valueType: 'fixed',
                  value: value as string | number | boolean,
                };
              } else if (!Array.isArray(value)) {
                // 🔧 空对象特殊处理
                if (Object.keys(value).length === 0) {
                  initialBody[fullKey] = {
                    valueType: 'fixed',
                    value: {} as object,
                  };
                } else {
                  fillBodyRecursive(value, fullKey);
                }
              } else {
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
        }

        // 初始化请求头
        const initialHeaders: Record<string, ParamValue> = {};
        if (processedApiInfo.requestHeaders) {
          Object.entries(processedApiInfo.requestHeaders).forEach(([key, value]) => {
            const skipHeaders = ['host', 'connection', 'content-length', 'accept-encoding'];
            if (!skipHeaders.includes(key.toLowerCase())) {
              initialHeaders[key] = {
                valueType: 'fixed',
                value: value as string | number | boolean,
              };
            }
          });
        }

        const newApiConfig: ParallelApiConfig = {
          id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          apiId: api.id,
          name: api.name,
          method: api.method,
          url: apiData.path,  // 使用原始路径（应包含占位符或真实值）
          requestConfig: {
            pathParams: initialPathParams,
            queryParams: initialQueryParams,
            headers: initialHeaders,
            body: initialBody,
          },
          responseExtract: [],
          assertions: [],
          assertionFailureStrategy: 'stopOnFailure',
          wait: {
            type: 'time',
            value: 0,
          },
        };

        console.log('🔧 Added API config:', {
          apiId: api.id,
          name: api.name,
          path: apiData.path,
          url: apiData.url,
          pathParams: initialPathParams,
          queryParams: initialQueryParams,
          headers: initialHeaders,
          body: initialBody,
        });

        onChange({
          ...data,
          apis: [...(data.apis || []), newApiConfig],
        });
      }
    } catch (error) {
      console.error('Error fetching API info:', error);
      
      // 如果获取失败，使用空配置
      const newApiConfig: ParallelApiConfig = {
        id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        apiId: api.id,
        name: api.name,
        method: api.method,
        url: api.path,  // 使用传入的API路径
        requestConfig: {
          pathParams: {},
          queryParams: {},
          headers: {},
          body: {},
        },
        responseExtract: [],
        assertions: [],
        assertionFailureStrategy: 'stopOnFailure',
        wait: {
          type: 'time',
          value: 0,
        },
      };

      onChange({
        ...data,
        apis: [...(data.apis || []), newApiConfig],
      });
    }
    
    setShowApiSelector(false);
  };

  const handleRemoveApi = (apiId: string) => {
    onChange({
      ...data,
      apis: data.apis.filter((api) => api.id !== apiId),
    });
  };

  const handleApiNameChange = (apiId: string, name: string) => {
    onChange({
      ...data,
      apis: data.apis.map((api) =>
        api.id === apiId ? { ...api, name } : api
      ),
    });
  };

  const handleUpdateApiConfig = (apiId: string, updates: Partial<ParallelApiConfig>) => {
    onChange({
      ...data,
      apis: data.apis.map((api) =>
        api.id === apiId ? { ...api, ...updates } : api
      ),
    });
  };

  const toggleApiExpand = (apiId: string) => {
    const newExpanded = new Set(expandedApis);
    if (newExpanded.has(apiId)) {
      newExpanded.delete(apiId);
    } else {
      newExpanded.add(apiId);
    }
    setExpandedApis(newExpanded);
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-500 text-white',
      POST: 'bg-green-500 text-white',
      PUT: 'bg-yellow-500 text-white',
      DELETE: 'bg-red-500 text-white',
      PATCH: 'bg-purple-500 text-white',
    };
    return colors[method] || 'bg-gray-500 text-white';
  };

  return (
    <div className="space-y-6">
      {/* 节点基本信息 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="node-name">{t('nodeName')}</Label>
          <Input
            id="node-name"
            value={data.name || ''}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            placeholder={t('nodeNamePlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="node-description">{t('nodeDescription')}</Label>
          <Input
            id="node-description"
            value={data.description || ''}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder={t('nodeDescPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="failure-strategy">{t('failureStrategy')}</Label>
          <Select
            value={data.failureStrategy || 'stopAll'}
            onValueChange={(value: 'stopAll' | 'continueAll') =>
              onChange({ ...data, failureStrategy: value })
            }
          >
            <SelectTrigger id="failure-strategy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stopAll">{t('stopAll')}</SelectItem>
              <SelectItem value="continueAll">{t('continueAll')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {data.failureStrategy === 'stopAll'
              ? t('stopAllDesc')
              : t('continueAllDesc')}
          </p>
        </div>

        {/* 后置清理开关 */}
        <div className="flex items-start gap-3 p-4 border rounded-md bg-muted/50">
          <Eraser className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="parallel-cleanup-switch" className="text-sm font-semibold cursor-pointer">
                {tNode('cleanupNode')}
              </Label>
              <Switch
                id="parallel-cleanup-switch"
                checked={data.isCleanup || false}
                onCheckedChange={(checked) => {
                  onChange({ ...data, isCleanup: checked });
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {tNode('cleanupNodeDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* API 列表 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">
            {t('apiList')}
            {data.apis?.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {data.apis.length}
              </Badge>
            )}
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowApiSelector(true)}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('addApi')}
          </Button>
        </div>

        {/* API 列表 */}
        {data.apis && data.apis.length > 0 ? (
          <div className="space-y-2 border rounded-lg p-3">
            {data.apis.map((api, index) => {
              const isExpanded = expandedApis.has(api.id);
              
              return (
                <div
                  key={api.id}
                  className="border rounded-lg p-3 space-y-3 bg-background"
                >
                  {/* API 头部 */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => toggleApiExpand(api.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>

                    <Badge className={`${getMethodColor(api.method)} text-xs px-2`}>
                      {api.method}
                    </Badge>

                    <span className="text-sm font-medium flex-1 truncate">
                      {api.name || api.url}
                    </span>

                    <Badge variant="outline" className="text-xs">
                      #{index + 1}
                    </Badge>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveApi(api.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* API 详情（展开时） */}
                  {isExpanded && (() => {
                    const apiInfo = apiInfoCache[api.apiId];
                    const pathParamNames = apiInfo ? parsePathParams(apiInfo.path) : [];
                    
                    // 初始化配置
                    const requestConfig = api.requestConfig || { pathParams: {}, queryParams: {}, headers: {}, body: {} };
                    
                    console.log('📋 Expanded API config:', {
                      apiId: api.apiId,
                      requestConfig: api.requestConfig,
                      headers: requestConfig?.headers,
                      body: requestConfig?.body,
                    });
                    
                    // 转换 body 为 JSON 文本（支持扁平键转嵌套结构）
                    const convertBodyToJson = (bodyData: Record<string, any>) => {
                      try {
                        if (!bodyData || Object.keys(bodyData).length === 0) {
                          return '{}';
                        }
                        
                        // 递归转换 ParamValue 为实际值
                        const convertParamValue = (pv: ParamValue): any => {
                          if (pv.valueType === 'variable') {
                            return `\${${pv.variable || pv.value}}`;
                          } else {
                            // 对于 fixed 类型，需要递归处理 value
                            return convertValue(pv.value);
                          }
                        };
                        
                        // 递归转换任意值
                        const convertValue = (value: any): any => {
                          if (Array.isArray(value)) {
                            return value.map((item) => convertValue(item));
                          }
                          
                          if (value && typeof value === 'object' && 'valueType' in value) {
                            return convertParamValue(value as ParamValue);
                          }
                          
                          if (value && typeof value === 'object') {
                            const result: any = {};
                            Object.entries(value).forEach(([k, v]) => {
                              result[k] = convertValue(v);
                            });
                            return result;
                          }
                          
                          return value;
                        };
                        
                        // 重建嵌套结构（支持数组）
                        const jsonObj: any = {};
                        
                        // 按路径长度排序
                        const sortedEntries = Object.entries(bodyData).sort(([a], [b]) => {
                          return a.split('.').length - b.split('.').length;
                        });
                        
                        sortedEntries.forEach(([key, paramValue]) => {
                          const value = convertParamValue(paramValue);
                          const keys = key.split('.');
                          let current: any = jsonObj;
                          
                          for (let i = 0; i < keys.length; i++) {
                            const k = keys[i];
                            const isLast = i === keys.length - 1;
                            const isArrayIndex = /^\d+$/.test(k);
                            
                            if (isLast) {
                              if (isArrayIndex) {
                                const index = parseInt(k, 10);
                                while (current.length <= index) {
                                  current.push(undefined);
                                }
                                current[index] = value;
                              } else {
                                current[k] = value;
                              }
                            } else {
                              const nextKey = keys[i + 1];
                              const isNextArrayIndex = /^\d+$/.test(nextKey);
                              
                              if (isArrayIndex) {
                                const index = parseInt(k, 10);
                                while (current.length <= index) {
                                  current.push(undefined);
                                }
                                if (current[index] === undefined) {
                                  current[index] = isNextArrayIndex ? [] : {};
                                }
                                current = current[index];
                              } else {
                                if (!(k in current)) {
                                  current[k] = isNextArrayIndex ? [] : {};
                                }
                                current = current[k];
                              }
                            }
                          }
                        });
                        
                        return JSON.stringify(jsonObj, null, 2);
                      } catch (e) {
                        console.error('Error converting body to JSON:', e);
                        return '{}';
                      }
                    };
                    
                    return (
                      <div className="space-y-3 pl-8 pt-2 border-t">
                        {/* 基本信息 */}
                        <div className="space-y-2">
                          <Label htmlFor={`api-name-${api.id}`} className="text-xs font-semibold">
                            {t('customName')}
                          </Label>
                          <Input
                            id={`api-name-${api.id}`}
                            value={api.name || ''}
                            onChange={(e) => handleApiNameChange(api.id, e.target.value)}
                            placeholder={t('customNamePlaceholder')}
                            className="h-8 text-sm"
                          />
                        </div>

                        {/* API 路径 */}
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">{t('apiPath')}</Label>
                          <div className="text-xs font-mono bg-muted p-2 rounded">
                            {api.method} {api.url}
                          </div>
                        </div>

                        {/* 配置Tab */}
                        {apiInfo && (
                          <Tabs defaultValue="params" className="w-full">
                            <TabsList className="grid w-full grid-cols-5">
                              <TabsTrigger value="params" className="text-xs">{t('params')}</TabsTrigger>
                              <TabsTrigger value="headers" className="text-xs">{t('headers')}</TabsTrigger>
                              <TabsTrigger value="body" className="text-xs">{t('body')}</TabsTrigger>
                              <TabsTrigger value="extract" className="text-xs">{t('extract')}</TabsTrigger>
                              <TabsTrigger value="assertions" className="text-xs">{t('assertions')}</TabsTrigger>
                              <TabsTrigger value="wait" className="text-xs">{t('wait')}</TabsTrigger>
                            </TabsList>

                            {/* 参数配置 */}
                            <TabsContent value="params" className="space-y-3 mt-3">
                              {/* 路径参数编辑器 - 始终显示，允许用户将真实值转换为占位符 */}
                                <div className="space-y-2">
                                <Label className="text-xs font-semibold">{t('apiPath')}</Label>
                                  <PathParamsEditor
                                  path={api.url}
                                  originalPath={apiInfo.path}
                                  values={requestConfig.pathParams || {}}
                                  onChange={(pathParams, newPath) => {
                                    console.log('🔄 路径更新:', { newPath, pathParams });
                                      handleUpdateApiConfig(api.id, {
                                      url: newPath,
                                        requestConfig: { ...requestConfig, pathParams },
                                    });
                                  }}
                                    nodes={nodes}
                                    currentNodeId={currentNodeId}
                                  />
                                </div>

                              {/* 查询参数 */}
                              {apiInfo.requestQuery && Object.keys(apiInfo.requestQuery).length > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold">{t('queryParams')}</Label>
                                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                    {t('queryParamsDesc')}
                                  </div>
                                </div>
                              )}
                            </TabsContent>

                            {/* 请求头配置 */}
                            <TabsContent value="headers" className="space-y-3 mt-3">
                              <HeadersEditor
                                values={requestConfig?.headers || {}}
                                onChange={(values) =>
                                  handleUpdateApiConfig(api.id, {
                                    requestConfig: { 
                                      ...requestConfig, 
                                      pathParams: requestConfig?.pathParams || {},
                                      queryParams: requestConfig?.queryParams || {},
                                      body: requestConfig?.body || {},
                                      headers: values 
                                    },
                                  })
                                }
                                nodes={nodes}
                                currentNodeId={currentNodeId}
                              />
                            </TabsContent>

                            {/* 请求体配置 - 只要 API 有请求体定义或已配置 body 就显示 */}
                            <TabsContent value="body" className="space-y-3 mt-3">
                              {(apiInfo.requestBody !== null && apiInfo.requestBody !== undefined) ||
                               (requestConfig.body && Object.keys(requestConfig.body).length > 0) ? (
                                <div className="space-y-2">
                                  {apiInfo.requestBody && Object.keys(apiInfo.requestBody).length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      API库中的请求体字段：{Object.keys(apiInfo.requestBody).join(', ')}
                                    </div>
                                  )}
                                  <JsonEditorWithVariables
                                    initialJson={convertBodyToJson(requestConfig.body || {})}
                                    values={(requestConfig.body || {}) as Record<string, ParamValue>}
                                    onChange={(jsonText, variables) => {
                                      console.log('📝 Body changed:', { jsonText, variables });
                                      handleUpdateApiConfig(api.id, {
                                        requestConfig: { ...requestConfig, body: variables },
                                      });
                                    }}
                                    nodes={nodes}
                                    currentNodeId={currentNodeId}
                                  />
                                </div>
                              ) : (
                                <div className="text-xs text-center text-muted-foreground py-4">
                                  {t('noBodyConfig')}
                                </div>
                              )}
                            </TabsContent>

                            {/* 预期返回配置 */}
                            <TabsContent value="extract" className="space-y-3 mt-3">
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
                                        <li>在后续节点中可以使用 <code className="bg-muted px-1 rounded text-foreground">节点ID.parallel.{api.id}.response.字段路径</code></li>
                                        <li>例如：<code className="bg-muted px-1 rounded text-foreground">step_1.parallel.{api.id}.response.data.token</code></li>
                                        <li>嵌套对象使用点号连接：<code className="bg-muted px-1 rounded text-foreground">step_1.parallel.{api.id}.response.data.user.id</code></li>
                                      </ul>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground text-xs">
                                    {t('noResponseData')}
                                  </div>
                                )}
                              </div>
                            </TabsContent>

                            {/* 断言配置 */}
                            <TabsContent value="assertions" className="space-y-3 mt-3">
                              <AssertionConfig
                                assertions={api.assertions || []}
                                onChange={(assertions) =>
                                  handleUpdateApiConfig(api.id, { assertions })
                                }
                                nodes={nodes}
                                currentNodeId={currentNodeId}
                                isApiNodeContext={true}
                                currentApiId={api.apiId}
                                assertionFailureStrategy={api.assertionFailureStrategy || 'stopOnFailure'}
                                onStrategyChange={(strategy) =>
                                  handleUpdateApiConfig(api.id, { assertionFailureStrategy: strategy })
                                }
                              />
                            </TabsContent>

                            {/* 等待配置 */}
                            <TabsContent value="wait" className="space-y-3 mt-3">
                              <WaitConfig
                                config={
                                  api.wait || {
                                    type: 'time',
                                    value: 0,
                                  }
                                }
                                onChange={(wait) =>
                                  handleUpdateApiConfig(api.id, { wait })
                                }
                                nodes={nodes}
                                currentNodeId={currentNodeId}
                                isApiNodeContext={true}
                                currentApiId={api.apiId}
                              />
                            </TabsContent>
                          </Tabs>
                        )}

                        {!apiInfo && (
                          <div className="text-xs text-center text-muted-foreground py-4">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                            {t('loadingApiConfig')}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-lg">
            <p>{t('noApis')}</p>
            <p className="text-xs mt-1">{t('clickToAdd')}</p>
          </div>
        )}
      </div>

      {/* 说明 */}
      <div className="bg-muted/50 p-3 rounded-lg text-xs space-y-1.5">
        <p className="font-medium">{t('concurrentExecNote')}</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2 text-muted-foreground">
          <li>{t('note1')}</li>
          <li>{t('note2')}</li>
          <li>{t('note3')}</li>
          <li>{t('note4')}</li>
        </ul>
      </div>

      {/* API 选择对话框 */}
      {showApiSelector && (
        <ApiSelectorDialog
          open={showApiSelector}
          onOpenChange={setShowApiSelector}
          onSelectApi={handleAddApi}
        />
      )}
    </div>
  );
}

