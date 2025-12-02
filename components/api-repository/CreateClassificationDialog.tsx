'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface CreateClassificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingData: {
    platforms: string[];
    components: Map<string, string[]>; // platform -> components
    features: Map<string, string[]>; // platform-component -> features
  };
  onSuccess: () => void;
  // 预设的父级分类上下文
  parentContext?: {
    platform?: string;
    component?: string;
  };
}

export function CreateClassificationDialog({
  open,
  onOpenChange,
  existingData,
  onSuccess,
  parentContext,
}: CreateClassificationDialogProps) {
  const t = useTranslations('apiRepository.createClassification');
  
  // 根据 parentContext 自动确定层级
  const getDefaultLevel = () => {
    if (!parentContext) return 'platform';
    if (parentContext.component) return 'feature';
    if (parentContext.platform) return 'component';
    return 'platform';
  };
  
  const [level, setLevel] = useState<'platform' | 'component' | 'feature'>(getDefaultLevel());
  const [platform, setPlatform] = useState(parentContext?.platform || '');
  const [component, setComponent] = useState(parentContext?.component || '');
  const [feature, setFeature] = useState('');
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 监听对话框打开和 parentContext 变化，更新状态
  useEffect(() => {
    if (open) {
      // 根据 parentContext 设置正确的 level
      if (parentContext?.component) {
        setLevel('feature');
        setPlatform(parentContext.platform || '');
        setComponent(parentContext.component);
      } else if (parentContext?.platform) {
        setLevel('component');
        setPlatform(parentContext.platform);
        setComponent('');
      } else {
        setLevel('platform');
        setPlatform('');
        setComponent('');
      }
      setNewName('');
      setFeature('');
    }
  }, [open, parentContext]);

  const handleSubmit = async () => {
    if (!newName.trim()) return;

    setIsSubmitting(true);
    try {
      // 构建保存的数据
      const classificationData = {
        level,
        platform: level === 'platform' ? newName : platform,
        component: level === 'component' ? newName : component || undefined,
        feature: level === 'feature' ? newName : undefined,
      };

      // 这里只需要保存分类结构，不需要创建实际的 API
      // 可以创建一个占位 API 或者直接在前端维护分类列表
      const response = await fetch('/api/api-library/create-classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classificationData),
      });

      if (!response.ok) throw new Error('Failed to create classification');

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error creating classification:', error);
      alert(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // 重置为初始状态（考虑 parentContext）
    setLevel(getDefaultLevel());
    setPlatform(parentContext?.platform || '');
    setComponent(parentContext?.component || '');
    setFeature('');
    setNewName('');
    onOpenChange(false);
  };

  const selectedComponents = platform ? existingData.components.get(platform) || [] : [];
  const selectedFeatures =
    platform && component
      ? existingData.features.get(`${platform}-${component}`) || []
      : [];

  // 根据上下文动态设置标题
  const getDialogTitle = () => {
    if (!parentContext) return t('title'); // "创建分类"
    if (parentContext.component) return t('addFeature'); // "添加功能"
    if (parentContext.platform) return t('addComponent'); // "添加组件"
    return t('title');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 显示父级上下文信息 */}
          {parentContext && (
            <div className="p-3 bg-muted rounded-md space-y-1 text-sm">
              <div className="font-medium">{t('parentContext') || '创建位置'}:</div>
              {parentContext.platform && (
                <div className="text-muted-foreground">
                  {t('platform')}: <span className="font-medium text-foreground">{parentContext.platform}</span>
                  {parentContext.component && (
                    <>
                      {' > '}
                      {t('component')}: <span className="font-medium text-foreground">{parentContext.component}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 选择层级 - 如果有父级上下文则禁用 */}
          {!parentContext && (
            <div className="space-y-2">
              <Label>{t('level')}</Label>
              <Select
                value={level}
                onValueChange={(value: any) => {
                  setLevel(value);
                  setNewName('');
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">{t('platform')}</SelectItem>
                  <SelectItem value="component">{t('component')}</SelectItem>
                  <SelectItem value="feature">{t('feature')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 如果创建组件，需要选择平台 - 如果已预设则禁用 */}
          {(level === 'component' || level === 'feature') && !parentContext?.platform && (
            <div className="space-y-2">
              <Label>{t('selectPlatform')}</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectPlatformPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {existingData.platforms.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 如果创建功能，需要选择组件 - 如果已预设则禁用 */}
          {level === 'feature' && platform && !parentContext?.component && (
            <div className="space-y-2">
              <Label>{t('selectComponent')}</Label>
              <Select value={component} onValueChange={setComponent}>
                <SelectTrigger>
                  <SelectValue placeholder={t('selectComponentPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {selectedComponents.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 输入新名称 */}
          <div className="space-y-2">
            <Label>
              {level === 'platform'
                ? t('platformName')
                : level === 'component'
                ? t('componentName')
                : t('featureName')}
            </Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={
                level === 'platform'
                  ? t('platformNamePlaceholder')
                  : level === 'component'
                  ? t('componentNamePlaceholder')
                  : t('featureNamePlaceholder')
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !newName.trim() ||
              (level !== 'platform' && !platform) ||
              (level === 'feature' && !component) ||
              isSubmitting
            }
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}




