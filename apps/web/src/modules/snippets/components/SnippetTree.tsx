import { memo } from 'react';
import type { Snippet } from '@moduprompt/types';
import type { SmartFolderConfig } from '../utils/constants';
import { SNIPPET_DRAG_MIME } from '../utils/constants';
import type { SnippetTreeItem } from '../types';

export interface SnippetTreeProps {
  treeItems: SnippetTreeItem[];
  smartFolders: Array<SnippetTreeItem & { config: SmartFolderConfig }>;
  duplicateIds: Set<string>;
  selectedSnippetId?: string;
  activeSmartFolderId?: string;
  onSelectSnippet: (snippetId: string) => void;
  onSelectSmartFolder: (smartFolderId?: string) => void;
  onSnippetDragStart?: (snippet: Snippet) => void;
}

const badgeClasses =
  'inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-danger';

const treeItemClasses =
  'flex w-full items-center justify-between gap-2 rounded-md px-3 py-1.5 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

export const SnippetTree = memo(
  ({
    treeItems,
    smartFolders,
    duplicateIds,
    selectedSnippetId,
    activeSmartFolderId,
    onSelectSnippet,
    onSelectSmartFolder,
    onSnippetDragStart,
  }: SnippetTreeProps) => {
    return (
      <div className="flex flex-col gap-4" data-testid="snippet-tree">
        <section aria-label="Smart folders" className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Smart folders</div>
          <div className="flex flex-col gap-1">
            {smartFolders.length ? (
              smartFolders.map((folder) => {
                const isActive = activeSmartFolderId === folder.config.id;
                return (
                  <button
                    key={folder.id}
                    type="button"
                    className={`${treeItemClasses} ${
                      isActive ? 'bg-brand/10 text-brand-strong shadow-inner' : 'bg-surface hover:bg-surface-strong'
                    }`}
                    onClick={() => onSelectSmartFolder(isActive ? undefined : folder.config.id)}
                    aria-pressed={isActive}
                  >
                    <span className="flex flex-col text-left">
                      <span className="font-medium">{folder.name}</span>
                      <span className="text-xs text-foreground-muted">{folder.count} snippets</span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-foreground-muted">No smart folders available.</p>
            )}
          </div>
        </section>

        <section aria-label="Snippet folders" className="flex flex-col gap-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">Library</div>
          {treeItems.length ? (
            <ul className="flex flex-col gap-1" role="tree">
              {treeItems.map((item) => {
                if (item.type === 'folder') {
                  return (
                    <li
                      key={item.id}
                      role="treeitem"
                      aria-level={item.depth + 1}
                      className="text-xs font-medium uppercase tracking-wide text-foreground-muted"
                      style={{ paddingLeft: item.depth * 16 }}
                    >
                      {item.name}
                    </li>
                  );
                }
                if (!item.snippet) return null;
                const snippet = item.snippet;
                const isSelected = selectedSnippetId === snippet.id;
                const isDuplicate = duplicateIds.has(snippet.id);
                return (
                  <li key={item.id} role="treeitem" aria-level={item.depth + 1} aria-selected={isSelected}>
                    <button
                      type="button"
                      className={`${treeItemClasses} ${
                        isSelected ? 'bg-brand/10 text-brand-strong shadow-inner' : 'bg-surface hover:bg-surface-strong'
                      }`}
                      style={{ paddingLeft: item.depth * 16 }}
                      onClick={() => onSelectSnippet(snippet.id)}
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'copy';
                        event.dataTransfer.setData(
                          SNIPPET_DRAG_MIME,
                          JSON.stringify({ id: snippet.id, title: snippet.title, revision: snippet.headRev }),
                        );
                        event.dataTransfer.setData('text/plain', snippet.title);
                        onSnippetDragStart?.(snippet);
                      }}
                    >
                      <span className="truncate font-medium">{snippet.title}</span>
                      <span className="flex items-center gap-2 text-xs text-foreground-muted">
                        {snippet.headRev ? `v${snippet.headRev}` : 'v0'}
                        {isDuplicate ? <span className={badgeClasses}>Duplicate</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-foreground-muted">No snippets match the current filters.</p>
          )}
        </section>
      </div>
    );
  },
);

SnippetTree.displayName = 'SnippetTree';
