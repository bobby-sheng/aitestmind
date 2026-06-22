'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type ConflictResolution = 'skip' | 'overwrite';

export interface ApiConflict {
  inputApi: {
    id?: string;
    method: string;
    url: string;
    path?: string;
    name?: string;
    [key: string]: any;
  };
  existingApi: {
    id: string;
    name: string;
    method: string;
    url: string;
    path: string;
    updatedAt: string;
    [key: string]: any;
  };
}

export interface ConflictDecision {
  inputApi: any;
  existingApi: any;
  resolution: ConflictResolution;
}

interface ApiConflictResolverDialogProps {
  open: boolean;
  conflicts: ApiConflict[];
  onResolve: (decisions: ConflictDecision[]) => void;
  onCancel: () => void;
}

/**
 * API冲突解决对话框
 * 
 * 用于处理API导入/创建时的重复冲突
 * 逐个显示冲突的API，让用户选择处理方式：
 * - 跳过：保留原有的API，不导入新的
 * - 覆盖：用新的API覆盖原有的
 */
export function ApiConflictResolverDialog({
  open,
  conflicts,
  onResolve,
  onCancel,
}: ApiConflictResolverDialogProps) {
  const t = useTranslations('apiRepository.conflictResolver');
  const tCommon = useTranslations('common');
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<ConflictDecision[]>([]);
  const [currentResolution, setCurrentResolution] = useState<ConflictResolution>('skip');

  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  const currentConflict = conflicts[currentIndex];
  const isLastConflict = currentIndex === conflicts.length - 1;
  const progress = `${currentIndex + 1}/${conflicts.length}`;

  // 处理当前冲突的决策
  const handleNext = () => {
    const newDecision: ConflictDecision = {
      inputApi: currentConflict.inputApi,
      existingApi: currentConflict.existingApi,
      resolution: currentResolution,
    };

    const updatedDecisions = [...decisions, newDecision];
    setDecisions(updatedDecisions);

    if (isLastConflict) {
      // 所有冲突都已处理，返回结果
      onResolve(updatedDecisions);
      // 重置状态
      setCurrentIndex(0);
      setDecisions([]);
      setCurrentResolution('skip');
    } else {
      // 继续下一个冲突
      setCurrentIndex(currentIndex + 1);
      setCurrentResolution('skip'); // 重置为默认选项
    }
  };

  // 取消处理
  const handleCancel = () => {
    setCurrentIndex(0);
    setDecisions([]);
    setCurrentResolution('skip');
    onCancel();
  };

  // 批量处理：对所有剩余冲突应用相同的决策
  const handleApplyToAll = (resolution: ConflictResolution) => {
    const allDecisions: ConflictDecision[] = [];
    
    // 已经处理过的决策
    allDecisions.push(...decisions);
    
    // 从当前冲突开始到最后，全部应用同一决策
    for (let i = currentIndex; i < conflicts.length; i++) {
      allDecisions.push({
        inputApi: conflicts[i].inputApi,
        existingApi: conflicts[i].existingApi,
        resolution: resolution,
      });
    }
    
    console.log(`🎯 [批量处理] 对剩余 ${conflicts.length - currentIndex} 个冲突应用: ${resolution}`);
    
    // 返回结果
    onResolve(allDecisions);
    
    // 重置状态
    setCurrentIndex(0);
    setDecisions([]);
    setCurrentResolution('skip');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
              {t('title')}
            </DialogTitle>
            <Badge variant="outline">{progress}</Badge>
          </div>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {/* 批量操作按钮 */}
        {conflicts.length > 1 && (
          <div className="border-y border-[#e5e7eb] dark:border-[#4b5563] py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {t('batchActions')}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyToAll('skip')}
                  className="h-8"
                >
                  {t('skipAll')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleApplyToAll('overwrite')}
                  className="h-8"
                >
                  {t('overwriteAll')}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 py-4">
          {/* 冲突的API信息对比 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 新API */}
            <Card className="border-blue-500/30 bg-blue-500/5 dark:border-blue-500/50 dark:bg-blue-500/10">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{t('newApi')}</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('method')}: </span>
                    <Badge className="bg-blue-500 hover:bg-blue-600">{currentConflict.inputApi.method}</Badge>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">{t('name')}: </span>
                    <span className="font-medium text-foreground">{currentConflict.inputApi.name || t('unnamed')}</span>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">{t('path')}: </span>
                    <code className="text-xs bg-muted px-2 py-1 rounded break-all text-foreground">
                      {currentConflict.inputApi.path || currentConflict.inputApi.url}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 已存在的API */}
            <Card className="border-orange-500/30 bg-orange-500/5 dark:border-orange-500/50 dark:bg-orange-500/10">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold">
                  <XCircle className="h-4 w-4" />
                  <span>{t('existingApi')}</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('method')}: </span>
                    <Badge className="bg-orange-500 hover:bg-orange-600">{currentConflict.existingApi.method}</Badge>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">{t('name')}: </span>
                    <span className="font-medium text-foreground">{currentConflict.existingApi.name}</span>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">{t('path')}: </span>
                    <code className="text-xs bg-muted px-2 py-1 rounded break-all text-foreground">
                      {currentConflict.existingApi.path}
                    </code>
                  </div>
                  
                  {/* 显示分类信息 */}
                  {(currentConflict.existingApi.platform || currentConflict.existingApi.component || currentConflict.existingApi.feature || currentConflict.existingApi.subFeature) && (
                    <div>
                      <span className="text-muted-foreground">{t('category')}: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {currentConflict.existingApi.platform && (
                          <Badge variant="outline" className="text-xs">
                            {currentConflict.existingApi.platform}
                          </Badge>
                        )}
                        {currentConflict.existingApi.component && (
                          <>
                            {currentConflict.existingApi.platform && <span className="text-muted-foreground">/</span>}
                            <Badge variant="outline" className="text-xs">
                              {currentConflict.existingApi.component}
                            </Badge>
                          </>
                        )}
                        {currentConflict.existingApi.feature && (
                          <>
                            {(currentConflict.existingApi.platform || currentConflict.existingApi.component) && <span className="text-muted-foreground">/</span>}
                            <Badge variant="outline" className="text-xs">
                              {currentConflict.existingApi.feature}
                            </Badge>
                          </>
                        )}
                        {currentConflict.existingApi.subFeature && (
                          <>
                            {(currentConflict.existingApi.platform || currentConflict.existingApi.component || currentConflict.existingApi.feature) && <span className="text-muted-foreground">/</span>}
                            <Badge variant="outline" className="text-xs">
                              {currentConflict.existingApi.subFeature}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-muted-foreground">{t('lastUpdated')}: </span>
                    <span className="text-xs text-foreground">
                      {new Date(currentConflict.existingApi.updatedAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 处理选项 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">{t('selectAction')}</Label>
            <RadioGroup value={currentResolution} onValueChange={(v) => setCurrentResolution(v as ConflictResolution)}>
              <Card className={`cursor-pointer transition-all ${
                currentResolution === 'skip' ? 'border-primary bg-primary/10 shadow-sm' : 'hover:border-muted-foreground/50 hover:bg-muted/50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="skip" id="skip" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="skip" className="cursor-pointer font-semibold text-foreground">
                        {t('skip')}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('skipDescription')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`cursor-pointer transition-all ${
                currentResolution === 'overwrite' ? 'border-primary bg-primary/10 shadow-sm' : 'hover:border-muted-foreground/50 hover:bg-muted/50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value="overwrite" id="overwrite" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="overwrite" className="cursor-pointer font-semibold text-foreground">
                        {t('overwrite')}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('overwriteDescription')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleNext}>
            {isLastConflict ? t('finishAndSave') : t('next')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

