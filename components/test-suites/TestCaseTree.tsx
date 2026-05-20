'use client';

import { useState, useMemo } from 'react';
import { 
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * 测试用例分类树组件
 * 用于测试套件创建/编辑页面的左侧分类导航
 * 支持多层级分类展示（通过category字段用"/"分隔）
 */

interface TestCase {
  id: string;
  name: string;
  description?: string;
  status: string;
  category?: string;
  platform?: string;
  component?: string;
  feature?: string;
  subFeature?: string;
}

interface TestCaseTreeProps {
  testCases: TestCase[];
  selectedCategory?: string;
  onCategoryChange: (category?: string) => void;
}

interface TreeNode {
  type: 'platform' | 'component' | 'feature' | 'subFeature';
  name: string;
  count: number;
  children?: TreeNode[];
  fullPath: {
    platform?: string;
    component?: string;
    feature?: string;
    subFeature?: string;
  };
}

export function TestCaseTree({
  testCases,
  selectedCategory,
  onCategoryChange,
}: TestCaseTreeProps) {
  const t = useTranslations('testSuites.categoryTree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 构建四层分类树形结构（参考 API 仓库）
  const treeData = useMemo(() => {
    const tree: TreeNode[] = [];
    const platformMap = new Map<string, TreeNode>();
    
    // 默认分类配置
    const DEFAULT_PLATFORM = t('defaultPlatform');
    const DEFAULT_COMPONENT = t('defaultComponent');
    const DEFAULT_FEATURE = t('defaultFeature');
    
    // 统计每个分类路径的用例数量
    testCases.forEach(tc => {
      // 跳过没有分类信息的用例（未分类）
      if (!tc.platform && !tc.component && !tc.feature && !tc.subFeature) return;
      
      const platform = tc.platform || DEFAULT_PLATFORM;
      const component = tc.component || DEFAULT_COMPONENT;
      const feature = tc.feature || DEFAULT_FEATURE;
      const subFeature = tc.subFeature || null;
      
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
          children: [],
          fullPath: { platform, component, feature },
        };
        componentNode.children!.push(featureNode);
      }
      featureNode.count++;

      // 处理子功能层（第 4 层，可选）
      if (subFeature) {
        let subFeatureNode = featureNode.children?.find(
          (n) => n.name === subFeature && n.type === 'subFeature'
        );
        if (!subFeatureNode) {
          subFeatureNode = {
            type: 'subFeature',
            name: subFeature,
            count: 0,
            fullPath: { platform, component, feature, subFeature },
          };
          if (!featureNode.children) {
            featureNode.children = [];
          }
          featureNode.children.push(subFeatureNode);
        }
        subFeatureNode.count++;
      }
    });
    
    // 排序
    tree.sort((a, b) => a.name.localeCompare(b.name));
    tree.forEach((platform) => {
      platform.children?.sort((a, b) => a.name.localeCompare(b.name));
      platform.children?.forEach((component) => {
        component.children?.sort((a, b) => a.name.localeCompare(b.name));
        component.children?.forEach((featureNode) => {
          featureNode.children?.sort((a, b) => a.name.localeCompare(b.name));
        });
      });
    });
    
    return tree;
  }, [testCases, t]);

  // 统计信息
  const stats = useMemo(() => {
    const total = testCases.length;
    const categorized = testCases.filter(tc => tc.platform || tc.component || tc.feature).length;
    const uncategorized = total - categorized;

    return { total, categorized, uncategorized };
  }, [testCases]);

  // 生成节点唯一键
  const getNodeKey = (node: TreeNode): string => {
    const { platform, component, feature, subFeature } = node.fullPath;
    return [platform, component, feature, subFeature].filter(Boolean).join('/');
  };

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

  // 检查节点是否选中
  const isNodeSelected = (node: TreeNode): boolean => {
    if (!selectedCategory) return false;
    const nodeKey = getNodeKey(node);
    return selectedCategory === nodeKey;
  };

  // 选择节点
  const handleSelectNode = (node: TreeNode) => {
    const nodeKey = getNodeKey(node);
    if (isNodeSelected(node)) {
      // 如果点击已选中的节点，取消选择
      onCategoryChange(undefined);
    } else {
      onCategoryChange(nodeKey);
    }
  };

  // 渲染树节点
  const renderTreeNode = (node: TreeNode, level: number = 0): React.JSX.Element => {
    const nodeKey = getNodeKey(node);
    const isExpanded = expandedNodes.has(nodeKey);
    const isSelected = isNodeSelected(node);
    const hasChildren = node.children && node.children.length > 0;

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
          {isSelected ? (
            <FolderOpen className="h-4 w-4 flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 flex-shrink-0" />
          )}

          {/* 名称 */}
          <span className="truncate max-w-[100px]" title={node.name}>
            {node.name}
          </span>

          {/* 计数徽章 */}
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
    <div className="h-full flex flex-col border-r border-[#e5e7eb] dark:border-[#4b5563] bg-muted/10">
      {/* 头部 */}
      <div className="p-4 border-b border-[#e5e7eb] dark:border-[#4b5563]">
        <h3 className="font-semibold text-lg mb-4">{t('title')}</h3>

        {/* 统计信息 */}
        <div className="text-xs text-muted-foreground space-y-1 mb-4">
          <div className="flex justify-between">
            <span>{t('totalCases')}:</span>
            <span className="font-semibold text-foreground">{stats.total}</span>
          </div>
        </div>

        {/* 全部用例按钮 */}
        <button
          onClick={() => onCategoryChange(undefined)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
            !selectedCategory
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted'
          )}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{t('allCases')}</span>
          </div>
          <Badge
            variant={!selectedCategory ? 'secondary' : 'outline'}
            className="text-xs"
          >
            {stats.total}
          </Badge>
        </button>
      </div>

      {/* 树形分类列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 pr-1 space-y-1">
          {treeData.length === 0 && stats.uncategorized === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>{t('noCategories')}</p>
              <p className="text-xs mt-2">{t('noCategoriesDesc')}</p>
            </div>
          ) : (
            <>
              {/* 渲染树形结构 */}
              {treeData.map((node) => renderTreeNode(node, 0))}
              
              {/* 未分类 */}
              {stats.uncategorized > 0 && (
                <button
                  onClick={() => onCategoryChange('uncategorized')}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                    selectedCategory === 'uncategorized'
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {selectedCategory === 'uncategorized' ? (
                      <FolderOpen className="h-4 w-4" />
                    ) : (
                      <Folder className="h-4 w-4" />
                    )}
                    <span>{t('uncategorized')}</span>
                  </div>
                  <Badge
                    variant={selectedCategory === 'uncategorized' ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {stats.uncategorized}
                  </Badge>
                </button>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
