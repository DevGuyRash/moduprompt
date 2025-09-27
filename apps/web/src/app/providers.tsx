import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentStoreProvider, createDocumentStore } from '../state/document-model.js';
import { ThemeProvider } from './theme.js';

interface AppProvidersProps {
  children: ReactNode;
}

export const AppProviders = ({ children }: AppProvidersProps): JSX.Element => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 1,
          },
        },
      }),
  );

  const [documentStore] = useState(() => createDocumentStore());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <DocumentStoreProvider store={documentStore}>{children}</DocumentStoreProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
