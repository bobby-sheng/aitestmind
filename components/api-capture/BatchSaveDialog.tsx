"use client";

import { useState, useEffect } from "react";
import { CapturedApi } from "@/types/har";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X } from "lucide-react";
import { FourLayerSelector } from "@/components/api-repository/FourLayerSelector";
import { 
  ApiConflictResolverDialog,
  type ApiConflict,
  type ConflictDecision,
} from "@/components/api-repository/ApiConflictResolverDialog";

interface Category {
  id: string;
  name: string;
  color?: string | null;
}

interface Tag {
  id: string;
  name: string;
  color?: string | null;
}

interface BatchSaveDialogProps {
  apis: CapturedApi[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    apis: Array<CapturedApi & {
      name: string;
      description?: string;
      categoryId?: string;
      tagIds?: string[];
    }>;
  }) => Promise<void>;
}

export function BatchSaveDialog({
  apis,
  open,
  onOpenChange,
  onSave,
}: BatchSaveDialogProps) {
  const { toast } = useToast();
  const t = useTranslations('apiCapture');
  const tCommon = useTranslations('common');
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [localTags, setLocalTags] = useState<Tag[]>([]);
  const [tagSearchTerm, setTagSearchTerm] = useState('');

  // 批量设置选项
  const [batchCategory, setBatchCategory] = useState<string>("NONE");
  const [batchTags, setBatchTags] = useState<string[]>([]);
  const [batchNamePrefix, setBatchNamePrefix] = useState("");
  const [batchDescription, setBatchDescription] = useState("");
  
  // 四层分类
  const [classification, setClassification] = useState<{
    platform?: string;
    component?: string;
    feature?: string;
  }>({});

  // 新建分类
  const [newCategoryName, setNewCategoryName] = useState("");
  
  // 冲突检测
  const [conflicts, setConflicts] = useState<ApiConflict[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [preparedApis, setPreparedApis] = useState<any[]>([]);

  // 加载分类和标签
  useEffect(() => {
    if (open) {
      loadCategoriesAndTags();
    }
  }, [open]);

  // 同步本地标签列表
  useEffect(() => {
    setLocalTags(tags);
  }, [tags]);

  const loadCategoriesAndTags = async () => {
    setLoading(true);
    try {
      const [categoriesRes, tagsRes] = await Promise.all([
        fetch('/api/api-library/categories'),
        fetch('/api/api-library/tags'),
      ]);

      const categoriesData = await categoriesRes.json();
      const tagsData = await tagsRes.json();

      if (categoriesData.success) {
        setCategories(categoriesData.data);
      }
      if (tagsData.success) {
        setTags(tagsData.data);
      }
    } catch (error) {
      console.error('Failed to load categories and tags:', error);
    } finally {
      setLoading(false);
    }
  };

  // 创建新分类
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch('/api/api-library/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      const data = await response.json();
      if (data.success) {
        setCategories(prev => [...prev, data.data]);
        setBatchCategory(data.data.id);
        setNewCategoryName("");
        toast({
          variant: "success",
          title: tCommon('success'),
          description: t('createCategorySuccess', { name: data.data.name }),
        });
      } else {
        toast({
          variant: "destructive",
          title: t('createCategoryFailed'),
          description: data.error,
        });
      }
    } catch (error) {
      console.error('Failed to create category:', error);
      toast({
        variant: "destructive",
        title: t('createCategoryFailed'),
        description: t('pleaseTryAgain'),
      });
    }
  };

  // 创建新标签
  const handleCreateTag = async () => {
    const tagName = tagSearchTerm.trim();
    if (!tagName) return;

    // 检查是否已存在
    const existingTag = localTags.find(
      (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
    );
    if (existingTag) {
      // 如果标签已存在，直接选中它
      toggleTag(existingTag.id);
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

      const data = await response.json();
      if (data.success) {
        const newTag = data.data;
        // 添加到本地标签列表
        setLocalTags(prev => [...prev, newTag]);
        setTags(prev => [...prev, newTag]);
        // 自动选中新创建的标签
        setBatchTags(prev => [...prev, newTag.id]);
        setTagSearchTerm('');
        toast({
          variant: "success",
          title: tCommon('success'),
          description: t('createTagSuccess', { name: newTag.name }),
        });
      } else {
        toast({
          variant: "destructive",
          title: t('createTagFailed'),
          description: data.error,
        });
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
      toast({
        variant: "destructive",
        title: t('createTagFailed'),
        description: t('pleaseTryAgain'),
      });
    } finally {
      setCreatingTag(false);
    }
  };

  // 切换标签选择
  const toggleTag = (tagId: string) => {
    setBatchTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // 标签过滤和匹配逻辑
  const filteredTags = localTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase())
  );

  const selectedTagObjects = localTags.filter((tag) =>
    batchTags.includes(tag.id)
  );

  // 检查是否有完全匹配的标签（大小写不敏感）
  const exactMatch = localTags.find((tag) => 
    tag.name.toLowerCase() === tagSearchTerm.trim().toLowerCase()
  );

  // 显示创建/选择按钮（当有输入时）
  const canShowCreateButton = tagSearchTerm.trim().length > 0;

  // 提取路径的最后一部分作为简短名称
  const getShortName = (path: string) => {
    // 移除查询参数
    const cleanPath = path.split('?')[0];
    // 提取路径最后一部分
    const segments = cleanPath.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || segments[segments.length - 2] || 'API';
    return lastSegment;
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
        throw new Error(result.error || t('checkDuplicateFailed'));
      }

      return result.data;
    } catch (error: any) {
      console.error('Failed to check conflicts:', error);
      toast({
        variant: "destructive",
        title: t('checkFailed'),
        description: error.message,
      });
      return [];
    }
  };

  // 保存
  const handleSave = async () => {
    // 验证必须选择平台
    if (!classification.platform) {
      toast({
        variant: "destructive",
        title: t('classificationRequired'),
        description: t('pleaseSelectPlatform'),
      });
      return;
    }
    
    setSaving(true);
    try {
      // 为每个API生成名称和元数据
      const apisToSave = apis.map((api, index) => {
        // 生成默认名称（更简洁）
        const shortName = getShortName(api.path);
        const defaultName = batchNamePrefix 
          ? `${batchNamePrefix}-${api.method}-${shortName}`
          : `${api.method}-${shortName}`;

        return {
          ...api,
          name: defaultName,
          description: batchDescription || undefined,
          categoryId: batchCategory && batchCategory !== 'NONE' ? batchCategory : undefined,
          tagIds: batchTags.length > 0 ? batchTags : undefined,
          platform: classification.platform,
          component: classification.component,
          feature: classification.feature,
          importSource: 'recording',
        };
      });

      // 检查冲突
      const checkResults = await checkConflicts(apisToSave);
      const conflictedApis = checkResults.filter((result: any) => result.isDuplicate);

      if (conflictedApis.length > 0) {
        // 有冲突，显示冲突解决对话框
        const conflictsData: ApiConflict[] = conflictedApis.map((result: any) => ({
          inputApi: result.inputApi,
          existingApi: result.existingApi,
        }));
        
        setConflicts(conflictsData);
        setPreparedApis(apisToSave);
        setShowConflictDialog(true);
        setSaving(false);
      } else {
        // 没有冲突，但仍需去重（可能录制时有重复请求）
        console.log(`\n🔍 [API采集-直接保存-开始去重] 总共 ${apisToSave.length} 个API待处理`);
        
        const deduplicatedApis = apisToSave.reduce((acc: any[], api: any, index: number) => {
          const key = `${api.method}|${api.path}`;
          const existingIndex = acc.findIndex(
            (a: any) => `${a.method}|${a.path}` === key
          );
          if (existingIndex === -1) {
            acc.push(api);
            console.log(`  ✅ [${index + 1}] 保留: ${api.method} ${api.path} - ${api.name}`);
          } else {
            console.log(`  ⚠️ [${index + 1}] 跳过重复: ${api.method} ${api.path} - ${api.name}`);
            // 用最新的数据替换
            acc[existingIndex] = api;
          }
          return acc;
        }, []);

        const duplicateCount = apisToSave.length - deduplicatedApis.length;
        console.log(`\n📋 [API采集-直接保存-去重完成] 原始: ${apisToSave.length} 个 → 去重后: ${deduplicatedApis.length} 个 | 去除重复: ${duplicateCount} 个\n`);

        await onSave({ apis: deduplicatedApis });
        
        if (duplicateCount > 0) {
          toast({
            title: t('saveSuccess'),
            description: `已保存 ${deduplicatedApis.length} 个API，自动过滤了 ${duplicateCount} 个重复项`,
            variant: 'default',
          });
        }
        
        onOpenChange(false);
        
        // 重置表单
        setBatchCategory("NONE");
        setBatchTags([]);
        setBatchNamePrefix("");
        setBatchDescription("");
        setClassification({});
        setSaving(false);
      }
    } catch (error: any) {
      console.error('Failed to save:', error);
      // toast already handled in onSave, no need to show again
      setSaving(false);
    }
  };

  // 处理冲突解决
  const handleConflictResolve = async (decisions: ConflictDecision[]) => {
    setSaving(true);
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
      // 原因：采集的API中可能包含对同一API的多次请求
      console.log(`\n🔍 [API采集-开始去重] 总共 ${apisToSave.length} 个API待处理`);
      
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
          const key = `${api.method}|${api.path}`;
          const existingIndex = acc.findIndex(
            (a: any) => !a._overwrite && `${a.method}|${a.path}` === key
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
      console.log(`\n📋 [API采集-去重完成] 原始: ${apisToSave.length} 个 → 去重后: ${deduplicatedApis.length} 个 | 去除重复: ${duplicateCount} 个`);
      console.log(`📝 [API采集-去重详情] 覆盖: ${deduplicatedApis.filter((a: any) => a._overwrite).length} 个, 创建: ${deduplicatedApis.filter((a: any) => !a._overwrite).length} 个\n`);

      if (deduplicatedApis.length > 0) {
        await onSave({ apis: deduplicatedApis });
        
        // 显示去重信息
        if (duplicateCount > 0) {
          toast({
            title: t('saveSuccess'),
            description: `已保存 ${deduplicatedApis.length} 个API，自动过滤了 ${duplicateCount} 个重复项`,
            variant: 'default',
          });
        }
      }
      
      onOpenChange(false);
      
      // 重置表单
      setBatchCategory("NONE");
      setBatchTags([]);
      setBatchNamePrefix("");
      setBatchDescription("");
      setClassification({});
      setTagSearchTerm('');
      setConflicts([]);
      setPreparedApis([]);
    } catch (error: any) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  // 取消冲突解决
  const handleConflictCancel = () => {
    setShowConflictDialog(false);
    setConflicts([]);
    setPreparedApis([]);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('saveToRepository')}</DialogTitle>
          <DialogDescription>
            {t('batchSave')} {apis.length} {t('items')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* API前缀 */}
            <div className="space-y-2">
              <Label htmlFor="namePrefix">{t('apiPrefix')}</Label>
              <Input
                id="namePrefix"
                placeholder={t('apiPrefixPlaceholder')}
                value={batchNamePrefix}
                onChange={(e) => setBatchNamePrefix(e.target.value)}
              />
            </div>

            {/* 描述 */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('descriptionOptional')}</Label>
              <Textarea
                id="description"
                placeholder={t('descriptionPlaceholder')}
                value={batchDescription}
                onChange={(e) => setBatchDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* 四层分类选择 */}
            <div className="space-y-2">
              <FourLayerSelector
                value={classification}
                onChange={setClassification}
                allowCreate={true}
              />
            </div>

            {/* 标签选择 */}
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
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* 标签搜索 */}
              <Input
                placeholder={t('searchOrCreateTags')}
                value={tagSearchTerm}
                onChange={(e) => setTagSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagSearchTerm.trim()) {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />

              {/* 标签列表 */}
              <div className="max-h-40 overflow-y-auto border rounded-md p-2">
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
                          batchTags.includes(tag.id)
                            ? 'default'
                            : 'outline'
                        }
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => toggleTag(tag.id)}
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

            {/* API列表预览 */}
            <div className="space-y-2">
              <Label>{t('apisToSave', { count: apis.length })}</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                {apis.map((api, index) => (
                  <div key={index} className="text-sm flex items-start gap-2">
                    <Badge variant="outline" className="text-xs flex-shrink-0 mt-0.5">
                      {api.method}
                    </Badge>
                    <span className="font-mono text-xs break-all">{api.path}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {tCommon('cancel')}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || saving || !classification.platform}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tCommon('save')} ({apis.length})
          </Button>
        </DialogFooter>
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

