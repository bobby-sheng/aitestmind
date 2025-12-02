'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StreamingAIMessage, StreamBlock } from './StreamingAIMessage';
import { useTranslations } from 'next-intl';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  blocks?: StreamBlock[]; // 用于流式消息
  isStreaming?: boolean; // 是否正在流式传输
}

interface MessageListProps {
  messages: Message[];
  loading?: boolean;
  onExampleClick?: (example: string) => void;
}

export function MessageList({ messages, loading, onExampleClick }: MessageListProps) {
  const t = useTranslations('aiGenerate');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-transparent">
        <div className="text-center max-w-2xl">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {t('emptyTitle')}
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            {t('emptyDescription')}
          </p>
          
          <div className="grid gap-3 text-left">
            <button
              onClick={() => onExampleClick?.(t('example1Text'))}
              className="group p-4 rounded-xl bg-secondary border border-border hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer text-left hover:bg-accent"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <span className="text-lg">💡</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  <strong className="text-primary">{t('example1')}:</strong> {t('example1Text')}
                </p>
              </div>
            </button>
            
            <button
              onClick={() => onExampleClick?.(t('example2Text'))}
              className="group p-4 rounded-xl bg-secondary border border-border hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer text-left hover:bg-accent"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <span className="text-lg">💡</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  <strong className="text-primary">{t('example2')}:</strong> {t('example2Text')}
                </p>
              </div>
            </button>
            
            <button
              onClick={() => onExampleClick?.(t('example3Text'))}
              className="group p-4 rounded-xl bg-secondary border border-border hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer text-left hover:bg-accent"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <span className="text-lg">💡</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  <strong className="text-primary">{t('example3')}:</strong> {t('example3Text')}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-transparent">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {messages.map((message) => {
          // 用户消息
          if (message.role === 'user') {
            return (
              <div key={message.id} className="flex gap-4 justify-end">
                <div className="rounded-2xl px-5 py-3 max-w-[80%] bg-primary text-primary-foreground shadow-md">
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {message.content}
                  </div>
                  <div className="text-xs mt-2 opacity-80">
                    {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-md">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            );
          }

          // AI 消息 - 流式或普通
          if (message.role === 'assistant') {
            // 如果有 blocks，使用流式渲染
            if (message.blocks && message.blocks.length > 0) {
              return (
                <StreamingAIMessage
                  key={message.id}
                  blocks={message.blocks}
                  createdAt={message.createdAt}
                />
              );
            }

            // 否则使用普通渲染
            return (
              <div key={message.id} className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-md">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>

                <div className="rounded-2xl px-5 py-3 max-w-[80%] bg-muted text-foreground shadow-sm">
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {message.content}
                  </div>
                  <div className="text-xs mt-2 text-muted-foreground">
                    {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* 加载状态 */}
        {loading && (
          <div className="flex gap-4 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 shadow-md">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="rounded-2xl px-5 py-3 bg-muted shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">
                  {t('aiThinking')}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
