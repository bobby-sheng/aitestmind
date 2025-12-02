'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 检查是否已登录
    const token = localStorage.getItem('token');
    
    if (token) {
      // 已登录，跳转到 API 采集页
      router.push('/api-capture');
    } else {
      // 未登录，跳转到登录页
      router.push('/login');
    }
  }, [router]);

  // 显示加载状态
  return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
