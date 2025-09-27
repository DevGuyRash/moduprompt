import type { ReactNode } from 'react';

interface AppLayoutProps {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
}

export const AppLayout = ({ header, sidebar, children }: AppLayoutProps): JSX.Element => (
  <div className="min-h-screen bg-surface text-foreground">
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-4 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
    >
      Skip to main content
    </a>
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b border-border bg-surface-subtle md:h-screen md:w-64 md:border-b-0 md:border-r">
        {sidebar}
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="border-b border-border bg-surface px-4 py-4 md:px-6">{header}</header>
        <main
          id="main-content"
          className="flex-1 overflow-y-auto bg-surface-subtle px-4 py-6 md:px-8"
          aria-live="polite"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  </div>
);
