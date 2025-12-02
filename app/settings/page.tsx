'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { PlatformSettings } from "@/types/platform-settings";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const { toast } = useToast();
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const [loading, setLoading] = useState(false);
  const [testingLogin, setTestingLogin] = useState(false);
  
  // 环境配置
  const [baseUrl, setBaseUrl] = useState('');
  
  // 认证Token配置
  const [authTokenEnabled, setAuthTokenEnabled] = useState(false);
  const [authTokenKey, setAuthTokenKey] = useState('Authorization');
  const [authTokenValue, setAuthTokenValue] = useState('');
  
  // Session配置
  const [sessionEnabled, setSessionEnabled] = useState(false);
  const [loginApiUrl, setLoginApiUrl] = useState('');
  const [loginMethod, setLoginMethod] = useState('POST');
  const [loginRequestHeaders, setLoginRequestHeaders] = useState('{}');
  const [loginRequestBody, setLoginRequestBody] = useState('{}');
  const [sessionCookies, setSessionCookies] = useState('');
  const [sessionUpdatedAt, setSessionUpdatedAt] = useState<string>('');

  // AI 配置
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiModel, setAiModel] = useState('gpt-4-turbo-preview');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [aiMaxTokens, setAiMaxTokens] = useState(4000);
  const [aiTopP, setAiTopP] = useState(1.0);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<'success' | 'error' | null>(null);

  // 请求头过滤配置
  const [allowedHeaders, setAllowedHeaders] = useState('');

  // 加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // 使用新的 settings API
      const response = await fetch('/api/settings');
      const result = await response.json();
      
      if (result.success && result.settings) {
        const settings = result.settings;
        
        // 环境配置
        setBaseUrl(settings.baseUrl || '');
        setAuthTokenEnabled(settings.authTokenEnabled || false);
        setAuthTokenKey(settings.authTokenKey || 'Authorization');
        setAuthTokenValue(settings.authTokenValue || '');
        setSessionEnabled(settings.sessionEnabled || false);
        setLoginApiUrl(settings.loginApiUrl || '');
        setLoginMethod(settings.loginMethod || 'POST');
        setLoginRequestHeaders(JSON.stringify(settings.loginRequestHeaders || {}, null, 2));
        setLoginRequestBody(JSON.stringify(settings.loginRequestBody || {}, null, 2));
        setSessionCookies(settings.sessionCookies || '');
        setSessionUpdatedAt(settings.sessionUpdatedAt ? new Date(settings.sessionUpdatedAt).toLocaleString('zh-CN') : '');
        
        // AI 配置
        setAiEnabled(settings.aiEnabled || false);
        setAiProvider(settings.aiProvider || 'openai');
        setAiModel(settings.aiModel || 'gpt-4-turbo-preview');
        setAiApiKey(settings.aiApiKey || '');
        setAiBaseUrl(settings.aiBaseUrl || '');
        setAiTemperature(settings.aiTemperature || 0.7);
        setAiMaxTokens(settings.aiMaxTokens || 4000);
        setAiTopP(settings.aiTopP || 1.0);
        
        // 请求头过滤配置
        setAllowedHeaders(settings.allowedHeaders || '');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: t('toast.loadFailed'),
        description: t('toast.loadFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // 验证JSON格式
      let parsedHeaders = {};
      let parsedBody = {};
      
      try {
        parsedHeaders = JSON.parse(loginRequestHeaders);
      } catch (e) {
        toast({
          title: t('toast.jsonError'),
          description: t('toast.loginHeadersError'),
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }
      
      try {
        parsedBody = JSON.parse(loginRequestBody);
      } catch (e) {
        toast({
          title: t('toast.jsonError'),
          description: t('toast.loginBodyError'),
          variant: 'destructive',
          duration: 5000,
        });
        return;
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 环境配置
          baseUrl,
          authTokenEnabled,
          authTokenKey,
          authTokenValue,
          sessionEnabled,
          loginApiUrl,
          loginMethod,
          loginRequestHeaders: parsedHeaders,
          loginRequestBody: parsedBody,
          
          // AI 配置
          aiEnabled,
          aiProvider,
          aiModel,
          aiApiKey,
          aiBaseUrl,
          aiTemperature,
          aiMaxTokens,
          aiTopP,
          
          // 请求头过滤配置
          allowedHeaders,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 构建详细的保存信息
        const configDetails = [];
        
        if (baseUrl) {
          configDetails.push(t('toast.baseUrlSaved', { url: baseUrl }));
        }
        
        if (authTokenEnabled) {
          configDetails.push(t('toast.tokenEnabled'));
        }
        
        if (sessionEnabled) {
          configDetails.push(t('toast.sessionEnabled'));
          if (sessionCookies) {
            configDetails.push(t('toast.sessionSaved', { time: new Date(sessionUpdatedAt || '').toLocaleString() }));
          }
        }
        
        const description = configDetails.length > 0 
          ? configDetails.join('\n')
          : t('toast.settingsUpdated');
        
        toast({
          title: t('toast.saveSuccess'),
          description: description,
          variant: 'success',
          duration: 5000,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: t('toast.saveFailed'),
        description: t('toast.saveFailedDesc', { error: error instanceof Error ? error.message : 'Unknown error' }),
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestLogin = async () => {
    try {
      setTestingLogin(true);
      
      const response = await fetch('/api/platform-settings/test-login', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        const cookieInfo = result.data;
        
        // 构建Cookie摘要信息
        const cookieSummary = cookieInfo.cookies.map((cookie: string, idx: number) => {
          const [name] = cookie.split('=');
          return `  ${idx + 1}. ${name}`;
        }).join('\n');
        
        toast({
          title: t('toast.loginTestSuccess'),
          description: t('toast.loginTestSuccessDesc', { count: cookieInfo.cookieCount, summary: cookieSummary }),
          variant: 'success',
          duration: 6000,
        });
        
        // 重新加载设置以显示新的session信息
        await loadSettings();
      } else {
        // 显示详细的调试信息
        console.error('测试登录失败:', result);
        
        let errorMessage = result.error || 'Unknown error';
        
        if (result.debug) {
          console.log('调试信息:', result.debug);
          errorMessage += `\n\n${result.debug.hint}`;
        }
        
        toast({
          title: t('toast.loginTestFailed'),
          description: errorMessage,
          variant: 'destructive',
          duration: 8000,
        });
      }
    } catch (error) {
      console.error('Error testing login:', error);
      toast({
        title: t('toast.testException'),
        description: t('toast.testExceptionDesc', { error: error instanceof Error ? error.message : 'Unknown error' }),
        variant: 'destructive',
      });
    } finally {
      setTestingLogin(false);
    }
  };

  const handleTestAi = async () => {
    try {
      setTestingAi(true);
      setAiTestResult(null);
      
      const response = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: aiProvider,
          model: aiModel,
          apiKey: aiApiKey,
          baseUrl: aiBaseUrl || undefined,
          temperature: aiTemperature,
          maxTokens: aiMaxTokens,
          topP: aiTopP,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAiTestResult('success');
        toast({
          title: t('toast.aiTestSuccess'),
          description: t('toast.aiTestSuccessDesc'),
          variant: 'success',
          duration: 3000,
        });
      } else {
        setAiTestResult('error');
        toast({
          title: t('toast.aiTestFailed'),
          description: result.error || t('toast.aiTestFailedDesc'),
          variant: 'destructive',
          duration: 5000,
        });
      }
    } catch (error) {
      setAiTestResult('error');
      console.error('Error testing AI:', error);
      toast({
        title: t('toast.testException'),
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setTestingAi(false);
    }
  };

  return (
    <div className="h-full w-full p-6 flex flex-col">
      <div className="flex-shrink-0 mb-4">
        <p className="text-sm text-muted-foreground">
          {t('pageDescription')}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 min-h-0">
        <div className="grid gap-4 pb-4">
        {/* 环境配置 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('environment.title')}</CardTitle>
            <CardDescription>
              {t('environment.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="base-url">{t('environment.baseUrl')}</Label>
              <Input
                id="base-url"
                placeholder={t('environment.baseUrlPlaceholder')}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('environment.baseUrlHint')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 认证Token配置 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('authToken.title')}</CardTitle>
            <CardDescription>
              {t('authToken.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auth-token-enabled"
                checked={authTokenEnabled}
                onCheckedChange={(checked) => setAuthTokenEnabled(checked as boolean)}
              />
              <Label htmlFor="auth-token-enabled" className="cursor-pointer">
                {t('authToken.enable')}
              </Label>
            </div>

            {authTokenEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="auth-token-key">{t('authToken.headerKey')}</Label>
                  <Input
                    id="auth-token-key"
                    placeholder={t('authToken.headerKeyPlaceholder')}
                    value={authTokenKey}
                    onChange={(e) => setAuthTokenKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('authToken.headerKeyHint')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-token-value">{t('authToken.tokenValue')}</Label>
                  <Input
                    id="auth-token-value"
                    type="password"
                    placeholder={t('authToken.tokenValuePlaceholder')}
                    value={authTokenValue}
                    onChange={(e) => setAuthTokenValue(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('authToken.tokenValueHint')}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Session配置 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('session.title')}</CardTitle>
            <CardDescription>
              {t('session.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="session-enabled"
                checked={sessionEnabled}
                onCheckedChange={(checked) => setSessionEnabled(checked as boolean)}
              />
              <Label htmlFor="session-enabled" className="cursor-pointer">
                {t('session.enable')}
              </Label>
            </div>

            {sessionEnabled && (
              <>
                {/* 滚动配置区域 */}
                <div className="max-h-[400px] overflow-y-auto space-y-4 border rounded-md p-4 bg-muted/20">
                  <div className="space-y-2">
                    <Label htmlFor="login-api-url">{t('session.loginApiUrl')}</Label>
                    <Input
                      id="login-api-url"
                      placeholder={t('session.loginApiUrlPlaceholder')}
                      value={loginApiUrl}
                      onChange={(e) => setLoginApiUrl(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-method">{t('session.requestMethod')}</Label>
                    <select
                      id="login-method"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={loginMethod}
                      onChange={(e) => setLoginMethod(e.target.value)}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-headers">{t('session.requestHeaders')}</Label>
                    <textarea
                      id="login-headers"
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder='{"Content-Type": "application/json"}'
                      value={loginRequestHeaders}
                      onChange={(e) => setLoginRequestHeaders(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-body">{t('session.requestBody')}</Label>
                    <textarea
                      id="login-body"
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder='{"username": "admin", "password": "password"}'
                      value={loginRequestBody}
                      onChange={(e) => setLoginRequestBody(e.target.value)}
                    />
                  </div>

                  {sessionCookies && (
                    <div className="space-y-2">
                      <Label>{t('session.savedCookies')}</Label>
                      <div className="rounded-md border p-3 bg-muted/50 max-h-[120px] overflow-y-auto">
                        <p className="text-sm font-mono break-all whitespace-pre-wrap">
                          {sessionCookies}
                        </p>
                        {sessionUpdatedAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {t('session.lastUpdated')}: {sessionUpdatedAt}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('session.cookiesHint')}
                      </p>
                    </div>
                  )}
                </div>

                {/* 测试按钮 - 独立在滚动区域外 */}
                <Button 
                  onClick={handleTestLogin} 
                  disabled={testingLogin || !loginApiUrl}
                  variant="outline"
                  className="w-full"
                >
                  {testingLogin ? t('session.testing') : t('session.testLogin')}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* 请求头过滤配置 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('headerFilter.title')}</CardTitle>
            <CardDescription>
              {t('headerFilter.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allowed-headers">{t('headerFilter.allowedHeaders')}</Label>
              <Input
                id="allowed-headers"
                placeholder={t('headerFilter.allowedHeadersPlaceholder')}
                value={allowedHeaders}
                onChange={(e) => setAllowedHeaders(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {t('headerFilter.allowedHeadersHint')}
              </p>
              <div className="mt-2 p-3 bg-muted/50 rounded-md">
                <p className="text-xs font-semibold mb-1">{t('headerFilter.exampleTitle')}</p>
                <code className="text-xs">Authorization, Content-Type, X-Api-Key, X-Request-Id</code>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI 配置 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>{t('ai.title')}</span>
            </CardTitle>
            <CardDescription>
              {t('ai.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="ai-enabled"
                checked={aiEnabled}
                onCheckedChange={(checked) => setAiEnabled(checked as boolean)}
              />
              <Label htmlFor="ai-enabled" className="cursor-pointer">
                {t('ai.enable')}
              </Label>
            </div>

            {aiEnabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ai-provider">{t('ai.provider')}</Label>
                  <select
                    id="ai-provider"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                  >
                    <option value="openai">{t('ai.providers.openai')}</option>
                    <option value="deepseek">{t('ai.providers.deepseek')}</option>
                    <option value="claude">{t('ai.providers.claude')}</option>
                    <option value="baidu">{t('ai.providers.baidu')}</option>
                    <option value="alibaba">{t('ai.providers.alibaba')}</option>
                    <option value="zhipu">{t('ai.providers.zhipu')}</option>
                    <option value="ollama">{t('ai.providers.ollama')}</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {t('ai.providerHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-model">{t('ai.model')}</Label>
                  <Input
                    id="ai-model"
                    placeholder={t('ai.modelPlaceholder')}
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('ai.modelHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-api-key">{t('ai.apiKey')}</Label>
                  <Input
                    id="ai-api-key"
                    type="password"
                    placeholder={t('ai.apiKeyPlaceholder')}
                    value={aiApiKey}
                    onChange={(e) => setAiApiKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('ai.apiKeyHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai-base-url">{t('ai.baseUrl')}</Label>
                  <Input
                    id="ai-base-url"
                    placeholder={t('ai.baseUrlPlaceholder')}
                    value={aiBaseUrl}
                    onChange={(e) => setAiBaseUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('ai.baseUrlHint')}
                  </p>
                </div>

                {/* 高级配置 */}
                <details className="border rounded-md p-4">
                  <summary className="cursor-pointer font-semibold">{t('ai.advancedSettings')}</summary>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ai-temperature">{t('ai.temperature')}</Label>
                        <span className="text-sm text-muted-foreground">
                          {aiTemperature.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        id="ai-temperature"
                        min="0"
                        max="1"
                        step="0.1"
                        value={aiTemperature}
                        onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('ai.temperatureHint')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ai-max-tokens">{t('ai.maxTokens')}</Label>
                      <Input
                        type="number"
                        id="ai-max-tokens"
                        value={aiMaxTokens}
                        onChange={(e) => setAiMaxTokens(parseInt(e.target.value))}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('ai.maxTokensHint')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="ai-top-p">{t('ai.topP')}</Label>
                        <span className="text-sm text-muted-foreground">
                          {aiTopP.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        id="ai-top-p"
                        min="0"
                        max="1"
                        step="0.1"
                        value={aiTopP}
                        onChange={(e) => setAiTopP(parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('ai.topPHint')}
                      </p>
                    </div>
                  </div>
                </details>

                {/* 测试连接 */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleTestAi}
                    disabled={testingAi || !aiApiKey}
                  >
                    {testingAi ? t('session.testing') : t('ai.testConnection')}
                  </Button>

                  {aiTestResult === 'success' && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <span>{t('ai.connectionSuccess')}</span>
                    </div>
                  )}

                  {aiTestResult === 'error' && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <span>{t('ai.connectionFailed')}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

          {/* 保存按钮 */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={loading} size="lg">
              {loading ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

