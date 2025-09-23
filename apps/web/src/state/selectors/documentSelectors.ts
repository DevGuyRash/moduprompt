import type { Block, DocumentModel, Edge } from '@moduprompt/types';
import type { DocumentStoreState, DocumentRecord, DocumentIndices } from '../document-model';

interface ResolvedDocument {
  id: string;
  record: DocumentRecord;
}

const resolveDocument = (
  state: DocumentStoreState,
  documentId?: string,
): ResolvedDocument | undefined => {
  const id = documentId ?? state.activeDocumentId;
  if (!id) return undefined;
  const record = state.documents[id];
  if (!record) return undefined;
  return { id, record };
};

export interface NotebookBlockNode {
  id: string;
  kind: Block['kind'];
  sequence: number;
  block: Block;
  children?: NotebookBlockNode[];
}

export interface NotebookProjection {
  documentId: string;
  blocks: NotebookBlockNode[];
  tags: string[];
  statusKey: string;
  version: number;
  updatedAt: number;
}

const buildNotebookNode = (
  blockId: string,
  indices: DocumentIndices,
  visited: Set<string>,
): NotebookBlockNode | undefined => {
  if (visited.has(blockId)) {
    return undefined;
  }
  const block = indices.blocksById[blockId];
  if (!block) {
    return undefined;
  }
  visited.add(blockId);
  const childIds = indices.groupChildOrder[blockId] ?? [];
  const children: NotebookBlockNode[] = [];
  for (const childId of childIds) {
    const child = buildNotebookNode(childId, indices, visited);
    if (child) {
      children.push(child);
    }
  }
  visited.delete(blockId);
  return {
    id: block.id,
    kind: block.kind,
    sequence: block.sequence,
    block,
    children: children.length > 0 ? children : undefined,
  };
};

export const selectNotebookProjection = (
  state: DocumentStoreState,
  documentId?: string,
): NotebookProjection | undefined => {
  const resolved = resolveDocument(state, documentId);
  if (!resolved) return undefined;
  const { id, record } = resolved;
  const visited = new Set<string>();
  const blocks: NotebookBlockNode[] = [];
  for (const rootId of record.indices.rootBlockIds) {
    const node = buildNotebookNode(rootId, record.indices, visited);
    if (node) {
      blocks.push(node);
    }
  }
  return {
    documentId: id,
    blocks,
    tags: record.model.tags,
    statusKey: record.model.statusKey,
    version: record.version,
    updatedAt: record.model.updatedAt,
  };
};

export interface NodeProjectionNode {
  id: string;
  kind: Block['kind'];
  sequence: number;
  block: Block;
  incoming: string[];
  outgoing: string[];
}

export interface NodeProjectionEdge {
  id: string;
  source: Edge['source'];
  target: Edge['target'];
  kind: Edge['kind'];
  condition?: Edge['condition'];
  metadata?: Edge['metadata'];
  order: number;
}

export interface NodeProjection {
  documentId: string;
  nodes: NodeProjectionNode[];
  edges: NodeProjectionEdge[];
  adjacency: Record<string, string[]>;
  reverseAdjacency: Record<string, string[]>;
  topologicalOrder: string[];
  version: number;
}

export const selectNodeProjection = (
  state: DocumentStoreState,
  documentId?: string,
): NodeProjection | undefined => {
  const resolved = resolveDocument(state, documentId);
  if (!resolved) return undefined;
  const { id, record } = resolved;
  const nodes: NodeProjectionNode[] = [];
  for (const blockId of record.indices.blockOrder) {
    const block = record.indices.blocksById[blockId];
    if (!block) {
      continue;
    }
    nodes.push({
      id: block.id,
      kind: block.kind,
      sequence: block.sequence,
      block,
      incoming: [...(record.indices.reverseAdjacency[blockId] ?? [])],
      outgoing: [...(record.indices.adjacency[blockId] ?? [])],
    });
  }
  const edges: NodeProjectionEdge[] = [];
  record.indices.edgeOrder.forEach((edgeId, index) => {
    const edge = record.indices.edgesById[edgeId];
    if (!edge) {
      return;
    }
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
      condition: edge.condition,
      metadata: edge.metadata,
      order: index,
    });
  });

  return {
    documentId: id,
    nodes,
    edges,
    adjacency: record.indices.adjacency,
    reverseAdjacency: record.indices.reverseAdjacency,
    topologicalOrder: record.indices.topologicalOrder,
    version: record.version,
  };
};

export const selectDocumentModel = (
  state: DocumentStoreState,
  documentId?: string,
): DocumentModel | undefined => {
  const resolved = resolveDocument(state, documentId);
  return resolved?.record.model;
};

export const selectBlockById = (
  state: DocumentStoreState,
  blockId: string,
  documentId?: string,
): Block | undefined => {
  const resolved = resolveDocument(state, documentId);
  if (!resolved) return undefined;
  return resolved.record.indices.blocksById[blockId];
};

export const selectEdgeById = (
  state: DocumentStoreState,
  edgeId: string,
  documentId?: string,
): Edge | undefined => {
  const resolved = resolveDocument(state, documentId);
  if (!resolved) return undefined;
  return resolved.record.indices.edgesById[edgeId];
};
