import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SnippetLibraryPanelProps } from './types.js';
import { useSnippetLibrary } from './hooks/useSnippetLibrary.js';
import { SnippetTree } from './components/SnippetTree.js';
import { SnippetTimeline } from './components/SnippetTimeline.js';
import { DiffViewer } from './components/DiffViewer.js';

const panelClasses =
  'grid w-full grid-cols-1 gap-6 rounded-lg border border-surface bg-surface-subtle p-4 text-foreground shadow-md md:grid-cols-[320px_1fr]';
const inputClasses =
  'w-full rounded-md border border-surface-strong bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const sectionHeaderClasses = 'text-sm font-semibold text-foreground';
const metaLabelClasses = 'text-xs font-semibold uppercase tracking-wide text-foreground-muted';
const metaValueClasses = 'text-sm text-foreground';
const buttonPrimaryClasses =
  'inline-flex items-center justify-center rounded-md border border-brand bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const buttonSecondaryClasses =
  'inline-flex items-center justify-center rounded-md border border-surface-strong bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

const joinClasses = (...classes: Array<string | false | null | undefined>): string => classes.filter(Boolean).join(' ');

const formatPath = (path?: string): string => {
  if (!path) return '—';
  return path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(' / ');
};

const formatTags = (frontmatter: Record<string, unknown> | undefined): string[] => {
  if (!frontmatter) return [];
  const tags = (frontmatter as { tags?: string[] }).tags;
  if (!Array.isArray(tags)) return [];
  return tags.map((tag) => tag.trim()).filter(Boolean);
};

const copyText = async (value: string) => {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (error) {
    // fallback below
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  } catch (error) {
    return false;
  }
};

export const SnippetLibraryPanel = ({
  className,
  store,
  initialSnippetId,
  onSnippetInsert,
  onSelectionChange,
}: SnippetLibraryPanelProps) => {
  const {
    state,
    smartFolders,
    folderTree,
    timeline,
    timelineLoading,
    activeSnippet,
    activeVersion,
    actions,
  } = useSnippetLibrary({ initialSnippetId, store, onSelectionChange });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const tags = useMemo(() => formatTags(activeVersion?.frontmatter ?? activeSnippet?.frontmatter), [
    activeSnippet?.frontmatter,
    activeVersion?.frontmatter,
  ]);

  const handleInsert = useCallback(() => {
    if (!activeSnippet) return;
    onSnippetInsert?.({
      id: activeSnippet.id,
      title: activeSnippet.title,
      revision: activeSnippet.headRev,
      body: activeVersion?.body ?? activeSnippet.body,
      frontmatter: activeVersion?.frontmatter ?? activeSnippet.frontmatter,
    });
    setStatusMessage('Snippet ready for insertion. Drag or drop into the editor.');
  }, [activeSnippet, activeVersion, onSnippetInsert]);

  const handleCopyBody = useCallback(async () => {
    if (!activeVersion) return;
    const ok = await copyText(activeVersion.body);
    setStatusMessage(ok ? 'Snippet body copied.' : 'Unable to copy snippet body.');
  }, [activeVersion]);

  const handleCopyFrontmatter = useCallback(async () => {
    if (!activeVersion) return;
    const serialized = JSON.stringify(activeVersion.frontmatter ?? {}, null, 2);
    const ok = await copyText(serialized);
    setStatusMessage(ok ? 'Frontmatter copied.' : 'Unable to copy frontmatter.');
  }, [activeVersion]);

  const handleRestore = useCallback(async () => {
    if (!activeVersion) return;
    try {
      await actions.restoreRevision(activeVersion.rev, `Restore to v${activeVersion.rev}`);
      setStatusMessage(`Restored new head from v${activeVersion.rev}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to restore revision.');
    }
  }, [actions, activeVersion]);

  const handlePinToggle = useCallback(async () => {
    if (!activeVersion) return;
    const next = state.pinnedRevision === activeVersion.rev ? undefined : activeVersion.rev;
    try {
      await actions.pinRevision(next);
      setStatusMessage(
        typeof next === 'number' ? `Pinned revision v${next}.` : 'Cleared pinned revision.',
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Unable to update pinned revision.');
    }
  }, [actions, activeVersion, state.pinnedRevision]);

  const diffPrevious = useMemo(() => {
    if (!activeVersion) return undefined;
    const index = timeline.findIndex((entry) => entry.version.rev === activeVersion.rev);
    return index >= 0 ? timeline[index]?.previous : undefined;
  }, [activeVersion, timeline]);

  const [offlineStatus, setOfflineStatus] = useState<string>(() => {
    if (typeof navigator === 'undefined') {
      return 'Offline-capable store';
    }
    return navigator.onLine ? 'Online · persisting to IndexedDB' : 'Offline · changes queue locally';
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const updateStatus = () => {
      setOfflineStatus(
        navigator.onLine ? 'Online · persisting to IndexedDB' : 'Offline · changes queue locally',
      );
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  return (
    <div className={joinClasses(panelClasses, className)}>
      <aside className="flex flex-col gap-4" aria-label="Snippet filters and list">
        <div className="flex flex-col gap-2">
          <label htmlFor="snippet-search" className={metaLabelClasses}>
            Search
          </label>
          <input
            id="snippet-search"
            type="search"
            className={inputClasses}
            placeholder="Search by title, path, or tag"
            value={state.query}
            onChange={(event) => actions.setQuery(event.target.value)}
            autoComplete="off"
          />
        </div>
        <SnippetTree
          treeItems={folderTree}
          smartFolders={smartFolders}
          duplicateIds={state.duplicateIds}
          selectedSnippetId={state.selectedSnippetId}
          activeSmartFolderId={state.smartFolderId}
          onSelectSnippet={actions.selectSnippet}
          onSelectSmartFolder={actions.setSmartFolderId}
        />
      </aside>

      <section className="flex flex-col gap-4" aria-label="Snippet details">
        <header className="flex flex-col gap-2 border-b border-surface-strong pb-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className={sectionHeaderClasses}>{activeSnippet?.title ?? 'Select a snippet'}</h2>
            <span className="text-xs text-foreground-muted">{offlineStatus}</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <div className={metaLabelClasses}>Path</div>
              <div className={metaValueClasses}>{formatPath(activeSnippet?.path)}</div>
            </div>
            <div>
              <div className={metaLabelClasses}>Head revision</div>
              <div className={metaValueClasses}>{activeSnippet?.headRev ?? 0}</div>
            </div>
            <div>
              <div className={metaLabelClasses}>Pinned</div>
              <div className={metaValueClasses}>
                {typeof state.pinnedRevision === 'number' ? `v${state.pinnedRevision}` : '—'}
              </div>
            </div>
            <div>
              <div className={metaLabelClasses}>Tags</div>
              <div className={metaValueClasses}>
                {tags.length ? (
                  <span className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-surface-strong px-2 py-0.5 text-xs"
                      >
                        #{tag}
                      </span>
                    ))}
                  </span>
                ) : (
                  '—'
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={buttonPrimaryClasses} disabled={!activeSnippet} onClick={handleInsert}>
              Insert snippet
            </button>
            <button type="button" className={buttonSecondaryClasses} disabled={!activeVersion} onClick={handleCopyBody}>
              Copy body
            </button>
            <button
              type="button"
              className={buttonSecondaryClasses}
              disabled={!activeVersion}
              onClick={handleCopyFrontmatter}
            >
              Copy frontmatter
            </button>
            <button
              type="button"
              className={buttonSecondaryClasses}
              disabled={!activeVersion}
              onClick={handleRestore}
            >
              Restore revision
            </button>
            <button
              type="button"
              className={buttonSecondaryClasses}
              disabled={!activeVersion}
              onClick={handlePinToggle}
            >
              {state.pinnedRevision === activeVersion?.rev ? 'Unpin revision' : 'Pin revision'}
            </button>
          </div>
          {statusMessage ? (
            <div className="rounded-md border border-surface-strong bg-surface px-3 py-2 text-xs text-foreground-muted">
              {statusMessage}
            </div>
          ) : null}
        </header>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
          <div className="flex flex-col gap-3">
            <h3 className={sectionHeaderClasses}>Version history</h3>
            <SnippetTimeline
              entries={timeline}
              loading={timelineLoading}
              selectedRevision={state.selectedRevision}
              onSelect={actions.selectRevision}
            />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className={sectionHeaderClasses}>Revision diff</h3>
            <DiffViewer current={activeVersion} previous={diffPrevious} />
          </div>
        </div>
      </section>
    </div>
  );
};
