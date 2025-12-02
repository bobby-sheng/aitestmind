"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';

interface HistoryState {
  nodes: Node[];
  edges: Edge[];
}

interface UseUndoRedoOptions {
  maxHistorySize?: number;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useUndoRedo(
  initialNodes: Node[],
  initialEdges: Edge[],
  options: UseUndoRedoOptions = {}
) {
  const { maxHistorySize = 50, onUndo, onRedo } = options;

  // 历史记录栈
  const [history, setHistory] = useState<HistoryState[]>([
    { nodes: initialNodes, edges: initialEdges }
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // 用于防止在撤销/重做时保存新历史
  const isUndoRedoAction = useRef(false);
  
  // 当前状态
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  // 保存新的历史状态
  const saveHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    // 如果是撤销/重做操作触发的更新，不保存历史
    if (isUndoRedoAction.current) {
      return;
    }

    setHistory((prev) => {
      // 截断当前位置之后的历史
      const newHistory = prev.slice(0, currentIndex + 1);
      
      // 添加新状态
      newHistory.push({
        nodes: JSON.parse(JSON.stringify(newNodes)), // 深拷贝
        edges: JSON.parse(JSON.stringify(newEdges)),
      });

      // 限制历史记录大小
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }

      return newHistory;
    });

    setCurrentIndex((prev) => {
      const newIndex = prev + 1;
      return newIndex >= maxHistorySize ? maxHistorySize - 1 : newIndex;
    });
  }, [currentIndex, maxHistorySize]);

  // 撤销
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUndoRedoAction.current = true;
      const newIndex = currentIndex - 1;
      const state = history[newIndex];
      
      setCurrentIndex(newIndex);
      setNodes(JSON.parse(JSON.stringify(state.nodes)));
      setEdges(JSON.parse(JSON.stringify(state.edges)));
      
      onUndo?.();
      
      // 延迟重置标志，确保状态更新完成
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 0);
    }
  }, [currentIndex, history, onUndo]);

  // 重做
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const newIndex = currentIndex + 1;
      const state = history[newIndex];
      
      setCurrentIndex(newIndex);
      setNodes(JSON.parse(JSON.stringify(state.nodes)));
      setEdges(JSON.parse(JSON.stringify(state.edges)));
      
      onRedo?.();
      
      // 延迟重置标志，确保状态更新完成
      setTimeout(() => {
        isUndoRedoAction.current = false;
      }, 0);
    }
  }, [currentIndex, history, onRedo]);

  // 更新节点（外部调用）- 会保存历史
  const updateNodes = useCallback((newNodes: Node[]) => {
    setNodes(newNodes);
    saveHistory(newNodes, edges);
  }, [edges, saveHistory]);

  // 更新边（外部调用）- 会保存历史
  const updateEdges = useCallback((newEdges: Edge[]) => {
    setEdges(newEdges);
    saveHistory(nodes, newEdges);
  }, [nodes, saveHistory]);

  // 同时更新节点和边 - 会保存历史
  const updateNodesAndEdges = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setNodes(newNodes);
    setEdges(newEdges);
    saveHistory(newNodes, newEdges);
  }, [saveHistory]);

  // 直接更新节点（不保存历史）- 用于运行时状态更新，如执行状态
  const setNodesDirectly = useCallback((newNodes: Node[] | ((prev: Node[]) => Node[])) => {
    isUndoRedoAction.current = true;
    setNodes(newNodes);
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 0);
  }, []);

  // 直接更新边（不保存历史）
  const setEdgesDirectly = useCallback((newEdges: Edge[] | ((prev: Edge[]) => Edge[])) => {
    isUndoRedoAction.current = true;
    setEdges(newEdges);
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 0);
  }, []);

  // 监听键盘快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? event.metaKey : event.ctrlKey;

      // Ctrl+Z / Cmd+Z - 撤销
      if (ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      // Ctrl+Shift+Z / Cmd+Shift+Z 或 Ctrl+Y / Cmd+Y - 重做
      else if (
        (ctrlKey && event.key === 'z' && event.shiftKey) ||
        (ctrlKey && event.key === 'y')
      ) {
        event.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo, redo]);

  // 重置历史（用于加载新的测试用例）
  const resetHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    isUndoRedoAction.current = true;
    setNodes(newNodes);
    setEdges(newEdges);
    setHistory([{ nodes: newNodes, edges: newEdges }]);
    setCurrentIndex(0);
    
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 0);
  }, []);

  return {
    nodes,
    edges,
    updateNodes,
    updateEdges,
    updateNodesAndEdges,
    setNodesDirectly,
    setEdgesDirectly,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    resetHistory,
  };
}

