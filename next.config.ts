import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 关闭 React 严格模式，避免开发环境下组件重复挂载 / useEffect 执行两遍
  reactStrictMode: false,
};

export default nextConfig;

