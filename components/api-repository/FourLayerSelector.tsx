'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, Layers, Box, Grid } from 'lucide-react';

interface FourLayerSelectorProps {
  value: {
    platform?: string;
    component?: string;
    feature?: string;
  };
  onChange: (value: {
    platform?: string;
    component?: string;
    feature?: string;
  }) => void;
  allowCreate?: boolean; // 是否允许创建新分类
  refreshTrigger?: boolean; // 用于触发数据刷新
}

export function FourLayerSelector({
  value,
  onChange,
  allowCreate = true,
  refreshTrigger,
}: FourLayerSelectorProps) {
  const t = useTranslations('apiRepository.fourLayerSelector');
  const tCommon = useTranslations('common');

  const [existingData, setExistingData] = useState<{
    platforms: string[];
    components: Map<string, string[]>;
    features: Map<string, string[]>;
  }>({
    platforms: [],
    components: new Map(),
    features: new Map(),
  });

  const [createMode, setCreateMode] = useState<{
    platform: boolean;
    component: boolean;
    feature: boolean;
  }>({
    platform: false,
    component: false,
    feature: false,
  });

  const [newValues, setNewValues] = useState<{
    platform: string;
    component: string;
    feature: string;
  }>({
    platform: '',
    component: '',
    feature: '',
  });

  // 加载现有分类数据
  useEffect(() => {
    fetchExistingData();
  }, [refreshTrigger]); // 当refreshTrigger变化时重新加载数据

  const fetchExistingData = async () => {
    try {
      // 方案：同时从 classifications 表和现有 API 中提取分类
      // classifications 是预定义的分类结构，即使没有 API 也能显示
      
      // 1. 获取预定义的分类结构
      const classificationsResponse = await fetch('/api/api-library/classifications');
      const classificationsResult = await classificationsResponse.json();
      
      console.log('FourLayerSelector - 预定义分类查询结果:', classificationsResult);

      // 2. 获取所有API用于补充分类（包括归档的）
      const apisResponse = await fetch('/api/api-library/list?page=1&pageSize=10000&includeArchived=true');
      const apisResult = await apisResponse.json();

      console.log('FourLayerSelector - API查询结果:', apisResult);

      // 使用 Set 来合并两个来源的数据
      const platformsSet = new Set<string>();
      const componentsMap = new Map<string, Set<string>>();
      const featuresMap = new Map<string, Set<string>>();

      // 从 classifications 表提取
      if (classificationsResult.success && classificationsResult.data) {
        const classifications = classificationsResult.data;
        console.log('FourLayerSelector - 预定义分类数量:', classifications.length);
        
        classifications.forEach((classification: any) => {
          if (classification.platform) {
            platformsSet.add(classification.platform);

            if (classification.component) {
              if (!componentsMap.has(classification.platform)) {
                componentsMap.set(classification.platform, new Set());
            }
              componentsMap.get(classification.platform)!.add(classification.component);

              if (classification.feature) {
                const key = `${classification.platform}-${classification.component}`;
                if (!featuresMap.has(key)) {
                  featuresMap.set(key, new Set());
                }
                featuresMap.get(key)!.add(classification.feature);
              }
            }
          }
        });
      }

      // 从现有 API 补充
      if (apisResult.success && apisResult.data) {
        const apis = apisResult.data;
        console.log('FourLayerSelector - 现有API数量:', apis.length);

        apis.forEach((api: any) => {
          if (api.platform) {
            platformsSet.add(api.platform);

            if (api.component) {
              if (!componentsMap.has(api.platform)) {
                componentsMap.set(api.platform, new Set());
              }
              componentsMap.get(api.platform)!.add(api.component);

              if (api.feature) {
            const key = `${api.platform}-${api.component}`;
                if (!featuresMap.has(key)) {
                  featuresMap.set(key, new Set());
            }
                featuresMap.get(key)!.add(api.feature);
              }
            }
          }
        });
      }

      // 转换为数组并排序
      const platforms = Array.from(platformsSet).sort();
      const components = new Map<string, string[]>();
      componentsMap.forEach((value, key) => {
        components.set(key, Array.from(value).sort());
      });
      const features = new Map<string, string[]>();
      featuresMap.forEach((value, key) => {
        features.set(key, Array.from(value).sort());
      });

      console.log('FourLayerSelector - 最终提取到的平台:', platforms);
      console.log('FourLayerSelector - 最终组件数量:', components.size);
      console.log('FourLayerSelector - 最终功能数量:', features.size);

      setExistingData({ platforms, components, features });
    } catch (error) {
      console.error('Failed to fetch existing data:', error);
    }
  };

  // 处理平台选择/输入
  const handlePlatformChange = (platform: string) => {
    if (platform === '__create__') {
      setCreateMode({ ...createMode, platform: true });
      setNewValues({ ...newValues, platform: '' });
      onChange({ platform: undefined, component: undefined, feature: undefined });
    } else if (createMode.platform) {
      setNewValues({ ...newValues, platform });
      onChange({ platform, component: undefined, feature: undefined });
    } else {
      onChange({ platform, component: undefined, feature: undefined });
      setCreateMode({ platform: false, component: false, feature: false });
    }
  };

  // 处理组件选择/输入
  const handleComponentChange = (component: string) => {
    if (component === '__create__') {
      setCreateMode({ ...createMode, component: true });
      setNewValues({ ...newValues, component: '' });
      onChange({ ...value, component: undefined, feature: undefined });
    } else if (createMode.component) {
      setNewValues({ ...newValues, component });
      onChange({ ...value, component, feature: undefined });
    } else {
      onChange({ ...value, component, feature: undefined });
      setCreateMode({ ...createMode, component: false, feature: false });
    }
  };

  // 处理功能选择/输入
  const handleFeatureChange = (feature: string) => {
    if (feature === '__create__') {
      setCreateMode({ ...createMode, feature: true });
      setNewValues({ ...newValues, feature: '' });
      onChange({ ...value, feature: undefined });
    } else if (createMode.feature) {
      setNewValues({ ...newValues, feature });
      onChange({ ...value, feature });
    } else {
      onChange({ ...value, feature });
      setCreateMode({ ...createMode, feature: false });
    }
  };

  // 获取可用的组件列表
  const availableComponents =
    value.platform ? existingData.components.get(value.platform) || [] : [];

  // 获取可用的功能列表
  const availableFeatures =
    value.platform && value.component
      ? existingData.features.get(`${value.platform}-${value.component}`) || []
      : [];

  return (
    <div className="space-y-4">
      {/* 平台 (第1层) */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Layers className="h-4 w-4" />
          {t('platform')} <span className="text-red-500">*</span>
        </Label>
        {createMode.platform ? (
          <div className="flex gap-2">
            <Input
              value={newValues.platform}
              onChange={(e) => handlePlatformChange(e.target.value)}
              placeholder={t('platformPlaceholder')}
              autoFocus
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setCreateMode({ ...createMode, platform: false });
                setNewValues({ ...newValues, platform: '' });
              }}
            >
              {tCommon('cancel')}
            </Button>
          </div>
        ) : (
          <Select
            value={value.platform || ''}
            onValueChange={handlePlatformChange}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectPlatformPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {allowCreate && (
                <SelectItem value="__create__">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {t('createNewPlatform')}
                  </div>
                </SelectItem>
              )}
              {existingData.platforms.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {platform}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 组件 (第2层) */}
      {value.platform && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Box className="h-4 w-4" />
            {t('component')}
          </Label>
          {createMode.component ? (
            <div className="flex gap-2">
              <Input
                value={newValues.component}
                onChange={(e) => handleComponentChange(e.target.value)}
                placeholder={t('componentPlaceholder')}
                autoFocus
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCreateMode({ ...createMode, component: false });
                  setNewValues({ ...newValues, component: '' });
                }}
              >
                {tCommon('cancel')}
              </Button>
            </div>
          ) : (
            <Select
              value={value.component || ''}
              onValueChange={handleComponentChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectComponentPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {allowCreate && (
                  <SelectItem value="__create__">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {t('createNewComponent')}
                    </div>
                  </SelectItem>
                )}
                {availableComponents.map((component) => (
                  <SelectItem key={component} value={component}>
                    {component}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* 功能 (第3层) */}
      {value.platform && value.component && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            {t('feature')}
          </Label>
          {createMode.feature ? (
            <div className="flex gap-2">
              <Input
                value={newValues.feature}
                onChange={(e) => handleFeatureChange(e.target.value)}
                placeholder={t('featurePlaceholder')}
                autoFocus
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCreateMode({ ...createMode, feature: false });
                  setNewValues({ ...newValues, feature: '' });
                }}
              >
                {tCommon('cancel')}
              </Button>
            </div>
          ) : (
            <Select
              value={value.feature || ''}
              onValueChange={handleFeatureChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectFeaturePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {allowCreate && (
                  <SelectItem value="__create__">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      {t('createNewFeature')}
                    </div>
                  </SelectItem>
                )}
                {availableFeatures.map((feature) => (
                  <SelectItem key={feature} value={feature}>
                    {feature}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* 分类路径显示 */}
      {value.platform && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <div className="font-semibold mb-1">{t('classificationPath')}:</div>
          <div className="flex items-center gap-2 text-xs">
            <span>{value.platform}</span>
            {value.component && (
              <>
                <span>→</span>
                <span>{value.component}</span>
              </>
            )}
            {value.feature && (
              <>
                <span>→</span>
                <span>{value.feature}</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

