import { useEffect, useState, type ChangeEvent } from 'react';
import { runtimeEnv } from '../../config/env.js';
import { useTheme } from '../theme.js';

export interface WorkspaceHeaderProps {
  workspaceId: string;
  documentId?: string;
  documents: Array<{ id: string; title: string }>;
  onDocumentChange: (documentId: string) => void;
}

const indicatorBaseClasses =
  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-wide';

export const WorkspaceHeader = ({
  workspaceId,
  documentId,
  documents,
  onDocumentChange,
}: WorkspaceHeaderProps): JSX.Element => {
  const { appliedTheme, setMode } = useTheme();
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextDocumentId = event.target.value;
    if (!nextDocumentId) return;
    onDocumentChange(nextDocumentId);
  };

  const nextTheme = appliedTheme === 'dark' ? 'light' : 'dark';

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest text-foreground-muted">Workspace</span>
        <div className="flex items-center gap-3 text-base font-semibold">
          <span>{workspaceId}</span>
          <span className="text-xs font-medium text-foreground-muted">v{runtimeEnv.releaseVersion}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-foreground-muted">
          Active document
          <select
            value={documentId ?? ''}
            onChange={handleChange}
            className="min-w-[220px] rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            aria-label="Select active document"
          >
            {documents.length === 0 ? (
              <option value="" disabled>
                No documents available
              </option>
            ) : (
              documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title}
                </option>
              ))
            )}
          </select>
        </label>

        <span
          className={`${indicatorBaseClasses} border-brand/30 bg-brand/10 text-brand-strong`}
          role="status"
        >
          {runtimeEnv.featureFlags.offlinePersistence ? 'Offline-ready' : 'Online-storage'}
        </span>

        <span
          className={`${indicatorBaseClasses} ${online ? 'border-success/40 bg-success/10 text-success' : 'border-warning/50 bg-warning/10 text-warning'}`}
          role="status"
        >
          {online ? 'Online' : 'Offline mode'}
        </span>

        <button
          type="button"
          onClick={() => setMode(nextTheme)}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-surface-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          aria-label={`Switch to ${nextTheme} theme`}
        >
          <span className="h-2 w-2 rounded-full border border-border bg-surface" aria-hidden />
          {appliedTheme === 'dark' ? 'Dark' : 'Light'} mode
        </button>
      </div>
    </div>
  );
};
