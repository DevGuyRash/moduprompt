export { createScopedStore, type ScopedStore } from './state/baseStore';
export type {
  DocumentHistory,
  DocumentIndices,
  DocumentRecord,
  DocumentStoreActions,
  DocumentStoreState,
  DocumentStoreValue,
  DocumentStoreApi,
} from './state/document-model';
export {
  createDocumentStore,
  DocumentStoreProvider,
  useDocumentStore,
  useDocumentStoreApi,
} from './state/document-model';
export type {
  NotebookBlockNode,
  NotebookProjection,
  NodeProjection,
  NodeProjectionEdge,
  NodeProjectionNode,
} from './state/selectors/documentSelectors';
export {
  selectNotebookProjection,
  selectNodeProjection,
  selectDocumentModel,
  selectBlockById,
  selectEdgeById,
} from './state/selectors/documentSelectors';
export { useUndoRedo, type UndoRedoControls } from './state/useUndoRedo';

export * from './modules/notebook';
