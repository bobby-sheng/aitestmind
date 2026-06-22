"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  FileCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from 'next-intl';
import { TestCaseTree } from './TestCaseTree';

interface TestCase {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: string;
  category?: string;
  platform?: string;
  component?: string;
  feature?: string;
   subFeature?: string;
}

interface TestCaseSelectorProps {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export function TestCaseSelector({
  selectedIds,
  onSelectionChange,
}: TestCaseSelectorProps) {
  const { toast } = useToast();
  const t = useTranslations('testSuites');
  const tCommon = useTranslations('common');
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // 全局测试用例（用于搜索和分类树）
  const [allTestCases, setAllTestCases] = useState<TestCase[]>([]);

  // 加载数据
  useEffect(() => {
    loadTestCases();
  }, []);

  useEffect(() => {
    filterTestCases();
  }, [selectedCategory, searchTerm, currentPage, allTestCases]);

  const loadTestCases = async () => {
    try {
      setLoading(true);
      // 方案A：一次性拉取全量已发布用例（后端默认 pageSize=20，会导致数据不全）
      const response = await fetch('/api/test-cases?status=active&page=1&pageSize=100000');
      const result = await response.json();
      
      if (result.success) {
        // 接口已按 status=active 过滤，这里仅做兜底
        const publishedCases = result.data.filter((tc: TestCase) => tc.status === 'active');
        setAllTestCases(publishedCases);
      }
    } catch (error) {
      console.error('Error loading test cases:', error);
      toast({
        title: t('loadFailed'),
        description: t('cannotLoadSuiteInfo'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterTestCases = () => {
    let filtered = [...allTestCases];

    // 分类筛选（基于四层分类结构）
    if (selectedCategory) {
      // 处理"未分类"情况
      if (selectedCategory === 'uncategorized') {
        filtered = filtered.filter(tc => {
          const tcAny = tc as any;
          return !tcAny.platform && !tcAny.component && !tcAny.feature && !tcAny.subFeature;
        });
      } else {
        // 解析分类路径
        const parts = selectedCategory.split('/');
        filtered = filtered.filter(tc => {
          const tcAny = tc as any;
          if (parts.length === 1) {
            // 只选择了平台
            return tcAny.platform === parts[0];
          } else if (parts.length === 2) {
            // 选择了平台和组件
            return tcAny.platform === parts[0] && tcAny.component === parts[1];
          } else if (parts.length === 3) {
            // 选择了平台、组件和功能
            return tcAny.platform === parts[0] && tcAny.component === parts[1] && tcAny.feature === parts[2];
          } else if (parts.length === 4) {
            // 选择了平台、组件、功能和子功能
            return (
              tcAny.platform === parts[0] &&
              tcAny.component === parts[1] &&
              tcAny.feature === parts[2] &&
              tcAny.subFeature === parts[3]
            );
          }
          return false;
        });
      }
    }

    // 搜索筛选（全局搜索）
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        tc => {
          const tcAny = tc as any;
          return (
            tc.name.toLowerCase().includes(term) ||
            (tc.description && tc.description.toLowerCase().includes(term)) ||
            (tc.category && tc.category.toLowerCase().includes(term)) ||
            (tcAny.platform && tcAny.platform.toLowerCase().includes(term)) ||
            (tcAny.component && tcAny.component.toLowerCase().includes(term)) ||
            (tcAny.feature && tcAny.feature.toLowerCase().includes(term)) ||
            (tcAny.subFeature && tcAny.subFeature.toLowerCase().includes(term))
          );
        }
      );
    }

    // 计算分页
    const total = filtered.length;
    const pages = Math.ceil(total / pageSize);
    setTotalPages(pages);

    // 应用分页
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const paged = filtered.slice(start, end);

    setTestCases(paged);
  };

  const toggleTestCase = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    onSelectionChange(newSelected);
  };

  const toggleAll = () => {
    if (testCases.every(tc => selectedIds.has(tc.id))) {
      // 全部取消选择
      const newSelected = new Set(selectedIds);
      testCases.forEach(tc => newSelected.delete(tc.id));
      onSelectionChange(newSelected);
    } else {
      // 全部选择
      const newSelected = new Set(selectedIds);
      testCases.forEach(tc => newSelected.add(tc.id));
      onSelectionChange(newSelected);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const allCurrentPageSelected = testCases.length > 0 && testCases.every(tc => selectedIds.has(tc.id));

  return (
    <div className="flex h-[65vh] min-h-[420px] max-h-[800px] border border-[#e5e7eb] dark:border-[#4b5563] rounded-lg overflow-hidden">
      {/* 左侧分类树 - 使用新的 TestCaseTree 组件 */}
      <div className="w-64 flex-shrink-0">
        <TestCaseTree
          testCases={allTestCases}
          selectedCategory={selectedCategory}
          onCategoryChange={(category) => {
            setSelectedCategory(category);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 搜索栏 */}
        <div className="p-4 border-b border-[#e5e7eb] dark:border-[#4b5563] bg-background space-y-3">
          {/* 提示信息 */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/50 border-l-4 border-blue-500 rounded-md shadow-sm">
            <div className="flex items-start gap-2">
              <span className="text-lg">💡</span>
              <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
                {t('onlyPublishedCasesTip')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('selected')} <span className="font-semibold text-foreground">{selectedIds.size}</span> {t('casesCount')}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('searchCasesPlaceholder')}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} size="sm">
              <Filter className="mr-2 h-4 w-4" />
              {tCommon('search')}
            </Button>
          </div>
        </div>

        {/* 测试用例列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">{t('loading')}</p>
            </div>
          ) : testCases.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">
                  {searchTerm || selectedCategory ? t('noMatchingCases') : t('noCases')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 全选 */}
              <div className="flex items-center space-x-3 p-3 border border-[#e5e7eb] dark:border-[#4b5563] rounded-lg bg-muted/20">
                <Checkbox
                  checked={allCurrentPageSelected}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm font-medium">
                  {allCurrentPageSelected ? t('deselectAll') : t('selectAllOnPage')}
                </span>
              </div>

              {/* 用例列表 */}
              {testCases.map((testCase) => (
                <Card
                  key={testCase.id}
                  className={cn(
                    "cursor-pointer hover:shadow-md transition-all",
                    selectedIds.has(testCase.id) && "ring-2 ring-primary"
                  )}
                  onClick={() => toggleTestCase(testCase.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={selectedIds.has(testCase.id)}
                        onCheckedChange={() => toggleTestCase(testCase.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{testCase.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {testCase.status === 'active' ? t('statusPublished') : t('statusDraft')}
                          </Badge>
                          <Badge variant="outline" className="text-xs flex items-center gap-1.5">
                            <span
                              className={cn(
                                'size-2 shrink-0 rounded-full',
                                (testCase.priority || 'P2') === 'P0' && 'bg-rose-400',
                                (testCase.priority || 'P2') === 'P1' && 'bg-amber-400',
                                (testCase.priority || 'P2') === 'P2' && 'bg-sky-400',
                                (testCase.priority || 'P2') === 'P3' && 'bg-gray-400'
                              )}
                              aria-hidden
                            />
                            {testCase.priority || 'P2'}
                          </Badge>
                        </div>
                        {testCase.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {testCase.description}
                          </p>
                        )}
                        {testCase.category && (
                          <div className="flex items-center gap-1 mt-2">
                            <span className="text-xs text-muted-foreground">{t('category')}</span>
                            <Badge variant="secondary" className="text-xs">
                              {testCase.category}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 分页 */}
        {testCases.length > 0 && (
          <div className="p-4 border-t border-[#e5e7eb] dark:border-[#4b5563] bg-background">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('pageOfTotal', { current: currentPage, total: totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('previousPage')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  {t('nextPage')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

