/**
 * Next.js 日志工具
 * 
 * 功能：
 * - 控制台输出
 * - 文件记录（按天分割）
 * - 操作类型标注
 * - 错误追踪
 */

import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

// 日志级别
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
  DEBUG = 'DEBUG',
}

// 操作类型
export enum OperationType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  EXECUTE = 'EXECUTE',
  AUTH = 'AUTH',
  QUERY = 'QUERY',
}

// 日志颜色
const colors = {
  INFO: '\x1b[36m',      // 青色
  WARN: '\x1b[33m',      // 黄色
  ERROR: '\x1b[31m',     // 红色
  SUCCESS: '\x1b[32m',   // 绿色
  DEBUG: '\x1b[35m',     // 紫色
  RESET: '\x1b[0m',
};

// 操作颜色
const operationColors = {
  CREATE: '\x1b[32m',    // 绿色
  READ: '\x1b[36m',      // 青色
  UPDATE: '\x1b[33m',    // 黄色
  DELETE: '\x1b[31m',    // 红色
  EXECUTE: '\x1b[35m',   // 紫色
  AUTH: '\x1b[34m',      // 蓝色
  QUERY: '\x1b[36m',     // 青色
};

class Logger {
  private logsDir: string;
  private currentDate: string;
  private logFilePath: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.currentDate = this.getDateString();
    this.logFilePath = this.getLogFilePath();
    this.ensureLogDirectory();
  }

  /**
   * 获取日期字符串 YYYY-MM-DD
   */
  private getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 获取时间戳字符串 HH:mm:ss.SSS
   */
  private getTimeString(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  /**
   * 获取日志文件路径
   */
  private getLogFilePath(): string {
    return path.join(this.logsDir, `${this.currentDate}-nextjs-api.log`);
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * 检查是否需要切换日志文件（跨天）
   */
  private checkDateChange(): void {
    const newDate = this.getDateString();
    if (newDate !== this.currentDate) {
      this.currentDate = newDate;
      this.logFilePath = this.getLogFilePath();
    }
  }

  /**
   * 写入日志文件
   */
  private writeToFile(message: string): void {
    try {
      this.checkDateChange();
      fs.appendFileSync(this.logFilePath, message + '\n', 'utf-8');
    } catch (error) {
      console.error('写入日志文件失败:', error);
    }
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(
    level: LogLevel,
    operation: OperationType | null,
    message: string,
    data?: any
  ): { console: string; file: string } {
    const timestamp = this.getTimeString();
    const operationStr = operation ? `[${operation}]` : '';
    
    // 控制台输出（带颜色）
    const levelColor = colors[level];
    const opColor = operation ? operationColors[operation] : '';
    const consoleMsg = 
      `${colors.RESET}[${timestamp}] ` +
      `${levelColor}[${level}]${colors.RESET} ` +
      `${opColor}${operationStr}${colors.RESET} ` +
      `${message}`;
    
    // 文件输出（无颜色）
    const fileMsg = 
      `[${timestamp}] [${level}] ${operationStr} ${message}` +
      (data ? `\nData: ${JSON.stringify(data, null, 2)}` : '');
    
    return { console: consoleMsg, file: fileMsg };
  }

  /**
   * 记录日志（通用方法）
   */
  private log(
    level: LogLevel,
    operation: OperationType | null,
    message: string,
    data?: any,
    error?: Error
  ): void {
    const formatted = this.formatMessage(level, operation, message, data);
    
    // 控制台输出
    console.log(formatted.console);
    if (data && typeof data === 'object') {
      console.log('  Data:', data);
    }
    if (error) {
      console.error('  Error:', error.message);
      console.error('  Stack:', error.stack);
    }
    
    // 文件输出
    let fileMessage = formatted.file;
    if (error) {
      fileMessage += `\nError: ${error.message}\nStack: ${error.stack}`;
    }
    this.writeToFile(fileMessage);
  }

  /**
   * API 请求日志
   */
  public apiRequest(
    method: string,
    path: string,
    operation: OperationType,
    data?: any
  ): void {
    this.log(
      LogLevel.INFO,
      operation,
      `${method} ${path}`,
      data
    );
  }

  /**
   * API 响应日志
   */
  public apiResponse(
    method: string,
    path: string,
    operation: OperationType,
    status: number,
    duration: number
  ): void {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.SUCCESS;
    this.log(
      level,
      operation,
      `${method} ${path} - ${status} (${duration}ms)`
    );
  }

  /**
   * 成功日志
   */
  public success(operation: OperationType, message: string, data?: any): void {
    this.log(LogLevel.SUCCESS, operation, message, data);
  }

  /**
   * 信息日志
   */
  public info(operation: OperationType | null, message: string, data?: any): void {
    this.log(LogLevel.INFO, operation, message, data);
  }

  /**
   * 警告日志
   */
  public warn(operation: OperationType | null, message: string, data?: any): void {
    this.log(LogLevel.WARN, operation, message, data);
  }

  /**
   * 错误日志
   */
  public error(
    operation: OperationType | null,
    message: string,
    error?: Error,
    data?: any
  ): void {
    this.log(LogLevel.ERROR, operation, message, data, error);
  }

  /**
   * 调试日志
   */
  public debug(operation: OperationType | null, message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      this.log(LogLevel.DEBUG, operation, message, data);
    }
  }

  /**
   * 数据库操作日志
   */
  public db(operation: OperationType, entity: string, action: string, data?: any): void {
    this.log(
      LogLevel.INFO,
      operation,
      `DB: ${entity}.${action}`,
      data
    );
  }

  /**
   * 认证日志
   */
  public auth(action: string, userId?: string, success: boolean = true): void {
    this.log(
      success ? LogLevel.SUCCESS : LogLevel.ERROR,
      OperationType.AUTH,
      `${action}${userId ? ` - User: ${userId}` : ''}`,
    );
  }

  /**
   * 外部调用日志
   */
  public external(service: string, action: string, success: boolean, data?: any): void {
    this.log(
      success ? LogLevel.SUCCESS : LogLevel.ERROR,
      OperationType.EXECUTE,
      `External: ${service} - ${action}`,
      data
    );
  }
}

// 导出单例
export const logger = new Logger();

/**
 * API 日志中间件辅助函数
 */
export function createApiLogger(operation: OperationType) {
  return {
    request: (request: Request | NextRequest, data?: any) => {
      const url = new URL(request.url);
      logger.apiRequest(request.method, url.pathname, operation, data);
    },
    
    success: (request: Request | NextRequest, result: any, startTime: number) => {
      const url = new URL(request.url);
      const duration = Date.now() - startTime;
      logger.apiResponse(request.method, url.pathname, operation, 200, duration);
      return result;
    },
    
    error: (request: Request | NextRequest, error: Error, startTime: number) => {
      const url = new URL(request.url);
      const duration = Date.now() - startTime;
      logger.apiResponse(request.method, url.pathname, operation, 500, duration);
      logger.error(operation, `API Error: ${url.pathname}`, error);
      throw error;
    },
  };
}

