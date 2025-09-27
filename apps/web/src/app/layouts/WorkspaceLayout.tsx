import { useCallback, useEffect, useMemo } from 'react';
import { Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { WorkspaceStore } from '@moduprompt/snippet-store';
import { useDocumentStore, useDocumentStoreApi } from '../../state/document-model.js';
import { AppLayout } from './AppLayout.js';
import { WorkspaceHeader } from './WorkspaceHeader.js';
import { WorkspaceSidebar } from './WorkspaceSidebar.js';

const SUPPORTED_VIEWS = new Set(['notebook', 'graph', 'snippets', 'governance', 'compiler']);

export interface WorkspaceLayoutProps {
  workspaceStore: WorkspaceStore;
}

interface WorkspaceRouteContext {
  documentId?: string;
  workspaceStore: WorkspaceStore;
}

const buildPath = (workspaceId: string, documentId: string, view: string): string =>
  `/workspace/${workspaceId}/documents/${documentId}/${view}`;

export const WorkspaceLayout = ({ workspaceStore }: WorkspaceLayoutProps): JSX.Element => {
  const { workspaceId = 'workspace-default', documentId: routeDocumentId, '*': wildcard } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const documentStoreApi = useDocumentStoreApi();

  const documentsRecord = useDocumentStore((state) => state.documents);
  const activeDocumentId = useDocumentStore((state) => state.activeDocumentId);

  const documents = useMemo(
    () =>
      Object.values(documentsRecord).map((record) => ({
        id: record.model.id,
        title: record.model.title || 'Untitled document',
      })),
    [documentsRecord],
  );

  const firstDocumentId = documents[0]?.id;
  const effectiveDocumentId = routeDocumentId ?? activeDocumentId ?? firstDocumentId;

  useEffect(() => {
    if (!effectiveDocumentId) {
      return;
    }
    const store = documentStoreApi.getState();
    if (store.activeDocumentId !== effectiveDocumentId && store.documents[effectiveDocumentId]) {
      store.setActiveDocument(effectiveDocumentId);
    }
  }, [documentStoreApi, effectiveDocumentId]);

  const viewSegment = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const candidate = segments[segments.length - 1] ?? 'notebook';
    return SUPPORTED_VIEWS.has(candidate) ? candidate : 'notebook';
  }, [location.pathname]);

  const handleDocumentChange = useCallback(
    (nextDocumentId: string) => {
      const nextPath = buildPath(workspaceId, nextDocumentId, viewSegment);
      navigate({ pathname: nextPath, search: location.search, hash: location.hash });
    },
    [location.hash, location.search, navigate, viewSegment, workspaceId],
  );

  if (documents.length === 0) {
    return (
      <AppLayout
        header={
          <WorkspaceHeader
            workspaceId={workspaceId}
            documentId={undefined}
            documents={[]}
            onDocumentChange={() => {}}
          />
        }
        sidebar={<WorkspaceSidebar workspaceId={workspaceId} documentId={undefined} />}
      >
        <div className="rounded-md border border-border bg-surface px-4 py-6 text-sm text-foreground-muted">
          No document is loaded yet. Create or import a document to begin.
        </div>
      </AppLayout>
    );
  }

  if (!effectiveDocumentId) {
    const fallbackId = firstDocumentId ?? documents[0]?.id;
    if (!fallbackId) {
      return null;
    }
    return <Navigate to={buildPath(workspaceId, fallbackId, 'notebook')} replace />;
  }

  if (!SUPPORTED_VIEWS.has(viewSegment) && wildcard !== undefined) {
    return <Navigate to={buildPath(workspaceId, effectiveDocumentId, 'notebook')} replace />;
  }

  return (
    <AppLayout
      header={
        <WorkspaceHeader
          workspaceId={workspaceId}
          documentId={effectiveDocumentId}
          documents={documents}
          onDocumentChange={handleDocumentChange}
        />
      }
      sidebar={<WorkspaceSidebar workspaceId={workspaceId} documentId={effectiveDocumentId} />}
    >
      <Outlet context={{ documentId: effectiveDocumentId, workspaceStore } satisfies WorkspaceRouteContext} />
    </AppLayout>
  );
};

export type { WorkspaceRouteContext };
