"use client"

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode, useEffect, useState } from 'react';

export function IntlProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<string>('zh');
  const [messages, setMessages] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 从 cookie 读取当前语言
    const currentLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('locale='))
      ?.split('=')[1] || 'zh';
    
    setLocale(currentLocale);

    // 动态加载对应的翻译文件
    import(`@/i18n/messages/${currentLocale}.json`)
      .then(module => {
        setMessages(module.default);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load messages:', err);
        // 加载失败时使用中文
        import('@/i18n/messages/zh.json')
          .then(module => {
            setMessages(module.default);
            setIsLoading(false);
          });
      });
  }, []);

  // 在加载过程中显示加载状态，但仍然提供空的 Provider context
  // 这样可以避免 useTranslations 找不到 context 的错误
  if (isLoading || !messages) {
    return (
      <NextIntlClientProvider locale={locale} messages={{}}>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">加载中...</div>
        </div>
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

