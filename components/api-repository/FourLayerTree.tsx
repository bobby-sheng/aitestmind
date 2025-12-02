'use client';

import { useState, useMemo } from 'react';
import { 
  ChevronRight,
  ChevronDown,
  Layers,
  Box,
  Grid,
  FileText,
  Star,
  Archive,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * 四层分类结构：
 * Platform (平台) -> Component (组件) -> Feature (功能) -> API (API动作)
 */

interface Api {
  id: string;
  name: string;
  method: string;
  path: string;
  platform?: string;
  component?: string;
  feature?: string;
  isStarred?: boolean;
}

interface Classification {
  id: string;
  platform: string;
  component?: string | null;
  feature?: string | null;
}

interface FourLayerTreeProps {
  apis: Api[];
  classifications?: Classification[]; // 预定义的分类结构
  selectedFilter?: {
    platform?: string;
    component?: string;
    feature?: string;
    isStarred?: boolean;
  };
  onFilterChange: (filter: {
    platform?: string;
    component?: string;
    feature?: string;
    isStarred?: boolean;
  }) => void;
  onCreateCategory?: (node?: TreeNode) => void;
  onEditCategory?: (node: TreeNode) => void;
  onDeleteCategory?: (node: TreeNode) => void;
}

interface TreeNode {
  type: 'platform' | 'component' | 'feature';
  name: string;
  count: number;
  children?: TreeNode[];
  fullPath: {
    platform?: string;
    component?: string;
    feature?: string;
  };
}

export function FourLayerTree({ 
  apis, 
  classifications = [],
  selectedFilter = {}, 
  onFilterChange,
  onCreateCategory,
  onEditCategory,
  onDeleteCategory
}: FourLayerTreeProps) {
  const t = useTranslations('apiRepository.fourLayerTree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 构建树形结构
  const treeData = useMemo(() => {
    const tree: TreeNode[] = [];
    const platformMap = new Map<string, TreeNode>();
    
    // 默认分类配置（使用国际化文本）
    const DEFAULT_PLATFORM = t('defaultPlatform');
    const DEFAULT_COMPONENT = t('defaultComponent');
    const DEFAULT_FEATURE = t('defaultFeature');

    // 📌 步骤1：从 classifications 创建树的骨架（空分类）
    classifications.forEach((classification) => {
      const { platform, component, feature } = classification;

      // 创建或获取平台节点
      if (!platformMap.has(platform)) {
        const platformNode: TreeNode = {
          type: 'platform',
          name: platform,
          count: 0,
          children: [],
          fullPath: { platform },
        };
        platformMap.set(platform, platformNode);
        tree.push(platformNode);
      }
      const platformNode = platformMap.get(platform)!;

      // 如果有 component，创建组件节点
      if (component) {
        let componentNode = platformNode.children?.find(
          (n) => n.name === component && n.type === 'component'
        );
        if (!componentNode) {
          componentNode = {
            type: 'component',
            name: component,
            count: 0,
            children: [],
            fullPath: { platform, component },
          };
          platformNode.children!.push(componentNode);
        }

        // 如果有 feature，创建功能节点
        if (feature) {
          let featureNode = componentNode.children?.find(
            (n) => n.name === feature && n.type === 'feature'
          );
          if (!featureNode) {
            featureNode = {
              type: 'feature',
              name: feature,
              count: 0,
              fullPath: { platform, component, feature },
            };
            componentNode.children!.push(featureNode);
          }
        }
      }
    });

    // 📌 步骤2：从 APIs 统计数量并补充未预定义的分类
    for (const api of apis) {
      // 如果没有 platform，使用默认分类
      const platform = api.platform || DEFAULT_PLATFORM;
      const component = api.component || DEFAULT_COMPONENT;
      const feature = api.feature || DEFAULT_FEATURE;

      // 获取或创建平台节点
      if (!platformMap.has(platform)) {
        const platformNode: TreeNode = {
          type: 'platform',
          name: platform,
          count: 0,
          children: [],
          fullPath: { platform },
        };
        platformMap.set(platform, platformNode);
        tree.push(platformNode);
      }
      const platformNode = platformMap.get(platform)!;
      platformNode.count++;

      // 处理组件层
      let componentNode = platformNode.children?.find(
        (n) => n.name === component && n.type === 'component'
      );
      if (!componentNode) {
        componentNode = {
          type: 'component',
          name: component,
          count: 0,
          children: [],
          fullPath: { platform, component },
        };
        platformNode.children!.push(componentNode);
      }
      componentNode.count++;

      // 处理功能层
      let featureNode = componentNode.children?.find(
        (n) => n.name === feature && n.type === 'feature'
      );
      if (!featureNode) {
        featureNode = {
          type: 'feature',
          name: feature,
          count: 0,
          fullPath: { platform, component, feature },
        };
        componentNode.children!.push(featureNode);
      }
      featureNode.count++;
    }

    // 排序
    tree.sort((a, b) => a.name.localeCompare(b.name));
    tree.forEach((platform) => {
      platform.children?.sort((a, b) => a.name.localeCompare(b.name));
      platform.children?.forEach((component) => {
        component.children?.sort((a, b) => a.name.localeCompare(b.name));
      });
    });

    // 🔧 智能折叠：如果一个平台下只有默认的component和feature，且有真实API，才隐藏这些中间层
    // 如果是空分类（count为0），则保持显示，不折叠
    tree.forEach((platform) => {
      // 只对有真实API的分类进行折叠判断
      if (platform.count > 0 && 
          platform.children?.length === 1 && 
          platform.children[0].name === DEFAULT_COMPONENT) {
        const component = platform.children[0];
        // 只有一个feature，且是默认值
        if (component.children?.length === 1 && 
            component.children[0].name === DEFAULT_FEATURE) {
          // 隐藏这些中间层：清空children，让它不展开
          platform.children = [];
        }
      }
    });

    return tree;
  }, [apis, classifications]);

  // 统计信息
  const stats = useMemo(() => {
    const withPlatform = apis.filter((api) => api.platform).length;
    const total = apis.length;
    const starred = apis.filter((api) => api.isStarred).length;

    return { withPlatform, total, starred };
  }, [apis]);

  // 切换节点展开/折叠
  const toggleNode = (nodeKey: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) {
        next.delete(nodeKey);
      } else {
        next.add(nodeKey);
      }
      return next;
    });
  };

  // 生成节点唯一键
  const getNodeKey = (node: TreeNode): string => {
    const { platform, component, feature } = node.fullPath;
    return [platform, component, feature].filter(Boolean).join('/');
  };

  // 检查节点是否选中
  const isNodeSelected = (node: TreeNode): boolean => {
    const DEFAULT_PLATFORM = t('defaultPlatform');
    const DEFAULT_COMPONENT = t('defaultComponent');
    const DEFAULT_FEATURE = t('defaultFeature');
    
    const { platform, component, feature } = node.fullPath;
    
    // 将默认分类文本转换为 "__NULL__" 进行比较
    const nodePlatform = platform === DEFAULT_PLATFORM ? '__NULL__' : platform;
    const nodeComponent = component === DEFAULT_COMPONENT ? '__NULL__' : component;
    const nodeFeature = feature === DEFAULT_FEATURE ? '__NULL__' : feature;
    
    return (
      selectedFilter.platform === nodePlatform &&
      selectedFilter.component === nodeComponent &&
      selectedFilter.feature === nodeFeature
    );
  };

  // 选择节点
  const handleSelectNode = (node: TreeNode) => {
    if (isNodeSelected(node)) {
      // 如果点击已选中的节点，取消选择
      onFilterChange({});
    } else {
      // 将默认分类文本转换为特殊标识 "__NULL__"，后端会识别并转换为 IS NULL 查询
      const DEFAULT_PLATFORM = t('defaultPlatform');
      const DEFAULT_COMPONENT = t('defaultComponent');
      const DEFAULT_FEATURE = t('defaultFeature');
      
      const filterValue = {
        platform: node.fullPath.platform === DEFAULT_PLATFORM ? '__NULL__' : node.fullPath.platform,
        component: node.fullPath.component === DEFAULT_COMPONENT ? '__NULL__' : node.fullPath.component,
        feature: node.fullPath.feature === DEFAULT_FEATURE ? '__NULL__' : node.fullPath.feature,
      };
      
      onFilterChange(filterValue);
    }
  };

  // 渲染树节点
  const renderTreeNode = (node: TreeNode, level: number = 0): React.JSX.Element => {
    const nodeKey = getNodeKey(node);
    const isExpanded = expandedNodes.has(nodeKey);
    const isSelected = isNodeSelected(node);
    const hasChildren = node.children && node.children.length > 0;

    const Icon =
      node.type === 'platform'
        ? Layers
        : node.type === 'component'
        ? Box
        : Grid;

    return (
      <div key={nodeKey}>
        <div
          className={cn(
            'group flex items-center gap-1 px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => handleSelectNode(node)}
        >
          {/* 展开/折叠图标 */}
          {hasChildren ? (
            <button
              className="flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(nodeKey);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {/* 图标 */}
          <Icon className="h-4 w-4 flex-shrink-0" />

          {/* 名称 */}
          <span className="truncate max-w-[100px]">{node.name}</span>

          {/* 操作按钮 - 紧跟名称 */}
          {(onCreateCategory || onEditCategory || onDeleteCategory) && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              {/* 添加子分类按钮 - 只在平台和组件层级显示 */}
              {onCreateCategory && (node.type === 'platform' || node.type === 'component') && (
                <button
                  className={cn(
                    "p-0.5 rounded hover:scale-110 transition-all",
                    isSelected 
                      ? "text-primary-foreground hover:bg-primary-foreground/20" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateCategory(node);
                  }}
                  title={node.type === 'platform' ? t('addComponent') : t('addFeature')}
                >
                  <Plus className="h-3 w-3" />
                </button>
              )}
              {onEditCategory && (
                <button
                  className={cn(
                    "p-0.5 rounded hover:scale-110 transition-all",
                    isSelected 
                      ? "text-primary-foreground hover:bg-primary-foreground/20" 
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCategory(node);
                  }}
                  title={t('editCategory')}
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              )}
              {onDeleteCategory && (
                <button
                  className={cn(
                    "p-0.5 rounded hover:scale-110 transition-all",
                    isSelected
                      ? "text-primary-foreground hover:bg-red-500/20"
                      : "text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCategory(node);
                  }}
                  title={t('deleteCategory')}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* 计数徽章 - 放在最右边 */}
          <Badge
            variant={isSelected ? 'secondary' : 'outline'}
            className="text-xs ml-auto flex-shrink-0"
          >
            {node.count}
          </Badge>
        </div>

        {/* 子节点 */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col border-r bg-muted/10 overflow-visible">
      {/* 头部 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{t('title')}</h3>
          {onCreateCategory && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={() => onCreateCategory()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* 统计信息 */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>{t('totalApis')}:</span>
            <span className="font-semibold">{stats.total}</span>
          </div>
        </div>

        {/* 特殊分类 */}
        <div className="space-y-1 mt-4">
          <button
            onClick={() => onFilterChange({})}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
              !selectedFilter.platform && !selectedFilter.component && !selectedFilter.feature && !selectedFilter.isStarred
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{t('allApis')}</span>
            </div>
            <Badge
              variant={
                !selectedFilter.platform && !selectedFilter.component && !selectedFilter.feature && !selectedFilter.isStarred
                  ? 'secondary'
                  : 'outline'
              }
            >
              {stats.total}
            </Badge>
          </button>
          
          <button
            onClick={() => onFilterChange({ isStarred: true })}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
              selectedFilter.isStarred
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span>{t('starred')}</span>
            </div>
            <Badge
              variant={selectedFilter.isStarred ? 'secondary' : 'outline'}
            >
              {stats.starred}
            </Badge>
          </button>
        </div>
      </div>

      {/* 树形列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 pr-1 space-y-1">
          {treeData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>{t('noClassification')}</p>
              <p className="text-xs mt-2">{t('goToApiCapture')}</p>
            </div>
          ) : (
            treeData.map((node) => renderTreeNode(node, 0))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}


