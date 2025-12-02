/**
 * mitmproxy 进程管理器
 * 直接从 Next.js 管理 mitmproxy，无需 Flask 中间层
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import chokidar from 'chokidar';

interface MitmSession {
  id: string;
  url: string;
  startTime: string;
  status: 'recording' | 'paused' | 'stopped';
  capturedRequests: number;
  isPaused: boolean;
}

interface SSEClient {
  write: (data: string) => void;
}

class MitmproxyManager {
  private process: ChildProcess | null = null;
  private port: number = 8899;
  private session: MitmSession | null = null;
  private tempFilePath: string;
  private sseClients: Set<SSEClient> = new Set();
  private fileWatcher: any = null;
  private lastRequestCount: number = 0;

  constructor() {
    // 临时文件路径（用于跨进程通信）
    this.tempFilePath = path.join(
      process.cwd(),
      'proxy-server',
      'mitm_capture_temp.json'
    );
  }

  /**
   * 添加 SSE 客户端
   */
  addSSEClient(client: SSEClient): void {
    this.sseClients.add(client);
    console.log(`[mitmproxy] SSE 客户端已连接 (总计: ${this.sseClients.size})`);
  }

  /**
   * 移除 SSE 客户端
   */
  removeSSEClient(client: SSEClient): void {
    this.sseClients.delete(client);
    console.log(`[mitmproxy] SSE 客户端已断开 (剩余: ${this.sseClients.size})`);
  }

  /**
   * 广播消息到所有 SSE 客户端
   */
  private broadcastToClients(data: any): void {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    this.sseClients.forEach(client => {
      try {
        client.write(message);
      } catch (error) {
        console.error('[mitmproxy] SSE 广播失败:', error);
        this.sseClients.delete(client);
      }
    });
  }

  /**
   * 启动文件监听（事件驱动）
   */
  private startFileWatcher(): void {
    if (this.fileWatcher) {
      return; // 已经在监听
    }
    
    this.fileWatcher = chokidar.watch(this.tempFilePath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 50,
      },
    });

    this.fileWatcher.on('change', async () => {
      try {
        const { summaries, totalRequests } = await this.readCaptureData();
        
        // 检查是否有新请求
        if (totalRequests > this.lastRequestCount) {
          const newRequests = summaries.slice(this.lastRequestCount);
          
          console.log(`[mitmproxy] 🔔 检测到 ${newRequests.length} 个新请求`);
          
          // 推送每个新请求
          newRequests.forEach(request => {
            this.broadcastToClients({
              type: 'new-request',
              data: request,
            });
          });
          
          // 推送会话更新
          if (this.session) {
            this.session.capturedRequests = totalRequests;
            this.broadcastToClients({
              type: 'session-update',
              session: this.session,
            });
          }
          
          this.lastRequestCount = totalRequests;
        }
      } catch (error) {
        console.error('[mitmproxy] 文件监听处理错误:', error);
      }
    });

    console.log('[mitmproxy] 📁 文件监听已启动');
  }

  /**
   * 停止文件监听
   */
  private stopFileWatcher(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
      console.log('[mitmproxy] 📁 文件监听已停止');
    }
  }

  /**
   * 检查并清理孤儿进程
   */
  private async checkAndKillOrphanProcess(port: number): Promise<void> {
    try {
      // 使用 lsof 检查端口是否被占用
      const checkProcess = spawn('lsof', ['-i', `:${port}`, '-t'], {
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      
      let pids: string[] = [];
      checkProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          pids = output.split('\n').filter((pid: string) => pid);
        }
      });
      
      await new Promise((resolve) => {
        checkProcess.on('close', resolve);
      });
      
      if (pids.length > 0) {
        console.log(`[mitmproxy] ⚠️ 发现孤儿进程 (PIDs: ${pids.join(', ')}), 正在清理...`);
        
        for (const pid of pids) {
          try {
            process.kill(parseInt(pid), 'SIGTERM');
            console.log(`[mitmproxy] 🗑️ 已发送停止信号给进程 ${pid}`);
          } catch (error) {
            console.warn(`[mitmproxy] 清理进程 ${pid} 失败:`, error);
          }
        }
        
        // 等待进程停止
        await this.delay(1000);
      }
    } catch (error) {
      // lsof 可能不可用，忽略错误
      console.log('[mitmproxy] 跳过孤儿进程检查');
    }
  }

  /**
   * 启动 mitmproxy
   */
  async start(port: number = 8899): Promise<{ success: boolean; session?: MitmSession; error?: string }> {
    try {
      // 如果已经在运行，返回现有会话
      if (this.process && !this.process.killed) {
        return {
          success: true,
          session: this.session || this.createSession(),
        };
      }

      this.port = port;
      
      // 🔥 清空旧的捕获数据（使用同步删除确保完成）
      try {
        if (fsSync.existsSync(this.tempFilePath)) {
          fsSync.unlinkSync(this.tempFilePath);
          console.log('[mitmproxy] 🗑️ 已清空旧的捕获数据');
        }
      } catch (error) {
        console.error('[mitmproxy] 清空旧数据失败:', error);
      }
      
      // 🔥 清空所有标记文件（防止旧标记影响新会话）
      const proxyDir = path.join(process.cwd(), 'proxy-server');
      const markerFiles = [
        'mitm_clear_marker.txt',
        'mitm_pause_marker.txt',
        'mitm_resume_marker.txt',
      ];
      
      for (const marker of markerFiles) {
        try {
          const markerPath = path.join(proxyDir, marker);
          if (fsSync.existsSync(markerPath)) {
            fsSync.unlinkSync(markerPath);
            console.log(`[mitmproxy] 🗑️ 已清理标记: ${marker}`);
          }
        } catch (error) {
          // 忽略错误
        }
      }
      
      // 重置计数器
      this.lastRequestCount = 0;

      // mitmproxy 录制器脚本路径
      const recorderScript = path.join(
        process.cwd(),
        'proxy-server',
        'mitmproxy_recorder.py'
      );

      // 检查脚本是否存在
      try {
        await fs.access(recorderScript);
      } catch {
        return {
          success: false,
          error: 'mitmproxy 录制器脚本不存在',
        };
      }

      // 检查并清理可能存在的孤儿进程
      await this.checkAndKillOrphanProcess(port);
      
      // 启动 mitmdump 进程
      this.process = spawn('mitmdump', [
        '-s', recorderScript,
        '--listen-port', port.toString(),
        '--set', 'block_global=false',
      ], {
        cwd: path.join(process.cwd(), 'proxy-server'),
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // 监听进程输出
      this.process.stdout?.on('data', (data) => {
        console.log(`[mitmproxy] ${data.toString()}`);
      });

      this.process.stderr?.on('data', (data) => {
        console.error(`[mitmproxy error] ${data.toString()}`);
      });

      // 监听进程退出
      this.process.on('exit', (code) => {
        console.log(`[mitmproxy] 进程退出，代码: ${code}`);
        this.process = null;
        if (this.session) {
          this.session.status = 'stopped';
        }
      });

      // 等待启动
      await this.delay(2000);

      // 创建会话
      this.session = this.createSession();
      
      // 🔔 启动文件监听（事件驱动）
      this.startFileWatcher();

      return {
        success: true,
        session: this.session,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 停止 mitmproxy
   */
  async stop(): Promise<{ success: boolean; harData?: any; summaries?: any[]; error?: string }> {
    try {
      if (!this.process || this.process.killed) {
        // 如果已经停止，返回成功（幂等操作）
        return {
          success: true,
          harData: { log: { version: '1.2', creator: {}, entries: [] } },
          summaries: [],
        };
      }

      // 读取捕获的数据
      const { harData, summaries } = await this.readCaptureData();

      // 停止进程并等待真正退出
      const exitPromise = new Promise<void>((resolve) => {
        if (this.process) {
          this.process.once('exit', () => {
            console.log('[mitmproxy] 进程已退出');
            resolve();
          });
          
          // 发送停止信号
          this.process.kill('SIGINT');
          
          // 设置超时，如果5秒内没有退出，强制结束
          setTimeout(() => {
            if (this.process && !this.process.killed) {
              console.log('[mitmproxy] 强制终止进程');
              this.process.kill('SIGKILL');
            }
            resolve();
          }, 5000);
        } else {
          resolve();
        }
      });

      await exitPromise;

      if (this.session) {
        this.session.status = 'stopped';
      }

      this.process = null;
      
      // 停止文件监听
      this.stopFileWatcher();
      
      // 删除捕获文件，防止误判为孤儿进程
      try {
        if (fsSync.existsSync(this.tempFilePath)) {
          fsSync.unlinkSync(this.tempFilePath);
          console.log('[mitmproxy] 🗑️ 已删除捕获文件');
        }
      } catch (error) {
        console.warn('[mitmproxy] 删除捕获文件失败:', error);
      }
      
      // 重置计数器
      this.lastRequestCount = 0;

      return {
        success: true,
        harData,
        summaries,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 暂停录制
   */
  async pause(): Promise<{ success: boolean; session?: MitmSession; error?: string }> {
    if (!this.session) {
      return { success: false, error: '无活跃会话' };
    }

    this.session.isPaused = true;
    this.session.status = 'paused';

    // 创建暂停标记文件，通知 Python 脚本暂停
    const pauseMarker = path.join(process.cwd(), 'proxy-server', 'mitm_pause_marker.txt');
    try {
      fsSync.writeFileSync(pauseMarker, 'pause', 'utf-8');
      console.log('[mitmproxy] ⏸️ 已创建暂停标记');
    } catch (error) {
      console.warn('[mitmproxy] 创建暂停标记失败:', error);
    }

    return {
      success: true,
      session: this.session,
    };
  }

  /**
   * 继续录制
   */
  async resume(): Promise<{ success: boolean; session?: MitmSession; error?: string }> {
    if (!this.session) {
      return { success: false, error: '无活跃会话' };
    }

    this.session.isPaused = false;
    this.session.status = 'recording';

    // 创建继续标记文件，通知 Python 脚本继续
    const resumeMarker = path.join(process.cwd(), 'proxy-server', 'mitm_resume_marker.txt');
    try {
      fsSync.writeFileSync(resumeMarker, 'resume', 'utf-8');
      console.log('[mitmproxy] ▶️ 已创建继续标记');
    } catch (error) {
      console.warn('[mitmproxy] 创建继续标记失败:', error);
    }

    return {
      success: true,
      session: this.session,
    };
  }

  /**
   * 获取状态
   */
  async getStatus(): Promise<{ 
  
    success: boolean; 
    session: MitmSession | null; 
    summaries: any[]; 
    totalRequests: number;
    orphanProcess?: boolean;
  }> {
    // 检查是否有进程引用
    if (!this.process || this.process.killed) {
      // 尝试检测孤儿进程（端口被占用但无进程引用）
      const hasOrphan = await this.detectOrphanProcess();
      
      // 只有当端口真的被占用时，才认为是孤儿进程
      if (hasOrphan) {
        console.log('[mitmproxy] ⚠️ 检测到孤儿进程（端口 :' + this.port + ' 被占用），尝试恢复会话');
        
        // 尝试从捕获文件恢复会话信息
        const { summaries, totalRequests } = await this.readCaptureData();
        
        if (summaries.length > 0) {
          // 创建恢复的会话
          if (!this.session) {
            this.session = this.createSession();
            this.session.capturedRequests = totalRequests;
            console.log('[mitmproxy] ✅ 已从孤儿进程恢复会话');
          }
          
          return {
            success: true,
            session: this.session,
            summaries,
            totalRequests,
            orphanProcess: true,
          };
        } else {
          // 端口被占用但没有数据，可能是其他程序
          console.log('[mitmproxy] ⚠️ 端口被占用但无捕获数据，可能是其他程序');
        }
      }
      
      // 没有进程，也没有孤儿进程
      return {
        success: false,
        session: null,
        summaries: [],
        totalRequests: 0,
      };
    }

    const { summaries, totalRequests } = await this.readCaptureData();

    // 更新会话计数
    if (this.session) {
      this.session.capturedRequests = totalRequests;
    }

    return {
      success: true,
      session: this.session,
      summaries,
      totalRequests,
    };
  }
  
  /**
   * 检测孤儿进程
   */
  private async detectOrphanProcess(): Promise<boolean> {
    try {
      const checkProcess = spawn('lsof', ['-i', `:${this.port}`, '-t'], {
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      
      let hasProcess = false;
      checkProcess.stdout?.on('data', (data) => {
        if (data.toString().trim()) {
          hasProcess = true;
        }
      });
      
      await new Promise((resolve) => {
        checkProcess.on('close', resolve);
      });
      
      return hasProcess;
    } catch (error) {
      return false;
    }
  }

  /**
   * 清空已捕获的数据（不停止录制）
   */
  async clearCapturedData(): Promise<{ success: boolean; error?: string }> {
    try {
      // 删除捕获文件
      if (fsSync.existsSync(this.tempFilePath)) {
        fsSync.unlinkSync(this.tempFilePath);
        console.log('[mitmproxy] 🗑️ 已清空捕获文件');
      }
      
      // 创建清理标记文件，通知 Python 脚本清空内存数据
      const clearMarker = path.join(process.cwd(), 'proxy-server', 'mitm_clear_marker.txt');
      try {
        fsSync.writeFileSync(clearMarker, 'clear', 'utf-8');
        console.log('[mitmproxy] 📝 已创建清理标记');
      } catch (markerError) {
        console.warn('[mitmproxy] 创建清理标记失败:', markerError);
      }
      
      // 重置计数器
      this.lastRequestCount = 0;
      
      // 重置会话计数
      if (this.session) {
        this.session.capturedRequests = 0;
      }
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('[mitmproxy] 清空数据失败:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 读取捕获的数据
   */
  private async readCaptureData(): Promise<{ harData?: any; summaries: any[]; totalRequests: number }> {
    try {
      const data = await fs.readFile(this.tempFilePath, 'utf-8');
      const parsed = JSON.parse(data);

      const summaries = this.convertToSummaries(parsed.har_data);

      return {
        harData: parsed.har_data,
        summaries,
        totalRequests: parsed.total_requests || 0,
      };
    } catch (error) {
      // 文件不存在或解析失败
      return {
        summaries: [],
        totalRequests: 0,
      };
    }
  }

  /**
   * 转换 HAR 数据为摘要
   */
  private convertToSummaries(harData: any): any[] {
    if (!harData || !harData.log || !harData.log.entries) {
      return [];
    }

    return harData.log.entries.map((entry: any, idx: number) => {
      const request = entry.request || {};
      const response = entry.response || {};
      const postData = request.postData || {};
      const content = response.content || {};

      // 生成唯一 ID
      const crypto = require('crypto');
      const uniqueStr = `${entry.startedDateTime}_${request.url}_${idx}`;
      const uniqueId = crypto.createHash('md5').update(uniqueStr).digest('hex').substring(0, 12);

      // 解析 URL
      const url = new URL(request.url || 'http://localhost');

      return {
        id: `req_${uniqueId}`,
        method: request.method || 'GET',
        url: request.url || '',
        path: url.pathname + url.search,
        status: response.status || 0,
        statusText: response.statusText || '',
        resourceType: entry._resourceType || 'other',
        time: entry.time || 0,
        size: response.bodySize || 0,
        startedDateTime: entry.startedDateTime || '',
        headers: Object.fromEntries(
          (request.headers || []).map((h: any) => [h.name, h.value])
        ),
        queryParams: Object.fromEntries(
          (request.queryString || []).map((q: any) => [q.name, q.value])
        ),
        requestBody: typeof postData === 'object' ? postData.text : null,
        responseBody: typeof content === 'object' ? content.text : null,
        mimeType: typeof content === 'object' ? content.mimeType || 'application/octet-stream' : 'application/octet-stream',
      };
    });
  }

  /**
   * 创建会话
   */
  private createSession(): MitmSession {
    return {
      id: `mitm_session_${Date.now()}`,
      url: 'mitmproxy Server',
      startTime: new Date().toISOString(),
      status: 'recording',
      capturedRequests: 0,
      isPaused: false,
    };
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取证书路径
   */
  getCertificatePath(): string {
    return path.join(os.homedir(), '.mitmproxy', 'mitmproxy-ca-cert.pem');
  }

  /**
   * 检查是否正在运行
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
}

// 单例模式
let mitmManager: MitmproxyManager | null = null;

export function getMitmManager(): MitmproxyManager {
  if (!mitmManager) {
    mitmManager = new MitmproxyManager();
  }
  return mitmManager;
}

