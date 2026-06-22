"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, Play, ArrowLeft, FileDown, Loader2, Tag, X, Layers, Box, Grid, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import FlowCanvas from '@/components/test-orchestration/FlowCanvas';
import NodePalette from '@/components/test-orchestration/NodePalette';
import ApiSelectorDialog from '@/components/test-orchestration/ApiSelectorDialog';
import NodeConfigSheet from '@/components/test-orchestration/NodeConfigSheet';
import TestCaseList from '@/components/test-orchestration/TestCaseList';
import ExecutionLogPanel from '@/components/test-orchestration/ExecutionLogPanel';
import { FlowNode, FlowEdge, NodeType, ApiInfo, ApiNodeData, ParallelNodeData } from '@/types/test-case';
import { Node, Edge } from '@xyflow/react';
import { useToast } from '@/hooks/use-toast';
import { sortNodesByEdges, hasCircularDependency } from '@/lib/utils/flow-helpers';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { getExecutorUrl } from '@/lib/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';

type ViewMode = 'list' | 'edit';
type TestCasePriority = 'P0' | 'P1' | 'P2' | 'P3';
type TestCaseListStatusFilter = 'all' | 'draft' | 'active' | 'archived';

function toTestCasePriority(value: unknown): TestCasePriority {
  return value === 'P0' || value === 'P1' || value === 'P2' || value === 'P3' ? value : 'P2';
}

interface TestCase {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority?: string;
  category?: string;
  platform?: string | null;
  component?: string | null;
  feature?: string | null;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  executeCount: number;
  successCount: number;
  failCount: number;
  steps: any[];
  flowConfig: any;
}

// 清理节点中的执行结果，防止保存到数据库
function cleanExecutionFromNodes(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    if (node.data && 'execution' in node.data) {
      const { execution, ...cleanData } = node.data;
      return { ...node, data: cleanData };
    }
    return node;
  });
}

// 提取「父功能 > 子功能」路径中的最后一段名称，用于展示
function getLeafName(value?: string | null) {
  if (!value) return value as string | null;
  const segments = String(value)
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : (value as string);
}

// 从 featurePath 中提取第 3 层 / 第 4 层名称（支持多级“父功能 > 子功能 > ...”）
function getThirdAndFourthFromFeaturePath(
  featurePath?: string | null,
): { level3?: string; level4?: string } {
  if (!featurePath) return {};
  const segments = String(featurePath)
    .split('>')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) return {};
  if (segments.length === 1) {
    return { level3: segments[0] };
  }

  const level4 = segments[segments.length - 1];
  const level3 = segments[segments.length - 2];
  return { level3, level4 };
}

export default function TestOrchestrationPage() {
  const { toast } = useToast();
  const t = useTranslations('testOrchestration');
  const tCommon = useTranslations('common');
  const tExecution = useTranslations('execution');
  const tCaseTree = useTranslations('testSuites.categoryTree');
  
  // 视图模式：列表或编辑
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [listStatusFilter, setListStatusFilter] = useState<TestCaseListStatusFilter>('all');
  const [apiCategoryKeys, setApiCategoryKeys] = useState<string[]>([]); // API仓库分类筛选（平台/组件/功能）
  const pageSize = 20;
  // 记录最近一次列表查询参数，防止相同条件下重复请求导致接口被频繁刷取
  const lastListQueryRef = useRef<string | null>(null);
  
  // 编辑模式的状态
  const [currentTestCaseId, setCurrentTestCaseId] = useState<string | null>(null);
  const [flowCanvasKey, setFlowCanvasKey] = useState<string>(''); // 独立的 canvas key
  const [testCaseName, setTestCaseName] = useState('未命名用例');
  const [testCaseDescription, setTestCaseDescription] = useState('');
  const [testCaseStatus, setTestCaseStatus] = useState('draft');
  const [testCasePriority, setTestCasePriority] = useState<TestCasePriority>('P0');
  const [testCaseCategory, setTestCaseCategory] = useState('');
  const [testCaseTags, setTestCaseTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // 用例编辑时的 API 仓库分类树数据
  const [editApiCategories, setEditApiCategories] = useState<any[]>([]);
  const [editAllApis, setEditAllApis] = useState<any[]>([]);
  const [editCategoryDropdownOpen, setEditCategoryDropdownOpen] = useState(false);
  const [editExpandedCategoryNodes, setEditExpandedCategoryNodes] = useState<Set<string>>(new Set());
  const [editCategoryDisplay, setEditCategoryDisplay] = useState<string>('');
  
  // 使用撤销/重做功能
  const {
    nodes,
    edges,
    updateNodes,
    updateEdges,
    updateNodesAndEdges,
    setNodesDirectly,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useUndoRedo(
    [{ id: 'start', type: 'start', position: { x: 400, y: 100 }, data: {} }],
    [],
    {
      onUndo: () => {
        toast({
          title: t('undoSuccess'),
          variant: 'default',
        });
      },
      onRedo: () => {
        toast({
          title: t('redoSuccess'),
          variant: 'default',
        });
      },
    }
  );
  const [showApiSelector, setShowApiSelector] = useState(false);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null); // 当前选中的节点ID
  const [showConfigSheet, setShowConfigSheet] = useState(false);
  const [pendingNodeType, setPendingNodeType] = useState<NodeType | 'parallel-api' | null>(null);
  const [pendingNodePosition, setPendingNodePosition] = useState<{ x: number; y: number } | null>(null);
  
  // 调试：监听 showApiSelector 变化
  useEffect(() => {
    console.log('📋 showApiSelector changed:', showApiSelector, 'pendingNodeType:', pendingNodeType);
  }, [showApiSelector, pendingNodeType]);
  
  // 计算下一个节点的位置（智能布局）
  const getNextNodePosition = useCallback((currentNodes: Node[]) => {
    if (currentNodes.length === 0) {
      return { x: 400, y: 100 };
    }
    
    // 找到最右边的节点
    const rightmostNode = currentNodes.reduce((max, node) => {
      return node.position.x > max.position.x ? node : max;
    }, currentNodes[0]);
    
    // 在最右边节点的右侧添加新节点（水平间距 250px）
    return {
      x: rightmostNode.position.x + 250,
      y: rightmostNode.position.y,
    };
  }, []);

  // 离开列表视图时，清空最近查询 key，确保回到列表时会重新加载
  useEffect(() => {
    if (viewMode === 'edit') {
      lastListQueryRef.current = null;
    }
  }, [viewMode]);

  // 加载测试用例列表
  useEffect(() => {
    if (viewMode === 'list') {
      loadTestCases();
    }
  }, [viewMode, page, apiCategoryKeys, listStatusFilter]);

  const loadTestCases = async (options?: { force?: boolean }) => {
    // 根据当前分页与筛选条件构造查询 key，用于去重
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (listStatusFilter !== 'all') {
      params.set('status', listStatusFilter);
    }
    if (apiCategoryKeys.length > 0) {
      params.set('apiCategories', JSON.stringify(apiCategoryKeys));
    }
    const queryKey = params.toString();

    // 如果不是强制刷新，且查询条件与上一次完全一致，则不再重复请求，
    // 避免在某些渲染循环场景下疯狂打接口
    if (!options?.force && lastListQueryRef.current === queryKey) {
      return;
    }
    lastListQueryRef.current = queryKey;

    try {
      setLoading(true);
      const response = await fetch(`/api/test-cases?${params.toString()}`);
      const result = await response.json();
      
      if (result.success) {
        setTestCases(result.data);
        setTotal(result.total || 0);
      } else {
        toast({
          title: t('loadFailed'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading test cases:', error);
      toast({
        title: t('loadFailed'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 创建新编排
  const handleCreateNew = async () => {
    const newTestCaseName = t('unnamedTestCase');
    const initialNodes = [
      {
        id: 'start',
        type: 'start',
        position: { x: 400, y: 100 },
        data: {},
      },
    ];
    
    // 立即创建一个草稿到数据库
    try {
      const response = await fetch('/api/test-cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTestCaseName,
          description: '',
          status: 'draft',
          priority: 'P0',
          category: null,
          tags: [],
          flowConfig: {
            nodes: initialNodes,
            edges: [],
          },
          steps: [], // 初始没有步骤（只有start节点）
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.id) {
        // 设置新创建的测试用例ID
        const newId = result.data.id;
        setCurrentTestCaseId(newId);
        setFlowCanvasKey(newId); // 使用ID作为key
        setTestCaseName(newTestCaseName);
        setTestCaseDescription('');
        setTestCaseStatus('draft');
        setTestCasePriority('P0');
        setTestCaseCategory('');
        setEditCategoryDisplay('');
        setEditCategoryDropdownOpen(false);
        setTestCaseTags([]);
        setTagInput('');
        setCurrentTestCaseCreatedBy(null);
        setCurrentTestCaseUpdatedBy(null);
        
        // 重置撤销/重做历史
        resetHistory(initialNodes, []);
        setViewMode('edit');
        
        toast({
          title: t('orchestrationCreated'),
          description: t('autoSavedDraft'),
          variant: 'success',
        });
      } else {
        throw new Error(result.error || 'Failed to create test case');
      }
    } catch (error) {
      console.error('Error creating new test case:', error);
      toast({
        title: t('createFailed'),
        description: t('createFailedDescription'),
        variant: 'destructive',
      });
    }
  };

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

  // 获取所有已有的分类和标签
  const existingCategories = Array.from(new Set(testCases.map(tc => tc.category).filter(Boolean))) as string[];
  const existingTags = Array.from(new Set(testCases.flatMap(tc => parseTags(tc.tags))));
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // 编辑现有编排
  const [currentTestCaseCreatedBy, setCurrentTestCaseCreatedBy] = useState<string | null>(null);
  const [currentTestCaseUpdatedBy, setCurrentTestCaseUpdatedBy] = useState<string | null>(null);

  const handleEdit = (testCase: TestCase) => {
    setCurrentTestCaseId(testCase.id);
    setFlowCanvasKey(testCase.id); // 使用编排 ID 作为 key
    setTestCaseName(testCase.name);
    setTestCaseDescription(testCase.description || '');
    setTestCaseStatus(testCase.status);
    setTestCasePriority(toTestCasePriority(testCase.priority));
    setTestCaseCategory(testCase.category || '');
    setEditCategoryDisplay(testCase.category || '');
    setTestCaseTags(parseTags(testCase.tags));
    setTagInput('');
    setCurrentTestCaseCreatedBy((testCase as any).createdByUser?.loginName ?? null);
    setCurrentTestCaseUpdatedBy((testCase as any).updatedByUser?.loginName ?? null);
    
    // 加载流程图配置 - 需要解析JSON字符串
    let flowConfig = testCase.flowConfig;
    
    // 如果flowConfig是字符串，解析它
    if (typeof flowConfig === 'string') {
      try {
        flowConfig = JSON.parse(flowConfig);
      } catch (error) {
        console.error('Error parsing flowConfig:', error);
        flowConfig = null;
      }
    }
    
    if (flowConfig && flowConfig.nodes) {
      console.log('Loading flow config with', flowConfig.nodes.length, 'nodes');
      // 重置撤销/重做历史
      resetHistory(flowConfig.nodes, flowConfig.edges || []);
    } else {
      // 如果没有流程图配置，使用默认值
      console.log('No flow config found, using default start node');
      resetHistory(
        [
          {
            id: 'start',
            type: 'start',
            position: { x: 400, y: 100 },
            data: {},
          },
        ],
        []
      );
    }
    
    setViewMode('edit');
  };

  // 编辑模式下加载 API 仓库分类数据（构建分类树）
  useEffect(() => {
    if (viewMode !== 'edit') return;

    const loadApiCategoriesForEdit = async () => {
      try {
        const classificationsResponse = await fetch('/api/api-library/classifications');
        const classificationsResult = await classificationsResponse.json();
        if (classificationsResult.success) {
          setEditApiCategories(classificationsResult.data);
        }

        const apisResponse = await fetch('/api/api-library/list?page=1&pageSize=10000&includeArchived=true');
        const apisResult = await apisResponse.json();
        if (apisResult.success) {
          setEditAllApis(apisResult.data);
        }
      } catch (error) {
        console.error('Failed to load API categories for edit page:', error);
      }
    };

    loadApiCategoriesForEdit();
  }, [viewMode]);

  // 构建编辑页使用的 API 分类树
  interface EditTreeNode {
    type: 'platform' | 'component' | 'feature' | 'subFeature';
    name: string;
    count: number;
    children?: EditTreeNode[];
    fullPath: {
      platform?: string;
      component?: string;
      feature?: string;
      subFeature?: string;
    };
  }

  const buildEditApiCategoryTree = (): EditTreeNode[] => {
    const tree: EditTreeNode[] = [];
    const platformMap = new Map<string, EditTreeNode>();
    const DEFAULT_PLATFORM = tCaseTree('defaultPlatform');
    const DEFAULT_COMPONENT = tCaseTree('defaultComponent');
    const DEFAULT_FEATURE = tCaseTree('defaultFeature');

    // 从 classifications 创建骨架，支持「父功能 > 子功能」
    editApiCategories.forEach((classification: any) => {
      const { platform, component, feature } = classification;
      if (!platform) return;

      if (!platformMap.has(platform)) {
        const platformNode: EditTreeNode = {
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

      if (component) {
        let componentNode =
          platformNode.children?.find(
            (n) => n.name === component && n.type === 'component'
          ) || null;
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

        if (feature) {
          const segments = String(feature)
            .split('>')
            .map((s) => s.trim())
            .filter(Boolean);
          if (segments.length === 0) return;

          let currentParent: EditTreeNode = componentNode;
          segments.forEach((segmentName, index) => {
            const isRootFeature = index === 0;
            const type: EditTreeNode['type'] = isRootFeature ? 'feature' : 'subFeature';

            let existingNode =
              currentParent.children?.find(
                (n) => n.name === segmentName && n.type === type
              ) || null;

            if (!existingNode) {
              const pathSegments = segments.slice(0, index + 1);
              existingNode = {
                type,
                name: segmentName,
                count: 0,
                children: [],
                fullPath: {
                  platform,
                  component,
                  feature: pathSegments.join(' > '),
                  subFeature: type === 'subFeature' ? segmentName : undefined,
                },
              };
              if (!currentParent.children) currentParent.children = [];
              currentParent.children.push(existingNode);
            }

            currentParent = existingNode;
          });
        }
      }
    });

    // 从所有 API 补充分类并统计数量（包含归档）
    editAllApis.forEach((api: any) => {
      const platform = api.platform || DEFAULT_PLATFORM;
      const component = api.component || DEFAULT_COMPONENT;
      const feature = api.feature || DEFAULT_FEATURE;
      const subFeature = api.subFeature || null;

      if (!platformMap.has(platform)) {
        const platformNode: EditTreeNode = {
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

      let componentNode =
        platformNode.children?.find(
          (n) => n.name === component && n.type === 'component'
        ) || null;
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

      let featureNode =
        componentNode.children?.find(
          (n) => n.name === feature && n.type === 'feature'
        ) || null;
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

      if (subFeature) {
        let subFeatureNode =
          featureNode.children?.find(
            (n) => n.name === subFeature && n.type === 'subFeature'
          ) || null;
        if (!subFeatureNode) {
          subFeatureNode = {
            type: 'subFeature',
            name: subFeature,
            count: 0,
            fullPath: { platform, component, feature, subFeature },
          };
          if (!featureNode.children) featureNode.children = [];
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
      });
    });

    return tree;
  };

  const editApiCategoryTree = buildEditApiCategoryTree();

  const getEditNodeKey = (node: EditTreeNode): string => {
    const { platform, component, feature } = node.fullPath;
    return [platform, component, feature].filter(Boolean).join('/');
  };

  const toggleEditNode = (nodeKey: string) => {
    setEditExpandedCategoryNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) next.delete(nodeKey);
      else next.add(nodeKey);
      return next;
    });
  };

  const handleSelectEditCategory = (node: EditTreeNode) => {
    const { platform, component, feature } = node.fullPath;
    const stored = [platform, component, feature].filter(Boolean).join(' / ');

    const { level3, level4 } = getThirdAndFourthFromFeaturePath(feature);
    const display = [platform, component, level3, level4]
      .filter(Boolean)
      .join(' / ');

    setTestCaseCategory(stored);
    setEditCategoryDisplay(display);
    setEditCategoryDropdownOpen(false);
  };

  const renderEditCategoryNode = (node: EditTreeNode, level: number = 0): React.ReactNode => {
    const nodeKey = getEditNodeKey(node);
    const isExpanded = editExpandedCategoryNodes.has(nodeKey);
    const hasChildren = node.children && node.children.length > 0;

    const Icon =
      node.type === 'platform'
        ? Layers
        : node.type === 'component'
        ? Box
        : Grid;

    const isSelected =
      editCategoryDisplay &&
      editCategoryDisplay.includes(node.name) &&
      testCaseCategory.includes(node.fullPath.feature || node.fullPath.component || node.fullPath.platform || '');

    return (
      <div key={nodeKey}>
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-sm cursor-pointer hover:bg-muted ${
            isSelected ? 'bg-primary text-primary-foreground hover:bg-primary' : ''
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => handleSelectEditCategory(node)}
        >
          {hasChildren ? (
            <button
              className="flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleEditNode(nodeKey);
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

          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate max-w-[140px]">
            {node.type === 'platform' || node.type === 'component'
              ? node.name
              : getLeafName(node.fullPath.feature || node.name)}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map((child) => renderEditCategoryNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // 删除编排
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/test-cases/${id}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: t('deleteSuccess'),
          variant: 'success',
        });
        // 删除后强制刷新当前页列表
        loadTestCases({ force: true });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting test case:', error);
      toast({
        title: t('deleteFailed'),
        variant: 'destructive',
      });
    }
  };

  // 批量删除编排
  const handleBatchDelete = async (ids: string[]) => {
    try {
      const response = await fetch('/api/test-cases/batch-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: t('batchDeleteSuccess'),
          description: t('batchDeleteSuccessDescription', { count: result.data.deletedCount }),
          variant: 'success',
        });
        // 如果当前页没有数据了，且不是第一页，则跳转到上一页
        if (testCases.length <= ids.length && page > 1) {
          setPage(page - 1);
        } else {
          // 批量删除后强制刷新
          loadTestCases({ force: true });
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error batch deleting test cases:', error);
      toast({
        title: t('batchDeleteFailed'),
        variant: 'destructive',
      });
    }
  };

  // 复制编排
  const handleCopy = async (id: string) => {
    try {
      toast({
        title: t('copying'),
        description: t('copyingDescription'),
      });

      const response = await fetch(`/api/test-cases/${id}/copy`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: t('copySuccess'),
          variant: 'success',
        });
        // 复制后强制刷新，让新用例立刻出现在列表
        loadTestCases({ force: true });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error copying test case:', error);
      toast({
        title: t('copyFailed'),
        variant: 'destructive',
      });
    }
  };

  // 返回列表
  const handleBackToList = () => {
    setViewMode('list');
    setCurrentTestCaseId(null);
  };

  // 处理添加节点
  const handleAddNode = useCallback((nodeType: NodeType) => {
    if (nodeType === 'api') {
      // API节点需要先选择API
      setPendingNodeType('api');
      setShowApiSelector(true);
    } else {
      // 其他类型节点直接添加
      const position = getNextNodePosition(nodes);
      const newNode: Node = {
        id: `${nodeType}_${Date.now()}`,
        type: nodeType,
        position,
        data: nodeType === 'wait' ? { wait: { type: 'time', value: 1000 } } : 
              nodeType === 'assertion' ? { assertions: [] } :
              nodeType === 'parallel' ? { 
                name: t('parallelNode'),
                apis: [],
                failureStrategy: 'stopAll'
              } : {},
      };
      updateNodes([...nodes, newNode]);
    }
  }, [getNextNodePosition, nodes, updateNodes, t]);

  // 处理选择API
  const handleSelectApi = useCallback(
    (api: ApiInfo) => {
      console.log('Selected API:', api, 'pending type:', pendingNodeType);
      
      // 如果是添加到并发节点
      if (pendingNodeType === 'parallel-api') {
        const targetNodeId = (window as any).pendingParallelNodeId;
        console.log('🔧 Adding API to parallel node:', targetNodeId);
        
        if (targetNodeId) {
          // 获取API详情以填充默认配置
          (async () => {
            try {
              const response = await fetch(`/api/api-library/apis/${api.id}`);
              const result = await response.json();
              
              let newApiConfig;
              
              if (result.success) {
                const apiData = result.data;
                
                // 解析JSON字段
                const parseJsonField = (field: any) => {
                  if (!field) return null;
                  if (typeof field === 'string') {
                    try {
                      return JSON.parse(field);
                    } catch {
                      return null;
                    }
                  }
                  return field;
                };

                const processedApiInfo = {
                  ...apiData,
                  requestHeaders: parseJsonField(apiData.requestHeaders),
                  requestQuery: parseJsonField(apiData.requestQuery),
                  requestBody: parseJsonField(apiData.requestBody),
                };

                // 初始化路径参数
                const pathParamNames: string[] = [];
                const pathRegex = /\{([^}]+)\}/g;
                let match;
                while ((match = pathRegex.exec(apiData.path)) !== null) {
                  pathParamNames.push(match[1]);
                }
                
                const initialPathParams: Record<string, any> = {};
                pathParamNames.forEach((paramName) => {
                  initialPathParams[paramName] = {
                    valueType: 'fixed',
                    value: '',
                  };
                });

                // 初始化查询参数
                const initialQueryParams: Record<string, any> = {};
                if (processedApiInfo.requestQuery) {
                  Object.entries(processedApiInfo.requestQuery).forEach(([key, value]) => {
                    initialQueryParams[key] = {
                      valueType: 'fixed',
                      value: value,
                    };
                  });
                }

                // 初始化请求体
                const initialBody: Record<string, any> = {};
                if (processedApiInfo.requestBody) {
                  const fillBodyRecursive = (obj: any, prefix: string = '') => {
                    Object.entries(obj).forEach(([key, value]) => {
                      const fullKey = prefix ? `${prefix}.${key}` : key;
                      
                      if (typeof value !== 'object' || value === null) {
                        initialBody[fullKey] = {
                          valueType: 'fixed',
                          value: value,
                        };
                      } else if (!Array.isArray(value)) {
                        fillBodyRecursive(value, fullKey);
                      } else {
                        initialBody[fullKey] = {
                          valueType: 'fixed',
                          value: JSON.stringify(value),
                        };
                      }
                    });
                  };
                  fillBodyRecursive(processedApiInfo.requestBody);
                }

                // 初始化请求头
                const initialHeaders: Record<string, any> = {};
                if (processedApiInfo.requestHeaders) {
                  Object.entries(processedApiInfo.requestHeaders).forEach(([key, value]) => {
                    const skipHeaders = ['host', 'connection', 'content-length', 'accept-encoding'];
                    if (!skipHeaders.includes(key.toLowerCase())) {
                      initialHeaders[key] = {
                        valueType: 'fixed',
                        value: value,
                      };
                    }
                  });
                }

                newApiConfig = {
                  id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  apiId: api.id,
                  name: api.name,
                  method: api.method,
                  url: api.path,
                  requestConfig: {
                    pathParams: initialPathParams,
                    queryParams: initialQueryParams,
                    headers: initialHeaders,
                    body: initialBody,
                  },
                  assertions: [],
                };
              } else {
                // 如果获取失败，使用空配置
                newApiConfig = {
                  id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  apiId: api.id,
                  name: api.name,
                  method: api.method,
                  url: api.path,
                  requestConfig: {
                    pathParams: {},
                    queryParams: {},
                    headers: {},
                    body: {},
                  },
                  assertions: [],
                };
              } 
              
              const updatedNodes = nodes.map((node) => {
                if (node.id === targetNodeId && node.type === 'parallel') {
                  const parallelData = node.data as unknown as ParallelNodeData;
                  
                  console.log('✅ Added API to parallel node:', newApiConfig);
                  
                  return {
                    ...node,
                    data: {
                      ...parallelData,
                      apis: [...(parallelData.apis || []), newApiConfig],
                    },
                  };
                }
                return node;
              });
              updateNodes(updatedNodes);
              
              toast({
                title: `${t('apiAdded')} ${api.name}`,
                variant: 'success',
              });
            } catch (error) {
              console.error('Error fetching API info:', error);
              toast({
                title: t('addFailed'),
                variant: 'destructive',
              });
            }
          })();
          
          // 清理临时存储
          delete (window as any).pendingParallelNodeId;
          console.log('🧹 Cleaned up pendingParallelNodeId');
        } else {
          console.error('❌ No targetNodeId found!');
        }
        
        // 关闭对话框并重置状态
        setShowApiSelector(false);
        setPendingNodeType(null);
        setPendingNodePosition(null);
        return;
      }
      
      // 普通添加API节点
      // 使用拖拽位置或智能计算的位置
      const position = pendingNodePosition || getNextNodePosition(nodes);
      
      const newNode: Node = {
        id: `step_${Date.now()}`,
        type: 'api',
        position,
        data: {
          apiId: api.id,
          name: api.name,
          method: api.method,
          url: api.path,
          requestConfig: {},
          responseExtract: [],
          assertions: [],
        },
      };

      console.log('New Node with position:', newNode.position);
      console.log('Current nodes count:', nodes.length);
      
      updateNodes([...nodes, newNode]);

      // 重置状态
      setPendingNodeType(null);
      setPendingNodePosition(null);
    },
    [pendingNodeType, pendingNodePosition, getNextNodePosition, nodes, updateNodes, toast, t]
  );

  // 处理节点点击 - 直接打开配置
  const handleNodeClick = useCallback((node: Node) => {
    console.log('🖱️ 节点被点击:', node.id, node.type);
    
    // 选中节点（视觉反馈）
    setSelectedNodeId(node.id);
    
    // 如果是可配置的节点，直接打开配置
    if (node.type === 'api' || node.type === 'wait' || node.type === 'assertion' || node.type === 'parallel') {
      console.log('✅ 打开配置面板');
      setSelectedNode(node as FlowNode);
      setShowConfigSheet(true);
    }
  }, []);

  // 处理节点配置 - 通过自定义事件触发（保留兼容性）
  const handleNodeConfig = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && (node.type === 'api' || node.type === 'wait' || node.type === 'assertion' || node.type === 'parallel')) {
      setSelectedNode(node as FlowNode);
      setSelectedNodeId(nodeId);
      setShowConfigSheet(true);
    }
  }, [nodes]);

  // 处理点击画布空白处 - 取消选中
  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // 处理节点配置保存
  const handleSaveNodeConfig = useCallback(
    async (nodeId: string, data: any) => {
      console.log('💾 开始保存节点配置:', { nodeId, data });
      
      // 更新前端状态 - 确保创建新的对象引用以触发重新渲染
      const updatedNodes = nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...data } } : node
      );
      updateNodes(updatedNodes);
      
      console.log('✅ 前端状态已更新');
      
      // 立即保存到数据库
      if (currentTestCaseId) {
        try {
          // 清理执行结果（防止保存执行日志到数据库）
          const cleanedNodes = cleanExecutionFromNodes(updatedNodes);
          
          // 构建测试用例数据
          const sortedNodes = sortNodesByEdges(cleanedNodes, edges);
          const testCase = {
            name: testCaseName,
            description: testCaseDescription,
            status: testCaseStatus,
            category: testCaseCategory,
            tags: testCaseTags,
            flowConfig: {
              nodes: cleanedNodes,
              edges,
            },
            steps: sortedNodes
              .filter((node) => node.type !== 'start' && node.type !== 'end')
              .map((node, index) => ({
                name: node.id,
                description: '',
                order: index,
                nodeId: node.id,
                apiId: node.type === 'api' ? (node.data as unknown as ApiNodeData).apiId : undefined,
                type: node.type,
                config: node.data,
                positionX: node.position.x,
                positionY: node.position.y,
              })),
          };

          const response = await fetch(`/api/test-cases/${currentTestCaseId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(testCase),
          });

          const result = await response.json();

          if (result.success) {
      toast({
              title: t('configSaved'),
        variant: 'success',
      });
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          console.error('Error saving node config:', error);
          toast({
            title: t('saveFailed'),
            variant: 'destructive',
          });
        }
      } else {
        // 理论上不应该到这里，因为新建时会自动创建草稿
        console.error('❌ 保存节点配置失败：测试用例ID不存在');
        toast({
          title: t('saveFailed'),
          description: t('testCaseIdMissing'),
          variant: 'destructive',
        });
      }
    },
    [nodes, edges, currentTestCaseId, testCaseName, testCaseDescription, testCaseStatus, testCaseCategory, testCaseTags, toast, t, updateNodes]
  );

  // 处理节点变化（包括位置、删除等）
  const handleNodesChange = useCallback((updatedNodes: Node[]) => {
    console.log('节点变化:', updatedNodes);
    updateNodes(updatedNodes);
  }, [updateNodes]);

  // 处理边变化
  const handleEdgesChange = useCallback((updatedEdges: Edge[]) => {
    console.log('Edges changed:', updatedEdges); // 调试日志
    const cleanedEdges = updatedEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    }));
    updateEdges(cleanedEdges);
  }, [updateEdges]);

  // 处理节点删除
  const handleNodeDelete = useCallback((nodeId: string) => {
    // 不允许删除开始节点
    if (nodeId === 'start') {
      toast({
        title: t('cannotDeleteStartNode'),
        variant: 'destructive',
      });
      return;
    }
    
    // 删除节点
    const updatedNodes = nodes.filter(node => node.id !== nodeId);
    // 删除与该节点相关的所有连线
    const updatedEdges = edges.filter(edge => edge.source !== nodeId && edge.target !== nodeId);
    
    updateNodesAndEdges(updatedNodes, updatedEdges);
    
    // 如果删除的是当前选中的节点，关闭配置面板
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setSelectedNode(null);
      setShowConfigSheet(false);
    }
    
    toast({
      title: t('nodeDeleted'),
      variant: 'success',
    });
  }, [nodes, edges, updateNodesAndEdges, selectedNodeId, toast, t]);

  // 处理节点拖放
  const handleNodeDrop = useCallback(
    (nodeType: string, position: { x: number; y: number }, targetNodeId?: string) => {
        console.log('🎯 handleNodeDrop called:', { nodeType, position, targetNodeId });
      
      // 如果拖拽到并发节点上
      if (targetNodeId && nodeType === 'api') {
        console.log('✅ Detected drop on parallel node:', targetNodeId);
        // 保存目标并发节点ID，然后打开API选择器
        setPendingNodeType('parallel-api');
        setPendingNodePosition(position);
        (window as any).pendingParallelNodeId = targetNodeId; // 临时存储
        console.log('📋 Opening API selector for parallel node');
        setShowApiSelector(true);
        
        toast({
          title: t('selectApi'),
          description: t('selectApiForParallel'),
        });
        return;
      }
      
      if (nodeType === 'api') {
        // API节点需要先选择API
        setPendingNodeType('api');
        setPendingNodePosition(position);
        setShowApiSelector(true);
      } else {
        // 其他类型节点直接添加
        const newNode: Node = {
          id: `${nodeType}_${Date.now()}`,
          type: nodeType as NodeType,
          position,
          data: nodeType === 'wait' ? { wait: { type: 'time', value: 1000 } } : 
                nodeType === 'assertion' ? { assertions: [] } :
                nodeType === 'parallel' ? { 
                  name: t('parallelNode'),
                  apis: [],
                  failureStrategy: 'stopAll'
                } : {},
        };
        updateNodes([...nodes, newNode]);
      }
    },
    [nodes, updateNodes, t]
  );

  // 执行状态
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExecutionLog, setShowExecutionLog] = useState(false);
  const [isLogPanelCollapsed, setIsLogPanelCollapsed] = useState(false);
  const [executionStats, setExecutionStats] = useState({ total: 0, executed: 0, passed: 0, failed: 0 }); // 日志面板折叠状态
  
  // 监听 isExecuting 状态变化
  useEffect(() => {
    console.log('[页面状态] isExecuting 变化:', isExecuting);
  }, [isExecuting]);

  // 运行测试用例（使用 SSE 实时推送）
  const handleRunTest = async () => {
    console.log('[运行测试] 按钮点击，当前执行状态:', isExecuting);
    
    // 防止重复执行
    if (isExecuting) {
      console.log('[运行测试] 已有测试正在执行，忽略此次点击');
      toast({
        title: t('waitForCompletion'),
        variant: 'destructive',
      });
      return;
    }
    
    // 如果还没有保存，先保存
    if (!currentTestCaseId) {
      toast({
        title: t('saveFirst'),
        description: t('saveBeforeRun'),
        variant: 'destructive',
      });
      return;
    }

    console.log('[运行测试] 开始执行测试用例:', currentTestCaseId);
    
    // 显示日志面板并展开
    setShowExecutionLog(true);
    setIsLogPanelCollapsed(false);

    // 清空所有节点的执行状态（不记录历史）
    setNodesDirectly(prevNodes => prevNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        execution: undefined
      }
    })));

    // 设置执行状态，让 ExecutionLogPanel 处理 SSE 连接
    console.log('[页面] 设置 isExecuting = true');
    setIsExecuting(true);
  };

  // 运行测试用例（原始方式 - 备用）
  const handleRunTestOld = async () => {
    // 如果还没有保存，先保存
    if (!currentTestCaseId) {
      toast({
        title: '请先保存',
        description: '请先保存测试用例后再运行',
        variant: 'destructive',
      });
      return;
    }

    try {
      toast({
        title: '开始执行',
        description: '正在执行测试用例...',
      });

      // 调用 Python 后端执行 API
      const executorUrl = getExecutorUrl();
      const response = await fetch(`${executorUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testCaseId: currentTestCaseId,
        }),
      });

      if (!response.ok) {
        throw new Error('执行请求失败');
      }

      const result = await response.json();

      if (result.success && result.result) {
        const executionResult = result.result;
        
        // 显示执行结果
        if (executionResult.success) {
          toast({
            title: '✅ 执行成功',
            description: `耗时: ${executionResult.duration?.toFixed(2)}秒, 通过: ${executionResult.passedSteps}/${executionResult.totalSteps}`,
          });
        } else {
          toast({
            title: '❌ 执行失败',
            description: executionResult.error || '测试执行失败',
            variant: 'destructive',
          });
        }

        // 在控制台输出详细结果
        console.log('=' .repeat(60));
        console.log('测试执行结果');
        console.log('=' .repeat(60));
        console.log('测试用例:', executionResult.testCaseName);
        console.log('执行状态:', executionResult.success ? '✅ 成功' : '❌ 失败');
        console.log('执行耗时:', executionResult.duration?.toFixed(2), '秒');
        console.log('总步骤数:', executionResult.totalSteps);
        console.log('成功步骤:', executionResult.passedSteps);
        console.log('失败步骤:', executionResult.failedSteps);
        
        if (executionResult.steps && executionResult.steps.length > 0) {
          console.log('\n步骤详情:');
          executionResult.steps.forEach((step: any, index: number) => {
            console.log(`\n步骤 ${index + 1}: ${step.stepName}`);
            console.log('  状态:', step.success ? '✅ 成功' : '❌ 失败');
            console.log('  耗时:', step.duration?.toFixed(2), '秒');
            
            if (step.request) {
              console.log('  请求:', step.request.method, step.request.url);
              if (step.request.json) {
                console.log('  请求体:', step.request.json);
              }
            }
            
            if (step.response) {
              console.log('  响应状态:', step.response.status);
              if (step.response.body) {
                console.log('  响应体:', step.response.body);
              }
            }
            
            if (step.extractedVariables) {
              console.log('  提取变量:', step.extractedVariables);
            }
            
            if (step.assertions && step.assertions.length > 0) {
              console.log('  断言结果:');
              step.assertions.forEach((assertion: any) => {
                console.log(`    ${assertion.success ? '✅' : '❌'} ${assertion.field} ${assertion.operator} ${assertion.expected}`);
              });
            }
            
            if (step.error) {
              console.log('  ❌ 错误:', step.error);
            }
          });
        }
        
        if (executionResult.variables) {
          console.log('\n全局变量:');
          console.log(executionResult.variables);
        }
        
        console.log('=' .repeat(60));
        
        // 重新加载测试用例列表以更新统计信息
        if (viewMode === 'list') {
          // 执行完成后刷新统计信息
          loadTestCases({ force: true });
        }
      } else {
        throw new Error(result.error || '执行失败');
      }
    } catch (error: any) {
      console.error('Error running test:', error);
      
      let errorMessage = '执行测试用例时发生错误';
      
      // 检查是否是连接失败
      if (error.message?.includes('fetch') || error.message?.includes('Failed to fetch')) {
        const executorUrl = getExecutorUrl();
        errorMessage = `无法连接到执行器服务 (${executorUrl})，请确保 Python 后端已启动`;
      }
      
      toast({
        title: '执行失败',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // 保存测试用例
  const handleSaveTestCase = async (saveStatus?: string) => {
    try {
      // 校验：分类必填
      if (!testCaseCategory || !testCaseCategory.trim()) {
        toast({
          title: '请选择分类',
          variant: 'destructive',
        });
        return;
      }

      // 检查是否有环形依赖
      if (hasCircularDependency(nodes, edges)) {
        toast({
          title: t('circularDependency'),
          variant: 'destructive',
        });
        return;
      }

      // 清理执行结果（防止保存执行日志到数据库）
      const cleanedNodes = cleanExecutionFromNodes(nodes);
      
      // 按照连线顺序排序节点
      console.log('Current nodes:', nodes);
      console.log('Current edges:', edges);
      const sortedNodes = sortNodesByEdges(cleanedNodes, edges);
      console.log('Sorted nodes by edges:', sortedNodes); // 调试日志

      const testCase = {
        name: testCaseName,
        description: testCaseDescription,
        status: saveStatus || testCaseStatus,
        priority: testCasePriority,
        category: testCaseCategory,
        tags: testCaseTags,
        flowConfig: {
          nodes: cleanedNodes,
          edges,
        },
        steps: sortedNodes
          .filter((node) => node.type !== 'start' && node.type !== 'end')
          .map((node, index) => ({
            name: node.id,
            description: '',
            order: index, // 使用排序后的索引作为执行顺序
            nodeId: node.id,
            apiId: node.type === 'api' ? (node.data as unknown as ApiNodeData).apiId : undefined,
            type: node.type,
            config: node.data,
            positionX: node.position.x,
            positionY: node.position.y,
          })),
      };

      console.log('Test case to save:', testCase); // 调试日志

      // 如果是更新现有用例，使用PUT；否则使用POST
      const url = currentTestCaseId 
        ? `/api/test-cases/${currentTestCaseId}` 
        : '/api/test-cases';
      const method = currentTestCaseId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testCase),
      });

      const result = await response.json();

      if (result.success) {
        // 如果是新建，更新ID（但不改变 key，避免画布重新挂载）
        if (!currentTestCaseId && result.data?.id) {
          setCurrentTestCaseId(result.data.id);
          // 注意：不更新 flowCanvasKey，保持画布稳定
        }
        
        // 更新状态
        if (saveStatus) {
          setTestCaseStatus(saveStatus);
        }
        
        toast({
          title: currentTestCaseId ? t('orchestrationUpdated') : t('orchestrationCreated'),
          variant: 'success',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving test case:', error);
      toast({
        title: t('saveFailed'),
        variant: 'destructive',
      });
    }
  };

  // 清空当前选择的分类
  const handleClearCategory = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setTestCaseCategory('');
    setEditCategoryDisplay('');
    setEditCategoryDropdownOpen(false);
  };

  // 列表模式渲染
  if (viewMode === 'list') {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (loading && testCases.length === 0) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg text-muted-foreground">{tCommon('loading')}</div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-hidden">
          <TestCaseList
            testCases={testCases}
            statusFilter={listStatusFilter}
            onStatusFilterChange={(status) => {
              setListStatusFilter(status);
              setPage(1);
            }}
            onApiCategoryKeysChange={(keys) => {
              setApiCategoryKeys(keys);
              setPage(1);
            }}
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBatchDelete={handleBatchDelete}
            onCopy={handleCopy}
          />
        </div>
        
        {/* 底部分页控制栏（固定在底部） */}
        <div className="flex items-center justify-between pt-4 px-6 pb-4 border-t border-[#e5e7eb] dark:border-[#4b5563] flex-shrink-0 bg-background">
            <div className="text-sm text-muted-foreground">
              {tExecution('displayingRecords', { 
                start: total === 0 ? 0 : (page - 1) * pageSize + 1, 
                end: total === 0 ? 0 : Math.min(page * pageSize, total), 
                total 
              })}
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(1)}
                disabled={page === 1 || total === 0}
              >
                {tExecution('firstPage')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || total === 0}
              >
                {tExecution('prevPage')}
              </Button>
              <span className="text-sm px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages || total === 0}
              >
                {tExecution('nextPage')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages || total === 0}
              >
                {tExecution('lastPage')}
              </Button>
            </div>
          </div>
      </div>
    );
  }

  // 添加标签的辅助函数
  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !testCaseTags.includes(trimmedTag)) {
      setTestCaseTags([...testCaseTags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTestCaseTags(testCaseTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 编辑模式渲染
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* 顶部工具栏 */}
      <div className="flex flex-col gap-4 p-4 border-b border-[#e5e7eb] dark:border-[#4b5563] bg-background flex-shrink-0">
        {/* 第一行：返回按钮、名称和操作按钮 */}
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('backToList')}
          </Button>
          
          <div className="h-6 w-px bg-[#e5e7eb] dark:bg-[#4b5563]" />
          
          <Input
            value={testCaseName}
            onChange={(e) => setTestCaseName(e.target.value)}
            className="max-w-xs font-semibold"
            placeholder={t('namePlaceholder')}
          />
          
          <Select value={testCaseStatus} onValueChange={setTestCaseStatus}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">{t('statusDraft')}</SelectItem>
              <SelectItem value="active">{t('statusActive')}</SelectItem>
              <SelectItem value="archived">{t('statusArchived')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={testCasePriority} onValueChange={(v) => setTestCasePriority(toTestCasePriority(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="P0">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full bg-rose-400" aria-hidden />
                  <span>{t('priorityP0')}</span>
                </span>
              </SelectItem>
              <SelectItem value="P1">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full bg-amber-400" aria-hidden />
                  <span>{t('priorityP1')}</span>
                </span>
              </SelectItem>
              <SelectItem value="P2">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  <span>{t('priorityP2')}</span>
                </span>
              </SelectItem>
              <SelectItem value="P3">
                <span className="flex items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full bg-gray-400" aria-hidden />
                  <span>{t('priorityP3')}</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          {(currentTestCaseCreatedBy || currentTestCaseUpdatedBy) && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {currentTestCaseCreatedBy && <span>{tCommon('createdBy')}: {currentTestCaseCreatedBy}</span>}
              {currentTestCaseUpdatedBy && <span>{tCommon('updatedBy')}: {currentTestCaseUpdatedBy}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveTestCase('draft')}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            {t('saveDraft')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveTestCase('active')}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {t('saveAndPublish')}
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="gap-2"
            onClick={handleRunTest}
            disabled={!currentTestCaseId || isExecuting}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('executing')}
              </>
            ) : (
              <>
            <Play className="h-4 w-4" />
            {t('runTest')}
              </>
            )}
          </Button>
          </div>
        </div>

      {/* 第二行：描述、分类和标签 */}
      <div className="flex items-center gap-4">
          {/* 编排描述 */}
          <Input
            value={testCaseDescription}
            onChange={(e) => setTestCaseDescription(e.target.value)}
            className="flex-[2] h-9"
            placeholder={t('descriptionPlaceholder')}
          />

          {/* 分类选择（API 仓库分类树） - 与描述框高度一致 */}
          <div className="flex-[1.5]">
            <DropdownMenu
              open={editCategoryDropdownOpen}
              onOpenChange={setEditCategoryDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <div className="h-9 px-3 inline-flex w-full items-center gap-2 rounded-md border border-input bg-background text-sm text-muted-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground">
                  <Layers className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {editCategoryDisplay || '选择分类'}
                  </span>
                </div>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-[280px] max-h-[400px] overflow-y-auto p-0"
                align="start"
              >
                <div className="p-2">
                  {/* 分类树（保持原有结构与行为不变） */}
                  {editApiCategoryTree.length > 0 ? (
                    <div className="space-y-1">
                      {editApiCategoryTree.map((node) =>
                        renderEditCategoryNode(node, 0)
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      暂无API分类
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
         
          {/* 标签输入 - 与其他控件对齐 */}
          <div className="flex items-center gap-2 flex-[2]">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {testCaseTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              
              <div className="relative">
                <Input
                  value={tagInput}
                  onChange={(e) => {
                    setTagInput(e.target.value);
                    setShowTagSuggestions(true);
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                  onKeyDown={handleTagInputKeyDown}
                  className="w-[150px] h-8"
                  placeholder={t('addTagPlaceholder')}
                />
                {showTagSuggestions && existingTags.length > 0 && (
                  <div className="absolute z-50 w-[200px] mt-1 bg-background border border-[#e5e7eb] dark:border-[#4b5563] rounded-md shadow-lg max-h-[150px] overflow-auto">
                    {existingTags
                      .filter(tag => 
                        (tagInput ? tag.toLowerCase().includes(tagInput.toLowerCase()) : true) &&
                        !testCaseTags.includes(tag)
                      )
                      .length > 0 ? (
                      existingTags
                        .filter(tag => 
                          (tagInput ? tag.toLowerCase().includes(tagInput.toLowerCase()) : true) &&
                          !testCaseTags.includes(tag)
                        )
                        .map((tag) => (
                          <button
                            key={tag}
                            onClick={() => {
                              if (!testCaseTags.includes(tag)) {
                                setTestCaseTags([...testCaseTags, tag]);
                                setTagInput('');
                              }
                              setShowTagSuggestions(false);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-muted transition-colors text-sm flex items-center gap-2"
                          >
                            <Tag className="h-3 w-3" />
                            {tag}
                          </button>
                        ))
                    ) : (
                      tagInput && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          {t('noMatchingTag')}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
            {tagInput && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleAddTag}
                className="h-8"
              >
                {t('addTag')}
              </Button>
            )}
          </div>
          
          {/* 显示已有标签快速选择 */}
          {existingTags.length > 0 && existingTags.some(tag => !testCaseTags.includes(tag)) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('commonTags')}</span>
              <div className="flex gap-1 flex-wrap">
                {existingTags
                  .filter((tag) => !testCaseTags.includes(tag))
                  .slice(0, 5)
                  .map((tag) => (
                    <button
                      key={tag}
                      onClick={() => {
                        if (!testCaseTags.includes(tag)) {
                          setTestCaseTags([...testCaseTags, tag]);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/70 transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 主内容区 - 完全禁用滚动 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧节点面板 */}
        <NodePalette onAddNode={handleAddNode} />

        {/* 流程图画布区域 */}
        <div className={`flex-1 relative overflow-hidden ${showExecutionLog ? 'flex flex-row' : ''}`}>
          <div className={showExecutionLog ? 'flex-1 min-w-0' : 'h-full'}>
            <FlowCanvas
              key={flowCanvasKey}
              initialNodes={nodes}
              initialEdges={edges}
              onNodeClick={handleNodeClick}
              onNodeConfig={handleNodeConfig}
              onPaneClick={handlePaneClick}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onNodeDrop={handleNodeDrop}
              onNodeDelete={handleNodeDelete}
              selectedNodeId={selectedNodeId}
            />

            {/* 添加节点提示 */}
            {nodes.length === 1 && !showExecutionLog && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-20 text-center pointer-events-none">
                <Card className="p-8 pointer-events-auto">
                  <div className="text-muted-foreground">
                    {t('dragNodeTip')}
                  </div>
                </Card>
              </div>
            )}
          </div>

          {/* 执行日志面板 - 从右侧弹出，可折叠，半屏宽度，独立滚动 */}
          {showExecutionLog && currentTestCaseId && (
            <div className={`border-l border-[#e5e7eb] dark:border-[#4b5563] flex-shrink-0 overflow-hidden transition-all duration-300 ${
              isLogPanelCollapsed ? 'w-12' : 'w-1/2'
            }`}>
              <div className="h-full flex flex-col">
                {/* 日志面板头部 - 可点击折叠/展开 */}
                <div 
                  className={`flex items-center justify-between px-4 py-2 border-b border-[#e5e7eb] dark:border-[#4b5563] bg-muted/50 ${
                    isLogPanelCollapsed ? '' : 'cursor-pointer hover:bg-muted/70'
                  } transition-colors`}
                >
                  {isLogPanelCollapsed ? (
                    <div className="flex flex-col items-center gap-2 w-full cursor-pointer" onClick={() => setIsLogPanelCollapsed(false)}>
                      <span className="font-semibold text-sm writing-mode-vertical">{t('executionLog')}</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{t('executionLog')}</span>
                        {isExecuting && (
                          <span className="text-blue-600 flex items-center gap-1 text-xs">
                            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            {t('executing')}
                          </span>
                        )}
                        {/* 统计信息 */}
                        {executionStats.total > 0 && (
                          <div className="flex items-center gap-2 text-xs">
                            <div className="h-3 w-px bg-[#e5e7eb] dark:bg-[#4b5563]" />
                            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              {t('totalSteps')}: {executionStats.total}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                              {t('passedSteps')}: {executionStats.passed}
                            </span>
                            {executionStats.failed > 0 && (
                              <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                {t('failedSteps')}: {executionStats.failed}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button 
                        className="p-1 hover:bg-muted rounded transition-colors"
                        onClick={() => setIsLogPanelCollapsed(true)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>

                {/* 日志面板内容 - 只在展开时显示 */}
                {!isLogPanelCollapsed && (
                  <div className="flex-1 overflow-hidden">
                    <ExecutionLogPanel
                      key={`execution-log-${currentTestCaseId}`}
                      testCaseId={currentTestCaseId}
                      isExecuting={isExecuting}
                      onStatsChange={(stats) => {
                        setExecutionStats(stats);
                      }}
                onExecutionComplete={(success) => {
                  console.log('[页面] onExecutionComplete 被调用, success:', success, '当前 isExecuting:', isExecuting);
                  setIsExecuting(false);
                  console.log('[页面] setIsExecuting(false) 已调用');
                  if (success) {
                    toast({
                      title: tCommon('submit'),
                      variant: 'success',
                    });
                  }
                }}
                onNodeStatusUpdate={(nodeId, status, executionData) => {
                  console.log('[节点状态更新] nodeId:', nodeId, 'status:', status, 'executionId:', executionData.executionId);
                  // 使用 setNodesDirectly 避免将执行状态更新记录到撤销/重做历史中
                  setNodesDirectly((prevNodes) => {
                    return prevNodes.map((node) => {
                      if (node.id === nodeId) {
                        const nodeData = node.data as any;
                        const currentStatus = nodeData.execution?.status;
                        const currentExecution = nodeData.execution;
                        const currentExecutionId = currentExecution?.executionId;
                        const newExecutionId = executionData.executionId;
                        
                        // 状态保护0：基于执行ID的保护 - 只接受来自当前或更新执行的状态更新
                        if (currentExecutionId && newExecutionId) {
                          // 提取执行ID中的时间戳（格式：exec_timestamp_random）
                          const extractTimestamp = (execId: string) => {
                            const match = execId.match(/exec_(\d+)_/);
                            return match ? parseInt(match[1], 10) : 0;
                          };
                          
                          const currentTimestamp = extractTimestamp(currentExecutionId);
                          const newTimestamp = extractTimestamp(newExecutionId);
                          
                          // 如果新的执行ID时间戳更旧，拒绝更新（旧执行的延迟消息）
                          if (newTimestamp < currentTimestamp) {
                            console.log('[节点状态更新] 拒绝更新 - 来自旧执行的消息:', node.id, 
                              '当前执行ID:', currentExecutionId, '消息执行ID:', newExecutionId);
                            return node;
                          }
                          
                          // 如果是同一个执行，应用正常的状态保护逻辑
                          if (newExecutionId === currentExecutionId) {
                            // 状态保护1：如果当前节点已经是终态（success/error），不允许被中间态（running）覆盖
                            if ((currentStatus === 'success' || currentStatus === 'error') && status === 'running') {
                              console.log('[节点状态更新] 拒绝更新 - 同一执行的终态不能被running覆盖:', node.id);
                              return node;
                            }
                            
                            // 状态保护2：如果当前已有详细执行数据，而新数据是空的，保留旧数据
                            const hasDetailedData = currentExecution && (
                              currentExecution.duration ||
                              currentExecution.request ||
                              currentExecution.response ||
                              currentExecution.assertions
                            );
                            const isEmptyUpdate = Object.keys(executionData).length <= 1; // 只有executionId
                            
                            if (hasDetailedData && isEmptyUpdate && currentStatus === status) {
                              console.log('[节点状态更新] 拒绝更新 - 已有详细数据，不用空数据覆盖:', node.id);
                              return node;
                            }
                          }
                        }
                        
                        console.log('[节点状态更新] 接受更新:', node.id, '状态:', status, 
                          '(当前:', currentStatus, '/', currentExecutionId?.slice(-9), 
                          '→ 新:', newExecutionId?.slice(-9), ')');
                        
                        const updatedNode = {
                          ...node,
                          data: {
                            ...node.data,
                            execution: {
                              status,
                              ...executionData
                            }
                          }
                        };
                        
                        console.log('[节点状态更新] 更新后节点数据:', {
                          nodeId: updatedNode.id,
                          status: updatedNode.data.execution?.status,
                          hasExecution: !!updatedNode.data.execution,
                          executionKeys: updatedNode.data.execution ? Object.keys(updatedNode.data.execution) : []
                        });
                        
                        return updatedNode;
                      }
                      return node;
                    });
                  });
                }}
              />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API选择对话框 */}
      <ApiSelectorDialog
        open={showApiSelector}
        onOpenChange={setShowApiSelector}
        onSelectApi={handleSelectApi}
      />

      {/* 节点配置抽屉 */}
      <NodeConfigSheet
        open={showConfigSheet}
        onOpenChange={setShowConfigSheet}
        node={selectedNode}
        nodes={nodes}
        onSave={handleSaveNodeConfig}
      />
    </div>
  );
}
