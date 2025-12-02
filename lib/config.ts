/**
 * 应用配置
 * 
 * 这个文件用于管理所有的环境变量配置，确保类型安全和默认值
 */

/**
 * 获取执行器服务的 URL
 * 
 * 优先级：
 * 1. NEXT_PUBLIC_EXECUTOR_URL - 用于浏览器端访问
 * 2. EXECUTOR_URL - 用于服务端访问（API 路由）
 * 3. 默认值 - http://localhost:8001
 * 
 * @param forClient 是否用于客户端（浏览器）访问，默认 true
 * @returns 执行器服务的完整 URL
 */
export function getExecutorUrl(forClient: boolean = true): string {
  if (forClient) {
    // 浏览器端使用 NEXT_PUBLIC_EXECUTOR_URL
    return process.env.NEXT_PUBLIC_EXECUTOR_URL || 'http://localhost:8001';
  } else {
    // 服务端使用 EXECUTOR_URL（API 路由内部调用）
    return process.env.EXECUTOR_URL || process.env.NEXT_PUBLIC_EXECUTOR_URL || 'http://localhost:8001';
  }
}

/**
 * 应用配置对象
 */
export const config = {
  // 执行器配置
  executor: {
    // 客户端（浏览器）访问的 URL
    clientUrl: process.env.NEXT_PUBLIC_EXECUTOR_URL || 'http://localhost:8001',
    // 服务端（API 路由）访问的 URL
    serverUrl: process.env.EXECUTOR_URL || process.env.NEXT_PUBLIC_EXECUTOR_URL || 'http://localhost:8001',
  },
  
  // 应用配置
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
  },
  
  // 数据库配置
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
} as const;

export default config;

