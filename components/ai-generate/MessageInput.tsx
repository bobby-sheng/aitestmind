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
    <div className="border-t border-border bg-card p-4">
      <div className="max-w-4xl mx-auto space-y-3">
        {/* 测试类型选择器 - 单行紧凑布局 */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground shrink-0">{t('generateType')}:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTestType('api')}
              disabled={loading}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${testType === 'api' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Code2 className="w-4 h-4" />
              <span>{t('generateApiTest')}</span>
            </button>
            <button
              type="button"
              onClick={() => setTestType('e2e')}
              disabled={loading}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${testType === 'e2e' 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }
                ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Workflow className="w-4 h-4" />
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
            className="min-h-[120px] pr-14 resize-none text-sm leading-relaxed"
          />
          {loading ? (
            <Button
              onClick={handleStop}
              variant="destructive"
              className="absolute right-3 bottom-3 gap-2 px-4 h-10 rounded-full shadow-lg animate-pulse"
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
              className="absolute right-3 bottom-3 rounded-full h-10 w-10"
              title={t('send')}
            >
              <Send className="w-5 h-5" />
            </Button>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="hidden sm:inline">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[11px] font-medium">Enter</kbd> {t('send')}
            <kbd className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[11px] font-medium">Shift+Enter</kbd> {t('sendWithShiftEnter')}
          </span>
          <span className="sm:hidden">Enter {t('send')}</span>
          <span className="font-medium">{input.length}</span>
        </div>
      </div>
    </div>
  );
}

