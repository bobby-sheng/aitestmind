import path from "path";
import { fileURLToPath } from "url";

// 固定为配置文件所在目录，避免从 D:\AutoTest 启动时解析到错误目录找不到 tailwindcss
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = __dirname;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "standalone",
  turbopack: {},

  webpack: (config, { dev }) => {
    const nodeModules = path.join(projectRoot, "node_modules");

    // 将 webpack context 固定到项目根目录
    config.context = projectRoot;

    config.resolve = config.resolve || {};

    // 模块搜索路径：优先本项目 node_modules
    config.resolve.modules = [nodeModules, "node_modules"];

    // 强制 tailwindcss 解析到本项目 node_modules 下的 CSS 入口文件
    config.resolve.alias = {
      ...config.resolve.alias,
      tailwindcss$: path.join(nodeModules, "tailwindcss", "index.css"),
      tailwindcss: path.join(nodeModules, "tailwindcss"),
    };

    // 为 CSS @import 设置独立的解析路径，确保在任何 cwd 下都能找到模块
    config.resolve.fallback = {
      ...config.resolve.fallback,
    };

    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/logs/**",
          "**/prisma/dev.db",
          "**/prisma/dev.db-journal",
          "**/.git/**",
          "**/executor/**/*.log",
          "**/executor/venv/**",
          "**/proxy-server/venv/**",
        ],
      };
    }
    return config;
  },

  allowedDevOrigins: [
    "http://192.168.10.113:3009",
    "http://localhost:3009",
    "http://127.0.0.1:3009",
  ],

  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
