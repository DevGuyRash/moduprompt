import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createWorkspaceStore, type WorkspaceStore } from '@moduprompt/snippet-store';
import { SnippetLibraryProvider } from '../modules/snippets/provider.js';
import { GovernanceProvider } from '../modules/governance/provider.js';
import { useDocumentStoreApi } from '../state/document-model.js';
import { AppRoutes } from './router.js';
import { createDemoDocument, seedWorkspaceStore } from './bootstrap.js';
import { ApiClient, DocumentsApi, SnippetsApi } from '../services/api/index.js';
import { WorkspaceOrchestrator, type WorkspaceLogger } from '../services/workspace/workspaceOrchestrator.js';
import { runtimeEnv } from '../config/env.js';
import { WorkspaceServicesProvider } from '../services/workspace/workspaceServicesContext.js';
import { DexieSyncService } from '../services/storage/dexieSync.js';

const createWorkspace = (): WorkspaceStore =>
  createWorkspaceStore({ dbName: 'moduprompt-workspace' });

export const AppShell = (): JSX.Element => {
  const documentStoreApi = useDocumentStoreApi();
  const [workspaceStore] = useState(createWorkspace);
  const [ready, setReady] = useState(false);

  const servicesRef = useRef<{
    orchestrator: WorkspaceOrchestrator;
    documentsApi: DocumentsApi;
    snippetsApi: SnippetsApi;
    storageSync: DexieSyncService;
  }>();

  if (!servicesRef.current) {
    const client = new ApiClient();
    const documentsApi = new DocumentsApi(client);
    const snippetsApi = new SnippetsApi(client);
    const storageLogger: WorkspaceLogger = (level, message, context) => {
      if (typeof console === 'undefined') {
        return;
      }
      const payload = context ? [message, context] : [message];
      if (level === 'error') {
        console.error(...payload);
      } else if (level === 'warn') {
        console.warn(...payload);
      } else {
        console.info(...payload);
      }
    };
    const orchestrator = new WorkspaceOrchestrator({
      documentStore: documentStoreApi,
      workspaceStore,
      documentsApi,
      snippetsApi,
      offlineEnabled: runtimeEnv.featureFlags.offlinePersistence,
    });
    const storageSync = new DexieSyncService({
      workspaceStore,
      logger: storageLogger,
    });
    servicesRef.current = { orchestrator, documentsApi, snippetsApi, storageSync };
  }

  useEffect(() => {
    const orchestrator = servicesRef.current!.orchestrator;
    const storageSync = servicesRef.current!.storageSync;
    let cancelled = false;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      storageSync.handleServiceWorkerMessage(event.data);
    };

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    const bootstrap = async () => {
      try {
        if (runtimeEnv.featureFlags.offlinePersistence) {
          await storageSync.initialize();
          await storageSync.restoreIfEmpty();
        }
        await orchestrator.initialize();
      } catch (error) {
        console.error('Workspace orchestration failed', error);
      }

      if (cancelled) {
        return;
      }

      const state = documentStoreApi.getState();
      if (Object.keys(state.documents).length === 0) {
        const demoDocument = createDemoDocument();
        state.loadDocument(demoDocument, { activate: true, historyCapacity: 100 });
        try {
          await seedWorkspaceStore(workspaceStore, demoDocument);
        } catch (error) {
          console.error('Failed to seed workspace store', error);
        }
      } else if (!state.activeDocumentId) {
        const fallbackId = Object.keys(state.documents)[0];
        if (fallbackId) {
          try {
            state.setActiveDocument(fallbackId);
          } catch (error) {
            console.warn('Unable to activate fallback document', { error, fallbackId });
          }
        }
      }

      if (!cancelled && runtimeEnv.featureFlags.offlinePersistence) {
        await storageSync.backupNow();
        storageSync.startAutoBackup();
      }

      if (!cancelled) {
        setReady(true);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      orchestrator.dispose();
      storageSync.dispose();
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, [documentStoreApi, workspaceStore]);

  const services = servicesRef.current!;
  const servicesValue = useMemo(
    () => ({
      workspaceStore,
      documentsApi: services.documentsApi,
      snippetsApi: services.snippetsApi,
      orchestrator: services.orchestrator,
      storageSync: services.storageSync,
    }),
    [workspaceStore, services],
  );

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-foreground">
        <div role="status" className="flex flex-col items-center gap-2 text-sm text-foreground-muted">
          <span
            aria-hidden
            className="h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand"
          />
          <span>Initializing workspace…</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <WorkspaceServicesProvider value={servicesValue}>
        <SnippetLibraryProvider store={workspaceStore}>
          <GovernanceProvider store={workspaceStore}>
            <AppRoutes workspaceStore={workspaceStore} />
          </GovernanceProvider>
        </SnippetLibraryProvider>
      </WorkspaceServicesProvider>
    </BrowserRouter>
  );
};

export default AppShell;
