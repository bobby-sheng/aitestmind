"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import StartNode from './nodes/StartNode';
import ApiNode from './nodes/ApiNode';
import WaitNode from './nodes/WaitNode';
import AssertionNode from './nodes/AssertionNode';
import ParallelNode from './nodes/ParallelNode';
import EndNode from './nodes/EndNode';
import { FlowNode, FlowEdge } from '@/types/test-case';

const nodeTypes: NodeTypes = {
  start: StartNode,
  api: ApiNode,
  wait: WaitNode,
  assertion: AssertionNode,
  parallel: ParallelNode,
  end: EndNode,
};

interface FlowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodeClick?: (node: Node) => void;
  onNodeConfig?: (nodeId: string) => void;  // 新增：节点配置回调
  onPaneClick?: () => void;
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeDrop?: (nodeType: string, position: { x: number; y: number }, targetNodeId?: string) => void;
  onNodeDelete?: (nodeId: string) => void;  // 节点删除回调
  selectedNodeId?: string | null;
}

export default function FlowCanvas({
  initialNodes = [],
  initialEdges = [],
  onNodeClick,
  onNodeConfig,
  onPaneClick,
  onNodesChange,
  onEdgesChange,
  onNodeDrop,
  onNodeDelete,
  selectedNodeId,
}: FlowCanvasProps) {
  const [nodes, setNodes, handleNodesChange] = useNodesState(initialNodes as Node[]);
  const [edges, setEdges, handleEdgesChange] = useEdgesState(initialEdges as Edge[]);
  const prevEdgesRef = useRef<Edge[]>([]);
  const prevNodesRef = useRef<Node[]>([]);
  const prevInitialNodesRef = useRef<Node[]>([]);
  const prevInitialEdgesRef = useRef<Edge[]>([]);
  const isInternalUpdate = useRef(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // 监听节点配置自定义事件
  useEffect(() => {
    const handleNodeConfigEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nodeId = customEvent.detail?.nodeId;
      console.log('📥 Received node-config event:', nodeId);
      if (nodeId && onNodeConfig) {
        console.log('✅ Calling onNodeConfig for:', nodeId);
        onNodeConfig(nodeId);
      }
    };

    // 在 document 上监听，与触发方式一致
    document.addEventListener('node-config', handleNodeConfigEvent);
    return () => {
      document.removeEventListener('node-config', handleNodeConfigEvent);
    };
  }, [onNodeConfig]);

  // 监听节点删除自定义事件
  useEffect(() => {
    const handleNodeDeleteEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const nodeId = customEvent.detail?.nodeId;
      console.log('🗑️ Received node-delete event:', nodeId);
      if (nodeId && onNodeDelete) {
        onNodeDelete(nodeId);
      }
    };

    document.addEventListener('node-delete', handleNodeDeleteEvent);
    return () => {
      document.removeEventListener('node-delete', handleNodeDeleteEvent);
    };
  }, [onNodeDelete]);

  // 同步外部nodes更新（但避免回流导致的重复同步）
  useEffect(() => {
    // 使用更智能的比较：优先检查执行状态变化和配置变化
    const prevNodes = prevInitialNodesRef.current;
    
    // 情况1：节点数量变化，完全同步（跳过内部更新标志检查）
    if (!prevNodes || prevNodes.length !== initialNodes.length) {
      // 节点数量变化时，立即同步，不管 isInternalUpdate
      console.log('[FlowCanvas] 节点数量变化，完全同步:', prevNodes?.length, '->', initialNodes.length);
      setNodes(initialNodes as Node[]);
      prevInitialNodesRef.current = initialNodes;
      // 清除内部更新标志，避免影响下次更新
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
      }
      return;
    }
    
    // 情况2：如果是内部更新触发的，只更新引用但跳过实际同步
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      prevInitialNodesRef.current = initialNodes;
      return;
    }
    
    // 情况3：检查每个节点的数据是否变化
    let hasChange = false;
    const changedNodes: string[] = [];
    
    for (let i = 0; i < initialNodes.length; i++) {
      const prevNode = prevNodes.find(n => n.id === initialNodes[i].id);
      const currentNode = initialNodes[i];
      
      if (prevNode) {
        // 比较节点数据（使用 JSON 字符串比较）
        const prevDataStr = JSON.stringify(prevNode.data);
        const currentDataStr = JSON.stringify(currentNode.data);
        
        if (prevDataStr !== currentDataStr) {
          hasChange = true;
          changedNodes.push(currentNode.id);
          console.log(`[FlowCanvas] 节点 ${currentNode.id} 数据变化`);
        }
      } else {
        // 发现新节点（虽然数量没变，但节点ID不同）
        hasChange = true;
        changedNodes.push(currentNode.id);
        console.log(`[FlowCanvas] 发现新节点 ${currentNode.id}`);
      }
    }
    
    if (hasChange && initialNodes.length > 0) {
      console.log('[FlowCanvas] 检测到节点配置变化，更新节点:', changedNodes);
      // 使用 setNodes 回调确保更新
      setNodes((currentNodes) => {
        return initialNodes.map(newNode => {
          // 保留当前节点的位置，但更新数据
          const existingNode = currentNodes.find(n => n.id === newNode.id);
          if (existingNode) {
            return {
              ...existingNode,
              data: { ...newNode.data }  // 强制更新 data，创建新对象引用
            };
          }
          return newNode as Node;
        });
      });
      prevInitialNodesRef.current = initialNodes;
    }
  }, [initialNodes, setNodes]);

  // 同步外部edges更新
  useEffect(() => {
    // 如果是内部更新触发的，跳过
    if (isInternalUpdate.current) {
      return;
    }
    
    // 检查 initialEdges 是否真的变化了
    const edgesChanged = JSON.stringify(prevInitialEdgesRef.current) !== JSON.stringify(initialEdges);
    
    if (edgesChanged) {
      console.log('外部连线变化，完全同步:', initialEdges);
      // 确保所有边都设置为可删除和可选择
      const edgesWithDeletable = (initialEdges as Edge[]).map(edge => ({
        ...edge,
        deletable: true,
        selectable: true,
      }));
      setEdges(edgesWithDeletable);
      prevInitialEdgesRef.current = initialEdges;
    }
  }, [initialEdges, setEdges]);

  // 同步选中状态
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setNodes]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => {
        const newEdge = addEdge({ 
          ...connection, 
          deletable: true,
          selectable: true,
        }, eds);
        return newEdge;
      });
    },
    [setEdges]
  );

  const handlePaneClickInternal = useCallback(() => {
    onPaneClick?.();
  }, [onPaneClick]);

  const handleNodeClickInternal = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  // 监听节点变化并通知父组件
  const onNodesChangeInternal = useCallback(
    (changes: any) => {
      handleNodesChange(changes);
    },
    [handleNodesChange]
  );

  // 当nodes变化时，通知父组件
  useEffect(() => {
    // 检查nodes是否真的变化了（比较ID集合或位置）
    const prevIds = new Set(prevNodesRef.current.map(n => n.id));
    const currentIds = new Set(nodes.map(n => n.id));
    
    const hasChanged = prevIds.size !== currentIds.size || 
      ![...prevIds].every(id => currentIds.has(id)) ||
      JSON.stringify(prevNodesRef.current) !== JSON.stringify(nodes);
    
    if (hasChanged && onNodesChange) {
      console.log('同步节点到父组件:', nodes);
      isInternalUpdate.current = true; // 标记为内部更新，避免回流
      onNodesChange(nodes);
      prevNodesRef.current = nodes;
    }
  }, [nodes, onNodesChange]);

  // 监听边变化并通知父组件
  const onEdgesChangeInternal = useCallback(
    (changes: any) => {
      // 检查是否有删除操作
      const hasRemove = changes.some((change: any) => change.type === 'remove');
      if (hasRemove) {
        console.log('检测到连线删除操作:', changes);
      }
      // 应用变更到内部状态（包括删除操作）
      handleEdgesChange(changes);
    },
    [handleEdgesChange]
  );

  // 当edges变化时，通知父组件
  useEffect(() => {
    // 检查edges是否真的变化了
    const hasChanged = JSON.stringify(prevEdgesRef.current) !== JSON.stringify(edges);
    
    if (hasChanged && onEdgesChange) {
      console.log('同步连线到父组件:', edges.length, '条连线');
      isInternalUpdate.current = true; // 标记为内部更新，避免回流
      // 确保所有边都设置为可删除和可选择
      const edgesWithDeletable = edges.map(edge => ({
        ...edge,
        deletable: true,
        selectable: true,
      }));
      onEdgesChange(edgesWithDeletable);
      prevEdgesRef.current = edges;
    }
  }, [edges, onEdgesChange]);

  // 处理边删除
  const onEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      console.log('删除连线:', deletedEdges);
      // 删除操作已经通过 onEdgesChange 处理，这里可以添加额外的逻辑
      // 比如显示提示信息等
    },
    []
  );

  // 处理拖放
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');

      // 检查是否是有效的节点类型
      if (typeof nodeType === 'undefined' || !nodeType) {
        return;
      }

      // 获取React Flow实例
      if (reactFlowInstance) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        // 检查是否拖拽到并发节点上
        let targetNode = null;
        if (nodeType === 'api') {
          // 只在拖拽API节点时检查
          for (const node of nodes) {
            if (node.type !== 'parallel') continue;
            
            // 尝试多种选择器
            const selectors = [
              `[data-id="${node.id}"]`,
              `.react-flow__node[data-id="${node.id}"]`,
              `#${node.id}`,
            ];
            
            for (const selector of selectors) {
              const nodeEl = document.querySelector(selector);
              if (nodeEl) {
                const rect = nodeEl.getBoundingClientRect();
                const isInside = (
                  event.clientX >= rect.left &&
                  event.clientX <= rect.right &&
                  event.clientY >= rect.top &&
                  event.clientY <= rect.bottom
                );
                
                if (isInside) {
                  targetNode = node;
                  console.log('✅ Found target parallel node:', node.id, 'using selector:', selector);
                  break;
                }
              }
            }
            
            if (targetNode) break;
          }
        }

        console.log('Dropping node:', nodeType, 'at position:', position, 'target:', targetNode?.id);

        // 如果拖拽到并发节点上，通知父组件以特殊方式处理
        if (targetNode && nodeType === 'api') {
          onNodeDrop?.(nodeType, position, targetNode.id);
        } else {
          // 普通拖拽
          onNodeDrop?.(nodeType, position);
        }
      }
    },
    [reactFlowInstance, onNodeDrop, nodes]
  );

  return (
    <div 
      className="w-full h-full" 
      ref={reactFlowWrapper}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeInternal}
        onEdgesChange={onEdgesChangeInternal}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        onNodeClick={handleNodeClickInternal}
        onPaneClick={handlePaneClickInternal}
        onInit={setReactFlowInstance}
        nodeTypes={nodeTypes}
        deleteKeyCode="Delete"
        fitView
        className="bg-background"
      >
        <Background />
        <Controls position="top-left" />
        <MiniMap position="top-right" />
      </ReactFlow>
    </div>
  );
}

