import { useEffect, useMemo, useState } from 'react';
import type {
  DocumentModel,
  ExportRecipe,
  WorkspaceStatus,
} from '@moduprompt/types';
import type { CompileResult } from '@moduprompt/compiler';
import {
  createWorkspaceStore,
  type WorkspaceStore,
  type WorkspaceSettingsRecord,
} from '@moduprompt/snippet-store';
import { useDocumentStore } from '../../state/document-model.js';
import { ExportDrawer } from './components/ExportDrawer.js';
import { usePreflight } from './hooks/usePreflight.js';

export interface PreviewPaneProps {
  documentId: string;
  className?: string;
  store?: WorkspaceStore;
  variables?: Record<string, string | number | boolean | null>;
  onExport?: (context: { recipe: ExportRecipe; result: CompileResult }) => void | Promise<void>;
}

interface DocumentBindingsSnapshot {
  exportRecipes: DocumentModel['exportRecipes'];
  statusKey: string;
  title: string;
}

const containerClasses =
  'flex flex-col gap-4 rounded-xl border border-surface bg-surface-subtle p-4 shadow-sm text-foreground';
const headerClasses = 'flex items-center justify-between';
const titleClasses = 'text-base font-semibold';
const statusBadgeClasses = 'inline-flex items-center gap-1 rounded-full border border-surface px-3 py-1 text-xs uppercase tracking-wide';
const previewWrapperClasses = 'flex flex-col gap-3 rounded-lg border border-surface bg-surface p-4';
const diagnosticsWrapperClasses = 'flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm';
const diagnosticsTitleClasses = 'text-sm font-semibold';
const diagnosticsListClasses = 'space-y-1 text-sm';
const emptyStateClasses = 'flex min-h-[240px] items-center justify-center text-sm text-foreground-muted';
const iframeClasses = 'h-[360px] w-full rounded-md border border-surface-strong bg-white shadow-inner';
const errorBannerClasses = 'rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger';
const loadingTextClasses = 'text-xs uppercase tracking-wide text-foreground-muted';

const createDefaultSettings = (): WorkspaceSettingsRecord => ({
  id: 'workspace',
  statuses: [
    { key: 'draft', name: 'Draft', color: '#475569', order: 1 },
    { key: 'review', name: 'Review', color: '#f59e0b', order: 2 },
    { key: 'approved', name: 'Approved', color: '#10b981', order: 3, isFinal: true },
  ] satisfies WorkspaceStatus[],
  exportRecipes: [],
  schemaVersion: 1,
  updatedAt: Date.now(),
});

const escapeHtml = (input: string): string =>
  input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

const buildPreviewSource = (markdown: string): string => {
  const escaped = escapeHtml(markdown);
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
      :root {
        color-scheme: light dark;
      }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 14px;
        line-height: 1.6;
        padding: 16px;
        background: #ffffff;
        color: #1f2937;
        white-space: pre-wrap;
      }
      pre {
        margin: 0;
        font-family: "Fira Code", "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      }
    </style></head><body><pre>${escaped}</pre></body></html>`;
};

export const PreviewPane = ({
  documentId,
  className,
  store: storeOverride,
  variables,
  onExport,
}: PreviewPaneProps): JSX.Element => {
  const workspaceStore = useMemo(
    () => storeOverride ?? createWorkspaceStore({ dbName: 'moduprompt-workspace' }),
    [storeOverride],
  );

  const documentSnapshot = useDocumentStore(
    useMemo(
      () =>
        (state) => {
          const record = state.documents[documentId];
          if (!record) {
            return undefined;
          }
          return {
            exportRecipes: record.model.exportRecipes,
            statusKey: record.model.statusKey,
            title: record.model.title,
          } satisfies DocumentBindingsSnapshot;
        },
      [documentId],
    ),
  );

  const [settings, setSettings] = useState<{ loading: boolean; error?: string; record: WorkspaceSettingsRecord }>(() => ({
    loading: true,
    record: createDefaultSettings(),
  }));

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      setSettings((prev) => ({ ...prev, loading: true, error: undefined }));
      try {
        const record = (await workspaceStore.getWorkspaceSettings()) ?? createDefaultSettings();
        if (cancelled) return;
        setSettings({ loading: false, record, error: undefined });
      } catch (error) {
        if (cancelled) return;
        setSettings({
          loading: false,
          record: createDefaultSettings(),
          error: error instanceof Error ? error.message : 'Unable to load workspace settings.',
        });
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [workspaceStore]);

  const availableRecipes = useMemo(() => {
    if (!settings.record.exportRecipes.length) {
      return [] as ExportRecipe[];
    }
    const sorted = [...settings.record.exportRecipes].sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [settings.record.exportRecipes]);

  const [selectedRecipeId, setSelectedRecipeId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!availableRecipes.length) {
      setSelectedRecipeId(undefined);
      return;
    }
    const preferred = documentSnapshot?.exportRecipes?.find((binding) =>
      availableRecipes.some((recipe) => recipe.id === binding.recipeId),
    );
    const fallback = preferred?.recipeId ?? availableRecipes[0]!.id;
    setSelectedRecipeId((current) => (current && availableRecipes.some((recipe) => recipe.id === current) ? current : fallback));
  }, [availableRecipes, documentSnapshot?.exportRecipes]);

  const activeRecipe = useMemo(
    () => availableRecipes.find((recipe) => recipe.id === selectedRecipeId),
    [availableRecipes, selectedRecipeId],
  );

  const preflight = usePreflight({
    documentId,
    store: workspaceStore,
    recipe: activeRecipe,
    variables,
  });

  const previewSrc = useMemo(() => {
    if (!preflight.result) {
      return buildPreviewSource('');
    }
    return buildPreviewSource(preflight.result.markdown ?? '');
  }, [preflight.result]);

  const issues = preflight.result?.preflight.issues ?? [];
  const blockingIssues = issues.filter((issue) => issue.severity === 'error');
  const statusGateIssue = blockingIssues.find((issue) => issue.code === 'PREFLIGHT_STATUS_GATE');

  const handleExport = async () => {
    if (!activeRecipe || !preflight.result || preflight.hasBlockingIssues || !onExport) {
      return;
    }
    await onExport({ recipe: activeRecipe, result: preflight.result });
  };

  const statusLabel = useMemo(() => {
    if (!documentSnapshot) return 'No Document';
    const match = settings.record.statuses.find((status) => status.key === documentSnapshot.statusKey);
    return match ? match.name : documentSnapshot.statusKey;
  }, [documentSnapshot, settings.record.statuses]);

  return (
    <section className={`${containerClasses} ${className ?? ''}`}>
      <header className={headerClasses}>
        <div>
          <h2 className={titleClasses}>{documentSnapshot?.title ?? 'Preview'}</h2>
          <p className={loadingTextClasses}>
            {preflight.status === 'loading'
              ? 'Generating deterministic preview…'
              : `Preview hash: ${preflight.result?.hash ?? '—'}`}
          </p>
        </div>
        <span className={statusBadgeClasses} aria-live="polite">
          Status · {statusLabel}
        </span>
      </header>

      {settings.error ? <div className={errorBannerClasses}>{settings.error}</div> : null}
      {preflight.status === 'error' && preflight.error ? (
        <div className={errorBannerClasses}>{preflight.error}</div>
      ) : null}

      <div className={previewWrapperClasses}>
        {preflight.result ? (
          <iframe
            key={preflight.result.hash}
            title="Document preview"
            sandbox=""
            srcDoc={previewSrc}
            className={iframeClasses}
          />
        ) : (
          <div className={emptyStateClasses}>
            {preflight.status === 'loading' ? 'Preparing preview…' : 'No preview available yet.'}
          </div>
        )}
      </div>

      {issues.length ? (
        <section className={diagnosticsWrapperClasses} aria-live="polite" aria-label="Preflight diagnostics">
          <h3 className={diagnosticsTitleClasses}>
            Preflight · {blockingIssues.length} blocking · {issues.length - blockingIssues.length} warnings
          </h3>
          <ul className={diagnosticsListClasses}>
            {issues.map((issue, index) => (
              <li key={`${issue.code}-${index}`}>
                <span className={issue.severity === 'error' ? 'font-semibold text-danger' : 'text-warning'}>
                  {issue.severity === 'error' ? 'Error' : 'Warning'}
                </span>{' '}
                {issue.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ExportDrawer
        recipes={availableRecipes}
        selectedRecipeId={selectedRecipeId}
        onSelect={setSelectedRecipeId}
        onExport={handleExport}
        disabled={preflight.status === 'loading' || preflight.status === 'error'}
        busy={preflight.status === 'loading'}
        blocked={preflight.hasBlockingIssues}
      />

      {statusGateIssue ? (
        <p className="text-xs text-danger" role="alert">
          {statusGateIssue.message}
        </p>
      ) : null}
    </section>
  );
};
