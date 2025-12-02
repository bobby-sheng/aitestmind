"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { CapturedApi, RecordingSession } from "@/types/har";
import { downloadHarFile } from "@/lib/utils/api-helpers";
import { useRecordingPolling } from "@/hooks/useRecordingPolling";
import { useRecordingSSE } from "@/hooks/useRecordingSSE";
import { RecordingSection } from "@/components/api-capture/RecordingSection";
import { HarImport } from "@/components/api-capture/HarImport";
import { ApiList } from "@/components/api-capture/ApiList";
import { ApiDetailDialog } from "@/components/api-capture/ApiDetailDialog";
import { BatchSaveDialog } from "@/components/api-capture/BatchSaveDialog";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";

// localStorage keys
const RECORDING_STATE_KEY = 'api-capture-recording-state';
const RECORDING_SESSION_KEY = 'api-capture-session';

export default function ApiCapturePage() {
  const { toast } = useToast();
  const t = useTranslations('apiCapture');
  const tCommon = useTranslations('common');
  const [isRecording, setIsRecording] = useState(false);
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [capturedApis, setCapturedApis] = useState<CapturedApi[]>([]);
  const [selectedApi, setSelectedApi] = useState<CapturedApi | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [apisToSave, setApisToSave] = useState<CapturedApi[]>([]);
  const [isRestoring, setIsRestoring] = useState(true);

  // 使用 ref 保存最新的 session，避免 useCallback 依赖变化导致 SSE 连接重建
  const sessionRef = useRef<RecordingSession | null>(null);
  
  // 同步 session 到 ref
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // 页面加载时恢复录制状态
  // 注意：只在用户主动刷新页面时执行（组件首次挂载），不会自动触发
  useEffect(() => {
    const restoreRecordingState = async () => {
      try {
        let foundActiveSession = false;
        
        // 策略：从 localStorage 读取上次的会话信息（快速路径）
        const savedSession = localStorage.getItem(RECORDING_SESSION_KEY);
        
        if (savedSession) {
          try {
            const parsedSession: RecordingSession = JSON.parse(savedSession);
            
            // 根据 session.url 判断模式，只检查对应的状态接口
            let statusUrl = '/api/recording/status';
            let mode = 'browser';
            
            if (parsedSession.url?.includes('mitmproxy')) {
              statusUrl = '/api/mitm/status';
              mode = 'mitmproxy';
            } else if (parsedSession.url?.includes('Proxy Server')) {
              statusUrl = '/api/proxy/status';
              mode = 'proxy';
            }
            
            console.log(`🔍 [页面刷新] 检查 ${mode} 模式是否有活跃的采集任务: ${statusUrl}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 800); // 缩短超时时间到800ms
            
            const response = await fetch(statusUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            const data = await response.json();
            
            if (data.success && data.session) {
              // 恢复活跃的录制会话
              setIsRecording(true);
              setSession(data.session);
              setCapturedApis(data.summaries || []);
              
              console.log(`✅ 恢复 ${mode} 录制会话 (${data.summaries?.length || 0} 个请求)`, data.session);
              foundActiveSession = true;
            }
          } catch (parseError) {
            console.log('💡 未找到活跃的采集任务');
            foundActiveSession = false;
          }
        }
        
        // 如果没有找到活跃会话，清理 localStorage
        if (!foundActiveSession) {
          localStorage.removeItem(RECORDING_STATE_KEY);
          localStorage.removeItem(RECORDING_SESSION_KEY);
          console.log('ℹ️ 无活跃的采集任务');
        }
      } catch (error) {
        console.error('状态恢复失败:', error);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreRecordingState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组：只在组件首次挂载时执行（即用户刷新页面时）

  // 检测录制模式
  const recordingMode = session?.url?.includes('mitmproxy') 
    ? 'mitmproxy' 
    : session?.url?.includes('Proxy Server')
    ? 'proxy'
    : 'browser';

  // 方案1: SSE 实时推送（推荐）
  useRecordingSSE({
    isRecording,
    enabled: true, // 启用 SSE
    mode: recordingMode as 'browser' | 'proxy' | 'mitmproxy',
    onNewRequest: useCallback((newRequest: CapturedApi) => {
      // 实时添加新捕获的请求（去重）
      setCapturedApis(prev => {
        // 检查是否已存在相同 ID 的请求
        const exists = prev.some(api => api.id === newRequest.id);
        if (exists) {
          return prev; // 已存在，不添加
        }
        return [newRequest, ...prev]; // 添加到列表开头
      });
      
      // 使用 ref 获取最新 session，避免依赖导致连接重建
      const currentSession = sessionRef.current;
      if (currentSession) {
        const updatedSession = {
          ...currentSession,
          capturedRequests: (currentSession.capturedRequests || 0) + 1,
        };
        setSession(updatedSession);
        localStorage.setItem(RECORDING_SESSION_KEY, JSON.stringify(updatedSession));
      }
    }, []), // ✅ 空依赖，函数引用稳定
    onSessionUpdate: useCallback((updatedSession: RecordingSession) => {
      // 会话状态更新（暂停/继续等）
      setSession(updatedSession);
      localStorage.setItem(RECORDING_SESSION_KEY, JSON.stringify(updatedSession));
    }, []), // ✅ 空依赖，函数引用稳定
  });

  // 方案2: 轮询兜底（当 SSE 连接失败时）
  // useRecordingPolling({
  //   isRecording,
  //   session,
  //   interval: 2000,
  //   onUpdate: useCallback(({ summaries, session: updatedSession }) => {
  //     setCapturedApis(summaries);
  //     setSession(updatedSession);
  //     if (updatedSession) {
  //       localStorage.setItem(RECORDING_SESSION_KEY, JSON.stringify(updatedSession));
  //     }
  //   }, []),
  //   });
  
  // 注释掉自动获取初始数据的逻辑，避免在用户操作时意外刷新
  // 用户可以通过手动刷新页面来获取最新数据
  // useEffect(() => {
  //   if (isRecording && session && capturedApis.length === 0) {
  //     const fetchInitialData = async () => {
  //       try {
  //         const response = await fetch('/api/recording/status');
  //         const data = await response.json();
  //         if (data.success && data.summaries) {
  //           setCapturedApis(data.summaries);
  //         }
  //       } catch (error) {
  //         console.error(t('initialDataFetchFailed'), error);
  //       }
  //     };
  //     fetchInitialData();
  //   }
  // }, [isRecording, session, t]);

  /**
   * 启动录制
   */
  const handleStartRecording = async (url: string, mode: 'browser' | 'proxy' | 'mitmproxy' = 'browser') => {
    try {
      let apiEndpoint = '/api/recording/start';
      let requestBody: any = { url };
      
      if (mode === 'proxy') {
        apiEndpoint = '/api/proxy/start';
        requestBody = { port: 8899 };
      } else if (mode === 'mitmproxy') {
        apiEndpoint = '/api/mitm/start';
        requestBody = { port: 8899 };
      }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setIsRecording(true);
        setSession(data.session);
        
        // 如果是恢复已有会话，不清空数据；否则清空
        if (!data.alreadyRunning) {
          setCapturedApis([]); // 清空之前的数据
        } else {
          // 恢复已有会话，尝试获取现有数据
          try {
            const statusResponse = await fetch('/api/recording/status');
            const statusData = await statusResponse.json();
            if (statusData.success && statusData.summaries) {
              setCapturedApis(statusData.summaries);
            }
          } catch (error) {
            console.error('Failed to fetch existing data:', error);
          }
        }
        
        // 保存状态到 localStorage
        localStorage.setItem(RECORDING_STATE_KEY, 'recording');
        localStorage.setItem(RECORDING_SESSION_KEY, JSON.stringify(data.session));
        
        // 显示成功提示
        let description = `${t('browserOpened')}: ${url}`;
        if (mode === 'proxy') {
          description = `${t('configureProxy')}: localhost:${data.port || 8899}`;
        } else if (mode === 'mitmproxy') {
          description = `${t('configureProxyAndCert')}: localhost:${data.port || 8899}`;
        }
        
        // 如果是恢复已有会话，显示不同的提示
        if (data.alreadyRunning) {
          toast({
            title: '✅ ' + (mode === 'mitmproxy' ? 'mitmproxy 会话已恢复' : '会话已恢复'),
            description: data.message || '已恢复现有录制会话',
            duration: 5000,
          });
        } else {
          toast({
            title: mode === 'mitmproxy' ? t('mitmproxyStarted') : mode === 'proxy' ? t('proxyServerStarted') : t('startSuccess'),
            description,
          });
        }
      } else {
        // 特殊处理 Playwright 未安装的情况
        if (data.errorType === 'PLAYWRIGHT_NOT_INSTALLED') {
          const errorWithCommand = new Error(data.error);
          (errorWithCommand as any).errorType = 'PLAYWRIGHT_NOT_INSTALLED';
          (errorWithCommand as any).installCommand = data.installCommand;
          throw errorWithCommand;
        }
        
        // 特殊处理 mitmproxy API 服务器未运行的情况
        if (data.details?.includes('mitmproxy API 服务器未运行')) {
          toast({
            variant: "destructive",
            title: t('mitmproxyNotRunning'),
            description: t('startMitmproxyCommand'),
            duration: 5000,
          });
        }
        throw new Error(data.error || t('startFailed'));
      }
    } catch (error: any) {
      console.error(t('startFailed'), error);
      throw error;
    }
  };

  /**
   * 停止录制
   */
  const handleStopRecording = async () => {
    try {
      // 检测是哪种模式
      const isMitmMode = session?.url?.includes('mitmproxy');
      const isProxyMode = session?.url?.includes('Proxy Server');
      
      let apiEndpoint = '/api/recording/stop';
      if (isMitmMode) {
        apiEndpoint = '/api/mitm/stop';
      } else if (isProxyMode) {
        apiEndpoint = '/api/proxy/stop';
      }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setIsRecording(false);
        setSession(data.session);
        setCapturedApis(data.summaries || []);
        
        // 清除 localStorage 中的录制状态
        localStorage.removeItem(RECORDING_STATE_KEY);
        localStorage.removeItem(RECORDING_SESSION_KEY);
        
        toast({
          title: t('stopSuccess'),
          description: `${t('recordingStoppedWith')} ${data.summaries?.length || 0} ${t('requests')}`,
        });
      } else {
        toast({
          variant: "destructive",
          title: t('stopFailed'),
          description: data.error || t('unknownError'),
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('stopFailed'),
        description: error.message,
      });
      console.error(t('stopFailed'), error);
    }
  };

  /**
   * 暂停录制
   */
  const handlePauseRecording = async () => {
    try {
      const isMitmMode = session?.url?.includes('mitmproxy');
      const isProxyMode = session?.url?.includes('Proxy Server');
      
      let apiEndpoint = '/api/recording/pause';
      if (isMitmMode) {
        apiEndpoint = '/api/mitm/pause';
      } else if (isProxyMode) {
        apiEndpoint = '/api/proxy/pause';
      }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSession(data.session);
        // 更新 localStorage 中的 session
        localStorage.setItem(RECORDING_SESSION_KEY, JSON.stringify(data.session));
      } else {
        toast({
          variant: "destructive",
          title: t('pauseFailed'),
          description: data.error || t('unknownError'),
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('pauseFailed'),
        description: error.message,
      });
      console.error(t('pauseFailed'), error);
    }
  };

  /**
   * 继续录制
   */
  const handleResumeRecording = async () => {
    try {
      const isMitmMode = session?.url?.includes('mitmproxy');
      const isProxyMode = session?.url?.includes('Proxy Server');
      
      let apiEndpoint = '/api/recording/resume';
      if (isMitmMode) {
        apiEndpoint = '/api/mitm/resume';
      } else if (isProxyMode) {
        apiEndpoint = '/api/proxy/resume';
      }
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSession(data.session);
        // 更新 localStorage 中的 session
        localStorage.setItem(RECORDING_SESSION_KEY, JSON.stringify(data.session));
      } else {
        toast({
          variant: "destructive",
          title: t('resumeFailed'),
          description: data.error || t('unknownError'),
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('resumeFailed'),
        description: error.message,
      });
      console.error(t('resumeFailed'), error);
    }
  };

  /**
   * 导入HAR文件
   */
  const handleImportHar = (apis: CapturedApi[]) => {
    setCapturedApis(prev => [...apis, ...prev]);
  };

  /**
   * 删除单个API
   */
  const handleDeleteApi = (index: number) => {
    setCapturedApis(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * 清空所有采集的API
   */
  const handleClearAll = async () => {
    if (confirm(t('clearConfirm'))) {
      // 清空前端状态
      setCapturedApis([]);
      
      // 如果有活跃的录制会话，清空后端捕获数据
      if (session && isRecording) {
        try {
          const isMitmMode = session.url?.includes('mitmproxy');
          const isProxyMode = session.url?.includes('Proxy Server');
          
          let apiEndpoint = '/api/recording/clear';
          if (isMitmMode) {
            apiEndpoint = '/api/mitm/clear';
          } else if (isProxyMode) {
            apiEndpoint = '/api/proxy/clear';
          }
          
          const response = await fetch(apiEndpoint, {
            method: 'POST',
          });
          
          if (!response.ok) {
            console.error('清空后端数据失败');
          }
        } catch (error) {
          console.error('清空后端数据出错:', error);
        }
      }
    }
  };

  /**
   * 导出采集数据
   */
  const handleExportApis = async () => {
    if (isRecording) {
      toast({
        variant: "destructive",
        title: t('cannotExport'),
        description: t('stopRecordingFirst'),
      });
      return;
    }

    try {
      // 如果有录制会话，从后端获取完整的HAR数据
      if (session) {
        const response = await fetch('/api/recording/data');
        const data = await response.json();
        
        if (data.success && data.harData) {
          downloadHarFile(data.harData);
          toast({
            variant: "success",
            title: t('exportSuccess'),
            description: t('harFileDownloaded'),
          });
          return;
        }
      }
      
      // 否则只导出当前的API列表
      downloadHarFile({ apis: capturedApis });
      toast({
        variant: "success",
        title: t('exportSuccess'),
        description: t('apiDataExported'),
      });
    } catch (error) {
      console.error(t('exportFailed'), error);
      toast({
        variant: "destructive",
        title: t('exportFailed'),
        description: t('pleaseTryAgainLater'),
      });
    }
  };

  /**
   * 查看API详情
   */
  const handleViewDetail = (api: CapturedApi, index: number) => {
    setSelectedApi(api);
    setDetailDialogOpen(true);
  };

  /**
   * 打开批量保存对话框
   */
  const handleOpenBatchSave = (apis: CapturedApi[]) => {
    setApisToSave(apis);
    setSaveDialogOpen(true);
  };

  /**
   * 执行批量保存
   */
  const handleBatchSave = async (data: {
    apis: Array<CapturedApi & {
      name: string;
      description?: string;
      categoryId?: string;
      tagIds?: string[];
    }>;
  }) => {
    try {
      const response = await fetch('/api/api-library/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apis: data.apis }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          variant: "success",
          title: t('saveSuccess'),
          description: `${t('savedToLibrary')} ${result.count} ${t('apisToLibrary')}`,
        });
        
        // 可选：保存成功后从采集列表中移除这些API
        const savedApiIds = new Set(data.apis.map(api => api.id));
        setCapturedApis(prev => prev.filter(api => !savedApiIds.has(api.id)));
      } else {
        throw new Error(result.error || t('saveFailed'));
      }
    } catch (error: any) {
      console.error(t('saveFailed'), error);
      toast({
        variant: "destructive",
        title: t('saveFailed'),
        description: error.message || t('pleaseTryAgainLater'),
      });
      throw error;
    }
  };

  // 显示加载状态，等待采集任务检查完成后再渲染页面
  if (isRestoring) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">{t('checkingRecordingStatus')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-6">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('pageDescription')}
        </div>
        {capturedApis.length > 0 && (
          <Button onClick={handleExportApis} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            {t('exportCapturedData')}
          </Button>
        )}
      </div>

      {/* 录制状态栏或录制/导入功能卡片 */}
      {isRecording && session ? (
        // 正在录制：显示状态栏
        <RecordingSection
          isRecording={isRecording}
          session={session}
          capturedCount={capturedApis.length}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onPauseRecording={handlePauseRecording}
          onResumeRecording={handleResumeRecording}
        />
      ) : (
        // 未录制：显示录制和导入功能卡片
        <div className="grid gap-4 md:grid-cols-2">
          <RecordingSection
            isRecording={isRecording}
            session={session}
            capturedCount={capturedApis.length}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onPauseRecording={handlePauseRecording}
            onResumeRecording={handleResumeRecording}
          />
          <HarImport
            isRecording={isRecording}
            onImport={handleImportHar}
          />
        </div>
      )}

      {/* API采集列表 */}
      <ApiList
        apis={capturedApis}
        onDelete={handleDeleteApi}
        onClearAll={handleClearAll}
        onViewDetail={handleViewDetail}
        onBatchSave={handleOpenBatchSave}
      />

      {/* API详情对话框 */}
      <ApiDetailDialog
        api={selectedApi}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />

      {/* 批量保存对话框 */}
      <BatchSaveDialog
        apis={apisToSave}
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleBatchSave}
      />
    </div>
  );
}
