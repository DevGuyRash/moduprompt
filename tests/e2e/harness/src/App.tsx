import { useEffect, useMemo, useState } from 'react';
import type { CompileResult } from '@moduprompt/compiler';
import {
  DocumentStoreProvider,
  createDocumentStore,
  useDocumentStore,
} from '@moduprompt/web';
import {
  NotebookView,
  SnippetLibraryPanel,
  SnippetLibraryProvider,
  GovernancePanel,
  GovernanceProvider,
  PreviewPane,
  NodeGraphCanvas,
  AuditLogPanel,
} from '@moduprompt/web';
import {
  bufferAuditEntry,
  createTagChangeAuditEntry,
  createWorkspaceStore,
  listBufferedAuditEntries,
  type WorkspaceStore,
} from '@moduprompt/snippet-store';
import type { ExportRecipe } from '@moduprompt/types';
import {
  DOCUMENT_ID,
  HARNESS_EXPORT_LOG_ID,
  HARNESS_STATUS_MESSAGE_ID,
  STATUS_APPROVED,
  STATUS_DRAFT,
} from '../../fixtures/constants';
import { createHarnessData, HARNESS_DB_NAME, type HarnessData } from './data';

interface ExportState {
  timestamp: number;
  recipe: ExportRecipe;
  result: CompileResult;
}

const useDeterministicClock = () => {
  useEffect(() => {
    const originalDateNow = Date.now;
    let counter = 1_738_934_400_000;
    Date.now = () => {
      counter += 17;
      return counter;
    };

    const cryptoRef: Crypto | undefined = globalThis.crypto;
    const originalRandomUUID = cryptoRef?.randomUUID?.bind(cryptoRef);
    let uuidCounter = 0;
    const deterministicRandomUUID = () => {
      uuidCounter += 1;
      return `uuid-${uuidCounter.toString(16).padStart(4, '0')}`;
    };

    if (cryptoRef) {
      cryptoRef.randomUUID = deterministicRandomUUID;
    } else {
      (globalThis as typeof globalThis & { crypto?: Crypto }).crypto = {
        getRandomValues: <T extends ArrayBufferView>(array: T) => array,
        randomUUID: deterministicRandomUUID,
      } as unknown as Crypto;
    }

    return () => {
      Date.now = originalDateNow;
      if (cryptoRef && originalRandomUUID) {
        cryptoRef.randomUUID = originalRandomUUID;
      }
    };
  }, []);
};

const useFetchStub = () => {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    const stub = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.startsWith('/api/audit/logs')) {
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.startsWith('/api/audit/ingest')) {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    };
    window.fetch = stub;
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
};

const useHarnessStores = () => {
  const documentStore = useMemo(() => createDocumentStore(), []);
  const workspaceStore = useMemo<WorkspaceStore>(
    () => createWorkspaceStore({ dbName: HARNESS_DB_NAME }),
    [],
  );
  return { documentStore, workspaceStore };
};

const HarnessAppInner = () => {
  useDeterministicClock();
  useFetchStub();

  const { documentStore, workspaceStore } = useHarnessStores();
  const [harnessData, setHarnessData] = useState<HarnessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>('Harness ready');
  const [exportState, setExportState] = useState<ExportState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshOfflineStatusMessage = async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    const buffered = await listBufferedAuditEntries(workspaceStore);
    if (buffered.length) {
      setStatusMessage(`Offline audit queue has ${buffered.length} entr${buffered.length === 1 ? 'y' : 'ies'} waiting to sync.`);
    }
  };

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        setLoading(true);
        const data = await createHarnessData();
        if (!active) return;
        await workspaceStore.clear();
        await workspaceStore.importSnapshot(data.workspaceSnapshot);
        documentStore.getState().loadDocument(data.document, { activate: true });
        setHarnessData(data);
        setStatusMessage('Loaded deterministic workspace snapshot');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialise harness';
        setError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void bootstrap();
    return () => {
      active = false;
    };
  }, [documentStore, workspaceStore]);

  const handleSnippetInsert = (option: { id: string; revision?: number }) => {
    const store = documentStore.getState();
    const blockId = `snippet-${option.id}-${store.documents[DOCUMENT_ID]?.version ?? 0}`;
    const now = Date.now();
    store.insertBlock(DOCUMENT_ID, {
      id: blockId,
      kind: 'snippet',
      snippetId: option.id,
      revision: option.revision,
      mode: 'transclude',
      sequence: now,
      createdAt: now,
      updatedAt: now,
    });
    setStatusMessage(`Inserted snippet ${option.id} into notebook`);
  };

  const handleExport = async (context: { recipe: ExportRecipe; result: CompileResult }) => {
    const timestamp = Date.now();
    setExportState({ timestamp, ...context });
    setStatusMessage(`Exported ${context.recipe.name} at ${new Date(timestamp).toISOString()}`);
  };

  const handleStatusChange = (statusKey: string) => {
    const message = statusKey === STATUS_APPROVED ? 'Document approved for export' : `Status set to ${statusKey}`;
    setStatusMessage(message);
    void refreshOfflineStatusMessage();
  };

  const handleTagsChange = (tags: string[]) => {
    const storeApi = documentStore.getState();
    const previous = storeApi.getDocument(DOCUMENT_ID)?.tags ?? [];
    setStatusMessage(`Tags updated (${tags.join(', ') || 'none'})`);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const entry = createTagChangeAuditEntry({
        id: `offline-tag-${Date.now()}`,
        documentId: DOCUMENT_ID,
        previous,
        next: tags,
        occurredAt: new Date().toISOString(),
        metadata: { source: 'harness-offline' },
      });
      void bufferAuditEntry(workspaceStore, {
        ...entry,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }).then(() => refreshOfflineStatusMessage());
    } else {
      void refreshOfflineStatusMessage();
    }
  };

  if (loading || !harnessData) {
    return (
      <div className="flex h-full min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 text-slate-900">
        <h1 className="text-2xl font-semibold">ModuPrompt E2E Harness</h1>
        <p role="status" aria-live="polite" className="text-sm text-slate-600">
          Preparing deterministic workspace…
        </p>
        {error ? (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const DocumentStatus = () => {
    const status = useDocumentStore((state) => state.documents[DOCUMENT_ID]?.model.statusKey ?? STATUS_DRAFT);
    return <strong>{status}</strong>;
  };

  const layout = (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900" data-testid="harness-root">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-6 py-4">
          <h1 className="text-2xl font-semibold">ModuPrompt Quality Harness</h1>
          <p className="text-sm text-slate-600">
            Exercise core journeys: governed prompt authoring, snippet recovery, offline resilience, and export provenance.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-6">
        <section aria-label="Notebook authoring" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <NotebookView
            documentId={DOCUMENT_ID}
            availableSnippets={harnessData.snippetOptions}
            onSnippetInserted={(option) => handleSnippetInsert(option)}
            className="h-full"
          />
          <SnippetLibraryPanel
            className="h-full"
            store={workspaceStore}
            onSnippetInsert={(option) => handleSnippetInsert(option)}
          />
        </section>

        <section aria-label="Graph and governance" className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Node graph</h2>
            <NodeGraphCanvas documentId={DOCUMENT_ID} className="h-[440px]" />
          </div>
          <GovernancePanel
            documentId={DOCUMENT_ID}
            canManageStatuses
            onStatusChange={handleStatusChange}
            onTagsChange={handleTagsChange}
          />
        </section>

        <section aria-label="Audit activity" className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Audit buffer</h2>
          <AuditLogPanel />
        </section>

        <section aria-label="Preview and exports" className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Preview</h2>
            <PreviewPane documentId={DOCUMENT_ID} store={workspaceStore} onExport={handleExport} />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4" aria-live="polite">
            <h2 className="mb-3 text-lg font-semibold">Harness telemetry</h2>
            <div id={HARNESS_STATUS_MESSAGE_ID} className="text-sm text-slate-700">
              {statusMessage}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Active status: <DocumentStatus />
            </div>
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-100 p-3 text-sm" id={HARNESS_EXPORT_LOG_ID}>
              {exportState ? (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold">Last export</span>
                  <span>Recipe: {exportState.recipe.name}</span>
                  <span>Artifacts: {exportState.result.outputs?.length ?? 0}</span>
                  <span>Provenance entries: {exportState.result.provenance?.length ?? 0}</span>
                  <span>Timestamp: {new Date(exportState.timestamp).toISOString()}</span>
                </div>
              ) : (
                <span>No exports recorded yet.</span>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3 text-xs text-slate-500">
          <span>Offline capable · deterministic fixtures · accessibility ready</span>
          <span>Statuses: {STATUS_DRAFT}, {STATUS_APPROVED}</span>
        </div>
      </footer>
    </div>
  );

  return (
    <DocumentStoreProvider store={documentStore}>
      <SnippetLibraryProvider store={workspaceStore}>
        <GovernanceProvider store={workspaceStore}>{layout}</GovernanceProvider>
      </SnippetLibraryProvider>
    </DocumentStoreProvider>
  );
};

export const HarnessApp = () => <HarnessAppInner />;
