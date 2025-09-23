import type { Draft } from 'immer';
import type { Block } from '@moduprompt/types';
import type { DocumentStoreApi } from '../../state/document-model';
import type { NotebookFormatter } from './types';

export interface ApplyFormatterOptions {
  documentId: string;
  blockId: string;
  formatterId: string;
  formatters?: NotebookFormatter[];
  store: DocumentStoreApi;
}

export const applyFormatter = ({
  documentId,
  blockId,
  formatterId,
  formatters = [],
  store,
}: ApplyFormatterOptions): boolean => {
  const formatter = formatters.find((item) => item.id === formatterId);
  if (!formatter) {
    return false;
  }

  const state = store.getState();
  const block = state
    .getDocument(documentId)?.blocks.find((candidate: Block) => candidate.id === blockId);
  if (!block || !formatter.appliesTo(block)) {
    return false;
  }

  state.updateBlock(
    documentId,
    blockId,
    (draft: Draft<Block>) => {
      formatter.apply(draft);
    },
    { captureHistory: true },
  );

  return true;
};
