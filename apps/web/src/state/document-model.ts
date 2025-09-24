import { produce, type Draft } from 'immer';
import type {
  Block,
  DocumentModel,
  DocumentSettings,
  Edge,
  GroupBlock,
  VariableDefinition,
} from '@moduprompt/types';
import { normalizeTags } from '@moduprompt/snippet-store';
import type { StoreApi } from 'zustand/vanilla';
import { createScopedStore } from './baseStore';

const DEFAULT_HISTORY_CAPACITY = 100;

export interface DocumentHistory {
  capacity: number;
  past: DocumentModel[];
  future: DocumentModel[];
}

export interface DocumentIndices {
  blockOrder: string[];
  blockIndex: Record<string, number>;
  rootBlockIds: string[];
  groupChildOrder: Record<string, string[]>;
  childToParent: Record<string, string>;
  blocksById: Record<string, Block>;
  edgesById: Record<string, Edge>;
  edgeOrder: string[];
  adjacency: Record<string, string[]>;
  reverseAdjacency: Record<string, string[]>;
  topologicalOrder: string[];
}

export interface DocumentRecord {
  model: DocumentModel;
  indices: DocumentIndices;
  version: number;
  history: DocumentHistory;
}

export interface DocumentStoreState {
  activeDocumentId?: string;
  documents: Record<string, DocumentRecord>;
}

export interface DocumentStoreActions {
  loadDocument: (document: DocumentModel, options?: { activate?: boolean; historyCapacity?: number }) => void;
  unloadDocument: (documentId: string) => void;
  setActiveDocument: (documentId: string) => void;
  getDocument: (documentId: string) => DocumentModel | undefined;
  runTransaction: (
    documentId: string,
    fn: (draft: Draft<DocumentModel>) => void,
    options?: { captureHistory?: boolean },
  ) => DocumentModel | undefined;
  insertBlock: (
    documentId: string,
    block: Block,
    options?: { after?: string; captureHistory?: boolean },
  ) => void;
  updateBlock: (
    documentId: string,
    blockId: string,
    updater: (draft: Draft<Block>) => void,
    options?: { captureHistory?: boolean },
  ) => void;
  removeBlock: (
    documentId: string,
    blockId: string,
    options?: { captureHistory?: boolean },
  ) => void;
  updateEdges: (
    documentId: string,
    updater: (draft: Draft<Edge[]>) => void,
    options?: { captureHistory?: boolean },
  ) => void;
  updateVariables: (
    documentId: string,
    updater: (draft: Draft<VariableDefinition[]>) => void,
    options?: { captureHistory?: boolean },
  ) => void;
  updateSettings: (
    documentId: string,
    updater: (draft: Draft<DocumentSettings>) => void,
    options?: { captureHistory?: boolean },
  ) => void;
  setTags: (documentId: string, tags: string[], options?: { captureHistory?: boolean }) => void;
  setStatusKey: (documentId: string, statusKey: string, options?: { captureHistory?: boolean }) => void;
  canUndo: (documentId: string) => boolean;
  canRedo: (documentId: string) => boolean;
  undo: (documentId: string) => void;
  redo: (documentId: string) => void;
  clearHistory: (documentId: string) => void;
  setHistoryCapacity: (documentId: string, capacity: number) => void;
}

export type DocumentStoreValue = DocumentStoreState & DocumentStoreActions;
export type DocumentStoreApi = StoreApi<DocumentStoreValue>;

const normalizeSettings = (settings: DocumentSettings): DocumentSettings => ({
  ...settings,
  maxWidth: settings.maxWidth ?? '80ch',
});

const toRecord = <T extends { id: string }>(items: T[]): Record<string, T> => {
  const record: Record<string, T> = {};
  for (const item of items) {
    record[item.id] = item;
  }
  return record;
};

const ensureGroupChildren = (group: GroupBlock, blocksById: Record<string, Block>, blockIndex: Record<string, number>): string[] => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const childId of group.children) {
    if (childId === group.id) continue;
    if (!blocksById[childId]) continue;
    if (seen.has(childId)) continue;
    seen.add(childId);
    ordered.push(childId);
  }
  ordered.sort((a, b) => (blockIndex[a] ?? Number.MAX_SAFE_INTEGER) - (blockIndex[b] ?? Number.MAX_SAFE_INTEGER));
  return ordered;
};

const resequenceBlocks = (blocks: Block[]): Block[] => {
  const sorted = [...blocks].sort((a, b) => (a.sequence !== b.sequence ? a.sequence - b.sequence : a.id.localeCompare(b.id)));
  let previous = Number.NEGATIVE_INFINITY;
  const updatedById = new Map<string, Block>();

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index]!;
    let sequence = current.sequence;
    if (sequence <= previous) {
      sequence = previous + 1;
      updatedById.set(current.id, { ...current, sequence });
      previous = sequence;
    } else {
      previous = sequence;
    }
  }

  return blocks.map((block) => updatedById.get(block.id) ?? block);
};

const sortEdges = (edges: Edge[]): Edge[] =>
  [...edges].sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    if (a.target !== b.target) return a.target.localeCompare(b.target);
    if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
    return a.id.localeCompare(b.id);
  });

const normalizeDocumentModel = (input: DocumentModel): DocumentModel => {
  const clone = cloneDocument(input);
  clone.schemaVersion = 2;
  clone.tags = normalizeTags(clone.tags);
  clone.settings = normalizeSettings(clone.settings);
  clone.blocks = resequenceBlocks(clone.blocks);
  const blockOrder = [...clone.blocks].sort((a, b) =>
    a.sequence !== b.sequence ? a.sequence - b.sequence : a.id.localeCompare(b.id),
  );
  const blockIndex: Record<string, number> = {};
  blockOrder.forEach((block: Block, idx) => {
    blockIndex[block.id] = idx;
  });
  const blocksById = toRecord(clone.blocks);
  clone.blocks = clone.blocks.map((block) => {
    if (block.kind === 'group') {
      const group = block as GroupBlock;
      const children = ensureGroupChildren(group, blocksById, blockIndex);
      if (children !== group.children) {
        return { ...group, children } satisfies GroupBlock;
      }
    }
    return block;
  });

  const allowedNodes = new Set(clone.blocks.map((block) => block.id));
  clone.edges = sortEdges(
    clone.edges.filter((edge) => allowedNodes.has(edge.source) && allowedNodes.has(edge.target)),
  );

  return clone;
};

const computeAdjacency = (
  edges: Edge[],
  blockOrder: string[],
): { adjacency: Record<string, string[]>; reverseAdjacency: Record<string, string[]> } => {
  const adjacency: Record<string, string[]> = {};
  const reverseAdjacency: Record<string, string[]> = {};
  const orderIndex = blockOrder.reduce<Record<string, number>>((acc, id, idx) => {
    acc[id] = idx;
    return acc;
  }, {});

  for (const edge of edges) {
    (adjacency[edge.source] ??= []).push(edge.target);
    (reverseAdjacency[edge.target] ??= []).push(edge.source);
  }

  const sortByOrder = (a: string, b: string) => (orderIndex[a] ?? Number.MAX_SAFE_INTEGER) - (orderIndex[b] ?? Number.MAX_SAFE_INTEGER);

  for (const key of Object.keys(adjacency)) {
    adjacency[key] = Array.from(new Set(adjacency[key])).sort(sortByOrder);
  }
  for (const key of Object.keys(reverseAdjacency)) {
    reverseAdjacency[key] = Array.from(new Set(reverseAdjacency[key])).sort(sortByOrder);
  }

  return { adjacency, reverseAdjacency };
};

const computeTopologicalOrder = (
  blockOrder: string[],
  adjacency: Record<string, string[]>,
): string[] => {
  const indegree = new Map<string, number>();
  const orderIndex = blockOrder.reduce<Record<string, number>>((acc, id, idx) => {
    acc[id] = idx;
    return acc;
  }, {});

  for (const id of blockOrder) {
    indegree.set(id, 0);
  }

  for (const targets of Object.values(adjacency)) {
    for (const target of targets) {
      indegree.set(target, (indegree.get(target) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const id of blockOrder) {
    if ((indegree.get(id) ?? 0) === 0) {
      queue.push(id);
    }
  }

  const result: string[] = [];
  let cursor = 0;
  while (cursor < queue.length) {
    const current = queue[cursor];
    cursor += 1;
    result.push(current);
    for (const target of adjacency[current] ?? []) {
      const remaining = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, remaining);
      if (remaining === 0) {
        const insertIndex = queue.findIndex((id) => (orderIndex[id] ?? 0) > (orderIndex[target] ?? 0));
        if (insertIndex === -1) {
          queue.push(target);
        } else if (!queue.includes(target)) {
          queue.splice(insertIndex, 0, target);
        }
      }
    }
  }

  if (result.length !== blockOrder.length) {
    const seen = new Set(result);
    for (const id of blockOrder) {
      if (!seen.has(id)) {
        result.push(id);
      }
    }
  }

  return result;
};

const buildIndices = (document: DocumentModel): DocumentIndices => {
  const blockOrder = [...document.blocks]
    .sort((a, b) => (a.sequence !== b.sequence ? a.sequence - b.sequence : a.id.localeCompare(b.id)))
    .map((block: Block) => block.id);
  const blockIndex = blockOrder.reduce<Record<string, number>>((acc, id, idx) => {
    acc[id] = idx;
    return acc;
  }, {});
  const blocksById = toRecord(document.blocks);
  const childToParent: Record<string, string> = {};
  const groupChildOrder: Record<string, string[]> = {};

  for (const block of document.blocks) {
    if (block.kind === 'group') {
      const group = block as GroupBlock;
      const children = ensureGroupChildren(group, blocksById, blockIndex);
      groupChildOrder[group.id] = children;
      for (const child of children) {
        childToParent[child] = group.id;
      }
    }
  }

  const rootBlockIds = blockOrder.filter((id) => !(id in childToParent));
  const edges = sortEdges(document.edges);
  const edgesById = toRecord(edges);
  const edgeOrder = edges.map((edge) => edge.id);
  const { adjacency, reverseAdjacency } = computeAdjacency(edges, blockOrder);
  const topologicalOrder = computeTopologicalOrder(blockOrder, adjacency);

  return {
    blockOrder,
    blockIndex,
    rootBlockIds,
    groupChildOrder,
    childToParent,
    blocksById,
    edgesById,
    edgeOrder,
    adjacency,
    reverseAdjacency,
    topologicalOrder,
  };
};

const cloneDocument = (document: DocumentModel): DocumentModel =>
  typeof globalThis.structuredClone === 'function'
    ? globalThis.structuredClone(document)
    : (JSON.parse(JSON.stringify(document)) as DocumentModel);

const pushHistory = (record: DocumentRecord, snapshot: DocumentModel): DocumentHistory => {
  const past = [...record.history.past, snapshot];
  while (past.length > record.history.capacity) {
    past.shift();
  }
  return {
    capacity: record.history.capacity,
    past,
    future: [],
  };
};

const createDocumentRecord = (
  document: DocumentModel,
  options?: { historyCapacity?: number },
): DocumentRecord => {
  const normalized = normalizeDocumentModel(document);
  return {
    model: normalized,
    indices: buildIndices(normalized),
    version: 1,
    history: {
      capacity: options?.historyCapacity ?? DEFAULT_HISTORY_CAPACITY,
      past: [],
      future: [],
    },
  };
};

const getRecordOrThrow = (state: DocumentStoreState, documentId: string): DocumentRecord => {
  const record = state.documents[documentId];
  if (!record) {
    throw new Error(`Document ${documentId} is not loaded in the store.`);
  }
  return record;
};

const documentStoreFactory = createScopedStore<DocumentStoreValue>((set, get) => ({
  activeDocumentId: undefined,
  documents: {},

  loadDocument: (document, options) => {
    const record = createDocumentRecord(document, options);
    set((state) => {
      const documents = { ...state.documents, [record.model.id]: record };
      const activeDocumentId =
        options?.activate ?? state.activeDocumentId == null ? record.model.id : state.activeDocumentId;
      return {
        activeDocumentId,
        documents,
      } satisfies DocumentStoreState;
    });
  },

  unloadDocument: (documentId) => {
    set((state) => {
      if (!state.documents[documentId]) {
        return state;
      }
      const documents = { ...state.documents };
      delete documents[documentId];
      const remainingIds = Object.keys(documents);
      const activeDocumentId = state.activeDocumentId === documentId ? remainingIds[0] : state.activeDocumentId;
      return {
        activeDocumentId,
        documents,
      } satisfies DocumentStoreState;
    });
  },

  setActiveDocument: (documentId) => {
    const { documents } = get();
    if (!documents[documentId]) {
      throw new Error(`Cannot activate unknown document ${documentId}`);
    }
    set((state) => ({ ...state, activeDocumentId: documentId }));
  },

  getDocument: (documentId) => get().documents[documentId]?.model,

  runTransaction: (documentId, fn, options) => {
    const captureHistory = options?.captureHistory ?? true;
    let result: DocumentModel | undefined;
    set((state) => {
      const record = state.documents[documentId];
      if (!record) {
        throw new Error(`Cannot mutate unknown document ${documentId}`);
      }
      const produced = produce(record.model, fn);
      if (produced === record.model) {
        return state;
      }
      const normalized = normalizeDocumentModel(produced);
      result = normalized;
      const history = captureHistory ? pushHistory(record, cloneDocument(record.model)) : { ...record.history };
      return {
        ...state,
        documents: {
          ...state.documents,
          [documentId]: {
            model: normalized,
            indices: buildIndices(normalized),
            version: record.version + 1,
            history: captureHistory
              ? { ...history, future: [] }
              : history,
          },
        },
      } satisfies DocumentStoreState;
    });
    return result;
  },

  insertBlock: (documentId, block, options) => {
    get().runTransaction(
      documentId,
      (draft) => {
        if (draft.blocks.some((existing: Block) => existing.id === block.id)) {
          throw new Error(`Block with id ${block.id} already exists.`);
        }
        const targetIndex = options?.after
          ? draft.blocks.findIndex((item: Block) => item.id === options.after) + 1
          : draft.blocks.length;
        if (targetIndex === 0 && options?.after) {
          throw new Error(`Cannot insert after unknown block ${options.after}.`);
        }
        draft.blocks.splice(targetIndex, 0, block);
        draft.updatedAt = Date.now();
      },
      { captureHistory: options?.captureHistory },
    );
  },

  updateBlock: (documentId, blockId, updater, options) => {
    get().runTransaction(
      documentId,
      (draft) => {
        const target = draft.blocks.find((block) => block.id === blockId);
        if (!target) {
          throw new Error(`Cannot update unknown block ${blockId}.`);
        }
        updater(target as Draft<Block>);
        draft.updatedAt = Date.now();
      },
      { captureHistory: options?.captureHistory },
    );
  },

  removeBlock: (documentId, blockId, options) => {
    get().runTransaction(
      documentId,
      (draft) => {
        draft.blocks = draft.blocks.filter((block: Block) => block.id !== blockId);
        draft.edges = draft.edges.filter((edge: Edge) => edge.source !== blockId && edge.target !== blockId);
        draft.updatedAt = Date.now();
      },
      { captureHistory: options?.captureHistory },
    );
  },

  updateEdges: (documentId, updater, options) => {
    get().runTransaction(
      documentId,
      (draft) => {
        updater(draft.edges as Draft<Edge[]>);
        draft.updatedAt = Date.now();
      },
      { captureHistory: options?.captureHistory },
    );
  },

  updateVariables: (documentId, updater, options) => {
    get().runTransaction(
      documentId,
      (draft) => {
        updater(draft.variables as Draft<VariableDefinition[]>);
        draft.updatedAt = Date.now();
      },
      { captureHistory: options?.captureHistory },
    );
  },

  updateSettings: (documentId, updater, options) => {
    get().runTransaction(
      documentId,
      (draft) => {
        updater(draft.settings as Draft<DocumentSettings>);
        draft.updatedAt = Date.now();
      },
      { captureHistory: options?.captureHistory },
    );
  },

  setTags: (documentId, tags, options) => {
    get().runTransaction(
      documentId,
      (draft) => {
        draft.tags = normalizeTags(tags);
        draft.updatedAt = Date.now();
      },
      { captureHistory: options?.captureHistory },
    );
  },

  setStatusKey: (documentId, statusKey, options) => {
    get().runTransaction(
      documentId,
      (draft) => {
        draft.statusKey = statusKey;
        draft.updatedAt = Date.now();
      },
      { captureHistory: options?.captureHistory },
    );
  },

  canUndo: (documentId) => {
    const record = get().documents[documentId];
    return record ? record.history.past.length > 0 : false;
  },

  canRedo: (documentId) => {
    const record = get().documents[documentId];
    return record ? record.history.future.length > 0 : false;
  },

  undo: (documentId) => {
    set((state) => {
      const record = getRecordOrThrow(state, documentId);
      if (record.history.past.length === 0) {
        return state;
      }
      const previous = record.history.past[record.history.past.length - 1];
      const past = record.history.past.slice(0, -1);
      const future = [cloneDocument(record.model), ...record.history.future];
      const normalized = normalizeDocumentModel(previous);
      return {
        ...state,
        documents: {
          ...state.documents,
          [documentId]: {
            model: normalized,
            indices: buildIndices(normalized),
            version: record.version + 1,
            history: {
              capacity: record.history.capacity,
              past,
              future,
            },
          },
        },
      } satisfies DocumentStoreState;
    });
  },

  redo: (documentId) => {
    set((state) => {
      const record = getRecordOrThrow(state, documentId);
      if (record.history.future.length === 0) {
        return state;
      }
      const [next, ...rest] = record.history.future;
      const past = [...record.history.past, cloneDocument(record.model)];
      const normalized = normalizeDocumentModel(next);
      return {
        ...state,
        documents: {
          ...state.documents,
          [documentId]: {
            model: normalized,
            indices: buildIndices(normalized),
            version: record.version + 1,
            history: {
              capacity: record.history.capacity,
              past,
              future: rest,
            },
          },
        },
      } satisfies DocumentStoreState;
    });
  },

  clearHistory: (documentId) => {
    set((state) => {
      const record = state.documents[documentId];
      if (!record) {
        return state;
      }
      return {
        ...state,
        documents: {
          ...state.documents,
          [documentId]: {
            ...record,
            history: {
              capacity: record.history.capacity,
              past: [],
              future: [],
            },
          },
        },
      } satisfies DocumentStoreState;
    });
  },

  setHistoryCapacity: (documentId, capacity) => {
    if (capacity <= 0) {
      throw new Error('History capacity must be greater than zero.');
    }
    set((state) => {
      const record = state.documents[documentId];
      if (!record) {
        return state;
      }
      const past = record.history.past.slice(-capacity);
      const future = record.history.future.slice(0, capacity);
      return {
        ...state,
        documents: {
          ...state.documents,
          [documentId]: {
            ...record,
            history: {
              capacity,
              past,
              future,
            },
          },
        },
      } satisfies DocumentStoreState;
    });
  },
}));

export const createDocumentStore = documentStoreFactory.create;
export const DocumentStoreProvider = documentStoreFactory.Provider;
export const useDocumentStore = documentStoreFactory.useStore;
export const useDocumentStoreApi = documentStoreFactory.useStoreApi;
