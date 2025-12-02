"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PlatformSettingsForm, PlatformSettingsFormData } from '@/components/test-suites/PlatformSettingsForm';
import { TestCaseSelector } from '@/components/test-suites/TestCaseSelector';
import { ScheduleConfig } from '@/components/test-suites/ScheduleConfig';
import { useTranslations } from 'next-intl';

export default function EditTestSuitePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const t = useTranslations('testSuites');
  const tCommon = useTranslations('common');
  const suiteId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [useGlobalSettings, setUseGlobalSettings] = useState(false);
  const [environmentConfig, setEnvironmentConfig] = useState<PlatformSettingsFormData>({
    baseUrl: '',
    authTokenEnabled: false,
    authTokenKey: 'Authorization',
    authTokenValue: '',
    sessionEnabled: false,
    loginApiUrl: '',
    loginMethod: 'POST',
    loginRequestHeaders: {},
    loginRequestBody: {},
  });
  
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  
  // 调度配置
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState<any>(null);

  useEffect(() => {
    if (suiteId) {
      loadTestSuite();
    }
  }, [suiteId]);

  const loadTestSuite = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/test-suites/${suiteId}`);
      const result = await response.json();
      
      if (result.success) {
        const suite = result.data;
        setName(suite.name);
        setDescription(suite.description || '');
        setUseGlobalSettings(suite.useGlobalSettings);
        
        // 加载环境配置
        if (suite.environmentConfig) {
          try {
            const config = typeof suite.environmentConfig === 'string' 
              ? JSON.parse(suite.environmentConfig) 
              : suite.environmentConfig;
            setEnvironmentConfig({
              baseUrl: config.baseUrl || '',
              authTokenEnabled: config.authTokenEnabled || false,
              authTokenKey: config.authTokenKey || 'Authorization',
              authTokenValue: config.authTokenValue || '',
              sessionEnabled: config.sessionEnabled || false,
              loginApiUrl: config.loginApiUrl || '',
              loginMethod: config.loginMethod || 'POST',
              loginRequestHeaders: config.loginRequestHeaders || {},
              loginRequestBody: config.loginRequestBody || {},
            });
          } catch (error) {
            console.error('Error parsing environment config:', error);
          }
        }
        
        // 加载已选用例
        if (suite.testCases && Array.isArray(suite.testCases)) {
          const caseIds = suite.testCases.map((tc: any) => tc.testCaseId || tc.testCase?.id).filter(Boolean);
          setSelectedCases(new Set(caseIds));
        }
        
        // 加载调度配置
        if (suite.executionMode === 'scheduled') {
          setScheduleEnabled(true);
          if (suite.scheduleConfig) {
            try {
              const config = typeof suite.scheduleConfig === 'string'
                ? JSON.parse(suite.scheduleConfig)
                : suite.scheduleConfig;
              setScheduleConfig(config);
            } catch (error) {
              console.error('Error parsing schedule config:', error);
            }
          }
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error loading test suite:', error);
      toast({
        title: t('loadFailed'),
        description: t('cannotLoadSuiteInfo'),
        variant: 'destructive',
      });
      router.push('/test-suites');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: t('pleaseEnterName'),
        variant: 'destructive',
      });
      return;
    }

    if (selectedCases.size === 0) {
      toast({
        title: t('pleaseSelectCase'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);
      
      const testCasesData = Array.from(selectedCases).map((id, index) => ({
        testCaseId: id,
        order: index + 1,
        enabled: true,
      }));

      const response = await fetch(`/api/test-suites/${suiteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          useGlobalSettings,
          environmentConfig: useGlobalSettings ? null : environmentConfig,
          testCases: testCasesData,
          executionMode: scheduleEnabled ? 'scheduled' : 'manual',
          scheduleConfig: scheduleEnabled ? scheduleConfig : null,
          scheduleStatus: scheduleEnabled ? 'active' : null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: t('saveSuccess'),
        });
        router.push('/test-suites');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error updating test suite:', error);
      toast({
        title: t('saveFailed'),
        description: error instanceof Error ? error.message : t('saveError'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="space-y-4 p-6 pb-8">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('back')}
            </Button>
            <div className="text-sm text-muted-foreground">
              {t('modifyTestCasesAndConfig')}
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('saving') : t('save')}
          </Button>
        </div>

        {/* 基本信息 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('basicInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('suiteNameRequired')}</Label>
              <Input
                id="name"
                placeholder={t('enterSuiteName')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('descriptionOptional')}</Label>
              <Input
                id="description"
                placeholder={t('enterDescription')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 选择用例 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('selectTestCasesTitle')}</CardTitle>
            <CardDescription>
              {t('selectedCasesDesc', { count: selectedCases.size })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TestCaseSelector
              selectedIds={selectedCases}
              onSelectionChange={setSelectedCases}
            />
          </CardContent>
        </Card>

        {/* 环境配置 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('environmentConfigTitle')}</CardTitle>
                <CardDescription>
                  {t('environmentConfigDesc')}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="useGlobal">
                  {useGlobalSettings ? t('useGlobalConfig') : t('useSpecificConfig')}
                </Label>
                <Switch
                  id="useGlobal"
                  checked={useGlobalSettings}
                  onCheckedChange={setUseGlobalSettings}
                />
              </div>
            </div>
          </CardHeader>
          {!useGlobalSettings && (
            <CardContent>
              <PlatformSettingsForm
                value={environmentConfig}
                onChange={setEnvironmentConfig}
              />
            </CardContent>
          )}
        </Card>

        {/* 调度配置 */}
        <ScheduleConfig
          value={scheduleConfig}
          onChange={setScheduleConfig}
          enabled={scheduleEnabled}
          onEnabledChange={setScheduleEnabled}
        />
      </div>
    </div>
  );
}

