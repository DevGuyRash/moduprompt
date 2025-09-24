import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createWorkspaceStore, type WorkspaceStore } from '@moduprompt/snippet-store';

interface GovernanceProviderProps {
  store?: WorkspaceStore;
  children: ReactNode;
}

const GovernanceStoreContext = createContext<WorkspaceStore | null>(null);

export const GovernanceProvider = ({ store, children }: GovernanceProviderProps) => {
  const value = useMemo(() => store ?? createWorkspaceStore({ dbName: 'moduprompt-workspace' }), [store]);
  return <GovernanceStoreContext.Provider value={value}>{children}</GovernanceStoreContext.Provider>;
};

export const useGovernanceStore = (): WorkspaceStore => {
  const store = useContext(GovernanceStoreContext);
  if (!store) {
    throw new Error('GovernanceProvider is missing from the component tree.');
  }
  return store;
};
