/**
 * Playwright录制器核心类
 * 负责启动浏览器、拦截请求、记录HAR数据
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import {
  HarFile,
  HarEntry,
  HarRequest,
  HarResponse,
  HarHeader,
  HarCookie,
  HarContent,
  HarTimings,
  HarQueryString,
  HarPostData,
  RecordingSession,
  ApiRequestSummary,
} from '@/types/har';
import { filterHeaders, filterResponseHeaders } from '@/lib/header-filter';

export class PlaywrightRecorder {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private session: RecordingSession | null = null;
  private harEntries: HarEntry[] = [];
  private requestTimings: Map<string, { startTime: number; request: any }> = new Map();
  private isPaused: boolean = false; // 暂停状态
  private sseClients: Set<any> = new Set(); // SSE 客户端连接

  /**
   * 启动录制
   */
  async startRecording(url: string): Promise<RecordingSession> {
    try {
      // 启动浏览器（有头模式，用户可见）
      this.browser = await chromium.launch({
        headless: false, // 显示浏览器窗口
        args: [
          '--start-maximized',
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
          '--disable-setuid-sandbox',
        ],
        // 超时设置
        timeout: 60000, // 60秒超时
      }).catch((error) => {
        console.error('浏览器启动失败:', error);
        throw new Error(`浏览器启动失败: ${error.message}。请确保已安装Chromium: npx playwright install chromium`);
      });

      // 创建浏览器上下文
      this.context = await this.browser.newContext({
        viewport: null, // 使用最大化窗口
        ignoreHTTPSErrors: true,
        // 注意：我们通过请求/响应监听器手动构建HAR数据，不使用内置的recordHar
      });

      // 创建页面
      this.page = await this.context.newPage();

      // 初始化会话
      this.session = {
        id: `session_${Date.now()}`,
        url,
        startTime: new Date().toISOString(),
        status: 'recording',
        capturedRequests: 0,
      };

      // 设置请求拦截器
      await this.setupRequestInterceptor();

      // 导航到目标URL
      await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      return this.session;
    } catch (error: any) {
      this.session = {
        id: `session_${Date.now()}`,
        url,
        startTime: new Date().toISOString(),
        status: 'error',
        capturedRequests: 0,
        error: error.message,
      };
      throw error;
    }
  }

  /**
   * 设置请求拦截器
   */
  private async setupRequestInterceptor() {
    if (!this.page) return;

    // 监听请求
    this.page.on('request', async (request) => {
      const requestId = this.generateRequestId();
      const startTime = Date.now();

      // 记录请求开始时间
      this.requestTimings.set(requestId, {
        startTime,
        request: {
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
          postData: request.postData(),
          resourceType: request.resourceType(),
        },
      });
    });

    // 监听响应
    this.page.on('response', async (response) => {
      try {
        // 录制已停止（浏览器已关）或暂停时，不再处理
        if (!this.browser || !this.page || this.isPaused) {
          return;
        }

        const request = response.request();
        const requestId = this.findRequestId(request.url());
        const timing = this.requestTimings.get(requestId);

        if (!timing) return;

        const endTime = Date.now();
        const duration = endTime - timing.startTime;

        // 构建HAR Entry
        const harEntry = await this.buildHarEntry(
          timing.request,
          response,
          timing.startTime,
          duration
        );

        this.harEntries.push(harEntry);
        
        if (this.session) {
          this.session.capturedRequests = this.harEntries.length;
        }

        // 实时推送新捕获的请求到所有 SSE 客户端
        this.broadcastNewRequest(harEntry);

        // 清理已处理的请求记录
        this.requestTimings.delete(requestId);
      } catch (error: any) {
        if (!this.isPageClosedError(error)) {
          console.error('Error processing response:', error);
        }
      }
    });

    // 监听请求失败
    this.page.on('requestfailed', async (request) => {
      // 如果暂停中，不记录请求
      if (this.isPaused) {
        return;
      }

      const requestId = this.findRequestId(request.url());
      const timing = this.requestTimings.get(requestId);

      if (timing) {
        const endTime = Date.now();
        const duration = endTime - timing.startTime;

        // 记录失败的请求
        const harEntry = await this.buildFailedHarEntry(
          timing.request,
          request.failure()?.errorText || 'Unknown error',
          timing.startTime,
          duration
        );

        this.harEntries.push(harEntry);
        
        if (this.session) {
          this.session.capturedRequests = this.harEntries.length;
        }

        this.requestTimings.delete(requestId);
      }
    });
  }

  /**
   * 暂停录制
   */
  pauseRecording(): RecordingSession | null {
    if (!this.session || this.session.status !== 'recording') {
      throw new Error('没有正在进行的录制会话');
    }

    this.isPaused = true;
    this.session.status = 'paused';
    this.session.isPaused = true;
    this.session.pausedAt = new Date().toISOString();

    console.log('录制已暂停');
    
    // 广播状态变化
    this.broadcastSessionUpdate();
    
    return this.session;
  }

  /**
   * 继续录制
   */
  resumeRecording(): RecordingSession | null {
    if (!this.session || this.session.status !== 'paused') {
      throw new Error('当前会话未暂停');
    }

    this.isPaused = false;
    this.session.status = 'recording';
    this.session.isPaused = false;
    this.session.resumedAt = new Date().toISOString();

    console.log('录制已继续');
    
    // 广播状态变化
    this.broadcastSessionUpdate();
    
    return this.session;
  }

  /**
   * 判断是否为页面/浏览器已关闭导致的不可用错误
   */
  private isPageClosedError(error: any): boolean {
    const msg = error?.message ?? String(error);
    return (
      msg.includes('Target page, context or browser has been closed') ||
      msg.includes('No resource with given identifier') ||
      msg.includes('getResponseBody') ||
      msg.includes('Protocol error')
    );
  }

  /**
   * 构建HAR Entry
   */
  private async buildHarEntry(
    requestData: any,
    response: any,
    startTime: number,
    duration: number
  ): Promise<HarEntry> {
    const request = await this.buildHarRequest(requestData);
    let harResponse: HarResponse;
    try {
      harResponse = await this.buildHarResponse(response);
    } catch (error: any) {
      if (this.isPageClosedError(error)) {
        harResponse = {
          status: 0,
          statusText: 'Resource unavailable (page closed)',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [],
          content: { size: 0, mimeType: 'application/octet-stream' },
          redirectURL: '',
          headersSize: -1,
          bodySize: -1,
        };
      } else {
        throw error;
      }
    }

    let serverIPAddress: string | undefined;
    try {
      serverIPAddress = response.serverAddr()?.ipAddress;
    } catch {
      serverIPAddress = undefined;
    }

    const timings = this.buildHarTimings(duration);

    return {
      startedDateTime: new Date(startTime).toISOString(),
      time: duration,
      request,
      response: harResponse,
      cache: {},
      timings,
      serverIPAddress,
      _resourceType: requestData.resourceType,
    };
  }

  /**
   * 构建失败请求的HAR Entry
   */
  private async buildFailedHarEntry(
    requestData: any,
    errorText: string,
    startTime: number,
    duration: number
  ): Promise<HarEntry> {
    const request = await this.buildHarRequest(requestData);
    const timings = this.buildHarTimings(duration);

    return {
      startedDateTime: new Date(startTime).toISOString(),
      time: duration,
      request,
      response: {
        status: 0,
        statusText: errorText,
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: [],
        content: {
          size: 0,
          mimeType: 'text/plain',
        },
        redirectURL: '',
        headersSize: -1,
        bodySize: -1,
        _error: errorText,
      },
      cache: {},
      timings,
      _resourceType: requestData.resourceType,
    };
  }

  /**
   * 构建HAR Request
   */
  private async buildHarRequest(requestData: any): Promise<HarRequest> {
    const url = new URL(requestData.url);
    const headers: HarHeader[] = Object.entries(requestData.headers).map(([name, value]) => ({
      name,
      value: value as string,
    }));

    const queryString: HarQueryString[] = Array.from(url.searchParams.entries()).map(
      ([name, value]) => ({ name, value })
    );

    let postData: HarPostData | undefined;
    if (requestData.postData) {
      const contentType = requestData.headers['content-type'] || requestData.headers['Content-Type'] || 'application/octet-stream';
      const contentTypeLower = contentType.toLowerCase();
      
      postData = {
        mimeType: contentType,
        text: requestData.postData,
      };
      
      // 对于 form-data 和 urlencoded 类型，尝试解析为 params 数组
      if (contentTypeLower.includes('application/x-www-form-urlencoded')) {
        try {
          const params = new URLSearchParams(requestData.postData);
          postData.params = [];
          params.forEach((value, name) => {
            postData!.params!.push({ name, value });
          });
        } catch {
          // 解析失败，保留原始 text
        }
      } else if (contentTypeLower.includes('multipart/form-data')) {
        // multipart/form-data 比较复杂，尝试简单解析
        // 注意：这里只处理简单的文本字段，不处理文件上传
        try {
          // 从 Content-Type 中提取 boundary
          const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
          if (boundaryMatch) {
            const boundary = boundaryMatch[1].replace(/^["']|["']$/g, '');
            const parts = requestData.postData.split('--' + boundary);
            postData.params = [];
            
            for (const part of parts) {
              if (part.includes('Content-Disposition')) {
                const nameMatch = part.match(/name="([^"]+)"/);
                if (nameMatch) {
                  const name = nameMatch[1];
                  // 提取值（在空行之后的内容）
                  const valueMatch = part.split('\r\n\r\n')[1];
                  if (valueMatch) {
                    const value = valueMatch.replace(/\r\n--$/, '').trim();
                    postData.params.push({ name, value });
                  }
                }
              }
            }
          }
        } catch {
          // 解析失败，保留原始 text
        }
      }
    }

    return {
      method: requestData.method,
      url: requestData.url,
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers,
      queryString,
      postData,
      headersSize: -1,
      bodySize: requestData.postData ? requestData.postData.length : 0,
    };
  }

  /**
   * 构建HAR Response
   */
  private async buildHarResponse(response: any): Promise<HarResponse> {
    let headers: HarHeader[] = [];
    let status = 0;
    let statusText = 'Unknown';
    let contentType = 'application/octet-stream';

    try {
      headers = Object.entries(response.headers()).map(([name, value]) => ({
        name,
        value: value as string,
      }));
      contentType = response.headers()['content-type'] || contentType;
      status = response.status();
      statusText = response.statusText();
    } catch (error: any) {
      if (this.isPageClosedError(error)) {
        return {
          status: 0,
          statusText: 'Resource unavailable (page closed)',
          httpVersion: 'HTTP/1.1',
          cookies: [],
          headers: [],
          content: { size: 0, mimeType: 'application/octet-stream' },
          redirectURL: '',
          headersSize: -1,
          bodySize: -1,
        };
      }
      throw error;
    }

    let content: HarContent = {
      size: 0,
      mimeType: contentType,
    };

    try {
      // 尝试获取响应体
      // 注意：某些资源（图片、字体等）可能无法获取响应体，这是正常现象
      const body = await response.body();
      content.size = body.length;

      // 只为API请求保存响应体内容，以节省内存
      // 判断是否为API请求（JSON、XML、文本等）
      if (
        contentType.includes('json') ||
        contentType.includes('xml') ||
        contentType.includes('javascript') ||
        contentType.includes('text/plain') ||
        contentType.includes('text/html')
      ) {
        try {
          content.text = body.toString('utf-8');
        } catch (decodeError) {
          // 如果UTF-8解码失败，使用base64
          content.text = body.toString('base64');
          content.encoding = 'base64';
        }
      }
      // 对于二进制文件（图片、字体等），不保存内容，只记录大小
    } catch (error: any) {
      // 页面/浏览器已关闭或资源不可用时不打日志，其它情况仅对非预期错误输出警告
      const silent =
        this.isPageClosedError(error) ||
        (error.message?.includes && error.message.includes('No data found for resource'));
      if (!silent) {
        console.warn('Failed to get response body:', error.message);
      }
      content.size = 0;
    }

    return {
      status,
      statusText,
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers,
      content,
      redirectURL: '',
      headersSize: -1,
      bodySize: content.size,
    };
  }

  /**
   * 构建HAR Timings
   */
  private buildHarTimings(duration: number): HarTimings {
    return {
      blocked: -1,
      dns: -1,
      connect: -1,
      send: 0,
      wait: duration,
      receive: 0,
      ssl: -1,
    };
  }

  /**
   * 停止录制
   */
  async stopRecording(): Promise<HarFile> {
    if (this.session) {
      this.session.endTime = new Date().toISOString();
      this.session.status = 'stopped';
    }

    // 关闭浏览器
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }

    // 生成HAR文件
    const harFile: HarFile = {
      log: {
        version: '1.2',
        creator: {
          name: 'AI Test Handle - Playwright Recorder',
          version: '1.0.0',
        },
        browser: {
          name: 'Chromium',
          version: 'Latest',
        },
        entries: this.harEntries,
      },
    };

    return harFile;
  }

  /**
   * 获取当前会话信息
   */
  getSession(): RecordingSession | null {
    return this.session;
  }

  /**
   * 清空已捕获的数据（不停止录制）
   */
  clearCapturedData(): { success: boolean; error?: string } {
    try {
      // 清空 HAR 条目
      this.harEntries = [];
      
      // 清空请求计时
      this.requestTimings.clear();
      
      // 重置会话计数
      if (this.session) {
        this.session.capturedRequests = 0;
      }
      
      console.log('[Playwright] 🗑️ 已清空捕获数据');
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('[Playwright] 清空数据失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 获取捕获的请求摘要列表
   */
  getRequestSummaries(): ApiRequestSummary[] {
    return this.harEntries.map((entry, index) => {
      const url = new URL(entry.request.url);
      
      // 解析原始请求头和响应头
      const rawHeaders = Object.fromEntries(
        entry.request.headers.map((h) => [h.name, h.value])
      );
      const rawResponseHeaders = Object.fromEntries(
        entry.response.headers.map((h) => [h.name, h.value])
      );
      
      // 注意：不在这里过滤headers，统一在保存入库时根据平台设置的白名单过滤
      // 这样用户可以通过平台设置控制是否过滤以及过滤哪些headers
      
      // 解析请求体和请求体类型
      const postData = entry.request.postData;
      let requestBody: any = postData?.text;
      const requestMimeType = postData?.mimeType;
      
      // 对于 form-data 和 urlencoded，尝试解析为对象
      if (postData && requestMimeType) {
        const mimeTypeLower = requestMimeType.toLowerCase();
        if (mimeTypeLower.includes('application/json')) {
          // JSON 格式：尝试解析
          if (postData.text) {
            try {
              requestBody = JSON.parse(postData.text);
            } catch {
              requestBody = postData.text;
            }
          }
        } else if (mimeTypeLower.includes('multipart/form-data') || mimeTypeLower.includes('application/x-www-form-urlencoded')) {
          // form-data 或 urlencoded：优先使用 params
          if (postData.params && postData.params.length > 0) {
            requestBody = {};
            postData.params.forEach((param) => {
              requestBody[param.name] = param.value || '';
            });
          } else if (postData.text && mimeTypeLower.includes('urlencoded')) {
            // 尝试从 text 解析 urlencoded
            try {
              const params = new URLSearchParams(postData.text);
              requestBody = {};
              params.forEach((value, key) => {
                requestBody[key] = value;
              });
            } catch {
              requestBody = postData.text;
            }
          }
        }
      }
      
      return {
        id: `req_${index}`,
        method: entry.request.method,
        url: entry.request.url,
        path: url.pathname + url.search,
        status: entry.response.status,
        statusText: entry.response.statusText,
        resourceType: entry._resourceType || 'other',
        time: entry.time,
        size: entry.response.bodySize,
        startedDateTime: entry.startedDateTime,
        headers: rawHeaders,
        queryParams: Object.fromEntries(
          entry.request.queryString.map((q) => [q.name, q.value])
        ),
        requestBody,
        requestMimeType,
        responseHeaders: rawResponseHeaders,
        responseBody: entry.response.content.text,
        mimeType: entry.response.content.mimeType,
      };
    });
  }

  /**
   * 获取HAR数据
   */
  getHarData(): HarFile {
    return {
      log: {
        version: '1.2',
        creator: {
          name: 'AI Test Handle - Playwright Recorder',
          version: '1.0.0',
        },
        browser: {
          name: 'Chromium',
          version: 'Latest',
        },
        entries: this.harEntries,
      },
    };
  }

  /**
   * 添加 SSE 客户端
   */
  addSSEClient(client: any): void {
    this.sseClients.add(client);
    console.log(`SSE 客户端已连接，当前连接数: ${this.sseClients.size}`);
  }

  /**
   * 移除 SSE 客户端
   */
  removeSSEClient(client: any): void {
    this.sseClients.delete(client);
    console.log(`SSE 客户端已断开，当前连接数: ${this.sseClients.size}`);
  }

  /**
   * 广播新捕获的请求到所有 SSE 客户端
   */
  private broadcastNewRequest(harEntry: HarEntry): void {
    if (this.sseClients.size === 0) return;

    const url = new URL(harEntry.request.url);
    
    // 解析原始请求头和响应头
    const rawHeaders = Object.fromEntries(
      harEntry.request.headers.map((h) => [h.name, h.value])
    );
    const rawResponseHeaders = Object.fromEntries(
      harEntry.response.headers.map((h) => [h.name, h.value])
    );
    
    // 注意：不在这里过滤headers，统一在保存入库时根据平台设置的白名单过滤
    // 这样用户可以通过平台设置控制是否过滤以及过滤哪些headers
    
    // 解析请求体和请求体类型
    const postData = harEntry.request.postData;
    let requestBody: any = postData?.text;
    const requestMimeType = postData?.mimeType;
    
    // 对于 form-data 和 urlencoded，尝试解析为对象
    if (postData && requestMimeType) {
      const mimeTypeLower = requestMimeType.toLowerCase();
      if (mimeTypeLower.includes('application/json')) {
        // JSON 格式：尝试解析
        if (postData.text) {
          try {
            requestBody = JSON.parse(postData.text);
          } catch {
            requestBody = postData.text;
          }
        }
      } else if (mimeTypeLower.includes('multipart/form-data') || mimeTypeLower.includes('application/x-www-form-urlencoded')) {
        // form-data 或 urlencoded：优先使用 params
        if (postData.params && postData.params.length > 0) {
          requestBody = {};
          postData.params.forEach((param) => {
            requestBody[param.name] = param.value || '';
          });
        } else if (postData.text && mimeTypeLower.includes('urlencoded')) {
          // 尝试从 text 解析 urlencoded
          try {
            const params = new URLSearchParams(postData.text);
            requestBody = {};
            params.forEach((value, key) => {
              requestBody[key] = value;
            });
          } catch {
            requestBody = postData.text;
          }
        }
      }
    }
    
    const summary: ApiRequestSummary = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method: harEntry.request.method,
      url: harEntry.request.url,
      path: url.pathname + url.search,
      status: harEntry.response.status,
      statusText: harEntry.response.statusText,
      resourceType: harEntry._resourceType || 'other',
      time: harEntry.time,
      size: harEntry.response.bodySize,
      startedDateTime: harEntry.startedDateTime,
      headers: rawHeaders,
      queryParams: Object.fromEntries(
        harEntry.request.queryString.map((q) => [q.name, q.value])
      ),
      requestBody,
      requestMimeType,
      responseHeaders: rawResponseHeaders,
      responseBody: harEntry.response.content.text,
      mimeType: harEntry.response.content.mimeType,
    };

    const message = {
      type: 'new-request',
      data: summary,
      session: this.session,
    };

    // 发送给所有连接的客户端
    this.sseClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        console.error('发送 SSE 消息失败:', error);
        this.sseClients.delete(client);
      }
    });
  }

  /**
   * 广播会话状态变化
   */
  broadcastSessionUpdate(): void {
    if (this.sseClients.size === 0) return;

    const message = {
      type: 'session-update',
      session: this.session,
    };

    this.sseClients.forEach((client) => {
      try {
        client.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        console.error('发送 SSE 消息失败:', error);
        this.sseClients.delete(client);
      }
    });
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 根据URL查找请求ID
   */
  private findRequestId(url: string): string {
    for (const [id, timing] of this.requestTimings.entries()) {
      if (timing.request.url === url) {
        return id;
      }
    }
    return this.generateRequestId();
  }
}

// 单例实例（在生产环境中应该使用更好的状态管理）
let recorderInstance: PlaywrightRecorder | null = null;

export function getRecorderInstance(): PlaywrightRecorder {
  if (!recorderInstance) {
    recorderInstance = new PlaywrightRecorder();
  }
  return recorderInstance;
}

export function clearRecorderInstance(): void {
  recorderInstance = null;
}

