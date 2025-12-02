"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ApiInfo } from '@/types/test-case';
import { Loader2, Search, X, Filter, Layers, Box, Grid, Tag as TagIcon } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface ApiSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectApi: (api: ApiInfo) => void;
}

interface Tag {
  id: string;
  name: string;
  color?: string;
  _count?: { apis: number };
}

export default function ApiSelectorDialog({
  open,
  onOpenChange,
  onSelectApi,
}: ApiSelectorDialogProps) {
  const t = useTranslations('apiSelector');
  const tCommon = useTranslations('common');
  const tTree = useTranslations('apiRepository.fourLayerTree');
  const [searchTerm, setSearchTerm] = useState('');
  const [apis, setApis] = useState<ApiInfo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [classifications, setClassifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  
  // 筛选条件
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [selectedFeature, setSelectedFeature] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 并行获取所有数据：APIs、标签、分类
      const [apisRes, tagsRes, classificationsRes] = await Promise.all([
        fetch('/api/api-library/list?pageSize=1000'),
        fetch('/api/api-library/tags'),
        fetch('/api/api-library/classifications'),
      ]);

      const [apisData, tagsData, classificationsData] = await Promise.all([
        apisRes.json(),
        tagsRes.json(),
        classificationsRes.json(),
      ]);

      if (apisData.success) {
        setApis(apisData.data);
      }
      if (tagsData.success) {
        setTags(tagsData.data);
      }
      if (classificationsData.success) {
        setClassifications(classificationsData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // 从APIs和分类中提取所有唯一的平台、组件、功能
  const { platforms, components, features } = useMemo(() => {
    const platformSet = new Set<string>();
    const componentSet = new Set<string>();
    const featureSet = new Set<string>();
    
    // 从APIs中提取
    apis.forEach(api => {
      if (api.platform) platformSet.add(api.platform);
      if (api.component) componentSet.add(api.component);
      if (api.feature) featureSet.add(api.feature);
    });
    
    // 从分类中提取
    classifications.forEach((c: any) => {
      if (c.platform) platformSet.add(c.platform);
      if (c.component) componentSet.add(c.component);
      if (c.feature) featureSet.add(c.feature);
    });
    
    return {
      platforms: Array.from(platformSet).sort(),
      components: Array.from(componentSet).sort(),
      features: Array.from(featureSet).sort(),
    };
  }, [apis, classifications]);

  // 复杂筛选逻辑
  const filteredApis = apis.filter((api) => {
    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        api.name.toLowerCase().includes(term) ||
        api.path.toLowerCase().includes(term) ||
        api.description?.toLowerCase().includes(term) ||
        api.platform?.toLowerCase().includes(term) ||
        api.component?.toLowerCase().includes(term) ||
        api.feature?.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }

    // 方法过滤
    if (selectedMethod !== 'all' && api.method !== selectedMethod) {
      return false;
    }

    // 四层分类过滤
    if (selectedPlatform !== 'all' && api.platform !== selectedPlatform) {
      return false;
    }
    
    if (selectedComponent !== 'all' && api.component !== selectedComponent) {
      return false;
    }
    
    if (selectedFeature !== 'all' && api.feature !== selectedFeature) {
      return false;
    }

    // 标签过滤（任意一个标签匹配即可）
    if (selectedTags.length > 0) {
      const apiTagIds = api.tags?.map((t: any) => t.tag?.id || t.tagId) || [];
      const hasMatchingTag = selectedTags.some(tagId => apiTagIds.includes(tagId));
      if (!hasMatchingTag) return false;
    }

    return true;
  });

  const handleSelect = (api: ApiInfo) => {
    onSelectApi(api);
    onOpenChange(false);
    resetFilters();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedMethod('all');
    setSelectedPlatform('all');
    setSelectedComponent('all');
    setSelectedFeature('all');
    setSelectedTags([]);
    setTagSearchTerm('');
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearAllFilters = () => {
    resetFilters();
  };

  const hasActiveFilters = selectedMethod !== 'all' || 
                          selectedPlatform !== 'all' || 
                          selectedComponent !== 'all' ||
                          selectedFeature !== 'all' ||
                          selectedTags.length > 0 ||
                          searchTerm !== '';

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-blue-500 hover:bg-blue-600',
      POST: 'bg-green-500 hover:bg-green-600',
      PUT: 'bg-yellow-500 hover:bg-yellow-600',
      DELETE: 'bg-red-500 hover:bg-red-600',
      PATCH: 'bg-purple-500 hover:bg-purple-600',
    };
    return colors[method] || 'bg-gray-500 hover:bg-gray-600';
  };

  const getCategoryColor = (color?: string) => {
    if (!color) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    return color;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl">{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* 左侧筛选面板 */}
          <div className="w-64 flex-shrink-0 border-r pr-4 space-y-4 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {t('filterTitle')}
                </h3>
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearAllFilters}
                    className="h-6 text-xs"
                  >
                    {t('clearFilters')}
                  </Button>
                )}
              </div>

              {/* 方法筛选 */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('requestMethod')}
                </label>
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t('selectMethod')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allMethods')}</SelectItem>
                    {methods.map(method => (
                      <SelectItem key={method} value={method}>
                        <span className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            getMethodColor(method).split(' ')[0]
                          )} />
                          {method}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 四层分类筛选 */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {tTree('platform')}
                </label>
                <Select value={selectedPlatform} onValueChange={(value) => {
                  setSelectedPlatform(value);
                  if (value === 'all') {
                    setSelectedComponent('all');
                    setSelectedFeature('all');
                  }
                }}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={tTree('selectPlatform')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tTree('allPlatforms')}</SelectItem>
                    {platforms.map(platform => (
                      <SelectItem key={platform} value={platform}>
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Box className="h-3 w-3" />
                  {tTree('component')}
                </label>
                <Select 
                  value={selectedComponent} 
                  onValueChange={(value) => {
                    setSelectedComponent(value);
                    if (value === 'all') {
                      setSelectedFeature('all');
                    }
                  }}
                  disabled={selectedPlatform === 'all'}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={tTree('selectComponent')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tTree('allComponents')}</SelectItem>
                    {components.map(component => (
                      <SelectItem key={component} value={component}>
                        {component}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Grid className="h-3 w-3" />
                  {tTree('feature')}
                </label>
                <Select 
                  value={selectedFeature} 
                  onValueChange={setSelectedFeature}
                  disabled={selectedComponent === 'all'}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={tTree('selectFeature')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tTree('allFeatures')}</SelectItem>
                    {features.map(feature => (
                      <SelectItem key={feature} value={feature}>
                        {feature}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 标签筛选 */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <TagIcon className="h-3 w-3" />
                  {t('tags')}
                </label>
                
                {/* 搜索输入框 */}
                <div className="relative">
                  <Input
                    placeholder={t('searchTags') || '搜索标签...'}
                    value={tagSearchTerm}
                    onChange={(e) => setTagSearchTerm(e.target.value)}
                    className="h-9 pr-8"
                  />
                  {tagSearchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      onClick={() => setTagSearchTerm('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                {/* 已选标签显示 */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-muted/50 rounded-md">
                    {selectedTags.map(tagId => {
                      const tag = tags.find(t => t.id === tagId);
                      return tag ? (
                        <Badge
                          key={tag.id}
                          variant="default"
                          className="cursor-pointer"
                          onClick={() => toggleTag(tag.id)}
                        >
                          {tag.name}
                          <X className="ml-1 h-3 w-3" />
                        </Badge>
                      ) : null;
                    })}
                  </div>
                )}
                
                {/* 标签下拉列表 */}
                <div className="max-h-32 overflow-y-auto border rounded-md">
                  {tags
                    .filter(tag => 
                      !tagSearchTerm || 
                      tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase())
                    )
                    .map(tag => (
                      <div
                        key={tag.id}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent transition-colors",
                          selectedTags.includes(tag.id) && "bg-accent"
                        )}
                        onClick={() => toggleTag(tag.id)}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-4 rounded border flex items-center justify-center",
                            selectedTags.includes(tag.id) 
                              ? "bg-primary border-primary" 
                              : "border-muted-foreground"
                          )}>
                            {selectedTags.includes(tag.id) && (
                              <div className="h-2 w-2 bg-primary-foreground rounded-sm" />
                            )}
                          </div>
                          <span className="text-sm">{tag.name}</span>
                        </div>
                        {tag._count && (
                          <span className="text-xs text-muted-foreground">
                            {tag._count.apis}
                          </span>
                        )}
                      </div>
                    ))}
                  {tags.filter(tag => 
                    !tagSearchTerm || 
                    tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase())
                  ).length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {tagSearchTerm ? t('noMatchingTags') || '无匹配标签' : t('noTags')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧API列表 */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* 搜索框 */}
            <div className="flex-shrink-0 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-9"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* 结果统计 */}
            <div className="flex-shrink-0 mb-3 text-sm text-muted-foreground">
              {t('foundApis')} <span className="font-semibold text-foreground">{filteredApis.length}</span> {t('apisCount')}
            </div>

            {/* API列表 */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredApis.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-muted-foreground mb-2">
                    {hasActiveFilters ? t('noMatchingApis') : t('noApiData')}
                  </div>
                  {hasActiveFilters && (
                    <Button variant="link" onClick={clearAllFilters}>
                      {t('clearFiltersAction')}
                    </Button>
                  )}
                </div>
              ) : (
                filteredApis.map((api) => (
                  <Card
                    key={api.id}
                    className="p-4 cursor-pointer hover:shadow-md transition-all hover:border-primary"
                    onClick={() => handleSelect(api)}
                  >
                    <div className="space-y-2">
                      {/* 第一行：方法 + 名称 */}
                      <div className="flex items-start gap-3">
                        <Badge
                          className={cn(
                            getMethodColor(api.method),
                            "text-white text-xs px-2.5 py-0.5 font-semibold flex-shrink-0"
                          )}
                        >
                          {api.method}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base leading-tight mb-1">
                            {api.name}
                          </div>
                          <div className="text-sm text-muted-foreground font-mono break-all">
                            {api.path}
                          </div>
                        </div>
                      </div>

                      {/* 第二行：描述 */}
                      {api.description && (
                        <div className="text-sm text-muted-foreground line-clamp-2 pl-[52px]">
                          {api.description}
                        </div>
                      )}

                      {/* 第三行：四层分类和标签 */}
                      <div className="flex items-center gap-2 flex-wrap pl-[52px]">
                        {api.platform && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                          >
                            <Layers className="h-3 w-3 mr-1" />
                            {api.platform}
                          </Badge>
                        )}
                        {api.component && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                          >
                            <Box className="h-3 w-3 mr-1" />
                            {api.component}
                          </Badge>
                        )}
                        {api.feature && (
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                          >
                            <Grid className="h-3 w-3 mr-1" />
                            {api.feature}
                          </Badge>
                        )}
                        {api.tags && api.tags.length > 0 && (
                          <>
                            {api.tags.map((apiTag: any) => (
                              <Badge 
                                key={apiTag.id} 
                                variant="outline"
                                className="text-xs"
                              >
                                <TagIcon className="h-3 w-3 mr-1" />
                                {apiTag.tag.name}
                              </Badge>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

