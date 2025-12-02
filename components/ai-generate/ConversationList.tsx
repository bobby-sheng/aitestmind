'use client';

import { useState, useEffect } from 'react';
import {
  MessageSquarePlus,
  MessageSquare,
  Trash2,
  Edit2,
  Star,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  isStarred: boolean;
  isArchived: boolean;
  _count?: { messages: number };
}

interface ConversationListProps {
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onUpdateConversation: (id: string, data: Partial<Conversation>) => void;
}

export function ConversationList({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onUpdateConversation,
}: ConversationListProps) {
  const t = useTranslations('aiGenerate');
  const tCommon = useTranslations('common');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // 加载对话列表
  const loadConversations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error(t('loadConversationsFailed'), error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // 开始编辑标题
  const startEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  // 保存标题
  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    
    try {
      const res = await fetch(`/api/conversations/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      
      const data = await res.json();
      if (data.success) {
        onUpdateConversation(editingId, { title: editTitle.trim() });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === editingId ? { ...c, title: editTitle.trim() } : c
          )
        );
      }
    } catch (error) {
      console.error(t('updateTitleFailed'), error);
    } finally {
      setEditingId(null);
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // 删除对话
  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      
      const data = await res.json();
      if (data.success) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        onDeleteConversation(id);
      }
    } catch (error) {
      console.error(t('deleteConversationFailed'), error);
    }
  };

  // 切换收藏
  const toggleStar = async (conv: Conversation) => {
    try {
      const res = await fetch(`/api/conversations/${conv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !conv.isStarred }),
      });
      
      const data = await res.json();
      if (data.success) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conv.id ? { ...c, isStarred: !conv.isStarred } : c
          )
        );
        onUpdateConversation(conv.id, { isStarred: !conv.isStarred });
      }
    } catch (error) {
      console.error(t('updateStarFailed'), error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* 头部 */}
      <div className="p-4 border-b border-sidebar-border bg-sidebar">
        <Button
          onClick={onNewConversation}
          className="w-full gap-2"
          variant="default"
        >
          <MessageSquarePlus className="w-4 h-4" />
          {t('newConversation')}
        </Button>
      </div>

      {/* 对话列表 */}
      <ScrollArea className="flex-1 bg-sidebar">
        <div className="p-2 space-y-1 bg-sidebar">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              {tCommon('loading')}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {tCommon('noData')}
              <br />
              {t('newConversation')}
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'group relative rounded-lg transition-colors',
                  currentConversationId === conv.id
                    ? 'bg-sidebar-accent'
                    : 'hover:bg-sidebar-accent/50'
                )}
              >
                {editingId === conv.id ? (
                  <div className="p-3 flex items-center gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={saveEdit}
                      className="h-8 w-8 p-0"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={cancelEdit}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => onSelectConversation(conv.id)}
                    className="p-3 cursor-pointer flex items-start gap-2 relative"
                  >
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0 pr-14">
                      <div className="flex items-start gap-2">
                        <h3 className="text-sm font-medium flex-1 line-clamp-2">
                          {conv.title}
                        </h3>
                        {conv.isStarred && (
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(conv.updatedAt).toLocaleDateString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    
                    {/* 操作按钮 - 固定在右侧 */}
                    <div className="absolute right-2 top-3 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="flex items-center gap-1 bg-sidebar-accent rounded p-0.5 shadow-sm">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-accent transition-colors rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(conv);
                          }}
                          title={tCommon('edit')}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-primary" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-destructive/10 transition-colors rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(conv.id);
                          }}
                          title={tCommon('delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

