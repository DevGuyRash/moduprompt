import { useCallback, useMemo, useState, type KeyboardEvent } from 'react';
import { nanoid } from 'nanoid';
import type { WorkspaceStatus } from '@moduprompt/types';
import {
  bufferAuditEntry,
  createStatusChangeAuditEntry,
  createTagChangeAuditEntry,
  normalizeTags,
} from '@moduprompt/snippet-store';
import { useDocumentStore, useDocumentStoreApi } from '../../state/document-model';
import { selectDocumentModel } from '../../state/selectors/documentSelectors';
import { GovernanceProvider, useGovernanceStore } from './provider';
import { AuditLogPanel } from './components/AuditLogPanel';
import { useWorkspaceGovernance } from './hooks/useWorkspaceGovernance';
import { getAccessiblePalette } from './utils/color';
import type { GovernancePanelProps } from './types';

const containerClasses =
  'bg-surface-subtle text-foreground flex w-full flex-col gap-6 rounded-lg border border-surface px-4 py-5 shadow-sm';
const sectionHeaderClasses = 'text-sm font-semibold text-foreground';
const helperTextClasses = 'text-xs text-foreground-muted';
const tagInputClasses =
  'w-full rounded-md border border-surface-strong bg-surface px-3 py-2 text-sm shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60';
const chipClasses =
  'inline-flex items-center gap-2 rounded-full border border-surface-strong bg-surface px-3 py-1 text-xs font-medium';
const removeButtonClasses =
  'inline-flex h-5 w-5 items-center justify-center rounded-full border border-surface-strong bg-surface hover:bg-surface-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';
const radioItemClasses =
  'flex items-center justify-between gap-2 rounded-md border border-surface-strong bg-surface px-3 py-2 text-sm focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/40';
const adminPanelClasses =
  'rounded-md border border-surface-strong bg-surface px-3 py-3 text-sm shadow-sm';
const buttonPrimaryClasses =
  'inline-flex items-center justify-center rounded-md border border-brand bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60';
const buttonSecondaryClasses =
  'inline-flex items-center justify-center rounded-md border border-surface-strong bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60';
const badgeWarningClasses =
  'inline-flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning';
const badgeInfoClasses =
  'inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand/10 px-3 py-2 text-xs text-brand-strong';
const tableHeaderClasses = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_70px] gap-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted md:grid-cols-[180px_1fr_140px_90px_70px]';
const tableRowClasses =
  'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_70px] items-center gap-3 py-2 md:grid-cols-[180px_1fr_140px_90px_70px]';

const slugify = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
};

const ensureKeyUnique = (key: string, statuses: WorkspaceStatus[], skipIndex?: number): string => {
  const base = key || 'status';
  let candidate = base;
  let suffix = 1;
  const occupied = new Set(
    statuses
      .map((status, index) => ({ status, index }))
      .filter(({ index }) => index !== skipIndex)
      .map(({ status }) => status.key),
  );
  while (occupied.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
};

const getStatusByKey = (statuses: WorkspaceStatus[], key: string | undefined): WorkspaceStatus | undefined =>
  statuses.find((status) => status.key === key);

const StatusIndicator = ({ color, name }: { color: string; name: string }) => {
  const palette = getAccessiblePalette(color);
  const contrastMessage = `Status ${name} color contrast ratio ${palette.contrastRatio.toFixed(2)}:1 using ${palette.reference} text, ${
    palette.accessible ? 'meets' : 'below'
  } WCAG AA`;

  return (
    <span className="inline-flex items-center gap-2 text-xs text-foreground">
      <span
        aria-hidden
        className="h-3 w-3 rounded-full border"
        style={{
          backgroundColor: palette.background,
          borderColor: palette.borderColor,
        }}
      />
      <span
        aria-hidden
        className="inline-flex items-center rounded-full px-2 py-1 text-[11px] font-semibold"
        style={{
          backgroundColor: palette.background,
          color: palette.textColorCss,
          border: `1px solid ${palette.borderColor}`,
        }}
      >
        {name}
      </span>
      <span className="sr-only">{contrastMessage}</span>
    </span>
  );
};

const GovernancePanelInner = ({
  documentId,
  className,
  canEditTags = true,
  canEditStatus = true,
  canManageStatuses = false,
  onTagsChange,
  onStatusChange,
}: Omit<GovernancePanelProps, 'store'>) => {
  const governanceStore = useGovernanceStore();
  const document = useDocumentStore(
    useCallback((state) => selectDocumentModel(state, documentId), [documentId]),
  );
  const storeApi = useDocumentStoreApi();
  const { statuses, draftStatuses, exportRecipes, loading, saving, dirty, error, setDraftStatuses, saveDraft, resetDraft } =
    useWorkspaceGovernance();

  const [tagDraft, setTagDraft] = useState('');
  const [adminOpen, setAdminOpen] = useState(false);

  const tags = document?.tags ?? [];
  const statusKey = document?.statusKey ?? '';

  const documentRecipeIds = useMemo(() => new Set(document?.exportRecipes?.map((binding) => binding.recipeId) ?? []), [
    document?.exportRecipes,
  ]);

  const boundRecipes = useMemo(() => {
    if (documentRecipeIds.size === 0) return exportRecipes;
    return exportRecipes.filter((recipe) => documentRecipeIds.has(recipe.id));
  }, [documentRecipeIds, exportRecipes]);

  const statusDefinition = useMemo(() => getStatusByKey(statuses, statusKey), [statuses, statusKey]);

  const shouldBufferAudit = useCallback(() => typeof navigator === 'undefined' || !navigator.onLine, []);

  const enqueueStatusAudit = useCallback(
    (from: string | undefined, to: string) => {
      if (!shouldBufferAudit()) {
        return;
      }
      const base = createStatusChangeAuditEntry({
        id: nanoid(),
        documentId,
        from,
        to,
        occurredAt: new Date().toISOString(),
        statuses,
        metadata: { source: 'offline-buffer' },
      });
      const now = Date.now();
      void bufferAuditEntry(governanceStore, {
        ...base,
        createdAt: now,
        updatedAt: now,
      });
    },
    [documentId, governanceStore, shouldBufferAudit, statuses],
  );

  const enqueueTagAudit = useCallback(
    (previous: string[], next: string[]) => {
      if (!shouldBufferAudit()) {
        return;
      }
      const base = createTagChangeAuditEntry({
        id: nanoid(),
        documentId,
        previous,
        next,
        occurredAt: new Date().toISOString(),
        metadata: { source: 'offline-buffer' },
      });
      const now = Date.now();
      void bufferAuditEntry(governanceStore, {
        ...base,
        createdAt: now,
        updatedAt: now,
      });
    },
    [documentId, governanceStore, shouldBufferAudit],
  );

  const handleAddTag = useCallback(() => {
    const value = tagDraft.trim();
    if (!value || !document) {
      return;
    }
    const normalized = value.toLowerCase();
    if (tags.some((tag) => tag.toLowerCase() === normalized)) {
      setTagDraft('');
      return;
    }
    const nextTags = normalizeTags([...tags, normalized]);
    storeApi.getState().setTags(documentId, nextTags);
    enqueueTagAudit(tags, nextTags);
    setTagDraft('');
    onTagsChange?.(nextTags);
  }, [document, documentId, enqueueTagAudit, onTagsChange, storeApi, tagDraft, tags]);

  const handleRemoveTag = useCallback(
    (tag: string) => {
      if (!document) return;
      const nextTags = normalizeTags(tags.filter((existing) => existing !== tag));
      storeApi.getState().setTags(documentId, nextTags);
      enqueueTagAudit(tags, nextTags);
      onTagsChange?.(nextTags);
    },
    [document, documentId, enqueueTagAudit, onTagsChange, storeApi, tags],
  );

  const handleStatusChange = useCallback(
    (next: string) => {
      if (!document || statusKey === next) return;
      storeApi.getState().setStatusKey(documentId, next);
      enqueueStatusAudit(statusKey, next);
      onStatusChange?.(next);
    },
    [document, documentId, enqueueStatusAudit, onStatusChange, statusKey, storeApi],
  );

  const handleTagKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag],
  );

  const handleDraftFieldChange = useCallback(
    (index: number, field: keyof WorkspaceStatus, value: string | boolean) => {
      setDraftStatuses((current) => {
        const next = current.map((status, idx) => (idx === index ? { ...status } : status));
        const target = next[index];
        if (!target) return current;
        if (field === 'key' && typeof value === 'string') {
          const slug = ensureKeyUnique(slugify(value), next, index);
          target.key = slug;
        } else if (field === 'name' && typeof value === 'string') {
          target.name = value;
          target.key = ensureKeyUnique(slugify(value), next, index);
        } else if (field === 'color' && typeof value === 'string') {
          target.color = value;
        } else if (field === 'description' && typeof value === 'string') {
          target.description = value;
        } else if (field === 'isFinal' && typeof value === 'boolean') {
          target.isFinal = value;
        }
        return [...next];
      });
    },
    [setDraftStatuses],
  );

  const handleMoveStatus = useCallback(
    (index: number, direction: -1 | 1) => {
      setDraftStatuses((current) => {
        const target = current[index];
        const swapIndex = index + direction;
        if (!target || swapIndex < 0 || swapIndex >= current.length) {
          return current;
        }
        const next = [...current];
        [next[index], next[swapIndex]] = [next[swapIndex]!, next[index]!];
        return next.map((status, idx) => ({ ...status, order: idx + 1 }));
      });
    },
    [setDraftStatuses],
  );

  const handleAddStatus = useCallback(() => {
    setDraftStatuses((current) => {
      const baseName = `New Status ${current.length + 1}`;
      const key = ensureKeyUnique(slugify(baseName) || `status-${current.length + 1}`, current);
      return [
        ...current,
        {
          key,
          name: baseName,
          color: '#3b82f6',
          description: '',
          order: current.length + 1,
          isFinal: false,
        },
      ];
    });
  }, [setDraftStatuses]);

  const handleRemoveStatus = useCallback(
    (index: number) => {
      setDraftStatuses((current) => {
        if (current.length <= 1) {
          return current;
        }
        const next = current.filter((_, idx) => idx !== index);
        return next.map((status, idx) => ({ ...status, order: idx + 1 }));
      });
    },
    [setDraftStatuses],
  );

  if (!document) {
    return (
      <div className={`${containerClasses} ${className ?? ''}`}>
        <div className="text-sm text-foreground-muted">No document selected. Load a document to manage governance settings.</div>
      </div>
    );
  }

  return (
    <div className={`${containerClasses} ${className ?? ''}`}>
      <section aria-labelledby="tags-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="tags-heading" className={sectionHeaderClasses}>
            Tags
          </h2>
          <p className={helperTextClasses}>Tags are deduplicated automatically and surfaced in governance reports.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="list" aria-label="Current tags">
          {tags.length ? (
            tags.map((tag) => (
              <span key={tag} role="listitem" className={chipClasses}>
                <span>#{tag}</span>
                {canEditTags ? (
                  <button
                    type="button"
                    className={removeButtonClasses}
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                  >
                    ×
                  </button>
                ) : null}
              </span>
            ))
          ) : (
            <span className={helperTextClasses}>No tags assigned.</span>
          )}
        </div>
        {canEditTags ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="tag-input" className="sr-only">
              Add tag
            </label>
            <input
              id="tag-input"
              type="text"
              placeholder="Enter tag then press Enter"
              className={tagInputClasses}
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={handleTagKeyDown}
            />
            <button type="button" className={buttonSecondaryClasses} onClick={handleAddTag} disabled={!tagDraft.trim()}>
              Add tag
            </button>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="status-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="status-heading" className={sectionHeaderClasses}>
            Status
          </h2>
          <p className={helperTextClasses}>
            Status controls export eligibility and policy gates. Admins can configure available statuses and their colors.
          </p>
        </div>

        {statuses.length === 0 ? (
          <div className={badgeWarningClasses} role="status">
            No statuses are configured. Ask an administrator to configure governance statuses.
          </div>
        ) : (
          <fieldset className="flex flex-col gap-2" aria-describedby="status-policy">
            <legend className="sr-only">Choose a status</legend>
            {statuses.map((status) => {
              const selected = status.key === statusKey;
              const blockedRecipes = boundRecipes.filter((recipe) =>
                Array.isArray(recipe.allowedStatuses) && recipe.allowedStatuses.length > 0
                  ? !recipe.allowedStatuses.includes(status.key)
                  : false,
              );
              return (
                <label key={status.key} className={radioItemClasses}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="document-status"
                      value={status.key}
                      checked={selected}
                      onChange={() => handleStatusChange(status.key)}
                      disabled={!canEditStatus}
                      className="h-4 w-4 accent-brand"
                      aria-labelledby={`status-label-${status.key}`}
                    />
                    <div className="flex flex-col gap-1">
                      <span id={`status-label-${status.key}`} className="text-sm font-medium text-foreground">
                        {status.name}
                      </span>
                      {status.description ? (
                        <span className={helperTextClasses}>{status.description}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusIndicator color={status.color} name={status.name} />
                    {status.isFinal ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
                        Final
                      </span>
                    ) : null}
                    {blockedRecipes.length ? (
                      <span className="text-[10px] text-warning">Blocked in {blockedRecipes.length} recipe(s)</span>
                    ) : null}
                  </div>
                </label>
              );
            })}
          </fieldset>
        )}

        <div id="status-policy" className="flex flex-col gap-2">
          {boundRecipes.length === 0 ? (
            <div className={helperTextClasses}>No export recipes are bound to this document.</div>
          ) : (
            boundRecipes.map((recipe) => {
              const allowed = recipe.allowedStatuses ?? [];
              const allowedNames = allowed
                .map((key) => getStatusByKey(statuses, key)?.name ?? key)
                .filter((item) => Boolean(item));
              const gateAllows = allowed.length === 0 || allowed.includes(statusKey);
              return (
                <div key={recipe.id} className={gateAllows ? badgeInfoClasses : badgeWarningClasses} role="note">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold">
                      {recipe.name} export {gateAllows ? 'allows' : 'blocks'} status “{statusDefinition?.name ?? statusKey}”.
                    </span>
                    {allowed.length ? (
                      <span className="text-xs text-foreground">
                        Allowed statuses: {allowedNames.length ? allowedNames.join(', ') : allowed.join(', ')}
                      </span>
                    ) : (
                      <span className="text-xs text-foreground">All statuses permitted.</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {statusDefinition ? null : statusKey ? (
          <div className={badgeWarningClasses} role="alert">
            Current status “{statusKey}” is not recognized. Select a valid status to restore governance compliance.
          </div>
        ) : null}
      </section>

      <section aria-labelledby="admin-heading" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 id="admin-heading" className={sectionHeaderClasses}>
            Status administration
          </h2>
          <button
            type="button"
            className={buttonSecondaryClasses}
            onClick={() => setAdminOpen((prev) => !prev)}
            aria-expanded={adminOpen}
          >
            {adminOpen ? 'Hide configuration' : 'Configure statuses'}
          </button>
        </div>
        {canManageStatuses ? (
          adminOpen ? (
            <div className={adminPanelClasses}>
              {loading ? (
                <p className={helperTextClasses}>Loading workspace governance settings…</p>
              ) : (
                <div className="flex flex-col gap-6">
                  <form
                    className="flex flex-col gap-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void saveDraft();
                    }}
                  >
                  {error ? (
                    <div className={badgeWarningClasses} role="alert">
                      {error}
                    </div>
                  ) : null}

                  <div className="overflow-x-auto">
                    <div className={tableHeaderClasses}>
                      <span>Name</span>
                      <span>Description</span>
                      <span>Key</span>
                      <span>Color</span>
                      <span className="text-right">Actions</span>
                    </div>
                    {draftStatuses.map((status, index) => {
                      const palette = getAccessiblePalette(status.color);
                      return (
                        <div key={status.key} className={tableRowClasses}>
                          <div className="flex flex-col gap-1">
                            <label className="sr-only" htmlFor={`status-name-${status.key}`}>
                              Status name
                            </label>
                            <input
                              id={`status-name-${status.key}`}
                              type="text"
                              className={tagInputClasses}
                              value={status.name}
                              onChange={(event) => handleDraftFieldChange(index, 'name', event.target.value)}
                              required
                            />
                            <label className="inline-flex items-center gap-2 text-xs text-foreground">
                              <input
                                type="checkbox"
                                checked={Boolean(status.isFinal)}
                                onChange={(event) => handleDraftFieldChange(index, 'isFinal', event.target.checked)}
                              />
                              Final status
                            </label>
                          </div>
                          <div>
                            <label className="sr-only" htmlFor={`status-description-${status.key}`}>
                              Status description
                            </label>
                            <textarea
                              id={`status-description-${status.key}`}
                              className={`${tagInputClasses} min-h-[60px]`}
                              value={status.description ?? ''}
                              onChange={(event) => handleDraftFieldChange(index, 'description', event.target.value)}
                            />
                          </div>
                          <div>
                            <label className="sr-only" htmlFor={`status-key-${status.key}`}>
                              Status key
                            </label>
                            <input
                              id={`status-key-${status.key}`}
                              type="text"
                              className={tagInputClasses}
                              value={status.key}
                              onChange={(event) => handleDraftFieldChange(index, 'key', event.target.value)}
                              required
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="sr-only" htmlFor={`status-color-${status.key}`}>
                              Status color
                            </label>
                            <input
                              id={`status-color-${status.key}`}
                              type="color"
                              className="h-9 w-full rounded border border-surface-strong bg-transparent"
                              value={status.color}
                              onChange={(event) => handleDraftFieldChange(index, 'color', event.target.value)}
                              aria-label={`Choose color for ${status.name}`}
                            />
                            <StatusIndicator color={status.color} name={status.name} />
                            <span
                              className={`text-[10px] ${palette.accessible ? 'text-foreground-muted' : 'text-warning'}`}
                              role={palette.accessible ? 'note' : 'alert'}
                            >
                              {`Contrast ${palette.contrastRatio.toFixed(2)}:1 with ${palette.reference} text ${
                                palette.accessible ? 'meets' : 'is below'
                              } WCAG AA.`}
                            </span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className={buttonSecondaryClasses}
                              onClick={() => handleMoveStatus(index, -1)}
                              disabled={index === 0}
                              aria-label={`Move ${status.name} up`}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className={buttonSecondaryClasses}
                              onClick={() => handleMoveStatus(index, 1)}
                              disabled={index === draftStatuses.length - 1}
                              aria-label={`Move ${status.name} down`}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className={buttonSecondaryClasses}
                              onClick={() => handleRemoveStatus(index)}
                              disabled={draftStatuses.length <= 1}
                              aria-label={`Remove ${status.name}`}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" className={buttonSecondaryClasses} onClick={handleAddStatus}>
                      Add status
                    </button>
                    <div className="flex-1" />
                    <button type="button" className={buttonSecondaryClasses} onClick={resetDraft} disabled={!dirty}>
                      Reset
                    </button>
                    <button
                      type="button"
                      className={buttonPrimaryClasses}
                      disabled={!dirty || saving}
                      onClick={() => {
                        void saveDraft();
                      }}
                    >
                      {saving ? 'Saving…' : 'Save statuses'}
                    </button>
                  </div>
                  </form>
                  <AuditLogPanel />
                </div>
              )}
            </div>
          ) : null
        ) : (
          <p className={helperTextClasses}>You do not have permission to manage workspace statuses.</p>
        )}
      </section>
    </div>
  );
};

export const GovernancePanel = ({ store, ...props }: GovernancePanelProps) => (
  <GovernanceProvider store={store}>
    <GovernancePanelInner {...props} />
  </GovernanceProvider>
);
