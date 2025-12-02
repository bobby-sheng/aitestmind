import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright配置文件
 * 用于API录制功能
 */
export default defineConfig({
  // 测试目录（如果需要）
  testDir: './tests',
  
  // 全局超时设置
  timeout: 60 * 1000, // 60秒
  
  // 期望超时
  expect: {
    timeout: 10000,
  },
  
  // 失败重试次数
  fullyParallel: true,
  retries: 0,
  
  // 工作线程数
  workers: 1,
  
  // 报告配置
  reporter: 'html',
  
  // 所有项目的共享设置
  use: {
    // 基础URL
    baseURL: 'http://localhost:3000',
    
    // 追踪设置
    trace: 'on-first-retry',
    
    // 截图设置
    screenshot: 'only-on-failure',
    
    // 视频设置
    video: 'retain-on-failure',
  },

  // 浏览器项目配置
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // 使用本地安装的Chromium
        channel: undefined,
      },
    },
  ],

  // 开发服务器配置（如果需要）
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});

