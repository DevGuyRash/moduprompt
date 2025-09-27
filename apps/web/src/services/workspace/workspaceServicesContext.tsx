import { createContext, useContext, type ReactNode } from 'react';
import type { WorkspaceStore } from '@moduprompt/snippet-store';
import type { DocumentsApi } from '../api/documents.js';
import type { SnippetsApi } from '../api/snippets.js';
import type { WorkspaceOrchestrator } from './workspaceOrchestrator.js';
import type { DexieSyncService } from '../storage/dexieSync.js';

export interface WorkspaceServices {
  workspaceStore: WorkspaceStore;
  documentsApi: DocumentsApi;
  snippetsApi: SnippetsApi;
  orchestrator: WorkspaceOrchestrator;
  storageSync: DexieSyncService;
}

const WorkspaceServicesContext = createContext<WorkspaceServices | null>(null);

export interface WorkspaceServicesProviderProps {
  value: WorkspaceServices;
  children: ReactNode;
}

export const WorkspaceServicesProvider = ({ value, children }: WorkspaceServicesProviderProps): JSX.Element => (
  <WorkspaceServicesContext.Provider value={value}>{children}</WorkspaceServicesContext.Provider>
);

export const useWorkspaceServices = (): WorkspaceServices => {
  const context = useContext(WorkspaceServicesContext);
  if (!context) {
    throw new Error('WorkspaceServicesProvider is missing in the component tree.');
  }
  return context;
};
