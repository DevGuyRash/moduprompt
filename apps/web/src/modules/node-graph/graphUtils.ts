import type { CSSProperties } from 'react';
import type { Edge, EdgeCondition, EdgeKind } from '@moduprompt/types';
import { MarkerType } from 'reactflow';
import type { Node, Edge as ReactFlowEdge, Connection } from 'reactflow';
import type { NodeProjection } from '../../state/selectors/documentSelectors.js';
import type { LayoutResult } from './layout.js';
import type { BlockNodeData } from './nodes/BlockNode.js';

export type HandleKind = EdgeKind;

export interface NodeHandleConfig {
  inputs: HandleKind[];
  outputs: HandleKind[];
}

const HANDLE_ORDER: HandleKind[] = ['default', 'conditional', 'error'];

const sortHandleKinds = (kinds: Set<HandleKind>): HandleKind[] =>
  HANDLE_ORDER.filter((kind) => kinds.has(kind));

export const buildHandleConfiguration = (projection: NodeProjection): Record<string, NodeHandleConfig> => {
  const config: Record<string, { inputs: Set<HandleKind>; outputs: Set<HandleKind> }> = {};
  for (const node of projection.nodes) {
    config[node.id] = {
      inputs: new Set<HandleKind>(['default']),
      outputs: new Set<HandleKind>(['default']),
    };
  }

  for (const edge of projection.edges) {
    config[edge.source]?.outputs.add(edge.kind);
    config[edge.target]?.inputs.add(edge.kind);
  }

  const resolved: Record<string, NodeHandleConfig> = {};
  for (const nodeId of Object.keys(config)) {
    const entry = config[nodeId]!;
    resolved[nodeId] = {
      inputs: sortHandleKinds(entry.inputs),
      outputs: sortHandleKinds(entry.outputs),
    };
  }
  return resolved;
};

export const buildReactFlowNodes = (
  projection: NodeProjection,
  layout: LayoutResult,
  selectedNodeId?: string,
  onSelect?: (blockId: string) => void,
): Node<BlockNodeData>[] => {
  const handleConfig = buildHandleConfiguration(projection);
  return projection.nodes.map((node) => {
    const rfNode: Node<BlockNodeData> = {
      id: node.id,
      type: 'block',
      position: layout.positions[node.id] ?? { x: 0, y: 0 },
      data: {
        block: node.block,
        handleConfig: handleConfig[node.id] ?? { inputs: ['default'], outputs: ['default'] },
        isSelected: node.id === selectedNodeId,
        onSelect,
      },
      selectable: true,
      draggable: false,
    };
    return rfNode;
  });
};

const EDGE_STYLE: Record<EdgeKind, CSSProperties> = {
  default: { stroke: 'var(--color-brand, #2563eb)', strokeWidth: 2 },
  conditional: { stroke: 'var(--color-accent, #7c3aed)', strokeWidth: 2, strokeDasharray: '6 4' },
  error: { stroke: 'var(--color-danger, #ef4444)', strokeWidth: 2, strokeDasharray: '4 3' },
};

const EDGE_LABEL: Record<EdgeKind, string | undefined> = {
  default: undefined,
  conditional: 'Conditional',
  error: 'Error',
};

const buildEdgeLabel = (kind: EdgeKind, condition?: EdgeCondition): string | undefined => {
  if (kind !== 'conditional') return EDGE_LABEL[kind];
  if (!condition) return EDGE_LABEL[kind];
  return `${condition.language}: ${condition.expression}`;
};

const buildHandleId = (direction: 'source' | 'target', kind: HandleKind): string => `${direction}:${kind}`;

export const buildReactFlowEdges = (projection: NodeProjection): ReactFlowEdge<Edge>[] => {
  return projection.edges.map((edge) => {
    const rfEdge: ReactFlowEdge<Edge> = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: buildHandleId('source', edge.kind),
      targetHandle: buildHandleId('target', edge.kind),
      data: edge,
      label: buildEdgeLabel(edge.kind, edge.condition),
      markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_STYLE[edge.kind].stroke as string },
      style: EDGE_STYLE[edge.kind],
      type: edge.kind === 'conditional' ? 'smoothstep' : 'default',
    };
    return rfEdge;
  });
};

export const parseHandleKind = (handleId?: string | null): HandleKind => {
  if (!handleId) return 'default';
  const [, kind] = handleId.split(':');
  if (kind === 'conditional' || kind === 'error') {
    return kind;
  }
  return 'default';
};

export const deriveEdgeKind = (connection: Connection): EdgeKind => parseHandleKind(connection.sourceHandle);

export const isConnectionTyped = (connection: Connection): boolean => {
  if (!connection.source || !connection.target) {
    return false;
  }
  const sourceKind = parseHandleKind(connection.sourceHandle);
  const targetKind = parseHandleKind(connection.targetHandle);
  return sourceKind === targetKind || targetKind === 'default';
};

export const wouldCreateCycle = (
  projection: NodeProjection,
  sourceId: string,
  targetId: string,
): boolean => {
  if (sourceId === targetId) {
    return true;
  }
  const queue: string[] = [targetId];
  const visited = new Set<string>([targetId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === sourceId) {
      return true;
    }
    for (const next of projection.adjacency[current] ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return false;
};

export const removeEdgesById = (edges: Edge[], ids: Set<string>): Edge[] => edges.filter((edge) => !ids.has(edge.id));

export const edgeExists = (edges: Edge[], candidate: Edge): boolean =>
  edges.some(
    (edge) =>
      edge.source === candidate.source &&
      edge.target === candidate.target &&
      edge.kind === candidate.kind &&
      edge.sourcePort === candidate.sourcePort &&
      edge.targetPort === candidate.targetPort,
  );
