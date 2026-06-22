"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Radio, Chrome, Square, Play, RefreshCw, AlertCircle, Pause, Network, Copy, CheckCircle, Shield } from "lucide-react";
import { RecordingSession } from "@/types/har";
import { Select } from "@/components/ui/select";
import { useTranslations } from "next-intl";

export type CaptureMode = 'browser' | 'proxy' | 'mitmproxy';

interface RecordingSectionProps {
  isRecording: boolean;
  session: RecordingSession | null;
  capturedCount: number;
  onStartRecording: (url: string, mode?: CaptureMode) => Promise<void>;
  onStopRecording: () => Promise<void>;
  onPauseRecording: () => Promise<void>;
  onResumeRecording: () => Promise<void>;
  mode?: CaptureMode;
  onModeChange?: (mode: CaptureMode) => void;
}

export function RecordingSection({
  isRecording,
  session,
  capturedCount,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  mode = 'browser',
  onModeChange,
}: RecordingSectionProps) {
  const t = useTranslations('apiCapture');
  const tCommon = useTranslations('common');
  const [showModal, setShowModal] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [captureMode, setCaptureMode] = useState<CaptureMode>(mode);
  const [proxyPort, setProxyPort] = useState("8899");
  const [showProxyInstructions, setShowProxyInstructions] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [isPlaywrightError, setIsPlaywrightError] = useState(false);
  const [installCommand, setInstallCommand] = useState('');
  const isPaused = session?.status === 'paused' || session?.isPaused;

  const handleStartClick = () => {
    setShowModal(true);
    setError("");
    setRecordingUrl("");
  };

  const handleBeginRecording = async () => {
    // 代理模式不需要URL
    if (captureMode === 'browser') {
      if (!recordingUrl) {
        setError(t('startUrlPlaceholder'));
        return;
      }

      // 验证URL格式
      try {
        new URL(recordingUrl);
      } catch (e) {
        setError(t('startUrlPlaceholder'));
        return;
      }
    }

    setIsLoading(true);
    setError("");

    try {
      await onStartRecording(captureMode === 'browser' ? recordingUrl : '', captureMode);
      
      if (captureMode === 'proxy') {
        setShowProxyInstructions(true);
      }
      
      setShowModal(false);
      setRecordingUrl("");
      setIsPlaywrightError(false);
    } catch (error: any) {
      // 检测是否是 Playwright 未安装的错误
      if (error.errorType === 'PLAYWRIGHT_NOT_INSTALLED') {
        setIsPlaywrightError(true);
        setInstallCommand(error.installCommand || 'npx playwright install chromium');
        setError(error.message || 'Playwright Chromium 未安装');
      } else {
        setIsPlaywrightError(false);
        setError(error.message || t('startFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCommand(id);
      setTimeout(() => setCopiedCommand(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleStopClick = async () => {
    setIsLoading(true);
    try {
      await onStopRecording();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseClick = async () => {
    setIsLoading(true);
    try {
      await onPauseRecording();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeClick = async () => {
    setIsLoading(true);
    try {
      await onResumeRecording();
    } finally {
      setIsLoading(false);
    }
  };

  // 如果正在录制或暂停，显示状态条
  if (isRecording && session) {
    const isProxyMode = session.url?.includes('Proxy Server');
    const isMitmMode = session.url?.includes('mitmproxy');
    
    // 确定模式显示
    let modeIcon = <Chrome className="h-3 w-3 mr-1" />;
    let modeName = t('browserRecording');
    if (isMitmMode) {
      modeIcon = <Shield className="h-3 w-3 mr-1" />;
      modeName = t('mitmproxyRecording');
    } else if (isProxyMode) {
      modeIcon = <Network className="h-3 w-3 mr-1" />;
      modeName = t('proxyRecording');
    }
    
    return (
      <>
        <Card className={isPaused ? "border-yellow-500/50 bg-yellow-500/10 dark:border-yellow-500/70 dark:bg-yellow-500/20" : "border-red-500/50 bg-red-500/10 dark:border-red-500/70 dark:bg-red-500/20"}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className={isPaused ? "" : "animate-pulse"}>
                  <div className={`h-3 w-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className={`font-semibold ${isPaused ? 'text-yellow-700 dark:text-yellow-300' : 'text-red-700 dark:text-red-300'}`}>
                      {isPaused ? t('paused') : t('recording')}
                    </p>
                    <Badge variant="outline" className="bg-background">
                      {modeIcon}
                      {modeName}
                    </Badge>
                    <Badge variant="outline" className="bg-background">
                      {isPaused ? (
                        <Pause className="h-3 w-3 mr-1" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      )}
                      {t('capturedRequests')} {capturedCount}
                    </Badge>
                  </div>
                  <p className={`text-sm mt-1 ${isPaused ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                    {(isProxyMode || isMitmMode) ? session.url : `${t('url')}: ${session.url}`}
                  </p>
                </div>
              </div>
            <div className="flex gap-2">
              {isPaused ? (
                <Button 
                  onClick={handleResumeClick} 
                  variant="default"
                  disabled={isLoading}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {t('resume')}
                </Button>
              ) : (
                <Button 
                  onClick={handlePauseClick} 
                  variant="outline"
                  disabled={isLoading}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  {t('pause')}
                </Button>
              )}
              <Button 
                onClick={handleStopClick} 
                variant="destructive"
                disabled={isLoading}
              >
                <Square className="mr-2 h-4 w-4" />
                {t('stopRecording')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 代理模式配置指南 */}
      {showProxyInstructions && isProxyMode && (
        <Card className="mt-4 border-blue-500/50 bg-blue-500/10 dark:border-blue-500/70 dark:bg-blue-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Network className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-lg text-foreground">{t('proxySettings')}</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProxyInstructions(false)}
              >
                {tCommon('close')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300">📋 配置步骤：</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <li>在浏览器中配置代理服务器</li>
                <li>打开你需要测试的网站</li>
                <li>正常进行操作，系统会自动捕获所有API请求</li>
                <li>完成后点击"停止录制"按钮</li>
              </ol>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-background rounded-lg border border-[#e5e7eb] dark:border-[#4b5563]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-foreground">Chrome / Edge</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('chrome://settings/?search=proxy', 'chrome')}
                  >
                    {copiedCommand === 'chrome' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <code className="text-xs bg-muted p-2 rounded block text-foreground">
                  chrome://settings/?search=proxy
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  然后配置：HTTP代理 localhost:{proxyPort}
                </p>
              </div>

              <div className="p-3 bg-background rounded-lg border border-[#e5e7eb] dark:border-[#4b5563]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-foreground">Firefox</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard('about:preferences#general', 'firefox')}
                  >
                    {copiedCommand === 'firefox' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <code className="text-xs bg-muted p-2 rounded block text-foreground">
                  about:preferences#general
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  网络设置 → 手动配置代理 → HTTP代理 localhost:{proxyPort}
                </p>
              </div>
            </div>

            <div className="p-3 bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/50 dark:border-yellow-500/70 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ⚠️ 注意：使用代理期间，浏览器的所有流量都会通过代理服务器。完成录制后请记得关闭代理设置。
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
    );
  }

  // 未录制时显示录制卡片
  return (
    <>
      {/* 录制卡片 */}
      <Card className="hover:shadow-md transition-shadow border-[#e5e7eb] dark:border-[#4b5563]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {captureMode === 'mitmproxy' ? (
                <Shield className="h-6 w-6 text-primary" />
              ) : captureMode === 'proxy' ? (
                <Network className="h-6 w-6 text-primary" />
              ) : (
                <Chrome className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <CardTitle>
                {captureMode === 'mitmproxy' 
                  ? t('mitmproxyRecording')
                  : captureMode === 'proxy' 
                  ? t('proxyRecording')
                  : t('browserRecording')
                }
              </CardTitle>
              <CardDescription className="mt-1">
                {captureMode === 'mitmproxy'
                  ? t('mitmproxyRecording')
                  : captureMode === 'proxy' 
                  ? t('proxyRecording')
                  : t('browserRecording')
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full" 
            onClick={handleStartClick}
            disabled={isRecording}
          >
            <Radio className="mr-2 h-4 w-4" />
            {t('startRecording')}
          </Button>
        </CardContent>
      </Card>

      {/* 录制配置模态框 */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !isLoading && setShowModal(false)}
        >
          <Card 
            className="w-full max-w-md shadow-2xl border-2 border-[#e5e7eb] dark:border-[#4b5563] bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader className="space-y-3 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Radio className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl">{t('startRecording')}</CardTitle>
                  <CardDescription className="text-base mt-1">
                    {t('startUrlPlaceholder')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pb-6">
              {/* 模式选择 */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  {t('captureMethod')} <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setCaptureMode('browser')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      captureMode === 'browser'
                        ? 'border-primary bg-primary/5'
                        : 'border-[#e5e7eb] dark:border-[#4b5563] hover:border-[#d1d5db] dark:hover:border-[#6b7280]'
                    }`}
                    disabled={isLoading}
                  >
                    <Chrome className="h-5 w-5 mb-2" />
                    <div className="font-semibold text-sm">{t('browserRecording')}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Local
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaptureMode('proxy')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      captureMode === 'proxy'
                        ? 'border-primary bg-primary/5'
                        : 'border-[#e5e7eb] dark:border-[#4b5563] hover:border-[#d1d5db] dark:hover:border-[#6b7280]'
                    }`}
                    disabled={isLoading}
                  >
                    <Network className="h-5 w-5 mb-2" />
                    <div className="font-semibold text-sm">{t('proxyMode')}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Simple
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCaptureMode('mitmproxy')}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      captureMode === 'mitmproxy'
                        ? 'border-primary bg-primary/5'
                        : 'border-[#e5e7eb] dark:border-[#4b5563] hover:border-[#d1d5db] dark:hover:border-[#6b7280]'
                    }`}
                    disabled={isLoading}
                  >
                    <Shield className="h-5 w-5 mb-2" />
                    <div className="font-semibold text-sm">mitmproxy</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      HTTPS
                    </div>
                  </button>
                </div>
              </div>

              {/* 错误提示 */}
              {error && !isPlaywrightError && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Playwright 未安装错误提示 */}
              {error && isPlaywrightError && (
                <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-500/40 dark:border-amber-500/30 rounded-lg backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="font-semibold text-foreground">
                        ⚠️ {t('playwrightNotInstalled')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('playwrightRequiredDesc')}
                      </p>
                      <div className="relative">
                        <code className="block p-3 pr-12 bg-secondary/80 text-primary rounded text-sm font-mono overflow-x-auto border border-[#e5e7eb] dark:border-[#4b5563]">
                          {installCommand}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-8 w-8 p-0"
                          onClick={() => copyToClipboard(installCommand, 'install-cmd')}
                        >
                          {copiedCommand === 'install-cmd' ? (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        💡 {t('installTip')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 浏览器模式：URL输入 */}
              {captureMode === 'browser' && (
                <div className="space-y-3">
                  <Label htmlFor="url" className="text-base font-semibold">
                    {t('startUrl')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="url"
                    placeholder={t('startUrlPlaceholder')}
                    value={recordingUrl}
                    onChange={(e) => {
                      setRecordingUrl(e.target.value);
                      setError("");
                    }}
                    className="h-11 text-base"
                    autoFocus
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && recordingUrl && !isLoading) {
                        handleBeginRecording();
                      }
                    }}
                  />
                  <p className="text-sm text-muted-foreground">
                    {t('startUrlPlaceholder')}
                  </p>
                </div>
              )}

              {/* 代理模式：端口配置 */}
              {(captureMode === 'proxy' || captureMode === 'mitmproxy') && (
                <div className="space-y-3">
                  <Label htmlFor="proxyPort" className="text-base font-semibold">
                    代理端口
                  </Label>
                  <Input
                    id="proxyPort"
                    type="number"
                    placeholder="8899"
                    value={proxyPort}
                    onChange={(e) => setProxyPort(e.target.value)}
                    className="h-11 text-base"
                    disabled={isLoading}
                  />
                  <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 dark:border-blue-500/50 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      💡 {t('proxyConfigHint', { port: proxyPort })}
                    </p>
                    {captureMode === 'mitmproxy' && (
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                        🔒 {t('mitmproxyHttpsHint')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                  <p className="text-sm text-primary">{tCommon('loading')}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  className="flex-1 h-11 text-base"
                  onClick={handleBeginRecording}
                  disabled={isLoading || (captureMode === 'browser' && !recordingUrl)}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      {tCommon('loading')}
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      {t('startRecording')}
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline"
                  className="h-11 px-6 text-base"
                  onClick={() => setShowModal(false)}
                  disabled={isLoading}
                >
                  {tCommon('cancel')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

