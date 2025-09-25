import { Fragment, useCallback, useMemo, useState } from 'react';
import type { Block, CommentBlock, GroupBlock, MarkdownBlock, SnippetBlock } from '@moduprompt/types';
import { useDocumentStore, useDocumentStoreApi } from '../../state/document-model.js';
import { selectNotebookProjection, type NotebookBlockNode } from '../../state/selectors/documentSelectors.js';
import type {
  NotebookFormatter,
  NotebookSnippetOption,
  NotebookViewProps,
} from './types.js';
import { applyFormatter } from './applyFormatter.js';
import { generateId } from './id.js';

const containerClasses =
  'bg-surface-subtle text-foreground flex flex-col gap-4 rounded-lg border border-surface shadow-sm';
const cellClasses =
  'rounded-md border border-surface-strong bg-surface px-4 py-3 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30 transition';
const toolbarClasses = 'flex flex-wrap items-center gap-2 text-sm';
const buttonBaseClasses =
  'inline-flex items-center gap-1 rounded-md border border-surface-strong bg-surface-strong px-3 py-1.5 text-left text-foreground transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand hover:bg-surface-emphasis';
const ghostButtonClasses =
  'inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-foreground-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const textareaClasses =
  'w-full resize-vertical border-0 bg-transparent text-base leading-relaxed text-foreground focus:outline-none focus:ring-0';
const snippetCardClasses =
  'flex flex-col gap-2 rounded-md border border-dashed border-brand/40 bg-brand/5 px-4 py-3 text-sm';
const groupHeaderClasses =
  'flex items-center justify-between rounded-md border border-surface px-3 py-2 bg-surface-strong';

interface NotebookBlockProps {
  documentId: string;
  node: NotebookBlockNode;
  depth: number;
  formatters?: NotebookFormatter[];
  availableSnippets?: NotebookSnippetOption[];
  onFormatterApplied?: (formatterId: string, blockId: string) => void;
  onSnippetInserted?: (option: NotebookSnippetOption) => void;
  onFocus: (blockId: string) => void;
}

const NotebookBlock = ({
  documentId,
  node,
  depth,
  formatters,
  availableSnippets,
  onFormatterApplied,
  onSnippetInserted,
  onFocus,
}: NotebookBlockProps) => {
  const storeApi = useDocumentStoreApi();
  const [showSnippetDialog, setShowSnippetDialog] = useState(false);

  const handleMarkdownChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = event.target.value;
      const state = storeApi.getState();
      if (!documentId) return;
      state.updateBlock(documentId, node.id, (draft) => {
        if (draft.kind === 'markdown') {
          (draft as MarkdownBlock).body = value;
          draft.updatedAt = Date.now();
        }
      });
    },
    [documentId, node.id, storeApi],
  );

  const handleCommentToggle = useCallback(() => {
    const state = storeApi.getState();
    if (!documentId) return;
    state.updateBlock(documentId, node.id, (draft) => {
      if (draft.kind === 'comment') {
        (draft as CommentBlock).resolved = !(draft as CommentBlock).resolved;
        draft.updatedAt = Date.now();
      }
    });
  }, [documentId, node.id, storeApi]);

  const handleFormatter = useCallback(
    (formatterId: string) => {
      if (!documentId) return;
      const applied = applyFormatter({
        documentId,
        blockId: node.id,
        formatterId,
        formatters,
        store: storeApi,
      });
      if (applied && onFormatterApplied) {
        onFormatterApplied(formatterId, node.id);
      }
    },
    [documentId, node.id, formatters, onFormatterApplied, storeApi],
  );

  const insertMarkdownBelow = useCallback(() => {
    const state = storeApi.getState();
    if (!documentId) return;
    const timestamp = Date.now();
    const id = generateId('block');
    state.insertBlock(
      documentId,
      {
        id,
        kind: 'markdown',
        sequence: timestamp,
        body: '',
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      { after: node.id },
    );
  }, [documentId, node.id, storeApi]);

  const insertSnippet = useCallback(
    (option: NotebookSnippetOption) => {
      const state = storeApi.getState();
      if (!documentId) return;
      const timestamp = Date.now();
      const id = generateId('snippet');
      state.insertBlock(
        documentId,
        {
          id,
          kind: 'snippet',
          snippetId: option.id,
          revision: option.revision,
          mode: 'transclude',
          sequence: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
        { after: node.id },
      );
      if (onSnippetInserted) {
        onSnippetInserted(option);
      }
    },
    [documentId, node.id, onSnippetInserted, storeApi],
  );

  const toggleGroup = useCallback(() => {
    const state = storeApi.getState();
    if (!documentId) return;
    state.updateBlock(documentId, node.id, (draft) => {
      if (draft.kind === 'group') {
        (draft as GroupBlock).collapsed = !(draft as GroupBlock).collapsed;
        draft.updatedAt = Date.now();
      }
    });
  }, [documentId, node.id, storeApi]);

  const indentationStyle = useMemo(() => ({
    marginLeft: depth * 24,
  }), [depth]);

  return (
    <div
      role="listitem"
      tabIndex={0}
      aria-label={`Notebook block ${node.kind}`}
      className={cellClasses}
      style={indentationStyle}
      onFocus={() => onFocus(node.id)}
    >
      {node.kind === 'markdown' && (
        <Fragment>
          <div className={toolbarClasses}>
            {formatters?.map((formatter) => (
              <button
                key={formatter.id}
                type="button"
                className={buttonBaseClasses}
                onClick={() => handleFormatter(formatter.id)}
              >
                {formatter.label}
              </button>
            ))}
            <button type="button" className={ghostButtonClasses} onClick={insertMarkdownBelow}>
              Add markdown below
            </button>
            {availableSnippets?.length ? (
              <button
                type="button"
                className={ghostButtonClasses}
                onClick={() => setShowSnippetDialog(true)}
              >
                Insert snippet
              </button>
            ) : null}
          </div>
          <label className="sr-only" htmlFor={`markdown-${node.id}`}>
            Markdown content
          </label>
          <textarea
            id={`markdown-${node.id}`}
            className={textareaClasses}
            value={(node.block as MarkdownBlock).body}
            onChange={handleMarkdownChange}
            rows={4}
            aria-multiline="true"
          />
        </Fragment>
      )}

      {node.kind === 'comment' && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground">{(node.block as CommentBlock).body}</p>
          <button type="button" className={buttonBaseClasses} onClick={handleCommentToggle}>
            {(node.block as CommentBlock).resolved ? 'Re-open' : 'Resolve'} comment
          </button>
        </div>
      )}

      {node.kind === 'snippet' && (
        <div className={snippetCardClasses}>
          <div>
            <p className="font-medium">Snippet {(node.block as SnippetBlock).snippetId}</p>
            {((node.block as SnippetBlock).revision != null) && (
              <p className="text-xs text-foreground-muted">Revision {(node.block as SnippetBlock).revision}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={ghostButtonClasses} onClick={insertMarkdownBelow}>
              Add markdown below
            </button>
            {availableSnippets?.length ? (
              <button
                type="button"
                className={ghostButtonClasses}
                onClick={() => setShowSnippetDialog(true)}
              >
                Replace snippet
              </button>
            ) : null}
          </div>
        </div>
      )}

      {node.kind === 'group' && (
        <div className="flex flex-col gap-3">
          <div className={groupHeaderClasses}>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{node.block.label ?? 'Group'}</span>
              <span className="text-xs text-foreground-muted">Contains {node.children?.length ?? 0} blocks</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={buttonBaseClasses}
                aria-expanded={!(node.block as GroupBlock).collapsed}
                onClick={toggleGroup}
              >
                {(node.block as GroupBlock).collapsed ? 'Expand' : 'Collapse'}
              </button>
              <button type="button" className={ghostButtonClasses} onClick={insertMarkdownBelow}>
                Add block below
              </button>
            </div>
          </div>
          {!(node.block as GroupBlock).collapsed && node.children?.length ? (
            <div role="group" aria-label="Group contents" className="flex flex-col gap-3">
              {node.children.map((child) => (
                <NotebookBlock
                  key={child.id}
                  documentId={documentId}
                  node={child}
                  depth={depth + 1}
                  formatters={formatters}
                  availableSnippets={availableSnippets}
                  onFormatterApplied={onFormatterApplied}
                  onSnippetInserted={onSnippetInserted}
                  onFocus={onFocus}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {showSnippetDialog && availableSnippets?.length ? (
        <SnippetDialog
          options={availableSnippets}
          onClose={() => setShowSnippetDialog(false)}
          onSelect={(option) => {
            insertSnippet(option);
            setShowSnippetDialog(false);
          }}
        />
      ) : null}
    </div>
  );
};

interface SnippetDialogProps {
  options: NotebookSnippetOption[];
  onSelect: (option: NotebookSnippetOption) => void;
  onClose: () => void;
}

const SnippetDialog = ({ options, onSelect, onClose }: SnippetDialogProps) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Insert snippet"
      className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop/40 p-4"
    >
      <div className="max-h-[70vh] w-full max-w-md overflow-y-auto rounded-lg bg-surface px-4 py-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Insert snippet</h2>
          <button type="button" className={ghostButtonClasses} onClick={onClose}>
            Close
          </button>
        </div>
        <ul role="listbox" className="flex flex-col gap-2">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                role="option"
                className={`${buttonBaseClasses} w-full justify-start`}
                onClick={() => onSelect(option)}
              >
                <span className="font-medium">{option.title}</span>
                {option.description ? (
                  <span className="text-xs text-foreground-muted">{option.description}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const NotebookContent = ({
  documentId,
  className,
  formatters,
  availableSnippets,
  onSnippetInserted,
  onFormatterApplied,
}: NotebookViewProps) => {
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const projection = useDocumentStore(
    useCallback((state) => selectNotebookProjection(state, documentId), [documentId]),
  );

  const storeApi = useDocumentStoreApi();
  const handleFormatter = useCallback(
    (formatterId: string) => {
      const blockId = activeBlockId ?? projection?.blocks[0]?.id;
      if (!blockId) return;
      const applied = applyFormatter({
        documentId,
        blockId,
        formatterId,
        formatters,
        store: storeApi,
      });
      if (applied && onFormatterApplied) {
        onFormatterApplied(formatterId, blockId);
      }
    },
    [activeBlockId, documentId, formatters, onFormatterApplied, projection?.blocks, storeApi],
  );

  const addMarkdownAtEnd = useCallback(() => {
    const state = storeApi.getState();
    const timestamp = Date.now();
    const id = generateId('block');
    state.insertBlock(documentId, {
      id,
      kind: 'markdown',
      sequence: timestamp,
      body: '',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }, [documentId, storeApi]);

  if (!projection) {
    return (
      <div className={`${containerClasses} ${className ?? ''}`}>
        <p className="px-4 py-6 text-sm text-foreground-muted">No document loaded.</p>
      </div>
    );
  }

  return (
    <div className={`${containerClasses} ${className ?? ''}`} role="list" aria-label="Notebook blocks">
      <div className={`${toolbarClasses} px-4 pt-4`}>
        {formatters?.map((formatter) => (
          <button
            key={formatter.id}
            type="button"
            className={buttonBaseClasses}
            onClick={() => handleFormatter(formatter.id)}
          >
            {formatter.label}
          </button>
        ))}
        <button type="button" className={ghostButtonClasses} onClick={addMarkdownAtEnd}>
          Add markdown block
        </button>
      </div>

      {projection.blocks.length === 0 ? (
        <div className="px-4 pb-4 text-sm text-foreground-muted">
          This document is empty. Use “Add markdown block” to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {projection.blocks.map((node) => (
            <NotebookBlock
              key={node.id}
              documentId={documentId}
              node={node}
              depth={0}
              formatters={formatters}
              availableSnippets={availableSnippets}
              onSnippetInserted={onSnippetInserted}
              onFormatterApplied={onFormatterApplied}
              onFocus={setActiveBlockId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const NotebookView = (props: NotebookViewProps): JSX.Element => {
  return <NotebookContent {...props} />;
};
