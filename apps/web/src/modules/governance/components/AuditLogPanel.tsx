import { useMemo } from 'react';
import type { AuditLogEntry } from '@moduprompt/types';
import { useAuditLogFeed } from '../hooks/useAuditLogFeed.js';

const panelClasses =
  'rounded-md border border-surface-strong bg-surface px-3 py-3 text-sm shadow-sm focus-within:ring-2 focus-within:ring-brand/40';
const headerClasses = 'flex flex-wrap items-center justify-between gap-3';
const buttonPrimaryClasses =
  'inline-flex items-center justify-center rounded-md border border-brand bg-brand px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60';
const buttonSecondaryClasses =
  'inline-flex items-center justify-center rounded-md border border-surface-strong bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-60';
const badgeWarningClasses =
  'inline-flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning';
const badgeInfoClasses =
  'inline-flex items-center gap-2 rounded-md border border-brand/30 bg-brand/10 px-3 py-2 text-xs text-brand-strong';
const tableHeaderClasses =
  'grid grid-cols-[160px_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.6fr)] gap-4 border-b border-surface-strong pb-2 text-xs font-semibold uppercase tracking-wide text-foreground-muted';
const rowClasses =
  'grid grid-cols-[160px_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,0.6fr)] items-start gap-4 border-b border-surface-strong py-3 text-sm last:border-b-0';
const statusChipPending =
  'inline-flex w-fit items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning';
const statusChipDelivered =
  'inline-flex w-fit items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-2 py-1 text-[11px] font-semibold text-brand-strong';

const formatDateTime = (value: string): string => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch (error) {
    return value;
  }
};

const flattenMetadata = (metadata: Record<string, unknown>, prefix = ''): Array<{ key: string; value: string }> => {
  const entries: Array<{ key: string; value: string }> = [];
  for (const [key, value] of Object.entries(metadata)) {
    const label = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...flattenMetadata(value as Record<string, unknown>, label));
    } else {
      const serialized = Array.isArray(value) ? value.join(', ') : String(value ?? '');
      entries.push({ key: label, value: serialized });
    }
  }
  return entries;
};

const MetadataList = ({ metadata }: { metadata: Record<string, unknown> }) => {
  const items = useMemo(() => flattenMetadata(metadata), [metadata]);
  if (!items.length) {
    return <span className="text-xs text-foreground-muted">No metadata</span>;
  }
  return (
    <dl className="flex flex-col gap-1 text-xs text-foreground">
      {items.slice(0, 6).map((item) => (
        <div key={item.key} className="flex gap-2">
          <dt className="w-32 flex-shrink-0 text-foreground-muted">{item.key}</dt>
          <dd className="flex-1 break-words">{item.value}</dd>
        </div>
      ))}
      {items.length > 6 ? <span className="text-foreground-muted">…</span> : null}
    </dl>
  );
};

const StatusBadge = ({ pending }: { pending?: boolean }) =>
  pending ? <span className={statusChipPending}>Pending sync</span> : <span className={statusChipDelivered}>Delivered</span>;

const AuditRow = ({ entry }: { entry: AuditLogEntry & { pending?: boolean; bufferedAt?: number; attempts?: number; lastError?: string | null } }) => (
  <div className={rowClasses}>
    <div className="flex flex-col gap-1 text-xs text-foreground">
      <span className="font-medium">{formatDateTime(entry.occurredAt)}</span>
      <span className="text-foreground-muted">{entry.id}</span>
    </div>
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-foreground">{entry.type}</span>
      <span className="text-xs text-foreground-muted">Subject: {entry.subjectId}</span>
      {entry.actorId ? <span className="text-xs text-foreground-muted">Actor: {entry.actorId}</span> : null}
    </div>
    <div className="flex flex-col gap-2">
      <MetadataList metadata={entry.metadata} />
      {entry.pending && entry.lastError ? (
        <span className={badgeWarningClasses} role="alert">
          Last error: {entry.lastError}
        </span>
      ) : null}
    </div>
    <div className="flex flex-col items-start gap-2">
      <StatusBadge pending={entry.pending} />
      {entry.pending && entry.bufferedAt ? (
        <span className="text-[11px] text-foreground-muted">Buffered {formatDateTime(new Date(entry.bufferedAt).toISOString())}</span>
      ) : null}
      {entry.pending && entry.attempts ? (
        <span className="text-[11px] text-foreground-muted">Attempts: {entry.attempts}</span>
      ) : null}
    </div>
  </div>
);

export const AuditLogPanel = () => {
  const { entries, bufferedCount, loading, error, refresh, flush } = useAuditLogFeed();

  return (
    <section aria-label="Audit log" className={panelClasses}>
      <div className={headerClasses}>
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-foreground">Audit activity</h3>
          <p className="text-xs text-foreground-muted">
            Governance events, snippet versioning, and export lifecycle updates captured for compliance review.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={buttonSecondaryClasses} onClick={() => refresh()} disabled={loading}>
            Refresh
          </button>
          <button
            type="button"
            className={buttonPrimaryClasses}
            onClick={() => flush()}
            disabled={bufferedCount === 0}
          >
            Flush {bufferedCount > 0 ? `(${bufferedCount})` : ''}
          </button>
        </div>
      </div>

      {error ? (
        <div className={badgeWarningClasses} role="alert">
          {error}
        </div>
      ) : null}
      {bufferedCount > 0 && !error ? (
        <div className={badgeInfoClasses} role="status">
          {bufferedCount} offline audit entr{bufferedCount === 1 ? 'y is' : 'ies are'} waiting to sync.
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <div className={tableHeaderClasses}>
          <span>Timestamp</span>
          <span>Event</span>
          <span>Details</span>
          <span>Status</span>
        </div>
        {loading ? (
          <div className="py-4 text-sm text-foreground-muted">Loading audit events…</div>
        ) : entries.length ? (
          entries.map((entry) => <AuditRow key={`${entry.id}-${entry.pending ? 'pending' : 'stored'}`} entry={entry} />)
        ) : (
          <div className="py-4 text-sm text-foreground-muted">No audit events recorded yet.</div>
        )}
      </div>
    </section>
  );
};
