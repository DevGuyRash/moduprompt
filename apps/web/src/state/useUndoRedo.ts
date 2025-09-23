import { useCallback } from 'react';
import { useDocumentStore, useDocumentStoreApi } from './document-model';

export interface UndoRedoControls {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const useUndoRedo = (documentId: string): UndoRedoControls => {
  const storeApi = useDocumentStoreApi();
  const canUndo = useDocumentStore(
    useCallback((state) => state.canUndo(documentId), [documentId]),
  );
  const canRedo = useDocumentStore(
    useCallback((state) => state.canRedo(documentId), [documentId]),
  );

  const undo = useCallback(() => {
    const api = storeApi.getState();
    if (api.canUndo(documentId)) {
      api.undo(documentId);
    }
  }, [documentId, storeApi]);

  const redo = useCallback(() => {
    const api = storeApi.getState();
    if (api.canRedo(documentId)) {
      api.redo(documentId);
    }
  }, [documentId, storeApi]);

  const clear = useCallback(() => {
    const api = storeApi.getState();
    api.clearHistory(documentId);
  }, [documentId, storeApi]);

  return {
    undo,
    redo,
    clear,
    canUndo,
    canRedo,
  };
};
