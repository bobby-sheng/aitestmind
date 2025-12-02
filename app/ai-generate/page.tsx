'use client';

import { useState, useEffect, useRef } from 'react';
import { ConversationList } from '@/components/ai-generate/ConversationList';
import { MessageList, Message } from '@/components/ai-generate/MessageList';
import { MessageInput, TestType } from '@/components/ai-generate/MessageInput';
import { StreamBlock } from '@/components/ai-generate/StreamingAIMessage';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Menu, StopCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslations } from 'next-intl';

export default function AIGeneratePage() {
  const t = useTranslations('aiGenerate');
  const tCommon = useTranslations('common');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [conversationNeedsRefresh, setConversationNeedsRefresh] = useState(0); // 用于触发对话列表刷新
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // 监听页面刷新/关闭事件 - 当AI正在生成时阻止用户离开
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (loading) {
        e.preventDefault();
        e.returnValue = ''; // Chrome需要设置returnValue
        return t('generatingWarning');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [loading]);

  // 加载对话消息
  const loadMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await res.json();
      if (data.success) {
        // 解析消息，将 metadata.blocks 提取到 message.blocks
        const parsedMessages = data.data.map((msg: any) => {
          if (msg.metadata && msg.metadata.blocks) {
            return {
              ...msg,
              blocks: msg.metadata.blocks,
            };
          }
          return msg;
        });
        setMessages(parsedMessages);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
      toast({
        title: t('error'),
        description: t('loadMessagesFailed'),
        variant: 'destructive',
      });
    }
  };

  // 选择对话
  const handleSelectConversation = async (id: string) => {
    setCurrentConversationId(id);
    await loadMessages(id);
    setIsSidebarOpen(false);
  };

  // 创建新对话
  const handleNewConversation = async () => {
    try {
      // 立即创建数据库记录，这样左侧会显示"新对话"
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: t('newConversation'),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCurrentConversationId(data.data.id);
        setMessages([]);
        setIsSidebarOpen(false);
        setConversationNeedsRefresh(prev => prev + 1); // 触发列表刷新
      }
    } catch (error) {
      console.error('创建对话失败:', error);
      toast({
        title: t('error'),
        description: t('createConversationFailed'),
        variant: 'destructive',
      });
    }
  };

  // 删除对话
  const handleDeleteConversation = (id: string) => {
    if (id === currentConversationId) {
      setCurrentConversationId(null);
      setMessages([]);
    }
    setConversationNeedsRefresh(prev => prev + 1); // 触发列表刷新
    toast({
      title: tCommon('success'),
      description: t('conversationDeleted'),
    });
  };

  // 更新对话
  const handleUpdateConversation = (id: string, data: any) => {
    setConversationNeedsRefresh(prev => prev + 1); // 触发列表刷新
  };

  // 停止生成
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      
      toast({
        title: t('stopped'),
        description: t('aiGenerationStopped'),
      });
    }
  };

  // 发送消息 - SSE 流式版本
  const handleSendMessage = async (content: string, testType: TestType = 'api') => {
    // 将变量声明移到 try 外部，确保 catch 块可以访问
    let conversationId = currentConversationId;
    let isNewConversation = false;

    try {
      // 如果有正在进行的请求，取消它
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // 创建新的 AbortController
      abortControllerRef.current = new AbortController();

      // 如果没有当前对话，先创建一个
      
      if (!conversationId) {
        const createRes = await fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          }),
        });

        const createData = await createRes.json();
        if (!createData.success) {
          throw new Error(t('createConversationFailed'));
        }

        conversationId = createData.data.id;
        setCurrentConversationId(conversationId);
        isNewConversation = true;
        setConversationNeedsRefresh(prev => prev + 1); // 触发列表刷新
      }

      // 添加用户消息到UI
      const userMessageId = `user-${Date.now()}`;
    const userMessage: Message = {
        id: userMessageId,
      role: 'user',
        content,
        createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

      // 保存用户消息到数据库
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'user',
          content,
        }),
      });

      // 创建流式AI消息
      const aiMessageId = `assistant-${Date.now()}`;
      const aiMessage: Message = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        blocks: [],
        isStreaming: true,
      };
      setMessages((prev) => [...prev, aiMessage]);

      // 调用SSE流式API
      const response = await fetch('/api/ai/smart-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userInput: content,
          testType 
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(t('requestFailed'));
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error(t('cannotReadStream'));
      }

      let fullContent = '';
      const blocks: StreamBlock[] = [];
      const toolCallMap = new Map<string, number>(); // 跟踪工具调用的索引，key: tool名称
      let thinkingBlockIndex = -1; // 思考块的索引
      let toolCallCounter = 0; // 工具调用计数器

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // 处理不同类型的消息
              if (data.type === 'thinking') {
                // 如果还没有思考块，创建一个
                if (thinkingBlockIndex === -1) {
                  thinkingBlockIndex = blocks.length;
                  blocks.push({
                    id: `thinking-block`,
                    type: 'thinking',
                    content: data.content,
                    timestamp: Date.now(),
                  });
                } else {
                  // 否则追加到现有思考块
                  blocks[thinkingBlockIndex].content += '\n' + data.content;
                }
                fullContent += `[${t('thinking')}] ${data.content}\n\n`;

              } else if (data.type === 'tool_call') {
                // 修复：使用工具名称+计数器作为key，更稳定
                const toolName = data.data.tool;
                
                if (data.content === 'start') {
                  // 新的工具调用
                  toolCallCounter++;
                  const toolKey = `${toolName}-${toolCallCounter}`;
                  const blockIndex = blocks.length;
                  toolCallMap.set(toolKey, blockIndex);
                  blocks.push({
                    id: `tool-${Date.now()}-${Math.random()}`,
                    type: 'tool_call',
                    content: data.content,
                    data: data.data,
                    timestamp: Date.now(),
                  });
                  fullContent += `[${t('toolCall')}] ${data.data.tool}\n`;

                } else {
                  // 更新现有工具调用：找到最近的同名工具调用块
                  let blockIndex = -1;
                  
                  // 从最新的工具调用开始查找
                  for (let i = blocks.length - 1; i >= 0; i--) {
                    if (blocks[i].type === 'tool_call' && 
                        blocks[i].data?.tool === toolName &&
                        (blocks[i].data?.status === 'running' || !blocks[i].data?.status)) {
                      blockIndex = i;
                      break;
                    }
                  }
                  
                  if (blockIndex !== -1) {
                    blocks[blockIndex] = {
                      ...blocks[blockIndex],
                      content: data.content,
                      data: data.data,
                    };
                  }
                  
                  if (data.content === 'success' && data.data.summary) {
                    fullContent += `${data.data.summary}\n`;
                  } else if (data.content === 'error') {
                    fullContent += `${t('errorMsg')}: ${data.data.error}\n`;
                  }
                }

              } else if (data.type === 'content') {
                blocks.push({
                  id: `content-${Date.now()}-${Math.random()}`,
                  type: 'content',
                  content: data.content,
                  timestamp: Date.now(),
                });
                fullContent += `${data.content}\n\n`;

              } else if (data.type === 'summary') {
                blocks.push({
                  id: `summary-${Date.now()}-${Math.random()}`,
                  type: 'summary',
                  content: data.content,
                  data: data.data,
                  timestamp: Date.now(),
                });
                fullContent += `[${t('summary')}] ${data.content}\n`;

              } else if (data.type === 'error') {
                blocks.push({
                  id: `error-${Date.now()}-${Math.random()}`,
                  type: 'error',
                  content: data.content,
                  timestamp: Date.now(),
                });
                fullContent += `[${t('errorMsg')}] ${data.content}\n`;
              }

              // 更新UI
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        blocks: [...blocks],
                        content: fullContent,
                      }
                    : msg
                )
              );

            } catch (e) {
              console.error(t('parseError'), e);
            }
          }
        }
      }

      // 完成流式传输
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, isStreaming: false }
            : msg
        )
      );

      // 保存AI回复到数据库
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
        role: 'assistant',
          content: fullContent,
          metadata: { blocks },
        }),
      });

      // 如果是新对话或第一条消息，更新对话标题
      if (isNewConversation || messages.length === 0) {
        await fetch(`/api/conversations/${conversationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
          }),
        });
        setConversationNeedsRefresh(prev => prev + 1); // 触发列表刷新以显示新标题
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log(t('requestAborted'));
        
        // 保留已生成的内容，并添加停止提示
        // 先获取当前正在流式传输的消息内容
        let stoppedContent = '';
        let stoppedBlocks: StreamBlock[] = [];
        
        // 使用函数式更新确保获取最新状态
        setMessages((prev) => {
          // 从最新的state中获取正在流式传输的消息
          const streamingMessage = prev.find(m => m.isStreaming);
          
          if (streamingMessage) {
            // 在已有内容的基础上添加停止提示块
            stoppedBlocks = [...(streamingMessage.blocks || [])];
            
            // 添加停止提示块
            stoppedBlocks.push({
              id: `stopped-${Date.now()}`,
              type: 'error',
              content: t('userStopped'),
              timestamp: Date.now(),
            });
            
            stoppedContent = streamingMessage.content + '\n\n⚠️ ' + t('userStoppedMessage');
            
            const stoppedMessage = {
              ...streamingMessage,
              isStreaming: false,
              blocks: stoppedBlocks,
              content: stoppedContent,
            };
            
            // 返回更新后的消息列表
            return prev.map((msg) => (msg.isStreaming ? stoppedMessage : msg));
          }
          
          return prev;
        });
        
        // 在 setMessages 外部保存到数据库，避免重复调用
        if (conversationId && stoppedContent) {
          fetch(`/api/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: 'assistant',
              content: stoppedContent,
              metadata: { 
                blocks: stoppedBlocks,
                stopped: true 
              },
            }),
          })
          .then(() => console.log(t('stoppedMessageSaved')))
          .catch(err => console.error(t('saveStoppedMessageFailed'), err));
        }
        
        return;
      }

      console.error('发送消息失败:', error);
      toast({
        title: t('error'),
        description: error.message || t('sendMessageFailed'),
        variant: 'destructive',
      });
      
      // 其他错误则移除失败的消息
      setMessages((prev) => prev.filter((msg) => !msg.isStreaming));
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="h-full flex bg-background">
      {/* 左侧边栏 - 桌面端 */}
      <div className="hidden lg:block w-80 h-full border-r border-border">
        <ConversationList
          key={conversationNeedsRefresh} // 使用key强制刷新
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onUpdateConversation={handleUpdateConversation}
        />
      </div>

      {/* 左侧边栏 - 移动端 */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0 bg-sidebar">
          <ConversationList
            key={conversationNeedsRefresh} // 使用key强制刷新
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onUpdateConversation={handleUpdateConversation}
          />
        </SheetContent>
      </Sheet>

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col h-full bg-card">
        {/* 顶部栏（仅移动端显示菜单按钮） */}
        <div className="border-b border-border bg-card px-6 py-3 flex items-center gap-3 lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <span className="text-sm text-muted-foreground">{t('pageSubtitle')}</span>
        </div>

        {/* AI生成中的警告提示 */}
        {loading && (
          <Alert className="m-4 border-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:border-orange-500 animate-pulse">
            <AlertTriangle className="h-5 w-5 text-orange-700 dark:text-orange-300" />
            <AlertDescription className="text-orange-950 dark:text-orange-50 font-semibold ml-2">
              ⚠️ {t('generatingAlert')}
            </AlertDescription>
          </Alert>
        )}

        {/* 消息列表 */}
        <MessageList 
          messages={messages} 
          loading={loading}
          onExampleClick={handleSendMessage}
        />

        {/* 输入框 */}
        <MessageInput
          onSend={handleSendMessage}
          loading={loading}
          onStop={handleStopGeneration}
        />
      </div>
    </div>
  );
}
