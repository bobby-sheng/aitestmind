"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  PlayCircle,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Tag,
  FolderOpen,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TestCase {
  id: string;
  name: string;
  description?: string;
  status: string;
  category?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  executeCount: number;
  successCount: number;
  failCount: number;
  steps: any[];
  flowConfig: any;
}

interface TestCaseListProps {
  testCases: TestCase[];
  onCreateNew: () => void;
  onEdit: (testCase: TestCase) => void;
  onDelete: (id: string) => void;
  onBatchDelete?: (ids: string[]) => void;
  onCopy?: (id: string) => void;
  onExecute?: (id: string) => void;
}

export default function TestCaseList({
  testCases,
  onCreateNew,
  onEdit,
  onDelete,
  onBatchDelete,
  onCopy,
  onExecute,
}: TestCaseListProps) {
  const t = useTranslations('testCaseList');
  const tCommon = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  
  // 批量选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 辅助函数：解析标签（处理可能的JSON字符串）
  const parseTags = (tags: any): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // 获取所有分类
  const categories = Array.from(new Set(testCases.map(tc => tc.category).filter(Boolean))) as string[];
  
  // 获取所有标签
  const allTags = Array.from(new Set(testCases.flatMap(tc => parseTags(tc.tags))));

  // 筛选和搜索
  const filteredTestCases = testCases.filter((testCase) => {
    const tags = parseTags(testCase.tags);
    const matchesSearch = testCase.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      testCase.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || testCase.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || testCase.category === categoryFilter;
    const matchesTag = selectedTag === 'all' || tags.includes(selectedTag);
    return matchesSearch && matchesStatus && matchesCategory && matchesTag;
  });

  // 分页计算
  const totalPages = Math.ceil(filteredTestCases.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedTestCases = filteredTestCases.slice(startIndex, endIndex);

  // 当筛选条件改变时，重置到第一页和选择
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, categoryFilter, selectedTag]);

  // 格式化时间
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} ${t('hoursAgo')}`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)} ${t('daysAgo')}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // 处理删除
  const handleDeleteClick = (testCase: TestCase) => {
    setSelectedTestCase(testCase);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedTestCase) {
      onDelete(selectedTestCase.id);
      setDeleteDialogOpen(false);
      setSelectedTestCase(null);
    }
  };

  // 计算成功率
  const getSuccessRate = (testCase: TestCase) => {
    if (testCase.executeCount === 0) return 0;
    return Math.round((testCase.successCount / testCase.executeCount) * 100);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedIds.size === paginatedTestCases.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedTestCases.map(tc => tc.id)));
    }
  };

  // 切换单个选择
  const handleToggleSelect = (id: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
    } else {
      newSelectedIds.add(id);
    }
    setSelectedIds(newSelectedIds);
  };

  // 批量删除
  const handleBatchDeleteClick = () => {
    if (selectedIds.size > 0) {
      setBatchDeleteDialogOpen(true);
    }
  };

  const handleConfirmBatchDelete = () => {
    if (onBatchDelete && selectedIds.size > 0) {
      onBatchDelete(Array.from(selectedIds));
      setBatchDeleteDialogOpen(false);
      setSelectedIds(new Set());
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* 顶部搜索和操作栏 */}
      <div className="flex flex-col gap-3 px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button onClick={onCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('createNew')}
            </Button>
            {selectedIds.size > 0 && onBatchDelete && (
              <Button
                onClick={handleBatchDeleteClick}
                variant="destructive"
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t('batchDelete')} ({selectedIds.size})
              </Button>
            )}
          </div>
          {paginatedTestCases.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={selectedIds.size === paginatedTestCases.length && paginatedTestCases.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <label
                htmlFor="select-all"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {t('selectAll')}
              </label>
            </div>
          )}
        </div>

        {/* 搜索和筛选栏 - 单行紧凑布局 */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 搜索框 */}
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* 分类筛选 */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder={t('category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCategories')}</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 标签筛选 */}
          <Select value={selectedTag} onValueChange={setSelectedTag}>
            <SelectTrigger className="w-[140px] h-9">
              <Tag className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder={t('tags')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTags')}</SelectItem>
              {allTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 状态筛选 */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs px-3">{t('all')}</TabsTrigger>
              <TabsTrigger value="draft" className="text-xs px-3">{t('draft')}</TabsTrigger>
              <TabsTrigger value="active" className="text-xs px-3">{t('active')}</TabsTrigger>
              <TabsTrigger value="archived" className="text-xs px-3">{t('archived')}</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 统计信息 */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
            <span>{t('total')} <span className="font-medium text-foreground">{filteredTestCases.length}</span> {t('items')}</span>
          </div>

          {/* 清空筛选 */}
          {(searchQuery || categoryFilter !== 'all' || selectedTag !== 'all' || statusFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setSelectedTag('all');
                setStatusFilter('all');
              }}
              className="gap-1 h-9 px-3"
            >
              <X className="h-3 w-3" />
              {t('clearFilters')}
            </Button>
          )}
        </div>
      </div>

      {/* 测试用例卡片网格 */}
      <div className="flex-1 overflow-auto p-6">
        {filteredTestCases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[500px] text-center">
            <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {searchQuery ? t('noTestCases') : t('noTestCases')}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-md">
              {searchQuery ? t('noTestCases') : t('createFirstTestCase')}
            </p>
            {!searchQuery && (
              <Button onClick={onCreateNew} size="lg" className="gap-2 h-11 px-6">
                <Plus className="h-5 w-5" />
                {t('createNew')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 卡片列表 - 单列紧凑布局 */}
            <div className="space-y-3">
              {paginatedTestCases.map((testCase) => {
                const tags = parseTags(testCase.tags);
                const successRate = getSuccessRate(testCase);
                
                return (
                  <Card 
                    key={testCase.id} 
                    className="group hover:shadow-md transition-all cursor-pointer"
                    onClick={() => onEdit(testCase)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* 复选框 */}
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(testCase.id)}
                            onCheckedChange={() => handleToggleSelect(testCase.id)}
                          />
                        </div>
                        
                        {/* 左侧：主要信息 */}
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* 第一行：标题和状态 */}
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                testCase.status === 'active'
                                  ? 'default'
                                  : testCase.status === 'draft'
                                  ? 'secondary'
                                  : 'outline'
                              }
                              className="shrink-0"
                            >
                              {testCase.status === 'draft' && t('draft')}
                              {testCase.status === 'active' && t('active')}
                              {testCase.status === 'archived' && t('archived')}
                            </Badge>
                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                              {testCase.name}
                            </h3>
                          </div>

                          {/* 第二行：描述（如果有） */}
                          {testCase.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {testCase.description}
                            </p>
                          )}

                          {/* 第三行：分类、标签、统计信息 */}
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            {/* 分类 */}
                            {testCase.category && (
                              <Badge variant="outline" className="gap-1">
                                <FolderOpen className="h-3 w-3" />
                                {testCase.category}
                              </Badge>
                            )}

                            {/* 标签 */}
                            {tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                {tags.slice(0, 2).map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {tags.length > 2 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{tags.length - 2}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* 统计信息 */}
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {testCase.steps?.length || 0} {t('executions')}
                              </span>
                              <span className="flex items-center gap-1">
                                <PlayCircle className="h-3 w-3" />
                                {testCase.executeCount} {t('executions')}
                              </span>
                              {testCase.executeCount > 0 && (
                                <>
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {testCase.successCount}
                                  </span>
                                  <span className="flex items-center gap-1 text-red-600">
                                    <XCircle className="h-3 w-3" />
                                    {testCase.failCount}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* 更新时间 */}
                            <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                              <Clock className="h-3 w-3" />
                              {formatDate(testCase.updatedAt)}
                            </div>
                          </div>

                          {/* 成功率进度条 */}
                          {testCase.executeCount > 0 && (
                            <div className="flex items-center gap-3">
                              <div className="flex-1 max-w-xs">
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      successRate >= 80 ? 'bg-green-500' :
                                      successRate >= 60 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${successRate}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-xs font-medium text-muted-foreground">
                                {successRate}% {t('successRate')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* 右侧：操作按钮 */}
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(testCase);
                            }}
                            variant="ghost"
                            size="sm"
                            title={t('edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {onCopy && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCopy(testCase.id);
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title={t('copy')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {onExecute && testCase.status === 'active' && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                onExecute(testCase.id);
                              }}
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title={t('run')}
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(testCase);
                            }}
                            variant="ghost"
                            size="sm"
                            title={t('delete')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 分页控件 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {t('page')} {currentPage} {t('of')} {totalPages} {t('pages')} · {t('total')} {startIndex + 1}-{Math.min(endIndex, filteredTestCases.length)} / {filteredTestCases.length} {t('items')}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    {t('next')}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('deleteConfirmDescription')} "<strong>{selectedTestCase?.name}</strong>"
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
            >
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 批量删除确认对话框 */}
      <Dialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('batchDeleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('batchDeleteConfirmDescription', { count: selectedIds.size })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBatchDeleteDialogOpen(false)}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmBatchDelete}
            >
              {tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

