"use client";

// 强制重编译 - v2.0
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileJson, Save, ChevronRight, CheckSquare, Square, Search, Filter } from "lucide-react";
import { CapturedApi } from "@/types/har";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { parameterizePath } from "@/lib/path-parameterization";
import { filterHeaders, filterResponseHeaders } from "@/lib/header-filter";
import { FourLayerSelector } from "@/components/api-repository/FourLayerSelector";
import { 
  ApiConflictResolverDialog,
  type ApiConflict,
  type ConflictDecision,
} from "@/components/api-repository/ApiConflictResolverDialog";

interface HarImportProps {
  isRecording: boolean;
  onImport: (apis: CapturedApi[]) => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500',
  POST: 'bg-blue-500',
  PUT: 'bg-orange-500',
  DELETE: 'bg-red-500',
  PATCH: 'bg-purple-500',
};

export function HarImport({ isRecording, onImport }: HarImportProps) {
  const { toast } = useToast();
  const t = useTranslations('apiCapture');
  const tCommon = useTranslations('common');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [harContent, setHarContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'select' | 'classify'>('input');
  const [parsedApis, setParsedApis] = useState<CapturedApi[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // 筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  
  // 四层分类状态
  const [classification, setClassification] = useState<{
    platform?: string;
    component?: string;
    feature?: string;
    subFeature?: string;
  }>({});
  
  // 冲突检测
  const [conflicts, setConflicts] = useState<ApiConflict[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [preparedApis, setPreparedApis] = useState<any[]>([]);

  // 统一判重Key：GET 忽略 query，只按 pathname 判重；其他方法保持 method + path
  const getApiIdentityKey = (api: any) => {
    const method = String(api?.method || '').toUpperCase();
    let path = String(api?.path || '');
    if (method === 'GET') {
      path = path.split('?')[0];
    }
    return `${method}|${path}`;
  };

  const parseHarContent = (harText: string): CapturedApi[] => {
    try {
      const harData = JSON.parse(harText);
      
      // 解析HAR文件中的entries
      if (!harData.log || !harData.log.entries) {
        throw new Error(t('harFormatError'));
      }

      const entries = harData.log.entries;
      const parsedApis: CapturedApi[] = entries.map((entry: any, index: number) => {
        try {
          const url = new URL(entry.request.url);
          
          // 自动参数化路径（识别并替换硬编码的 ID）
          // GET 请求：判重只按 pathname，忽略 query
          const originalPath = entry.request.method === 'GET'
            ? url.pathname
            : url.pathname + url.search;
          const paramResult = parameterizePath(originalPath);
          const finalPath = paramResult.parameterizedPath;
          
          // 如果路径被参数化，在控制台输出提示
          if (paramResult.isParameterized) {
            console.log(`🔧 [路径参数化] ${originalPath} → ${finalPath}`);
            if (paramResult.parameters.length > 0) {
              console.log('   参数:', paramResult.parameters.map(p => `${p.name}=${p.value}`).join(', '));
            }
          }
          
          // 解析请求头和响应头
          const rawHeaders = Object.fromEntries(
            (entry.request.headers || []).map((h: any) => [h.name, h.value])
          );
          const rawResponseHeaders = Object.fromEntries(
            (entry.response?.headers || []).map((h: any) => [h.name, h.value])
          );
          
          // 注意：不在这里过滤headers，统一在保存入库时根据平台设置的白名单过滤
          // 这样用户可以通过平台设置控制是否过滤以及过滤哪些headers
          
          // 解析请求体和请求体类型
          const postData = entry.request.postData;
          let requestBody: any = undefined;
          let requestMimeType: string | undefined = undefined;
          
          if (postData) {
            requestMimeType = postData.mimeType;
            const mimeTypeLower = (requestMimeType || '').toLowerCase();
            
            if (mimeTypeLower.includes('application/json')) {
              // JSON 格式：尝试解析 text 为 JSON 对象
              if (postData.text) {
                try {
                  requestBody = JSON.parse(postData.text);
                } catch {
                  requestBody = postData.text;
                }
              }
            } else if (mimeTypeLower.includes('multipart/form-data') || mimeTypeLower.includes('application/x-www-form-urlencoded')) {
              // form-data 或 urlencoded 格式：从 params 或 text 解析
              if (postData.params && postData.params.length > 0) {
                // 优先使用 params 数组
                requestBody = {};
                postData.params.forEach((param: any) => {
                  requestBody[param.name] = param.value || '';
                });
              } else if (postData.text) {
                // 如果没有 params，尝试从 text 解析
                try {
                  // 尝试解析为 URL 编码格式
                  const params = new URLSearchParams(postData.text);
                  requestBody = {};
                  params.forEach((value, key) => {
                    requestBody[key] = value;
                  });
                } catch {
                  requestBody = postData.text;
                }
              }
            } else {
              // 其他格式：保留原始 text
              requestBody = postData.text;
            }
          }
          
          return {
            id: `har_${Date.now()}_${index}`,
            name: `${entry.request.method} ${url.pathname.split('/').filter(Boolean).pop() || 'api'}`,
            method: entry.request.method,
            url: entry.request.url,
            path: finalPath,  // 使用参数化后的路径
            status: entry.response?.status || 0,
            statusText: entry.response?.statusText || '',
            resourceType: entry._resourceType || 'other',
            time: entry.time || 0,
            size: entry.response?.bodySize || 0,
            startedDateTime: entry.startedDateTime,
            // 请求头（原始数据，入库时会根据平台设置过滤）
            headers: rawHeaders,
            // 查询参数
            queryParams: Object.fromEntries(
              (entry.request.queryString || []).map((q: any) => [q.name, q.value])
            ),
            // 请求体
            requestBody,
            // 请求体 MIME 类型
            requestMimeType,
            // 响应头（原始数据）
            responseHeaders: rawResponseHeaders,
            // 响应体
            responseBody: entry.response?.content?.text,
            mimeType: entry.response?.content?.mimeType || 'text/plain',
          };
        } catch (error) {
          console.error(t('parseEntryFailed'), error);
          return null;
        }
      }).filter(Boolean) as CapturedApi[];
      
      return parsedApis;
    } catch (error) {
      console.error(t('harParseError'), error);
      throw error;
    }
  };

  const handleParse = () => {
    if (!harContent.trim()) {
      toast({
        variant: "destructive",
        title: t('emptyContent'),
        description: t('pleasePasteHar'),
      });
      return;
    }

    try {
      // 解析HAR内容
      const apis = parseHarContent(harContent);
      
      if (apis.length === 0) {
        toast({
          variant: "destructive",
          title: t('parseFailed'),
          description: t('noValidRequests'),
        });
        return;
      }

      // 设置解析结果并切换到选择步骤
      setParsedApis(apis);
      // 默认全选
      setSelectedIds(new Set(apis.map(api => api.id)));
      setStep('select');
      
      toast({
        title: t('parseSuccess'),
        description: `${t('parsedCount')} ${apis.length} ${t('apiRequests')}`,
      });
    } catch (error: any) {
      console.error(t('parseFailed'), error);
      toast({
        variant: "destructive",
        title: t('parseFailed'),
        description: error.message || t('harFormatIncorrect'),
      });
    }
  };

  const handleNextToClassify = () => {
    const selectedApis = parsedApis.filter(api => selectedIds.has(api.id));
    
    if (selectedApis.length === 0) {
      toast({
        variant: "destructive",
        title: t('noApiSelected'),
        description: t('selectAtLeastOne'),
      });
      return;
    }
    
    setStep('classify');
  };

  // 检查冲突
  const checkConflicts = async (apisToCheck: any[]) => {
    try {
      const response = await fetch('/api/api-library/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apis: apisToCheck }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || '检查重复失败');
      }

      return result.data;
    } catch (error: any) {
      console.error('检查冲突失败:', error);
      toast({
        variant: "destructive",
        title: "检查失败",
        description: error.message,
      });
      return [];
    }
  };

  // 去重函数：基于 method + path 去除重复的API
  const deduplicateApis = (apis: any[]) => {
    const seen = new Map<string, any>();
    const duplicates: any[] = [];
    
    apis.forEach(api => {
      const key = getApiIdentityKey(api);
      if (seen.has(key)) {
        duplicates.push(api);
        console.log(`⚠️ [去重] 发现重复API: ${api.method} ${api.path} - ${api.name}`);
        // 保留最新的数据
        seen.set(key, api);
      } else {
        seen.set(key, api);
        console.log(`✅ [去重] 保留API: ${api.method} ${api.path} - ${api.name}`);
      }
    });
    
    const deduplicated = Array.from(seen.values());
    console.log(`📋 [去重结果] 原始: ${apis.length} 个, 去重后: ${deduplicated.length} 个, 重复: ${duplicates.length} 个`);
    
    return {
      deduplicated,
      duplicateCount: duplicates.length,
    };
  };

  const handleSaveSelected = async () => {
    const selectedApis = parsedApis.filter(api => selectedIds.has(api.id));
    
    if (selectedApis.length === 0) {
      toast({
        variant: "destructive",
        title: t('noApiSelected'),
        description: t('selectAtLeastOne'),
      });
      return;
    }
    
    // 验证必须选择平台
    if (!classification.platform) {
      toast({
        variant: "destructive",
        title: t('classificationRequired'),
        description: t('pleaseSelectPlatform'),
      });
      return;
    }

    setLoading(true);
    try {
      // 保存选中的API到仓库，包含四层分类信息
      const apisWithClassification = selectedApis.map(api => ({
        ...api,
        platform: classification.platform,
        component: classification.component,
        feature: classification.feature,
        subFeature: classification.subFeature?.trim() || undefined,
        importSource: 'har',
      }));
      
      // 检查冲突
      const checkResults = await checkConflicts(apisWithClassification);
      const conflictedApis = checkResults.filter((result: any) => result.isDuplicate);

      if (conflictedApis.length > 0) {
        // 有冲突，显示冲突解决对话框
        const conflictsData: ApiConflict[] = conflictedApis.map((result: any) => ({
          inputApi: result.inputApi,
          existingApi: result.existingApi,
        }));
        
        setConflicts(conflictsData);
        setPreparedApis(apisWithClassification);
        setShowConflictDialog(true);
        setLoading(false);
      } else {
        // 没有冲突，直接保存前先去重
        const { deduplicated, duplicateCount } = deduplicateApis(apisWithClassification);
        
        const response = await fetch('/api/api-library/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ apis: deduplicated }),
        });

        const result = await response.json();

        if (result.success) {
          const dedupeInfo = duplicateCount > 0 
            ? `（已自动去除 ${duplicateCount} 个重复请求）` 
            : '';
          toast({
            title: t('saveSuccess'),
            description: `${t('savedCount')} ${result.count} ${t('apisToRepo')}${dedupeInfo}`,
          });
          
          // 重置状态并关闭对话框
          handleClose();
        } else {
          throw new Error(result.error || t('saveFailed'));
        }
        setLoading(false);
      }
    } catch (error: any) {
      console.error(t('saveFailed'), error);
      toast({
        variant: "destructive",
        title: t('saveFailed'),
        description: error.message || t('pleaseTryAgainLater'),
      });
      setLoading(false);
    }
  };

  // 处理冲突解决
  const handleConflictResolve = async (decisions: ConflictDecision[]) => {
    setLoading(true);
    setShowConflictDialog(false);
    
    try {
      // 根据决策处理API
      const apisToSave = preparedApis.filter((api) => {
        // 查找这个API的决策
        const decision = decisions.find(
          (d) => d.inputApi.id === api.id || 
                 (d.inputApi.method === api.method && d.inputApi.path === api.path)
        );
        
        // 如果是跳过，则不保存
        return !decision || decision.resolution !== 'skip';
      }).map((api) => {
        // 查找这个API的决策
        const decision = decisions.find(
          (d) => d.inputApi.id === api.id || 
                 (d.inputApi.method === api.method && d.inputApi.path === api.path)
        );
        
        if (decision?.resolution === 'overwrite') {
          // 覆盖：使用现有API的ID，保留原有名称，但更新其他信息（分类、描述、标签等）
          return {
            ...api,
            id: decision.existingApi.id,
            name: decision.existingApi.name, // 保留原有API的名称
            _overwrite: true,
          };
        }
        
        // 没有决策，保持原样
        return api;
      });

      // 🔧 去重：分别处理覆盖和创建模式
      // 原因：HAR文件中可能包含对同一API的多次请求
      console.log(`\n🔍 [开始去重] 总共 ${apisToSave.length} 个API待处理`);
      
      const deduplicatedApis = apisToSave.reduce((acc: any[], api: any, index: number) => {
        if (api._overwrite && api.id) {
          // 覆盖模式：基于目标API ID去重
          const existingIndex = acc.findIndex(
            (a: any) => a._overwrite && a.id === api.id
          );
          if (existingIndex === -1) {
            acc.push(api);
            console.log(`  ✅ [${index + 1}] [覆盖模式] 保留: ${api.id} - ${api.name}`);
          } else {
            console.log(`  ⚠️ [${index + 1}] [覆盖模式] 跳过重复（ID已存在）: ${api.id} - ${api.name}`);
            // 用最新的数据替换
            acc[existingIndex] = api;
          }
        } else {
          // 普通创建模式：基于 method + path 去重
          const key = getApiIdentityKey(api);
          const existingIndex = acc.findIndex(
            (a: any) => !a._overwrite && getApiIdentityKey(a) === key
          );
          if (existingIndex === -1) {
            acc.push(api);
            console.log(`  ✅ [${index + 1}] [创建模式] 保留: ${api.method} ${api.path} - ${api.name}`);
          } else {
            console.log(`  ⚠️ [${index + 1}] [创建模式] 跳过重复（method+path已存在）: ${api.method} ${api.path} - ${api.name}`);
            // 用最新的数据替换（保留最后一次的数据）
            acc[existingIndex] = api;
          }
        }
        return acc;
      }, []);

      const duplicateCount = apisToSave.length - deduplicatedApis.length;
      console.log(`\n📋 [去重完成] 原始: ${apisToSave.length} 个 → 去重后: ${deduplicatedApis.length} 个 | 去除重复: ${duplicateCount} 个`);
      console.log(`📝 [去重详情] 覆盖: ${deduplicatedApis.filter((a: any) => a._overwrite).length} 个, 创建: ${deduplicatedApis.filter((a: any) => !a._overwrite).length} 个\n`);

      if (deduplicatedApis.length > 0) {
        const response = await fetch('/api/api-library/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ apis: deduplicatedApis }),
        });

        const result = await response.json();

        if (result.success) {
          // 检查是否有失败的API
          if (result.failed && result.failed > 0) {
            // 部分成功
            const failedNames = result.failedDetails?.map((f: any) => f.api).join(', ') || '';
            toast({
              title: t('saveSuccess'),
              description: `成功保存 ${result.count} 个API，${result.failed} 个失败${failedNames ? `（${failedNames}）` : ''}`,
              variant: 'default',
            });
            console.error('保存失败的API:', result.failedDetails);
          } else {
            // 全部成功
            const dedupeInfo = duplicateCount > 0
              ? `（已自动去除 ${duplicateCount} 个重复请求）` 
              : '';
            toast({
              title: t('saveSuccess'),
              description: `${t('savedCount')} ${result.count} ${t('apisToRepo')}${dedupeInfo}`,
            });
          }
          
          // 重置状态并关闭对话框
          handleClose();
        } else {
          throw new Error(result.error || t('saveFailed'));
        }
      } else {
        // 所有API都被跳过
        toast({
          title: "已取消",
          description: "所有API都已跳过",
        });
        handleClose();
      }
      
      setConflicts([]);
      setPreparedApis([]);
    } catch (error: any) {
      console.error(t('saveFailed'), error);
      toast({
        variant: "destructive",
        title: t('saveFailed'),
        description: error.message || t('pleaseTryAgainLater'),
      });
    } finally {
      setLoading(false);
    }
  };

  // 取消冲突解决
  const handleConflictCancel = () => {
    setShowConflictDialog(false);
    setConflicts([]);
    setPreparedApis([]);
    setLoading(false);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setHarContent('');
    setParsedApis([]);
    setSelectedIds(new Set());
    setStep('input');
    setSearchTerm('');
    setMethodFilter('ALL');
    setClassification({});
  };

  const handleToggleApi = (apiId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(apiId)) {
        newSet.delete(apiId);
      } else {
        newSet.add(apiId);
      }
      return newSet;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === filteredApis.length) {
      // 取消选中当前筛选结果中的所有API
      const filteredIds = new Set(filteredApis.map(api => api.id));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        filteredIds.forEach(id => newSet.delete(id));
        return newSet;
      });
    } else {
      // 选中当前筛选结果中的所有API
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        filteredApis.forEach(api => newSet.add(api.id));
        return newSet;
      });
    }
  };

  const handleBack = () => {
    if (step === 'classify') {
      setStep('select');
    } else if (step === 'select') {
      setStep('input');
      setSearchTerm('');
      setMethodFilter('ALL');
    }
  };

  // 获取所有唯一的方法
  const availableMethods = useMemo(() => {
    const methods = new Set(parsedApis.map(api => api.method));
    return Array.from(methods).sort();
  }, [parsedApis]);

  // 筛选API列表
  const filteredApis = useMemo(() => {
    return parsedApis.filter(api => {
      // 方法筛选
      if (methodFilter !== 'ALL' && api.method !== methodFilter) {
        return false;
      }
      
      // 关键词搜索（搜索URL和名称）
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        const matchUrl = api.url.toLowerCase().includes(lowerSearch);
        const matchName = api.name?.toLowerCase().includes(lowerSearch);
        if (!matchUrl && !matchName) {
          return false;
        }
      }
      
      return true;
    });
  }, [parsedApis, methodFilter, searchTerm]);

  // 当前筛选结果中已选择的数量
  const filteredSelectedCount = useMemo(() => {
    return filteredApis.filter(api => selectedIds.has(api.id)).length;
  }, [filteredApis, selectedIds]);

  return (
    <>
      <Card className="hover:shadow-md transition-shadow border-[#e5e7eb] dark:border-[#4b5563]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileJson className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>{t('importHar')}</CardTitle>
              <CardDescription className="mt-1">
                {t('importSuccess')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setDialogOpen(true)}
            disabled={isRecording}
          >
            <FileJson className="mr-2 h-4 w-4" />
            {t('importHar')}
          </Button>
        </CardContent>
      </Card>

      {/* HAR导入对话框 */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[800px] h-[85vh] flex flex-col p-0">
          <div className="px-6 pt-6">
            <DialogHeader>
              <DialogTitle>
                {step === 'input' 
                  ? t('importHarContent') 
                  : step === 'select'
                  ? t('selectApisToSave')
                  : t('selectClassification')}
              </DialogTitle>
              <DialogDescription>
                {step === 'input' 
                  ? t('exportHarFromBrowser')
                  : step === 'select'
                  ? `${t('parsedApisCount')} ${parsedApis.length} ${t('items')}，${t('selectedCount')} ${selectedIds.size} ${t('items')}`
                  : t('selectClassificationDesc')}
              </DialogDescription>
            </DialogHeader>
          </div>

          {step === 'input' ? (
            // 步骤1：输入HAR内容
            <div className="flex-1 overflow-hidden flex flex-col px-6">
              <div className="space-y-4 py-4 flex-1 overflow-hidden flex flex-col">
                <div className="space-y-2 flex-1 flex flex-col min-h-0">
                  <Label>{t('harContent')}</Label>
                  <Textarea
                    value={harContent}
                    onChange={(e) => setHarContent(e.target.value)}
                    placeholder={`${t('pasteHarPlaceholder')}\n\n${t('harImportInstructions')}\n${t('harStep1')}\n${t('harStep2')}\n${t('harStep3')}\n${t('harStep4')}`}
                    className="font-mono text-xs flex-1 resize-none"
                  />
                </div>

                <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-md">
                  <p className="font-semibold">{t('instructions')}</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>{t('supportStandardHar')}</li>
                    <li>{t('autoParseData')}</li>
                    <li>{t('selectApisNextStep')}</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : step === 'select' ? (
            // 步骤2：选择API
            <div className="flex-1 overflow-hidden flex flex-col px-6 min-h-0">
              <div className="space-y-3 py-4 flex-shrink-0">
                {/* 筛选工具栏 */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('searchUrlOrName')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={methodFilter} onValueChange={setMethodFilter}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t('allMethods')}</SelectItem>
                      {availableMethods.map(method => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 全选操作 */}
                <div className="flex items-center justify-between pb-2 border-b border-[#e5e7eb] dark:border-[#4b5563]">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={filteredApis.length > 0 && filteredSelectedCount === filteredApis.length}
                      onCheckedChange={handleToggleAll}
                    />
                    <Label htmlFor="select-all" className="cursor-pointer text-sm">
                      {t('selectAllOnPage')} ({filteredSelectedCount}/{filteredApis.length})
                      {filteredApis.length !== parsedApis.length && (
                        <span className="text-muted-foreground ml-1">
                          · {t('totalSelected')} {selectedIds.size}/{parsedApis.length}
                        </span>
                      )}
                    </Label>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleToggleAll}>
                    {filteredSelectedCount === filteredApis.length ? (
                      <Square className="h-4 w-4 mr-2" />
                    ) : (
                      <CheckSquare className="h-4 w-4 mr-2" />
                    )}
                    {filteredSelectedCount === filteredApis.length ? t('deselectAll') : t('selectAll')}
                  </Button>
                </div>
              </div>

              {/* API列表 - 添加明确的高度和滚动 */}
              {filteredApis.length > 0 ? (
                <ScrollArea className="flex-1 -mx-6 px-6 min-h-0">
                  <div className="space-y-2 py-2">
                    {filteredApis.map((api) => (
                    <div
                      key={api.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border border-[#e5e7eb] dark:border-[#4b5563] transition-colors cursor-pointer ${
                        selectedIds.has(api.id)
                          ? 'bg-primary/5 border-primary/20'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleToggleApi(api.id)}
                    >
                      <Checkbox
                        checked={selectedIds.has(api.id)}
                        onCheckedChange={() => handleToggleApi(api.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className={METHOD_COLORS[api.method] || 'bg-gray-500'}>
                            {api.method}
                          </Badge>
                          <span className="font-medium text-sm truncate">
                            {api.name}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {api.url}
                        </p>
                        {api.status && (
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant={api.status < 400 ? 'secondary' : 'destructive'}>
                              {api.status}
                            </Badge>
                            {api.time && (
                              <span className="text-muted-foreground">
                                {api.time.toFixed(0)}ms
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center p-8 min-h-0">
                  <div>
                    <p className="text-muted-foreground">{t('noMatchingApis')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('tryAdjustFilters')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // 步骤3：选择四层分类
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <FourLayerSelector
                value={classification}
                onChange={setClassification}
                allowCreate={true}
                enableSubFeature={true}
              />
            </div>
          )}

          <div className="px-6 py-4 border-t border-[#e5e7eb] dark:border-[#4b5563] bg-background">
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={step === 'input' ? handleClose : handleBack}
                disabled={loading}
              >
                {step === 'input' ? tCommon('cancel') : t('previousStep')}
              </Button>
              <Button
                type="button"
                onClick={
                  step === 'input' 
                    ? handleParse 
                    : step === 'select' 
                    ? handleNextToClassify 
                    : handleSaveSelected
                }
                disabled={
                  loading || 
                  (step === 'input' && !harContent.trim()) || 
                  (step === 'select' && selectedIds.size === 0) ||
                  (step === 'classify' && !classification.platform)
                }
              >
                {step === 'input' ? (
                  <>
                    {t('parse')}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                ) : step === 'select' ? (
                  <>
                    {t('nextStep')}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? t('saving') : `${t('saveApis')} ${selectedIds.size} ${t('items')}`}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
        
        {/* 冲突解决对话框 */}
        <ApiConflictResolverDialog
          open={showConflictDialog}
          conflicts={conflicts}
          onResolve={handleConflictResolve}
          onCancel={handleConflictCancel}
        />
      </Dialog>
    </>
  );
}

