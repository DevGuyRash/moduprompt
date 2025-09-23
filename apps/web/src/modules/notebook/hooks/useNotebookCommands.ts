import { useCallback, useMemo } from 'react';
import { useDocumentStore, useDocumentStoreApi } from '../../../state/document-model';
import { selectNotebookProjection } from '../../../state/selectors/documentSelectors';
import type { Block } from '@moduprompt/types';
import type { NotebookCommand, NotebookFormatter } from '../types';
import { applyFormatter } from '../applyFormatter';
import { generateId } from '../id';

export interface UseNotebookCommandsOptions {
  documentId: string;
  formatters?: NotebookFormatter[];
}

export const useNotebookCommands = ({
  documentId,
  formatters = [],
}: UseNotebookCommandsOptions): NotebookCommand[] => {
  const storeApi = useDocumentStoreApi();
  const projection = useDocumentStore(
    useCallback((state) => selectNotebookProjection(state, documentId), [documentId]),
  );

  return useMemo(() => {
    if (!projection) {
      return [];
    }

    const commands: NotebookCommand[] = [];

    const toggleGroup = (blockId: string) => () => {
      const state = storeApi.getState();
      state.updateBlock(documentId, blockId, (draft) => {
        if (draft.kind === 'group') {
          draft.collapsed = !draft.collapsed;
          draft.updatedAt = Date.now();
        }
      });
    };

    for (const node of projection.blocks) {
      if (node.kind === 'group') {
        commands.push({
          id: `group.toggle.${node.id}`,
          label: node.block.label ? `Toggle group ${node.block.label}` : 'Toggle group',
          category: 'Grouping',
          run: toggleGroup(node.id),
        });
      }
    }

    for (const formatter of formatters) {
      commands.push({
        id: `formatter.${formatter.id}`,
        label: `Apply ${formatter.label}`,
        category: 'Formatting',
        run: () => {
          const state = storeApi.getState();
          const activeId = state.activeDocumentId ?? documentId;
          const document = state.getDocument(activeId);
          const firstBlock = document?.blocks.find((block: Block) => formatter.appliesTo(block));
          if (firstBlock) {
            applyFormatter({
              documentId: activeId,
              blockId: firstBlock.id,
              formatterId: formatter.id,
              formatters,
              store: storeApi,
            });
          }
        },
      });
    }

    commands.push({
      id: 'notebook.add-markdown',
      label: 'Add markdown block',
      category: 'Blocks',
      run: () => {
        const state = storeApi.getState();
        const timestamp = Date.now();
        const id = generateId("block");
        state.insertBlock(documentId, {
          id,
          kind: 'markdown',
          sequence: timestamp,
          body: '',
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      },
    });

    return commands;
  }, [documentId, formatters, projection, storeApi]);
};
