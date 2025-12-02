"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

export interface PlatformSettingsFormData {
  // 环境配置
  baseUrl: string;

  // 认证Token模式
  authTokenEnabled: boolean;
  authTokenKey: string;
  authTokenValue: string;

  // Session模式
  sessionEnabled: boolean;
  loginApiUrl: string;
  loginMethod: string;
  loginRequestHeaders: Record<string, string>;
  loginRequestBody: Record<string, any>;
}

interface PlatformSettingsFormProps {
  value: PlatformSettingsFormData;
  onChange: (value: PlatformSettingsFormData) => void;
  disabled?: boolean;
}

export function PlatformSettingsForm({
  value,
  onChange,
  disabled = false,
}: PlatformSettingsFormProps) {
  const t = useTranslations('testSuites');
  const [headers, setHeaders] = useState<string>('{}');
  const [body, setBody] = useState<string>('{}');
  const [headersError, setHeadersError] = useState<string>('');
  const [bodyError, setBodyError] = useState<string>('');

  // 初始化JSON字符串
  useEffect(() => {
    try {
      setHeaders(
        JSON.stringify(value.loginRequestHeaders || {}, null, 2)
      );
      setBody(
        JSON.stringify(value.loginRequestBody || {}, null, 2)
      );
    } catch (error) {
      console.error('Error initializing JSON:', error);
    }
  }, [value.loginRequestHeaders, value.loginRequestBody]);

  const updateField = (field: keyof PlatformSettingsFormData, fieldValue: any) => {
    onChange({ ...value, [field]: fieldValue });
  };

  const handleHeadersChange = (jsonStr: string) => {
    setHeaders(jsonStr);
    try {
      const parsed = JSON.parse(jsonStr);
      setHeadersError('');
      updateField('loginRequestHeaders', parsed);
    } catch (error) {
      setHeadersError(t('jsonFormatError'));
    }
  };

  const handleBodyChange = (jsonStr: string) => {
    setBody(jsonStr);
    try {
      const parsed = JSON.parse(jsonStr);
      setBodyError('');
      updateField('loginRequestBody', parsed);
    } catch (error) {
      setBodyError(t('jsonFormatError'));
    }
  };

  return (
    <div className="space-y-4">
      {/* 基础配置 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('basicConfigTitle')}</CardTitle>
          <CardDescription>{t('basicConfigDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://api.example.com"
              value={value.baseUrl}
              onChange={(e) => updateField('baseUrl', e.target.value)}
              disabled={disabled}
            />
            <p className="text-sm text-muted-foreground">
              {t('baseUrlHelp')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Token认证配置 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('authTokenConfigTitle')}</CardTitle>
          <CardDescription>
            {t('authTokenConfigDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auth-token-enabled"
              checked={value.authTokenEnabled}
              onCheckedChange={(checked) =>
                updateField('authTokenEnabled', checked as boolean)
              }
              disabled={disabled}
            />
            <Label htmlFor="auth-token-enabled" className="cursor-pointer">
              {t('enableAuthToken')}
            </Label>
          </div>

          {value.authTokenEnabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="tokenKey">{t('tokenHeaderKey')}</Label>
                <Input
                  id="tokenKey"
                  placeholder="Authorization"
                  value={value.authTokenKey}
                  onChange={(e) =>
                    updateField('authTokenKey', e.target.value)
                  }
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  {t('tokenHeaderKeyHelp')}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tokenValue">{t('tokenValue')}</Label>
                <Input
                  id="tokenValue"
                  type="password"
                  placeholder="Bearer your-token-here"
                  value={value.authTokenValue}
                  onChange={(e) =>
                    updateField('authTokenValue', e.target.value)
                  }
                  disabled={disabled}
                />
                <p className="text-xs text-muted-foreground">
                  {t('tokenValueHelp')}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Session认证配置 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sessionConfigTitle')}</CardTitle>
          <CardDescription>
            {t('sessionConfigDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="session-enabled"
              checked={value.sessionEnabled}
              onCheckedChange={(checked) =>
                updateField('sessionEnabled', checked as boolean)
              }
              disabled={disabled}
            />
            <Label htmlFor="session-enabled" className="cursor-pointer">
              {t('enableSession')}
            </Label>
          </div>

          {value.sessionEnabled && (
            <div className="max-h-[400px] overflow-y-auto space-y-4 border rounded-md p-4 bg-muted/20">
              <div className="space-y-2">
                <Label htmlFor="loginApiUrl">{t('loginApiUrl')}</Label>
                <Input
                  id="loginApiUrl"
                  placeholder="https://api.example.com/auth/login"
                  value={value.loginApiUrl}
                  onChange={(e) =>
                    updateField('loginApiUrl', e.target.value)
                  }
                  disabled={disabled}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginMethod">{t('requestMethod')}</Label>
                <select
                  id="loginMethod"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={value.loginMethod}
                  onChange={(e) =>
                    updateField('loginMethod', e.target.value)
                  }
                  disabled={disabled}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginHeaders">{t('requestHeadersJson')}</Label>
                <textarea
                  id="loginHeaders"
                  className={`flex min-h-[80px] w-full rounded-md border ${
                    headersError ? 'border-red-500' : 'border-input'
                  } bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono`}
                  placeholder='{"Content-Type": "application/json"}'
                  value={headers}
                  onChange={(e) => handleHeadersChange(e.target.value)}
                  disabled={disabled}
                />
                {headersError && (
                  <p className="text-sm text-red-500">{headersError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="loginBody">{t('requestBodyJson')}</Label>
                <textarea
                  id="loginBody"
                  className={`flex min-h-[100px] w-full rounded-md border ${
                    bodyError ? 'border-red-500' : 'border-input'
                  } bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono`}
                  placeholder='{"username": "admin", "password": "password"}'
                  value={body}
                  onChange={(e) => handleBodyChange(e.target.value)}
                  disabled={disabled}
                />
                {bodyError && (
                  <p className="text-sm text-red-500">{bodyError}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

