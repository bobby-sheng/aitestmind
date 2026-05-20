'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Star,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  Plus,
  CheckSquare,
  Square
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { FourLayerTree } from '@/components/api-repository/FourLayerTree';
import { ApiDetailDialog } from '@/components/api-repository/ApiDetailDialog';
import { ApiEditDialog } from '@/components/api-repository/ApiEditDialog';
import { ApiCreateDialog } from '@/components/api-repository/ApiCreateDialog';
import { CreateClassificationDialog } from '@/components/api-repository/CreateClassificationDialog';
import { EditClassificationDialog } from '@/components/api-repository/EditClassificationDialog';
import { ApiDeleteConfirmDialog } from '@/components/api-repository/ApiDeleteConfirmDialog';
import { useToast } from '@/hooks/use-toast';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500 hover:bg-green-600',
  POST: 'bg-blue-500 hover:bg-blue-600',
  PUT: 'bg-orange-500 hover:bg-orange-600',
  DELETE: 'bg-red-500 hover:bg-red-600',
  PATCH: 'bg-purple-500 hover:bg-purple-600',
};

// 提取「父功能 > 子功能」路径中的最后一段名称，用于展示
const getLeafName = (value?: string | null) => {
  if (!value) return value;
  const segments = value
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : value;
};

export default function ApiRepositoryPage() {
  const { toast } = useToast();
  const t = useTranslations('apiRepository');
  const tCommon = useTranslations('common');
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [apis, setApis] = useState<any[]>([]); // 过滤后的 API（用于右侧列表显示）
  const [allApis, setAllApis] = useState<any[]>([]); // 所有 API（用于构建左侧分类树）
  const [classifications, setClassifications] = useState<any[]>([]); // 预定义的分类结构
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [selectedApiIds, setSelectedApiIds] = useState<Set<string>>(new Set()); // 选中的API ID
  
  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // 对话框状态
  const [apiDetailDialogOpen, setApiDetailDialogOpen] = useState(false);
  const [selectedApiId, setSelectedApiId] = useState<string>();
  const [apiEditDialogOpen, setApiEditDialogOpen] = useState(false);
  const [editingApi, setEditingApi] = useState<any>(null);
  const [apiCreateDialogOpen, setApiCreateDialogOpen] = useState(false);
  const [createClassificationDialogOpen, setCreateClassificationDialogOpen] = useState(false);
  const [createParentContext, setCreateParentContext] = useState<{platform?: string; component?: string; feature?: string} | undefined>(undefined);
  const [editClassificationDialogOpen, setEditClassificationDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [deleteConfirmDialogOpen, setDeleteConfirmDialogOpen] = useState(false);
  const [deletingApiId, setDeletingApiId] = useState<string | null>(null);
  const [deletingApiName, setDeletingApiName] = useState<string>('');
  const [referencingTestCases, setReferencingTestCases] = useState<any[]>([]);
  const [totalReferences, setTotalReferences] = useState(0);
  
  // 四层分类筛选状态
  const [fourLayerFilter, setFourLayerFilter] = useState<{
    platform?: string;
    component?: string;
    feature?: string;
    subFeature?: string;
    isStarred?: boolean;
  }>({});

  // 加载数据
  useEffect(() => {
    fetchTags();
    fetchAllApis(); // 加载所有 API 用于构建分类树
    fetchClassifications(); // 加载预定义的分类结构
  }, []);

  useEffect(() => {
    fetchApis();
  }, [methodFilter, pagination.page, searchTerm, fourLayerFilter]);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/api-library/tags');
      const result = await response.json();
      if (result.success) {
        setTags(result.data);
      }
    } catch (error) {
      console.error(t('loadTagsFailed'), error);
    }
  };

  // 获取预定义的分类结构
  const fetchClassifications = async () => {
    try {
      const response = await fetch('/api/api-library/classifications');
      const result = await response.json();
      if (result.success) {
        setClassifications(result.data);
      }
    } catch (error) {
      console.error('Failed to load classifications:', error);
    }
  };

  // 获取所有 API（用于构建分类树，不带分页和过滤）
  const fetchAllApis = async () => {
    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '10000', // 获取所有数据
      });

      const response = await fetch(`/api/api-library/list?${params}`);
      const result = await response.json();

      if (result.success) {
        setAllApis(result.data);
      }
    } catch (error) {
      console.error('Failed to load all APIs for tree:', error);
    }
  };

  // 刷新所有数据（包括分类树和列表）
  const refreshAll = () => {
    fetchAllApis();
    fetchClassifications();
    fetchApis();
  };

  // 获取过滤后的 API（用于右侧列表显示，带分页和过滤）
  const fetchApis = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      // 处理四层分类筛选
      if (fourLayerFilter.platform) {
        params.append('platform', fourLayerFilter.platform);
      }
      if (fourLayerFilter.component) {
        params.append('component', fourLayerFilter.component);
      }
      if (fourLayerFilter.feature) {
        params.append('feature', fourLayerFilter.feature);
      }
      if (fourLayerFilter.subFeature) {
        params.append('subFeature', fourLayerFilter.subFeature);
      }
      if (fourLayerFilter.isStarred) {
        params.append('isStarred', 'true');
      }

      if (methodFilter && methodFilter !== 'ALL') {
        params.append('method', methodFilter);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/api-library/list?${params}`);
      const result = await response.json();

      if (result.success) {
        setApis(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      toast({
        title: t('loadFailed'),
        description: t('cannotLoadApiList'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewApi = (api: any) => {
    setSelectedApiId(api.id);
    setApiDetailDialogOpen(true);
  };

  const handleEditApi = (api: any) => {
    setEditingApi(api);
    setApiEditDialogOpen(true);
  };

  const handleDeleteApi = async (apiId: string, apiName: string = 'API') => {
    setDeletingApiId(apiId);
    setDeletingApiName(apiName);
    setReferencingTestCases([]);
    setTotalReferences(0);
    
    // 先尝试删除，检查是否有引用
    try {
      const response = await fetch(`/api/api-library/apis/${apiId}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: t('deleteSuccess'),
        });
        refreshAll(); // 刷新所有数据
      } else if (result.error === 'API_IN_USE') {
        // API被引用，显示确认对话框
        setReferencingTestCases(result.data?.referencingTestCases || []);
        setTotalReferences(result.data?.totalReferences || 0);
        setDeleteConfirmDialogOpen(true);
      } else {
        throw new Error(result.message || result.error);
      }
    } catch (error: any) {
      toast({
        title: t('deleteFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };
  
  const handleConfirmDelete = async (force: boolean) => {
    if (!deletingApiId) return;
    
    try {
      const url = force 
        ? `/api/api-library/apis/${deletingApiId}?force=true`
        : `/api/api-library/apis/${deletingApiId}`;
        
      const response = await fetch(url, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast({
          title: t('deleteSuccess'),
          description: force && result.clearedReferences 
            ? `已清理 ${result.clearedReferences} 个引用`
            : undefined,
        });
        refreshAll();
        setDeleteConfirmDialogOpen(false);
      } else {
        throw new Error(result.message || result.error);
      }
    } catch (error: any) {
      toast({
        title: t('deleteFailed'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedApiIds.size === apis.length && apis.length > 0) {
      // 如果已经全选，则取消全选
      setSelectedApiIds(new Set());
    } else {
      // 否则全选当前页的所有API
      setSelectedApiIds(new Set(apis.map(api => api.id)));
    }
  };

  // 切换单个API的选中状态
  const handleToggleSelect = (apiId: string) => {
    const newSelected = new Set(selectedApiIds);
    if (newSelected.has(apiId)) {
      newSelected.delete(apiId);
    } else {
      newSelected.add(apiId);
    }
    setSelectedApiIds(newSelected);
  };

  // 批量删除选中的API
  const handleBatchDelete = async () => {
    if (selectedApiIds.size === 0) {
      toast({
        title: '请先选择要删除的API',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(`确认删除选中的 ${selectedApiIds.size} 个API吗？此操作不可恢复！`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedApiIds).map(apiId =>
        fetch(`/api/api-library/apis/${apiId}`, {
          method: 'DELETE',
        }).then(res => res.json())
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast({
          title: `成功删除 ${successCount} 个API${failCount > 0 ? `，失败 ${failCount} 个` : ''}`,
        });
        setSelectedApiIds(new Set()); // 清空选中
        refreshAll(); // 刷新所有数据
      } else {
        throw new Error('删除失败');
      }
    } catch (error: any) {
      toast({
        title: '批量删除失败',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleStar = async (api: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(`/api/api-library/apis/${api.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isStarred: !api.isStarred }),
      });
      const result = await response.json();
      if (result.success) {
        fetchApis();
        fetchAllApis(); // 更新左侧树数据，使收藏统计正确
        toast({
          title: api.isStarred ? t('unstarred') : t('starred'),
        });
      }
    } catch (error) {
      toast({
        title: t('operationFailed'),
        variant: 'destructive',
      });
    }
  };

  const handleSearch = () => {
    setPagination({ ...pagination, page: 1 });
    fetchApis();
  };

  // 处理编辑分类
  const handleEditCategory = (node: any) => {
    setEditingNode(node);
    setEditClassificationDialogOpen(true);
  };

  // 处理删除分类
  const handleDeleteCategory = async (node: any) => {
    const categoryName = node.name;
    const categoryType = node.type === 'platform' ? '平台' : node.type === 'component' ? '组件' : '功能';
    
    if (!confirm(`确定要删除 ${categoryType} "${categoryName}" 吗？\n\n该分类下的所有 API 将被移动到"未分类"中。`)) {
      return;
    }

    try {
      // 🔧 将默认分类文本转换为对应的实际值（null）
      // 这些默认文本是前端显示用的占位符，数据库中实际存储为 null
      // 支持中英文多种表示形式
      const defaultTexts = {
        platform: ['Default Category', '默认分类', 'Uncategorized', '未分类'],
        component: ['Uncategorized', '未分类'],
        feature: ['Other', '其他'],
      };

      // 检查是否是默认分类文本，如果是则转换为 null
      const platform = defaultTexts.platform.includes(node.fullPath.platform) ? null : node.fullPath.platform;
      const component = defaultTexts.component.includes(node.fullPath.component) ? null : node.fullPath.component;
      const feature = defaultTexts.feature.includes(node.fullPath.feature) ? null : node.fullPath.feature;

      // 禁止删除纯默认分类（platform 为 null）
      if (platform === null) {
        toast({
          title: '无法删除',
          description: '无法删除未分类，这是系统预留的分类',
          variant: 'destructive',
        });
        return;
      }

      // 删除占位 API
      const response = await fetch('/api/api-library/delete-classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          component,
          feature,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '删除成功',
          description: `已删除 ${categoryType} "${categoryName}"`,
        });
        refreshAll(); // 刷新数据
      } else {
        throw new Error(result.error || '删除失败');
      }
    } catch (error: any) {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex h-full min-h-0">
      {/* 左侧四层分类树 */}
      <div className="w-72 flex-shrink-0 min-h-0">
        <FourLayerTree
          apis={allApis}
          classifications={classifications}
          selectedFilter={fourLayerFilter}
          onFilterChange={setFourLayerFilter}
          onCreateCategory={(node) => {
            // 如果点击的是节点上的+按钮，设置父级上下文
            if (node && node.fullPath) {
              setCreateParentContext({
                platform: node.fullPath.platform,
                component: node.fullPath.component,
                // 如果是功能层或更深层，记录当前功能路径，后续在对话框中用于生成“父功能 > 子功能”
                feature: node.fullPath.feature,
              });
            } else {
              // 如果是顶部的+按钮，清空父级上下文（创建平台）
              setCreateParentContext(undefined);
            }
            setCreateClassificationDialogOpen(true);
          }}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      </div>

      {/* 右侧内容区 */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* 顶部工具栏：单行布局，左侧统计+搜索，右侧操作按钮分组 */}
        <div className="p-4 border-b border-[#e5e7eb] dark:border-[#4b5563] bg-background">
          <div className="flex flex-wrap items-center gap-3">
            {/* 左侧：统计与搜索 */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {t('totalApis')} {pagination.total} {t('apis')}
              </span>
              {selectedApiIds.size > 0 && (
                <span className="text-sm text-primary font-medium whitespace-nowrap">
                  已选 {selectedApiIds.size} 个
                </span>
              )}
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  className="pl-9 h-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder={t('methodFilter')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('allMethods')}</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} size="sm" variant="secondary" className="h-9 shrink-0">
                <Filter className="mr-1.5 h-4 w-4" />
                {t('search')}
              </Button>
            </div>

            {/* 右侧：操作按钮（批量操作 | 主操作） */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-2 border-r border-[#e5e7eb] dark:border-[#4b5563] pr-2">
                <Button onClick={handleSelectAll} variant="outline" size="sm" className="h-9">
                  {selectedApiIds.size === apis.length && apis.length > 0 ? (
                    <>
                      <CheckSquare className="mr-1.5 h-4 w-4" />
                      取消全选
                    </>
                  ) : (
                    <>
                      <Square className="mr-1.5 h-4 w-4" />
                      全选
                    </>
                  )}
                </Button>
                {selectedApiIds.size > 0 && (
                  <Button onClick={handleBatchDelete} variant="destructive" size="sm" className="h-9">
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    删除选中
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={() => setApiCreateDialogOpen(true)} size="sm" className="h-9">
                  <Plus className="mr-1.5 h-4 w-4" />
                  {t('createApi')}
                </Button>
                <Button onClick={refreshAll} variant="outline" size="sm" className="h-9">
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  {t('refresh')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* API列表 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">{tCommon('loading')}</p>
            </div>
          ) : apis.filter((api) => api.name !== '_CLASSIFICATION_PLACEHOLDER_').length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-muted-foreground text-lg">{t('noApis')}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('pleaseRecordFirst')}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {apis
                .filter((api) => api.name !== '_CLASSIFICATION_PLACEHOLDER_') // 过滤掉占位 API
                .map((api) => (
                <Card
                  key={api.id}
                  className="hover:shadow-md transition-all group"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* 复选框 */}
                      <div 
                        className="pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedApiIds.has(api.id)}
                          onCheckedChange={() => handleToggleSelect(api.id)}
                        />
                      </div>

                      {/* API内容 */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleViewApi(api)}
                      >
                        <div className="flex items-start justify-between">
                          {/* API基本信息 */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-3">
                              <Badge className={METHOD_COLORS[api.method]}>
                                {api.method}
                              </Badge>
                              <h3 className="font-semibold text-lg truncate">
                                {api.name}
                              </h3>
                              {api.isStarred && (
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              )}
                            </div>

                        <p className="text-sm text-muted-foreground font-mono break-all">
                          {api.url}
                        </p>

                        <div className="flex items-center gap-4 text-sm">
                          {(api.platform || api.component || api.feature || api.subFeature) && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">{t('category')}:</span>
                              <div className="flex items-center gap-1">
                                {api.platform && (
                                  <Badge variant="outline" className="text-xs">
                                    {api.platform}
                                  </Badge>
                                )}
                                {api.component && (
                                  <>
                                    {api.platform && <span className="text-muted-foreground">/</span>}
                                    <Badge variant="outline" className="text-xs">
                                      {api.component}
                                    </Badge>
                                  </>
                                )}
                                {api.feature && (
                                  <>
                                    {(api.platform || api.component) && <span className="text-muted-foreground">/</span>}
                                    <Badge variant="outline" className="text-xs">
                                      {getLeafName(api.feature)}
                                    </Badge>
                                  </>
                                )}
                                {api.subFeature && (
                                  <>
                                    {(api.platform || api.component || api.feature) && <span className="text-muted-foreground">/</span>}
                                    <Badge variant="outline" className="text-xs">
                                      {api.subFeature}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {api.responseTime && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{api.responseTime}ms</span>
                            </div>
                          )}

                          {api.tags && api.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              {api.tags.slice(0, 3).map((apiTag: any) => (
                                <Badge key={apiTag.tag.id} variant="secondary" className="text-xs">
                                  {apiTag.tag.name}
                                </Badge>
                              ))}
                              {api.tags.length > 3 && (
                                <span className="text-xs text-muted-foreground">
                                  +{api.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          {(api.createdByUser || api.updatedByUser) && (
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {api.createdByUser && (
                                <span>{tCommon('createdBy')}: {api.createdByUser.loginName}</span>
                              )}
                              {api.updatedByUser && (
                                <span>{tCommon('updatedBy')}: {api.updatedByUser.username || api.updatedByUser.loginName}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewApi(api);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditApi(api);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => handleToggleStar(api, e)}
                        >
                          <Star className={`h-4 w-4 ${api.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteApi(api.id, api.name);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* 分页 */}
        {apis.length > 0 && (
          <div className="p-6 border-t border-[#e5e7eb] dark:border-[#4b5563] bg-background">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('pageInfo')} {pagination.page} {t('pageOf')} {pagination.totalPages} {t('totalPages')}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('previousPage')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  {t('nextPage')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 对话框 */}
      <ApiDetailDialog
        apiId={selectedApiId}
        open={apiDetailDialogOpen}
        onOpenChange={setApiDetailDialogOpen}
        onEdit={handleEditApi}
        onDelete={handleDeleteApi}
        onRefresh={refreshAll}
      />

      <ApiEditDialog
        open={apiEditDialogOpen}
        api={editingApi}
        categories={classifications}
        tags={tags}
        allApis={allApis}
        onOpenChange={setApiEditDialogOpen}
        onSuccess={refreshAll}
      />

      <ApiCreateDialog
        open={apiCreateDialogOpen}
        categories={classifications}
        tags={tags}
        onOpenChange={setApiCreateDialogOpen}
        onSuccess={refreshAll}
      />

      <CreateClassificationDialog
        open={createClassificationDialogOpen}
        onOpenChange={(open) => {
          setCreateClassificationDialogOpen(open);
          if (!open) {
            // 关闭对话框时清空父级上下文
            setCreateParentContext(undefined);
          }
        }}
        parentContext={createParentContext}
        existingData={{
          platforms: Array.from(new Set(allApis.map(api => api.platform).filter(Boolean) as string[])),
          components: allApis.reduce((map, api) => {
            if (api.platform && api.component) {
              if (!map.has(api.platform)) {
                map.set(api.platform, []);
              }
              const components = map.get(api.platform)!;
              if (!components.includes(api.component)) {
                components.push(api.component);
              }
            }
            return map;
          }, new Map<string, string[]>()),
          features: allApis.reduce((map, api) => {
            if (api.platform && api.component && api.feature) {
              const key = `${api.platform}-${api.component}`;
              if (!map.has(key)) {
                map.set(key, []);
              }
              const features = map.get(key)!;
              if (!features.includes(api.feature)) {
                features.push(api.feature);
              }
            }
            return map;
          }, new Map<string, string[]>()),
        }}
        onSuccess={refreshAll}
      />

      <EditClassificationDialog
        open={editClassificationDialogOpen}
        onOpenChange={setEditClassificationDialogOpen}
        node={editingNode}
        onSuccess={refreshAll}
      />

      <ApiDeleteConfirmDialog
        open={deleteConfirmDialogOpen}
        onOpenChange={setDeleteConfirmDialogOpen}
        onConfirm={handleConfirmDelete}
        apiName={deletingApiName}
        referencingTestCases={referencingTestCases}
        totalReferences={totalReferences}
      />
    </div>
  );
}
