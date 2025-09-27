import { useMemo } from 'react';
import {
  Navigate,
  useOutletContext,
  useRoutes,
} from 'react-router-dom';
import type { WorkspaceStore } from '@moduprompt/snippet-store';
import { NotebookView, type NotebookSnippetOption } from '../modules/notebook/index.js';
import { NodeGraphCanvas } from '../modules/node-graph/index.js';
import { SnippetLibraryPanel } from '../modules/snippets/index.js';
import { GovernancePanel } from '../modules/governance/index.js';
import { PreviewPane } from '../modules/compiler-preview/index.js';
import { useDocumentStoreApi } from '../state/document-model.js';
import { runtimeEnv } from '../config/env.js';
import { WorkspaceLayout, type WorkspaceRouteContext } from './layouts/WorkspaceLayout.js';

const DEFAULT_WORKSPACE_ID = 'workspace-default';

interface AppRoutesProps {
  workspaceStore: WorkspaceStore;
}

const createBlockId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch (error) {
      // fallback below
    }
  }
  return `block-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
};

const NotebookRoute = (): JSX.Element => {
  const context = useOutletContext<WorkspaceRouteContext>();
  const { documentId } = context;

  if (!documentId) {
    return (
      <div className="rounded-md border border-border bg-surface px-4 py-6 text-sm text-foreground-muted">
        No document selected.
      </div>
    );
  }

  return <NotebookView documentId={documentId} />;
};

const GraphRoute = (): JSX.Element => {
  const context = useOutletContext<WorkspaceRouteContext>();
  const { documentId } = context;

  if (!documentId) {
    return (
      <div className="rounded-md border border-border bg-surface px-4 py-6 text-sm text-foreground-muted">
        No document selected.
      </div>
    );
  }

  return <NodeGraphCanvas documentId={documentId} />;
};

const SnippetsRoute = (): JSX.Element => {
  const context = useOutletContext<WorkspaceRouteContext>();
  const documentStoreApi = useDocumentStoreApi();
  const { documentId, workspaceStore } = context;

  const handleSnippetInsert = (option: NotebookSnippetOption) => {
    if (!documentId) return;
    const timestamp = Date.now();
    const blockId = createBlockId();
    documentStoreApi.getState().insertBlock(documentId, {
      id: blockId,
      kind: 'snippet',
      snippetId: option.id,
      revision: option.revision,
      mode: 'transclude',
      sequence: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  };

  return (
    <SnippetLibraryPanel
      store={workspaceStore}
      onSnippetInsert={handleSnippetInsert}
      className="min-h-[520px]"
    />
  );
};

const GovernanceRoute = (): JSX.Element => {
  const context = useOutletContext<WorkspaceRouteContext>();
  const { documentId, workspaceStore } = context;
  const documentStoreApi = useDocumentStoreApi();

  if (!documentId) {
    return (
      <div className="rounded-md border border-border bg-surface px-4 py-6 text-sm text-foreground-muted">
        No document selected.
      </div>
    );
  }

  return (
    <GovernancePanel
      store={workspaceStore}
      documentId={documentId}
      canManageStatuses={Boolean(runtimeEnv.featureFlags.governanceRules)}
      onTagsChange={(tags) => documentStoreApi.getState().setTags(documentId, tags)}
      onStatusChange={(statusKey) => documentStoreApi.getState().setStatusKey(documentId, statusKey)}
    />
  );
};

const CompilerRoute = (): JSX.Element => {
  const context = useOutletContext<WorkspaceRouteContext>();
  const { documentId, workspaceStore } = context;

  if (!documentId) {
    return (
      <div className="rounded-md border border-border bg-surface px-4 py-6 text-sm text-foreground-muted">
        No document selected.
      </div>
    );
  }

  return <PreviewPane documentId={documentId} store={workspaceStore} className="min-h-[500px]" />;
};

export const AppRoutes = ({ workspaceStore }: AppRoutesProps): JSX.Element | null => {
  const routes = useMemo(
    () => [
      {
        path: '/',
        element: <Navigate to={`/workspace/${DEFAULT_WORKSPACE_ID}/documents/moduprompt-welcome/notebook`} replace />,
      },
      {
        path: '/workspace/:workspaceId/documents/:documentId',
        element: <WorkspaceLayout workspaceStore={workspaceStore} />,
        children: [
          { index: true, element: <Navigate to="notebook" replace /> },
          { path: 'notebook', element: <NotebookRoute /> },
          { path: 'graph', element: <GraphRoute /> },
          { path: 'snippets', element: <SnippetsRoute /> },
          { path: 'governance', element: <GovernanceRoute /> },
          { path: 'compiler', element: <CompilerRoute /> },
        ],
      },
      { path: '*', element: <Navigate to={`/workspace/${DEFAULT_WORKSPACE_ID}/documents/moduprompt-welcome/notebook`} replace /> },
    ],
    [workspaceStore],
  );

  return useRoutes(routes);
};
