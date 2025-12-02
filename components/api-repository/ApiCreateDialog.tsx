'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { X, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { 
  ApiConflictResolverDialog,
  type ApiConflict,
  type ConflictDecision,
} from '@/components/api-repository/ApiConflictResolverDialog';
import { FourLayerSelector } from '@/components/api-repository/FourLayerSelector';

interface ApiCreateDialogProps {
  open: boolean;
  categories: any[];
  tags: any[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

export function ApiCreateDialog({
  open,
  categories,
  tags,
  onOpenChange,
  onSuccess,
}: ApiCreateDialogProps) {
  const { toast } = useToast();
  const t = useTranslations('apiRepository.apiCreateDialog');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [localTags, setLocalTags] = useState<any[]>([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  
  // 手动输入表单
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    method: 'GET',
    url: '',
    categoryId: '',
    selectedTags: [] as string[],
    requestHeaders: '{}',
    requestBody: '',
    responseBody: '',
    platform: undefined as string | undefined,
    component: undefined as string | undefined,
    feature: undefined as string | undefined,
  });
  
  // 冲突检测
  const [conflicts, setConflicts] = useState<ApiConflict[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [preparedApiData, setPreparedApiData] = useState<any>(null);

  useEffect(() => {
    if (open) {
      // 初始化本地标签列表
      setLocalTags(tags);
    } else {
      // 对话框关闭时重置表单
      resetForm();
    }
  }, [tags, open]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      method: 'GET',
      url: '',
      categoryId: '',
      selectedTags: [],
      requestHeaders: '{}',
      requestBody: '',
      responseBody: '',
      platform: undefined,
      component: undefined,
      feature: undefined,
    });
    setTagSearchTerm('');
  };

  const handleToggleTag = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter((id) => id !== tagId)
        : [...prev.selectedTags, tagId],
    }));
  };

  const handleCreateTag = async () => {
    const tagName = tagSearchTerm.trim();
    if (!tagName) return;

    // 检查是否已存在
    const existingTag = localTags.find(
      (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
    );
    if (existingTag) {
      handleToggleTag(existingTag.id);
      setTagSearchTerm('');
      return;
    }

    setCreatingTag(true);
    try {
      const response = await fetch('/api/api-library/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: tagName }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const newTag = result.data;
        // 添加到本地标签列表
        setLocalTags((prev) => [...prev, newTag]);
        // 自动选中新创建的标签
        handleToggleTag(newTag.id);
        setTagSearchTerm('');
        toast({
          title: t('tagCreated'),
          description: `${t('tag')}"${tagName}"${t('created')}`,
        });
      } else {
        throw new Error(result.error || t('tagCreationFailed'));
      }
    } catch (error: any) {
      toast({
        title: t('tagCreationFailed'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCreatingTag(false);
    }
  };

  const filteredTags = localTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase())
  );

  const selectedTagObjects = localTags.filter((tag) =>
    formData.selectedTags.includes(tag.id)
  );

  // 检查是否有完全匹配的标签（大小写不敏感）
  const exactMatch = localTags.find((tag) => 
    tag.name.toLowerCase() === tagSearchTerm.trim().toLowerCase()
  );

  // 总是显示创建/选择按钮（当有输入时）
  const canShowCreateButton = tagSearchTerm.trim().length > 0;

  // 检查冲突
  const checkConflicts = async (apiToCheck: any) => {
    try {
      const response = await fetch('/api/api-library/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apis: [apiToCheck] }),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 验证必填字段
      if (!formData.name || !formData.method || !formData.url) {
        throw new Error(t('requiredFieldsError'));
      }

      // 验证四层分类：平台为必填
      if (!formData.platform) {
        throw new Error(t('platformRequired') || '请选择平台分类');
      }

      // 解析JSON字段
      let requestHeaders = {};
      let requestBody = null;
      let responseBody = null;

      try {
        if (formData.requestHeaders.trim()) {
          requestHeaders = JSON.parse(formData.requestHeaders);
        }
      } catch {
        throw new Error(t('requestHeadersFormatError'));
      }

      if (formData.requestBody.trim()) {
        try {
          requestBody = JSON.parse(formData.requestBody);
        } catch {
          // 如果不是JSON，保留原始字符串
          requestBody = formData.requestBody;
        }
      }

      if (formData.responseBody.trim()) {
        try {
          responseBody = JSON.parse(formData.responseBody);
        } catch {
          // 如果不是JSON，保留原始字符串
          responseBody = formData.responseBody;
        }
      }

      // 提取Content-Type
      const contentType = (requestHeaders as any)['Content-Type'] || 
                         (requestHeaders as any)['content-type'] || 
                         'application/json';

      const apiData = {
        name: formData.name,
        description: formData.description,
        method: formData.method,
        url: formData.url,
        categoryId: formData.categoryId === 'NONE' ? null : formData.categoryId,
        tags: formData.selectedTags,
        requestHeaders,
        requestBody,
        requestMimeType: contentType,
        responseBody,
        // 四层分类
        platform: formData.platform,
        component: formData.component,
        feature: formData.feature,
      };

      // 检查冲突
      const checkResults = await checkConflicts(apiData);
      const conflictedApi = checkResults.find((result: any) => result.isDuplicate);

      if (conflictedApi) {
        // 有冲突，显示冲突解决对话框
        const conflictsData: ApiConflict[] = [{
          inputApi: conflictedApi.inputApi,
          existingApi: conflictedApi.existingApi,
        }];
        
        setConflicts(conflictsData);
        setPreparedApiData(apiData);
        setShowConflictDialog(true);
        setLoading(false);
      } else {
        // 没有冲突，直接创建
        const response = await fetch('/api/api-library/apis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData),
        });

        const result = await response.json();

        if (result.success) {
          toast({
            title: t('createSuccess'),
            description: `${t('api')}"${formData.name}"${t('created')}`,
          });
          resetForm();
          onSuccess();
          onOpenChange(false);
        } else {
          throw new Error(result.error || t('createFailed'));
        }
        setLoading(false);
      }
    } catch (error: any) {
      toast({
        title: t('createFailed'),
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  // 处理冲突解决
  const handleConflictResolve = async (decisions: ConflictDecision[]) => {
    setLoading(true);
    setShowConflictDialog(false);
    
    try {
      const decision = decisions[0];
      
      if (decision.resolution === 'skip') {
        // 跳过创建
        toast({
          title: "已取消",
          description: "API创建已取消",
        });
        setConflicts([]);
        setPreparedApiData(null);
        setLoading(false);
        return;
      }
      
      let apiData = { ...preparedApiData };
      
      if (decision.resolution === 'overwrite') {
        // 覆盖：使用PUT更新现有API
        // 清理空字符串，转换为 null（避免外键约束错误）
        const cleanedApiData = {
          ...apiData,
          categoryId: apiData.categoryId || null,
        };
        
        const response = await fetch(`/api/api-library/apis/${decision.existingApi.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanedApiData),
        });

        const result = await response.json();

        if (result.success) {
          toast({
            title: "更新成功",
            description: `已覆盖更新API "${formData.name}"`,
          });
          resetForm();
          onSuccess();
          onOpenChange(false);
        } else {
          throw new Error(result.error || '更新失败');
        }
      } else if (decision.resolution === 'create_new') {
        // 创建新的：添加后缀
        apiData.name = `${apiData.name} (副本)`;
        
        const response = await fetch('/api/api-library/apis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiData),
        });

        const result = await response.json();

        if (result.success) {
          toast({
            title: t('createSuccess'),
            description: `${t('api')}"${apiData.name}"${t('created')}`,
          });
          resetForm();
          onSuccess();
          onOpenChange(false);
        } else {
          throw new Error(result.error || t('createFailed'));
        }
      }
      
      setConflicts([]);
      setPreparedApiData(null);
    } catch (error: any) {
      console.error('操作失败:', error);
      toast({
        title: '操作失败',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 取消冲突解决
  const handleConflictCancel = () => {
    setShowConflictDialog(false);
    setConflicts([]);
    setPreparedApiData(null);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('apiName')} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t('apiNamePlaceholder')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">{t('requestMethod')} *</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HTTP_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL *</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                  placeholder="https://api.example.com/users"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('apiDescription')}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t('apiDescriptionPlaceholder')}
                />
              </div>

              {/* 四层分类选择器 */}
              <FourLayerSelector
                value={{
                  platform: formData.platform,
                  component: formData.component,
                  feature: formData.feature,
                }}
                onChange={(classification) => {
                  setFormData({
                    ...formData,
                    platform: classification.platform,
                    component: classification.component,
                    feature: classification.feature,
                  });
                }}
                allowCreate={true}
                refreshTrigger={open}
              />

              <div className="space-y-2">
                <Label>{t('tags')}</Label>
                
                {/* 已选择的标签 */}
                {selectedTagObjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 p-2 border rounded-md bg-muted/30">
                    {selectedTagObjects.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        onClick={() => handleToggleTag(tag.id)}
                      >
                        {tag.name}
                        <X className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* 标签搜索 */}
                <Input
                  placeholder={t('searchTags')}
                  value={tagSearchTerm}
                  onChange={(e) => setTagSearchTerm(e.target.value)}
                />

                {/* 标签列表 */}
                <div className="max-h-32 overflow-y-auto border rounded-md p-2">
                  <div className="flex flex-wrap gap-2">
                    {/* 创建/选择标签按钮 */}
                    {canShowCreateButton && (
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors border-dashed border-2 border-primary"
                        onClick={handleCreateTag}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {exactMatch ? t('selectTag') : t('createTag')}: "{tagSearchTerm.trim()}"
                      </Badge>
                    )}
                    
                    {/* 现有标签列表 */}
                    {filteredTags.length > 0 ? (
                      filteredTags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant={
                            formData.selectedTags.includes(tag.id)
                              ? 'default'
                              : 'outline'
                          }
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => handleToggleTag(tag.id)}
                        >
                          {tag.name}
                        </Badge>
                      ))
                    ) : !canShowCreateButton ? (
                      <p className="text-sm text-muted-foreground">
                        {tagSearchTerm ? t('noMatchingTags') : t('noTags')}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestHeaders">{t('requestHeaders')}</Label>
                <Textarea
                  id="requestHeaders"
                  value={formData.requestHeaders}
                  onChange={(e) =>
                    setFormData({ ...formData, requestHeaders: e.target.value })
                  }
                  placeholder={t('requestHeadersPlaceholder')}
                  rows={3}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requestBody">{t('requestBody')}</Label>
                <Textarea
                  id="requestBody"
                  value={formData.requestBody}
                  onChange={(e) =>
                    setFormData({ ...formData, requestBody: e.target.value })
                  }
                  placeholder={t('requestBodyPlaceholder')}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responseBody">{t('responseBody')}</Label>
                <Textarea
                  id="responseBody"
                  value={formData.responseBody}
                  onChange={(e) =>
                    setFormData({ ...formData, responseBody: e.target.value })
                  }
                  placeholder={t('responseBodyPlaceholder')}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('creating') : tCommon('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      {/* 冲突解决对话框 */}
      <ApiConflictResolverDialog
        open={showConflictDialog}
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        onCancel={handleConflictCancel}
      />
    </Dialog>
  );
}

