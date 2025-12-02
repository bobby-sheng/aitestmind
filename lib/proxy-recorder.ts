/**
 * HTTP/HTTPS 代理录制器
 * 用于远程部署场景，用户在本地浏览器配置代理，服务器捕获API请求
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import {
  HarFile,
  HarEntry,
  HarRequest,
  HarResponse,
  HarHeader,
  HarContent,
  HarTimings,
  HarQueryString,
  HarPostData,
  RecordingSession,
  ApiRequestSummary,
} from '@/types/har';
import { filterHeaders, filterResponseHeaders } from '@/lib/header-filter';

export class ProxyRecorder {
  private server: http.Server | null = null;
  private session: RecordingSession | null = null;
  private harEntries: HarEntry[] = [];
  private requestTimings: Map<string, { startTime: number; request: any }> = new Map();
  private isPaused: boolean = false;
  private sseClients: Set<any> = new Set();
  private port: number;

  constructor(port: number = 8899) {
    this.port = port;
  }

  /**
   * 启动代理服务器
   */
  async startRecording(port?: number): Promise<RecordingSession> {
    if (port) {
      this.port = port;
    }

    return new Promise((resolve, reject) => {
      try {
        // 初始化会话
        this.session = {
          id: `proxy_session_${Date.now()}`,
          url: `Proxy Server: localhost:${this.port}`,
          startTime: new Date().toISOString(),
          status: 'recording',
          capturedRequests: 0,
        };

        // 创建HTTP代理服务器
        this.server = http.createServer((clientReq, clientRes) => {
          this.handleProxyRequest(clientReq, clientRes);
        });

        // 处理CONNECT方法（用于HTTPS）
        this.server.on('connect', (req, clientSocket, head) => {
          this.handleConnectRequest(req, clientSocket, head);
        });

        // 启动监听
        this.server.listen(this.port, () => {
          console.log(`🚀 代理服务器已启动在端口: ${this.port}`);
          console.log(`📡 请在浏览器中配置HTTP/HTTPS代理: localhost:${this.port}`);
          resolve(this.session!);
        });

        this.server.on('error', (error) => {
          console.error('代理服务器启动失败:', error);
          this.session = {
            id: `proxy_session_${Date.now()}`,
            url: `Proxy Server: localhost:${this.port}`,
            startTime: new Date().toISOString(),
            status: 'error',
            capturedRequests: 0,
            error: error.message,
          };
          reject(error);
        });
      } catch (error: any) {
        reject(error);
      }
    });
  }

  /**
   * 处理HTTP代理请求
   */
  private handleProxyRequest(clientReq: http.IncomingMessage, clientRes: http.ServerResponse): void {
    if (this.isPaused) {
      // 暂停时仍然转发请求，但不记录
      this.forwardRequest(clientReq, clientRes, false);
      return;
    }

    const requestId = this.generateRequestId();
    const startTime = Date.now();

    // 收集请求体
    let requestBody = '';
    clientReq.on('data', (chunk) => {
      requestBody += chunk.toString();
    });

    clientReq.on('end', () => {
      // 记录请求信息
      this.requestTimings.set(requestId, {
        startTime,
        request: {
          method: clientReq.method,
          url: clientReq.url,
          headers: clientReq.headers,
          postData: requestBody,
        },
      });

      // 转发请求
      this.forwardRequest(clientReq, clientRes, true, requestId, requestBody);
    });

    clientReq.on('error', (error) => {
      console.error('客户端请求错误:', error);
      clientRes.writeHead(500);
      clientRes.end('Proxy Error');
    });
  }

  /**
   * 转发HTTP请求到目标服务器
   */
  private forwardRequest(
    clientReq: http.IncomingMessage,
    clientRes: http.ServerResponse,
    record: boolean,
    requestId?: string,
    requestBody?: string
  ): void {
    try {
      const targetUrl = new URL(clientReq.url || '', `http://${clientReq.headers.host}`);
      
      const options: http.RequestOptions = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: clientReq.method,
        headers: {
          ...clientReq.headers,
          host: targetUrl.host, // 修改host头
        },
      };

      const protocol = targetUrl.protocol === 'https:' ? https : http;

      const proxyReq = protocol.request(options, (proxyRes) => {
        // 收集响应体
        let responseBody = '';
        proxyRes.on('data', (chunk) => {
          responseBody += chunk.toString('utf8');
        });

        proxyRes.on('end', () => {
          if (record && requestId) {
            const timing = this.requestTimings.get(requestId);
            if (timing) {
              const endTime = Date.now();
              const duration = endTime - timing.startTime;

              // 构建HAR Entry
              const harEntry = this.buildHarEntry(
                timing.request,
                {
                  status: proxyRes.statusCode,
                  statusText: proxyRes.statusMessage,
                  headers: proxyRes.headers,
                  body: responseBody,
                },
                timing.startTime,
                duration
              );

              this.harEntries.push(harEntry);

              if (this.session) {
                this.session.capturedRequests = this.harEntries.length;
              }

              // 实时推送
              this.broadcastNewRequest(harEntry);

              this.requestTimings.delete(requestId);
            }
          }
        });

        // 转发响应头和状态码
        clientRes.writeHead(proxyRes.statusCode || 200, proxyRes.headers);

        // 转发响应体
        proxyRes.pipe(clientRes);
      });

      proxyReq.on('error', (error) => {
        console.error('代理请求错误:', error);
        clientRes.writeHead(502);
        clientRes.end('Bad Gateway');

        if (record && requestId) {
          // 记录失败的请求
          const timing = this.requestTimings.get(requestId);
          if (timing) {
            const endTime = Date.now();
            const duration = endTime - timing.startTime;
            const harEntry = this.buildFailedHarEntry(
              timing.request,
              error.message,
              timing.startTime,
              duration
            );
            this.harEntries.push(harEntry);
            this.requestTimings.delete(requestId);
          }
        }
      });

      // 发送请求体
      if (requestBody) {
        proxyReq.write(requestBody);
      }
      proxyReq.end();
    } catch (error: any) {
      console.error('转发请求失败:', error);
      clientRes.writeHead(500);
      clientRes.end('Proxy Error');
    }
  }

  /**
   * 处理HTTPS CONNECT请求（隧道代理）
   */
  private handleConnectRequest(
    req: http.IncomingMessage,
    clientSocket: any,
    head: Buffer
  ): void {
    console.log(`CONNECT 请求: ${req.url}`);

    // 解析目标地址
    const [hostname, port] = (req.url || '').split(':');

    // 连接到目标服务器
    const serverSocket = require('net').connect(
      parseInt(port) || 443,
      hostname,
      () => {
        // 告诉客户端连接已建立
        clientSocket.write(
          'HTTP/1.1 200 Connection Established\r\n' +
          'Proxy-agent: Node.js-Proxy\r\n' +
          '\r\n'
        );

        // 双向转发数据（隧道模式，无法拦截HTTPS内容）
        serverSocket.write(head);
        serverSocket.pipe(clientSocket);
        clientSocket.pipe(serverSocket);

        // 注意：HTTPS隧道模式下无法拦截请求内容
        // 如需拦截HTTPS，需要实现中间人证书（MITM）
      }
    );

    serverSocket.on('error', (error: any) => {
      console.error('CONNECT隧道错误:', error);
      clientSocket.end();
    });

    clientSocket.on('error', (error: any) => {
      console.error('客户端socket错误:', error);
      serverSocket.end();
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

    console.log('代理录制已暂停');
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

    console.log('代理录制已继续');
    this.broadcastSessionUpdate();

    return this.session;
  }

  /**
   * 停止录制
   */
  async stopRecording(): Promise<HarFile> {
    if (this.session) {
      this.session.endTime = new Date().toISOString();
      this.session.status = 'stopped';
    }

    // 关闭服务器
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          console.log('代理服务器已关闭');
          resolve();
        });
      });
      this.server = null;
    }

    // 生成HAR文件
    const harFile: HarFile = {
      log: {
        version: '1.2',
        creator: {
          name: 'AI Test Handle - Proxy Recorder',
          version: '1.0.0',
        },
        browser: {
          name: 'Proxy',
          version: '1.0.0',
        },
        entries: this.harEntries,
      },
    };

    return harFile;
  }

  /**
   * 构建HAR Entry
   */
  private buildHarEntry(
    requestData: any,
    responseData: any,
    startTime: number,
    duration: number
  ): HarEntry {
    const request = this.buildHarRequest(requestData);
    const response = this.buildHarResponse(responseData);
    const timings = this.buildHarTimings(duration);

    return {
      startedDateTime: new Date(startTime).toISOString(),
      time: duration,
      request,
      response,
      cache: {},
      timings,
    };
  }

  /**
   * 构建失败请求的HAR Entry
   */
  private buildFailedHarEntry(
    requestData: any,
    errorText: string,
    startTime: number,
    duration: number
  ): HarEntry {
    const request = this.buildHarRequest(requestData);
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
    };
  }

  /**
   * 构建HAR Request
   */
  private buildHarRequest(requestData: any): HarRequest {
    const fullUrl = requestData.url?.startsWith('http') 
      ? requestData.url 
      : `http://${requestData.headers?.host || 'unknown'}${requestData.url}`;
    
    const url = new URL(fullUrl);
    const headers: HarHeader[] = Object.entries(requestData.headers || {}).map(([name, value]) => ({
      name,
      value: String(value),
    }));

    const queryString: HarQueryString[] = Array.from(url.searchParams.entries()).map(
      ([name, value]) => ({ name, value })
    );

    let postData: HarPostData | undefined;
    if (requestData.postData) {
      postData = {
        mimeType: requestData.headers?.['content-type'] || 'application/octet-stream',
        text: requestData.postData,
      };
    }

    return {
      method: requestData.method || 'GET',
      url: fullUrl,
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
  private buildHarResponse(responseData: any): HarResponse {
    const headers: HarHeader[] = Object.entries(responseData.headers || {}).map(([name, value]) => ({
      name,
      value: String(value),
    }));

    const contentType = responseData.headers?.['content-type'] || 'application/octet-stream';
    const content: HarContent = {
      size: responseData.body?.length || 0,
      mimeType: contentType,
    };

    // 只为API请求保存响应体
    if (
      contentType.includes('json') ||
      contentType.includes('xml') ||
      contentType.includes('javascript') ||
      contentType.includes('text')
    ) {
      content.text = responseData.body || '';
    }

    return {
      status: responseData.status || 200,
      statusText: responseData.statusText || 'OK',
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
      
      console.log('[Proxy] 🗑️ 已清空捕获数据');
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('[Proxy] 清空数据失败:', error);
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
      
      return {
        id: `req_${index}`,
        method: entry.request.method,
        url: entry.request.url,
        path: url.pathname + url.search,
        status: entry.response.status,
        statusText: entry.response.statusText,
        resourceType: 'xhr',
        time: entry.time,
        size: entry.response.bodySize,
        startedDateTime: entry.startedDateTime,
        headers: rawHeaders,
        queryParams: Object.fromEntries(
          entry.request.queryString.map((q) => [q.name, q.value])
        ),
        requestBody: entry.request.postData?.text,
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
          name: 'AI Test Handle - Proxy Recorder',
          version: '1.0.0',
        },
        browser: {
          name: 'Proxy',
          version: '1.0.0',
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
   * 广播新捕获的请求
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
    
    const summary: ApiRequestSummary = {
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method: harEntry.request.method,
      url: harEntry.request.url,
      path: url.pathname + url.search,
      status: harEntry.response.status,
      statusText: harEntry.response.statusText,
      resourceType: 'xhr',
      time: harEntry.time,
      size: harEntry.response.bodySize,
      startedDateTime: harEntry.startedDateTime,
      headers: rawHeaders,
      queryParams: Object.fromEntries(
        harEntry.request.queryString.map((q) => [q.name, q.value])
      ),
      requestBody: harEntry.request.postData?.text,
      responseHeaders: rawResponseHeaders,
      responseBody: harEntry.response.content.text,
      mimeType: harEntry.response.content.mimeType,
    };

    const message = {
      type: 'new-request',
      data: summary,
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
}

// 单例实例
let proxyRecorderInstance: ProxyRecorder | null = null;

export function getProxyRecorderInstance(): ProxyRecorder {
  if (!proxyRecorderInstance) {
    proxyRecorderInstance = new ProxyRecorder();
  }
  return proxyRecorderInstance;
}

export function clearProxyRecorderInstance(): void {
  proxyRecorderInstance = null;
}

