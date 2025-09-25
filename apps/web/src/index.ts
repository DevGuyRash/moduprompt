export { createScopedStore, type ScopedStore } from './state/baseStore.js';
export type {
  DocumentHistory,
  DocumentIndices,
  DocumentRecord,
  DocumentStoreActions,
  DocumentStoreState,
  DocumentStoreValue,
  DocumentStoreApi,
} from './state/document-model.js';
export {
  createDocumentStore,
  DocumentStoreProvider,
  useDocumentStore,
  useDocumentStoreApi,
} from './state/document-model.js';
export type {
  NotebookBlockNode,
  NotebookProjection,
  NodeProjection,
  NodeProjectionEdge,
  NodeProjectionNode,
} from './state/selectors/documentSelectors.js';
export {
  selectNotebookProjection,
  selectNodeProjection,
  selectDocumentModel,
  selectBlockById,
  selectEdgeById,
} from './state/selectors/documentSelectors.js';
export { useUndoRedo, type UndoRedoControls } from './state/useUndoRedo.js';

export * from './modules/notebook/index.js';
export * from './modules/node-graph/index.js';
export * from './modules/snippets/index.js';
export * from './modules/governance/index.js';
export * from './modules/compiler-preview/index.js';
