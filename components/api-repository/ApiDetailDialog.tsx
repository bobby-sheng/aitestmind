'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Copy, 
  ExternalLink, 
  Clock, 
  Database,
  Star,
  Edit2,
  Trash2,
  Archive
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';

interface ApiDetailDialogProps {
  apiId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (api: any) => void;
  onDelete?: (apiId: string) => void;
  onRefresh?: () => void;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500',
  POST: 'bg-blue-500',
  PUT: 'bg-orange-500',
  DELETE: 'bg-red-500',
  PATCH: 'bg-purple-500',
};

export function ApiDetailDialog({
  apiId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onRefresh,
}: ApiDetailDialogProps) {
  const { toast } = useToast();
  const t = useTranslations('apiRepository.apiDetailDialog');
  const tCommon = useTranslations('common');
  const [api, setApi] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState<{
    field: string | null;
    value: string;
  }>({ field: null, value: '' });
  const [saving, setSaving] = useState(false);
  const [rawHarLoaded, setRawHarLoaded] = useState(false);
  const [loadingRawHar, setLoadingRawHar] = useState(false);

  useEffect(() => {
    if (open && apiId) {
      fetchApiDetail();
      setRawHarLoaded(false); // 重置 rawHar 加载状态
    }
  }, [open, apiId]);

  const fetchApiDetail = async (includeRawHar = false) => {
    setLoading(true);
    try {
      const url = includeRawHar 
        ? `/api/api-library/apis/${apiId}?includeRawHar=true`
        : `/api/api-library/apis/${apiId}`;
      const response = await fetch(url);
      const result = await response.json();
      if (result.success) {
        setApi(result.data);
        if (includeRawHar) {
          setRawHarLoaded(true);
        }
      }
    } catch (error) {
      toast({
        title: t('loadFailed'),
        description: t('cannotLoadApiDetails'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 按需加载 rawHarEntry
  const loadRawHarIfNeeded = async () => {
    if (!rawHarLoaded && !loadingRawHar) {
      setLoadingRawHar(true);
      try {
        const response = await fetch(`/api/api-library/apis/${apiId}?includeRawHar=true`);
        const result = await response.json();
        if (result.success) {
          setApi((prev: any) => ({
            ...prev,
            rawHarEntry: result.data.rawHarEntry,
          }));
          setRawHarLoaded(true);
        }
      } catch (error) {
        toast({
          title: t('loadFailed'),
          description: t('cannotLoadRawData'),
          variant: 'destructive',
        });
      } finally {
        setLoadingRawHar(false);
      }
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t('copySuccess'),
      description: `${t('copied')}${label}${t('toClipboard')}`,
    });
  };

  const handleToggleStar = async () => {
    try {
      const response = await fetch(`/api/api-library/apis/${apiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !api.isStarred }),
      });
      const result = await response.json();
      if (result.success) {
        // 只更新 isStarred 字段，保留其他数据
        setApi((prev: any) => ({
          ...prev,
          ...result.data,
          rawHarEntry: rawHarLoaded ? (result.data.rawHarEntry || prev.rawHarEntry) : undefined,
        }));
        onRefresh?.();
        toast({
          title: api.isStarred ? t('unstarred') : t('starred'),
        });
      }
    } catch (error) {
      toast({
        title: t('operationFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleToggleArchive = async () => {
    try {
      const response = await fetch(`/api/api-library/apis/${apiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !api.isArchived }),
      });
      const result = await response.json();
      if (result.success) {
        // 只更新 isArchived 字段，保留其他数据
        setApi((prev: any) => ({
          ...prev,
          ...result.data,
          rawHarEntry: rawHarLoaded ? (result.data.rawHarEntry || prev.rawHarEntry) : undefined,
        }));
        onRefresh?.();
        toast({
          title: api.isArchived ? t('unarchivedSuccess') : t('archivedSuccess'),
        });
      }
    } catch (error) {
      toast({
        title: t('operationFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleStartEdit = (field: string, data: any) => {
    let value = '';
    try {
      if (typeof data === 'string') {
        // 如果是字符串，尝试解析为 JSON
        try {
          const parsed = JSON.parse(data);
          value = JSON.stringify(parsed, null, 2);
        } catch {
          value = data;
        }
      } else if (typeof data === 'object' && data !== null) {
        value = JSON.stringify(data, null, 2);
      } else {
        value = String(data || '');
      }
    } catch {
      value = String(data || '');
    }
    setEditMode({ field, value });
  };

  const handleCancelEdit = () => {
    setEditMode({ field: null, value: '' });
  };

  const handleSaveEdit = async () => {
    if (!editMode.field || !apiId) return;

    try {
      setSaving(true);
      
      // 根据字段名构建更新数据
      const updateData: any = {};
      
      // path 字段是字符串，不需要 JSON 解析
      if (editMode.field === 'path') {
        updateData.path = editMode.value;
      } else {
        // 其他字段需要验证 JSON 格式
        const parsed = JSON.parse(editMode.value || '{}');
        
        const fieldMap: Record<string, string> = {
          'requestHeaders': 'requestHeaders',
          'requestQuery': 'requestQuery',
          'requestBody': 'requestBody',
          'responseHeaders': 'responseHeaders',
          'responseBody': 'responseBody',
        };
        
        const dbField = fieldMap[editMode.field];
        if (dbField) {
          updateData[dbField] = parsed;
        }
      }

      // 同时更新 rawHarEntry（仅在已加载时，且不是 path 字段）
      if (editMode.field !== 'path' && rawHarLoaded && api.rawHarEntry) {
        const parsed = JSON.parse(editMode.value || '{}');
        const updatedHarEntry = { ...api.rawHarEntry };
        
        // 更新 HAR entry 中对应的字段
        if (editMode.field === 'requestHeaders' && updatedHarEntry.request) {
          updatedHarEntry.request.headers = parsed;
        } else if (editMode.field === 'requestQuery' && updatedHarEntry.request) {
          updatedHarEntry.request.queryString = parsed;
        } else if (editMode.field === 'requestBody' && updatedHarEntry.request) {
          updatedHarEntry.request.postData = { ...updatedHarEntry.request.postData, text: JSON.stringify(parsed) };
        } else if (editMode.field === 'responseHeaders' && updatedHarEntry.response) {
          updatedHarEntry.response.headers = parsed;
        } else if (editMode.field === 'responseBody' && updatedHarEntry.response) {
          updatedHarEntry.response.content = { ...updatedHarEntry.response.content, text: JSON.stringify(parsed) };
        }
        
        updateData.rawHarEntry = updatedHarEntry;
      }

      const response = await fetch(`/api/api-library/apis/${apiId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      
      if (result.success) {
        // 只更新修改的字段，保留已加载的 rawHarEntry
        setApi((prev: any) => ({
          ...prev,
          ...result.data,
          // 如果之前已经加载了 rawHarEntry，保留它
          rawHarEntry: rawHarLoaded ? (result.data.rawHarEntry || prev.rawHarEntry) : undefined,
        }));
        setEditMode({ field: null, value: '' });
        onRefresh?.();
        toast({
          title: t('saveSuccess'),
          description: t('dataUpdated'),
        });
      } else {
        throw new Error(result.error || t('saveFailed'));
      }
    } catch (error: any) {
      toast({
        title: error.message === 'Unexpected end of JSON input' || error.message.includes('JSON') 
          ? t('jsonFormatError') 
          : t('saveFailed'),
        description: error.message === 'Unexpected end of JSON input' || error.message.includes('JSON')
          ? t('pleaseEnterValidJson')
          : error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const renderJson = (data: any, title?: string, field?: string, editable?: boolean) => {
    const isEditing = editMode.field === field;
    const canEdit = editable === true && !!field;
    
    // 如果正在编辑这个字段
    if (isEditing) {
      return (
        <div className="space-y-2">
          <textarea
            className="w-full min-h-[300px] p-4 rounded-md bg-muted text-foreground text-sm font-mono border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            value={editMode.value}
            onChange={(e) => setEditMode({ ...editMode, value: e.target.value })}
            placeholder="请输入 JSON 格式数据"
            style={{
              fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
              whiteSpace: 'pre',
              tabSize: 2,
            }}
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelEdit}
              disabled={saving}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? t('saving') : tCommon('save')}
            </Button>
          </div>
        </div>
      );
    }

    // 如果没有数据，显示占位
    if (!data) {
      return (
        <div className="border border-border rounded-lg bg-card overflow-hidden flex flex-col">
          {/* 操作按钮条 */}
          <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
            <div className="text-xs font-semibold">
              {title || 'JSON 数据'}
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  size="sm"
                  className="h-7"
                  onClick={() => field && handleStartEdit(field, {})}
                >
                  <Edit2 className="h-3 w-3 mr-1" />
                  编辑
                </Button>
              )}
            </div>
          </div>
          <div className="text-center py-8 text-muted-foreground bg-muted/30">
            {t('noData')}
          </div>
        </div>
      );
    }
    
    // 尝试格式化为 JSON
    let displayContent: string;
    let isJson = false;
    
    try {
      if (typeof data === 'string') {
        // 如果是字符串，尝试解析为 JSON
        try {
          const parsed = JSON.parse(data);
          // 成功解析，格式化显示
          displayContent = JSON.stringify(parsed, null, 2);
          isJson = true;
        } catch {
          // 不是有效的 JSON，直接显示字符串
          displayContent = data;
          isJson = false;
        }
      } else if (typeof data === 'object' && data !== null) {
        // 如果是对象，格式化显示
        displayContent = JSON.stringify(data, null, 2);
        isJson = true;
      } else if (data === null || data === undefined) {
        // null或undefined
        displayContent = String(data);
        isJson = false;
      } else {
        // 其他类型（number, boolean等），转为字符串
        displayContent = String(data);
        isJson = false;
      }
    } catch (error) {
      console.error('Error formatting JSON:', error);
      displayContent = String(data);
      isJson = false;
    }

    return (
      <div className="border border-border rounded-lg bg-card overflow-hidden flex flex-col">
        {/* 操作按钮条 - 固定在顶部，不滚动 */}
        <div className="flex-shrink-0 flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
          <div className="text-xs font-semibold">
            {title || 'JSON 数据'}
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <Button
                size="sm"
                className="h-7"
                onClick={() => field && handleStartEdit(field, data)}
              >
                <Edit2 className="h-3 w-3 mr-1" />
                编辑
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              onClick={() => {
                navigator.clipboard.writeText(displayContent);
                toast({
                  title: t('copySuccess'),
                  description: title ? `${title}${t('copiedToClipboard')}` : t('contentCopiedToClipboard'),
                });
              }}
            >
              <Copy className="h-3 w-3 mr-1" />
              {tCommon('copy')}
            </Button>
          </div>
        </div>
        
        {/* 代码显示区域 - 可滚动 */}
        <div 
          className="flex-1 text-sm p-4 max-h-[500px] overflow-auto bg-muted text-foreground"
          style={{
            fontFamily: isJson ? '"Fira Code", "Consolas", "Monaco", monospace' : 'monospace',
            whiteSpace: 'pre',
          }}
        >
          {displayContent}
        </div>
      </div>
    );
  };

  const renderJsonWithColors = (jsonString: string) => {
    // 简单的语法高亮
    const lines = jsonString.split('\n');
    return lines.map((line, index) => {
      let coloredLine = line;
      
      // 键名高亮（蓝色）
      coloredLine = coloredLine.replace(/"([^"]+)":/g, '<span style="color: #7dd3fc">"$1"</span>:');
      
      // 字符串值高亮（绿色）
      coloredLine = coloredLine.replace(/: "([^"]*)"/g, ': <span style="color: #86efac">"$1"</span>');
      
      // 数字高亮（橙色）
      coloredLine = coloredLine.replace(/: (\d+\.?\d*)/g, ': <span style="color: #fdba74">$1</span>');
      
      // 布尔值高亮（紫色）
      coloredLine = coloredLine.replace(/: (true|false)/g, ': <span style="color: #c4b5fd">$1</span>');
      
      // null 高亮（红色）
      coloredLine = coloredLine.replace(/: (null)/g, ': <span style="color: #fca5a5">$1</span>');
      
      return (
        <div key={index} dangerouslySetInnerHTML={{ __html: coloredLine }} />
      );
    });
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('apiDetails')}</DialogTitle>
            <DialogDescription>{tCommon('loading')}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">{t('loadingApiDetails')}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!api) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge className={METHOD_COLORS[api.method]}>
                  {api.method}
                </Badge>
                <DialogTitle className="text-xl">{api.name}</DialogTitle>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs">URL:</span>
                  <span className="font-mono text-xs">{api.url}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleCopy(api.url, 'URL')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Path:</span>
                    {editMode.field === 'path' ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editMode.value}
                          onChange={(e) => setEditMode({ ...editMode, value: e.target.value })}
                          className="h-7 text-xs font-mono flex-1"
                          autoFocus
                          placeholder="/api/users/{id}"
                        />
                        <Button size="sm" className="h-7" onClick={handleSaveEdit} disabled={saving}>
                          {tCommon('save')}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7" onClick={handleCancelEdit}>
                          {tCommon('cancel')}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-mono text-xs">{api.path}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleStartEdit('path', api.path)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopy(api.path, 'Path')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                  {editMode.field === 'path' && (
                    <div className="text-xs ml-12 space-y-0.5">
                      <p className="text-muted-foreground">💡 示例: /api/users/{'{userId}'}</p>
                      <p className="text-amber-600 dark:text-amber-500">⚠️ 使用 {'{id}'} 格式，不是 ${'{"${id}"}'}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleStar}
              >
                <Star className={`h-4 w-4 ${api.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleToggleArchive}
              >
                <Archive className={`h-4 w-4 ${api.isArchived ? 'fill-current' : ''}`} />
              </Button>
              {onEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onEdit(api);
                    onOpenChange(false);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(t('confirmDeleteApi'))) {
                      onDelete(api.id);
                      onOpenChange(false);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4 py-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <Database className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <span className="text-muted-foreground">{t('category')}:</span>
                    <div className="mt-1 space-y-1">
                      {(() => {
                        const classifications = [];
                        
                        // 构建四层分类路径
                        if (api.platform) {
                          classifications.push(
                            <Badge key="platform" variant="outline" className="mr-1">
                              {api.platform}
                            </Badge>
                          );
                        }
                        
                        if (api.component) {
                          classifications.push(
                            <Badge key="component" variant="outline" className="mr-1">
                              {api.component}
                            </Badge>
                          );
                        }
                        
                        if (api.feature) {
                          classifications.push(
                            <Badge key="feature" variant="outline" className="mr-1">
                              {api.feature}
                            </Badge>
                          );
                        }
                        
                        if (api.subFeature) {
                          classifications.push(
                            <Badge key="subFeature" variant="outline" className="mr-1">
                              {api.subFeature}
                            </Badge>
                          );
                        }
                        
                        // 如果没有任何分类，显示"未分类"
                        return classifications.length > 0 
                          ? <div className="flex flex-wrap gap-1">{classifications}</div>
                          : <span className="text-sm text-muted-foreground">{t('uncategorized')}</span>;
                      })()}
                    </div>
                  </div>
                </div>
                {api.responseTime && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('responseTime')}:</span>
                    <span>{api.responseTime}ms</span>
                  </div>
                )}
                {api.responseSize && (
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('responseSize')}:</span>
                    <span>{(api.responseSize / 1024).toFixed(2)}KB</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('tags')}:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {api.tags?.length > 0 ? (
                      api.tags.map((apiTag: any) => (
                        <Badge key={apiTag.tag.id} variant="secondary">
                          {apiTag.tag.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">{t('noTags')}</span>
                    )}
                  </div>
                </div>
                {api.description && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">{t('description')}:</span>
                    <p className="mt-1">{api.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 详细信息 - 水平标签页布局 */}
        <div className="mt-4 border rounded-lg overflow-hidden">
          <Tabs defaultValue="request" className="w-full" onValueChange={(value) => {
            if (value === 'raw') {
              loadRawHarIfNeeded();
            }
          }}>
            {/* 顶部导航 */}
            <div className="bg-muted/30 border-b border-border">
              <TabsList className="w-full h-auto bg-transparent p-0 rounded-none justify-start">
                <TabsTrigger 
                  value="request" 
                  className="relative px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card/50 data-[state=active]:shadow-none transition-all text-muted-foreground data-[state=active]:text-foreground"
                >
                  <span className="mr-2">📤</span> 
                  <span className="font-medium">{t('requestInfo')}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="response"
                  className="relative px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card/50 data-[state=active]:shadow-none transition-all text-muted-foreground data-[state=active]:text-foreground"
                >
                  <span className="mr-2">📥</span> 
                  <span className="font-medium">{t('responseInfo')}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="raw"
                  className="relative px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-card/50 data-[state=active]:shadow-none transition-all text-muted-foreground data-[state=active]:text-foreground"
                >
                  <span className="mr-2">📋</span> 
                  <span className="font-medium">{t('rawData')}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* 内容区域 */}
            <div className="bg-card">
                <TabsContent value="request" className="m-0 p-6 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold">{t('requestHeaders')}</h4>
                      <Badge variant="outline">
                        {api.requestHeaders && typeof api.requestHeaders === 'object' ? Object.keys(api.requestHeaders).length : 0} {t('items')}
                      </Badge>
                    </div>
                    {renderJson(api.requestHeaders, t('requestHeaders'), 'requestHeaders', true)}
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold">{t('queryParameters')}</h4>
                      <Badge variant="outline">
                        {api.requestQuery && typeof api.requestQuery === 'object' ? Object.keys(api.requestQuery).length : 0} {t('items')}
                      </Badge>
                    </div>
                    {renderJson(api.requestQuery, t('queryParameters'), 'requestQuery', true)}
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold">{t('requestBody')}</h4>
                      {api.requestMimeType && <Badge variant="outline">{api.requestMimeType}</Badge>}
                    </div>
                    {renderJson(api.requestBody, t('requestBody'), 'requestBody', true)}
                  </div>
                </TabsContent>

                <TabsContent value="response" className="m-0 p-6 space-y-6">
                  {/* 状态信息卡片 */}
                  <div className="bg-card rounded-lg border border-border shadow-sm">
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-1 bg-primary rounded-full" />
                        <h4 className="text-lg font-semibold">{t('statusInfo')}</h4>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-card rounded-lg p-4 border border-border">
                          <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('statusCode')}</div>
                          <Badge 
                            variant={api.responseStatus >= 200 && api.responseStatus < 300 ? "default" : "destructive"}
                            className="text-lg px-3 py-1 font-bold"
                          >
                            {api.responseStatus}
                          </Badge>
                        </div>
                        {api.responseTime && (
                          <div className="bg-card rounded-lg p-4 border border-border">
                            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('responseTime')}</div>
                            <div className="text-xl font-bold">{api.responseTime}<span className="text-sm font-normal text-muted-foreground ml-1">ms</span></div>
                          </div>
                        )}
                        {api.responseSize && (
                          <div className="bg-card rounded-lg p-4 border border-border">
                            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t('responseSize')}</div>
                            <div className="text-xl font-bold">{(api.responseSize / 1024).toFixed(2)}<span className="text-sm font-normal text-muted-foreground ml-1">KB</span></div>
                          </div>
                        )}
                        {api.responseMimeType && (
                          <div className="bg-card rounded-lg p-4 border border-border col-span-2 md:col-span-1">
                            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Content-Type</div>
                            <div className="font-mono text-sm break-all">{api.responseMimeType}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 响应体卡片 */}
                  <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                    {/* 头部 */}
                    <div className="bg-muted/50 border-b border-border px-5 py-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-1 bg-emerald-500 rounded-full" />
                            <div>
                              <h4 className="text-base font-semibold">{t('responseBody')}</h4>
                              <p className="text-xs text-muted-foreground mt-0.5">Response Body</p>
                            </div>
                          </div>
                          {editMode.field !== 'responseBody' && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="h-8 px-3"
                                onClick={() => handleStartEdit('responseBody', api.responseBody)}
                              >
                                <Edit2 className="h-3.5 w-3.5 mr-1.5" />
                                {tCommon('edit')}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3"
                                onClick={() => {
                                  const content = typeof api.responseBody === 'string' 
                                    ? api.responseBody 
                                    : JSON.stringify(api.responseBody, null, 2);
                                  navigator.clipboard.writeText(content);
                                  toast({
                                    title: `✓ ${t('copySuccess')}`,
                                    description: t('responseBodyCopied'),
                                  });
                                }}
                              >
                                <Copy className="h-3.5 w-3.5 mr-1.5" />
                                {tCommon('copy')}
                              </Button>
                            </div>
                          )}
                      </div>
                    </div>
                    
                    {/* JSON内容区域或编辑区域 */}
                    {editMode.field === 'responseBody' ? (
                      // 编辑模式
                      <div className="p-6 bg-card">
                        <textarea
                          className="w-full min-h-[400px] p-4 rounded-md bg-muted text-foreground text-sm font-mono border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                          value={editMode.value}
                          onChange={(e) => setEditMode({ ...editMode, value: e.target.value })}
                          placeholder={t('enterJsonPlaceholder')}
                          style={{
                            fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                            whiteSpace: 'pre',
                            tabSize: 2,
                          }}
                        />
                        <div className="flex gap-2 justify-end mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
                            {tCommon('cancel')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleSaveEdit}
                            disabled={saving}
                          >
                            {saving ? t('saving') : tCommon('save')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // 显示模式
                      <div className="relative">
                        <div 
                          className="text-sm p-6 max-h-[500px] overflow-auto bg-muted text-foreground"
                          style={{
                            fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
                            whiteSpace: 'pre',
                            lineHeight: '1.6',
                          }}
                        >
                          {api.responseBody ? (
                            <div>
                              {(() => {
                                // 智能处理响应体
                                let displayContent = '';
                                
                                if (typeof api.responseBody === 'string') {
                                  try {
                                    // 尝试解析为JSON并格式化
                                    const parsed = JSON.parse(api.responseBody);
                                    displayContent = JSON.stringify(parsed, null, 2);
                                  } catch {
                                    // 不是有效JSON，直接显示
                                    displayContent = api.responseBody;
                                  }
                                } else {
                                  // 已经是对象，格式化显示
                                  displayContent = JSON.stringify(api.responseBody, null, 2);
                                }
                                
                                return displayContent;
                              })()}
                            </div>
                          ) : (
                            <div className="text-center py-16">
                              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                              </div>
                              <p className="text-muted-foreground text-sm">{t('noResponseData')}</p>
                            </div>
                          )}
                        </div>
                        {/* 滚动提示 */}
                        {api.responseBody && <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted to-transparent pointer-events-none" />}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="raw" className="m-0 p-6">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-lg font-semibold">{t('fullHarEntryData')}</h4>
                      <Badge variant="outline">{t('rawFormat')}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('harDescription')}
                    </p>
                    {loadingRawHar ? (
                      <div className="flex items-center justify-center py-12 border border-border rounded-lg bg-muted/30">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p className="text-sm text-muted-foreground">{t('loadingRawData')}</p>
                        </div>
                      </div>
                    ) : (
                      renderJson(api.rawHarEntry, t('harData'))
                    )}
                  </div>
                </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

