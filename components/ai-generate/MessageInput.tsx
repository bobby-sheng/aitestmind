'use client';

import { useState } from 'react';
import { Send, Loader2, StopCircle, Workflow, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';

export type TestType = 'api' | 'e2e';

interface MessageInputProps {
  onSend: (content: string, testType: TestType) => void;
  loading?: boolean;
  placeholder?: string;
  onStop?: () => void;
}

export function MessageInput({
  onSend,
  loading,
  placeholder,
  onStop,
}: MessageInputProps) {
  const t = useTranslations('aiGenerate');
  const [input, setInput] = useState('');
  const [testType, setTestType] = useState<TestType>('api');
  
  // 根据测试类型动态获取placeholder
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    return testType === 'api' ? t('placeholderApi') : t('placeholderE2e');
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    onSend(input.trim(), testType);
    setInput('');
  };

  const handleStop = () => {
    if (onStop) {
      onStop();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 检查是否正在使用输入法（如中文拼音输入）
    // 如果正在组合输入（isComposing），不应该触发发送
    if (e.key === 'Enter' && !e.shiftKey && !loading && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card p-3">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* 测试类型选择器 - 单行紧凑布局 */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground shrink-0">{t('generateType')}:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTestType('api')}
              disabled={loading}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${testType === 'api' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{t('generateApiTest')}</span>
            </button>
            <button
              type="button"
              onClick={() => setTestType('e2e')}
              disabled={loading}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${testType === 'e2e' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>{t('generateE2eTest')}</span>
            </button>
          </div>
        </div>

        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            disabled={loading}
            className="min-h-[80px] pr-12 resize-none text-sm"
          />
          {loading ? (
            <Button
              onClick={handleStop}
              variant="destructive"
              className="absolute right-2 bottom-2 gap-2 px-4 h-10 rounded-full shadow-lg animate-pulse"
              title={t('stopGenerating')}
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-semibold">{t('stopGenerating')}</span>
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!input.trim()}
              size="icon"
              className="absolute right-2 bottom-2 rounded-full"
              title={t('send')}
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="hidden sm:inline">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> {t('send')}
            <kbd className="ml-2 px-1 py-0.5 bg-muted rounded text-[10px]">Shift+Enter</kbd> {t('sendWithShiftEnter')}
          </span>
          <span className="sm:hidden">Enter {t('send')}</span>
          <span>{input.length}</span>
        </div>
      </div>
    </div>
  );
}

