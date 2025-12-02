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

interface ApiEditDialogProps {
  open: boolean;
  api?: any;
  categories: any[];
  tags: any[];
  allApis: any[]; // 用于提取分类列表
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ApiEditDialog({
  open,
  api,
  categories,
  tags,
  allApis,
  onOpenChange,
  onSuccess,
}: ApiEditDialogProps) {
  const { toast } = useToast();
  const t = useTranslations('apiRepository.apiEditDialog');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const [localTags, setLocalTags] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    path: '',
    platform: '',
    component: '',
    feature: '',
    selectedTags: [] as string[],
  });
  const [tagSearchTerm, setTagSearchTerm] = useState('');

  // 从 categories（预定义分类）和 allApis（已有API）中提取所有可用的分类选项
  // 合并两个数据源，确保显示所有可用的平台
  const platforms = Array.from(
    new Set([
      ...categories.filter(c => c.platform).map(c => c.platform),
      ...allApis.filter(a => a.platform).map(a => a.platform)
    ])
  ).sort();

  // 调试日志
  if (open) {
    console.log('🔍 ApiEditDialog 数据加载情况:');
    console.log('  - categories 数量:', categories.length);
    console.log('  - allApis 数量:', allApis.length);
    console.log('  - 提取的平台列表:', platforms);
    console.log('  - categories 详情:', categories);
  }

  const components = formData.platform
    ? Array.from(
        new Set([
          ...categories
            .filter(c => c.platform === formData.platform && c.component)
            .map(c => c.component),
          ...allApis
            .filter(a => a.platform === formData.platform && a.component)
            .map(a => a.component)
        ])
      ).sort()
    : [];

  const features = formData.platform && formData.component
    ? Array.from(
        new Set([
          ...categories
            .filter(
              c =>
                c.platform === formData.platform &&
                c.component === formData.component &&
                c.feature
            )
            .map(c => c.feature),
          ...allApis
            .filter(
              a =>
                a.platform === formData.platform &&
                a.component === formData.component &&
                a.feature
            )
            .map(a => a.feature)
        ])
      ).sort()
    : [];

  useEffect(() => {
    if (open) {
      // 初始化本地标签列表
      setLocalTags(tags);
    }
  }, [tags, open]);

  useEffect(() => {
    if (api) {
      setFormData({
        name: api.name || '',
        description: api.description || '',
        path: api.path || '',
        platform: api.platform || '',
        component: api.component || '',
        feature: api.feature || '',
        selectedTags: api.tags?.map((t: any) => t.tagId) || [],
      });
    } else {
      setFormData({
        name: '',
        description: '',
        path: '',
        platform: '',
        component: '',
        feature: '',
        selectedTags: [],
      });
    }
  }, [api, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!api) {
        throw new Error(t('apiDataNotExist'));
      }

      const response = await fetch(`/api/api-library/apis/${api.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          path: formData.path,
          platform: formData.platform || null,
          component: formData.component || null,
          feature: formData.feature || null,
          tags: formData.selectedTags,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: t('updateSuccess'),
          description: `${t('api')}"${formData.name}"${t('updated')}`,
        });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(result.error || t('updateFailed'));
      }
    } catch (error: any) {
      toast({
        title: t('updateFailed'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
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

            <div className="space-y-2">
              <Label htmlFor="path">{t('apiPath')} *</Label>
              <Input
                id="path"
                value={formData.path}
                onChange={(e) =>
                  setFormData({ ...formData, path: e.target.value })
                }
                placeholder={t('apiPathPlaceholder')}
                className="font-mono text-sm"
                required
              />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>{t('apiPathHint')}</p>
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                  <span>⚠️</span>
                  <span>{t('apiPathWarning')}</span>
                </div>
              </div>
            </div>

            {/* 四层分类 - 级联下拉选择 */}
            <div className="space-y-3 border rounded-md p-4 bg-muted/30">
              <Label className="text-base font-semibold">{t('classification')}</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {/* 平台 */}
                <div className="space-y-2">
                  <Label htmlFor="platform" className="text-xs">{t('platform')}</Label>
                  <Select
                    value={formData.platform}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        platform: value,
                        component: '', // 重置组件
                        feature: '', // 重置功能
                      });
                    }}
                  >
                    <SelectTrigger id="platform">
                      <SelectValue placeholder={t('platformPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 组件 */}
                <div className="space-y-2">
                  <Label htmlFor="component" className="text-xs">{t('component')}</Label>
                  <Select
                    value={formData.component}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        component: value,
                        feature: '', // 重置功能
                      });
                    }}
                    disabled={!formData.platform}
                  >
                    <SelectTrigger id="component">
                      <SelectValue placeholder={t('componentPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {components.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 功能 */}
                <div className="space-y-2">
                  <Label htmlFor="feature" className="text-xs">{t('feature')}</Label>
                  <Select
                    value={formData.feature}
                    onValueChange={(value) => {
                      setFormData({
                        ...formData,
                        feature: value,
                      });
                    }}
                    disabled={!formData.component}
                  >
                    <SelectTrigger id="feature">
                      <SelectValue placeholder={t('featurePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {features.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {t('classificationHint')}
              </div>
            </div>

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

            {/* API固定信息展示 */}
            {api && (
              <div className="space-y-2 p-3 bg-muted/30 rounded-md">
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('method')}:</span>{' '}
                  <Badge>{api.method}</Badge>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">URL:</span>{' '}
                  <span className="font-mono text-xs">{api.url}</span>
                </div>
              </div>
            )}
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
              {loading ? t('saving') : tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

