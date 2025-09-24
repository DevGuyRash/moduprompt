import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createWorkspaceStore, type WorkspaceStore } from '@moduprompt/snippet-store';

interface SnippetLibraryProviderProps {
  store?: WorkspaceStore;
  children: ReactNode;
}

const SnippetLibraryContext = createContext<WorkspaceStore | null>(null);

export const SnippetLibraryProvider = ({ store, children }: SnippetLibraryProviderProps) => {
  const value = useMemo(() => store ?? createWorkspaceStore({ dbName: 'moduprompt-workspace' }), [store]);
  return <SnippetLibraryContext.Provider value={value}>{children}</SnippetLibraryContext.Provider>;
};

export const useSnippetLibraryContext = (): WorkspaceStore => {
  const store = useContext(SnippetLibraryContext);
  if (!store) {
    throw new Error('SnippetLibraryProvider is missing from the component tree.');
  }
  return store;
};
