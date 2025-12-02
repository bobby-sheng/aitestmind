import { Node, Edge } from '@xyflow/react';

/**
 * 根据连线关系对节点进行拓扑排序
 * 从start节点开始，按照连线顺序遍历所有节点
 */
export function sortNodesByEdges(nodes: Node[], edges: Edge[]): Node[] {
  // 找到起点节点
  const startNode = nodes.find(node => node.type === 'start');
  if (!startNode) return nodes;

  // 构建邻接表（谁连接到谁）
  const adjacencyMap = new Map<string, string[]>();
  edges.forEach(edge => {
    if (!adjacencyMap.has(edge.source)) {
      adjacencyMap.set(edge.source, []);
    }
    adjacencyMap.get(edge.source)!.push(edge.target);
  });

  // BFS遍历，按连线顺序收集节点
  const sortedNodes: Node[] = [];
  const visited = new Set<string>();
  const queue: string[] = [startNode.id];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentNode = nodes.find(n => n.id === currentId);
    if (currentNode) {
      sortedNodes.push(currentNode);
    }

    // 添加所有子节点到队列
    const children = adjacencyMap.get(currentId) || [];
    children.forEach(childId => {
      if (!visited.has(childId)) {
        queue.push(childId);
      }
    });
  }

  // 添加未连接的节点（如果有的话）
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      sortedNodes.push(node);
    }
  });

  return sortedNodes;
}

/**
 * 验证流程图是否有环
 */
export function hasCircularDependency(nodes: Node[], edges: Edge[]): boolean {
  const adjacencyMap = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  // 初始化
  nodes.forEach(node => {
    adjacencyMap.set(node.id, []);
    inDegree.set(node.id, 0);
  });

  // 构建图和入度
  edges.forEach(edge => {
    adjacencyMap.get(edge.source)!.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Kahn算法检测环
  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  let processedCount = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    processedCount++;

    const neighbors = adjacencyMap.get(current) || [];
    neighbors.forEach(neighbor => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    });
  }

  return processedCount !== nodes.length;
}

/**
 * 获取节点的执行顺序编号
 */
export function getNodeExecutionOrder(nodeId: string, nodes: Node[], edges: Edge[]): number {
  const sortedNodes = sortNodesByEdges(nodes, edges);
  return sortedNodes.findIndex(node => node.id === nodeId);
}

