import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createWorkspaceStore, type WorkspaceStore } from '@moduprompt/snippet-store';
import { SnippetLibraryProvider } from '../modules/snippets/provider.js';
import { GovernanceProvider } from '../modules/governance/provider.js';
import { useDocumentStoreApi } from '../state/document-model.js';
import { AppRoutes } from './router.js';
import { createDemoDocument, seedWorkspaceStore } from './bootstrap.js';

const createWorkspace = (): WorkspaceStore =>
  createWorkspaceStore({ dbName: 'moduprompt-workspace' });

export const AppShell = (): JSX.Element => {
  const documentStoreApi = useDocumentStoreApi();
  const [workspaceStore] = useState(createWorkspace);
  const [ready, setReady] = useState(false);
  const demoDocument = useMemo(() => createDemoDocument(), []);

  useEffect(() => {
    const store = documentStoreApi.getState();
    if (!store.documents[demoDocument.id]) {
      store.loadDocument(demoDocument, { activate: true, historyCapacity: 100 });
    } else if (!store.activeDocumentId) {
      store.setActiveDocument(demoDocument.id);
    }
    setReady(true);

    const bootstrap = async () => {
      try {
        await seedWorkspaceStore(workspaceStore, demoDocument);
      } catch (error) {
        console.error('Failed to seed workspace store', error);
      }
    };

    void bootstrap();
  }, [demoDocument, documentStoreApi, workspaceStore]);

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
      <SnippetLibraryProvider store={workspaceStore}>
        <GovernanceProvider store={workspaceStore}>
          <AppRoutes workspaceStore={workspaceStore} />
        </GovernanceProvider>
      </SnippetLibraryProvider>
    </BrowserRouter>
  );
};

export default AppShell;
