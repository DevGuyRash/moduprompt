import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createWorkspaceStore, type WorkspaceStore } from '@moduprompt/snippet-store';
import { SnippetLibraryProvider } from '../modules/snippets/provider.js';
import { GovernanceProvider } from '../modules/governance/provider.js';
import { useDocumentStoreApi } from '../state/document-model.js';
import { AppRoutes } from './router.js';
import { createDemoDocument, seedWorkspaceStore } from './bootstrap.js';
import { ApiClient, DocumentsApi, SnippetsApi } from '../services/api/index.js';
import { WorkspaceOrchestrator } from '../services/workspace/workspaceOrchestrator.js';
import { runtimeEnv } from '../config/env.js';
import { WorkspaceServicesProvider } from '../services/workspace/workspaceServicesContext.js';

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
  }>();

  if (!servicesRef.current) {
    const client = new ApiClient();
    const documentsApi = new DocumentsApi(client);
    const snippetsApi = new SnippetsApi(client);
    const orchestrator = new WorkspaceOrchestrator({
      documentStore: documentStoreApi,
      workspaceStore,
      documentsApi,
      snippetsApi,
      offlineEnabled: runtimeEnv.featureFlags.offlinePersistence,
    });
    servicesRef.current = { orchestrator, documentsApi, snippetsApi };
  }

  useEffect(() => {
    const orchestrator = servicesRef.current!.orchestrator;
    let cancelled = false;

    const bootstrap = async () => {
      try {
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

      if (!cancelled) {
        setReady(true);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
      orchestrator.dispose();
    };
  }, [documentStoreApi, workspaceStore]);

  const services = servicesRef.current!;
  const servicesValue = useMemo(
    () => ({
      workspaceStore,
      documentsApi: services.documentsApi,
      snippetsApi: services.snippetsApi,
      orchestrator: services.orchestrator,
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
