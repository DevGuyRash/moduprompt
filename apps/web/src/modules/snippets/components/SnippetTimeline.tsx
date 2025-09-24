import { memo } from 'react';
import type { SnippetTimelineEntry } from '../types';

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const formatRelativeTime = (date: Date): string => {
  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);
  const minute = 60 * 1_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;

  if (abs < minute) {
    return relativeFormatter.format(Math.round(diff / 1_000), 'second');
  }
  if (abs < hour) {
    return relativeFormatter.format(Math.round(diff / minute), 'minute');
  }
  if (abs < day) {
    return relativeFormatter.format(Math.round(diff / hour), 'hour');
  }
  if (abs < week) {
    return relativeFormatter.format(Math.round(diff / day), 'day');
  }
  return relativeFormatter.format(Math.round(diff / week), 'week');
};

export interface SnippetTimelineProps {
  entries: SnippetTimelineEntry[];
  loading?: boolean;
  selectedRevision?: number;
  onSelect: (revision: number) => void;
}

const baseButtonClasses =
  'w-full rounded-md border px-3 py-2 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand';
const selectedClasses = 'border-brand/80 bg-brand/10 text-brand-strong shadow-inner';
const defaultClasses = 'border-transparent bg-surface hover:border-surface-strong';

export const SnippetTimeline = memo(({ entries, loading, selectedRevision, onSelect }: SnippetTimelineProps) => {
  if (loading) {
    return (
      <div className="flex flex-col gap-2" role="status" aria-live="polite">
        <div className="h-9 animate-pulse rounded-md bg-surface-strong" />
        <div className="h-9 animate-pulse rounded-md bg-surface-strong" />
        <div className="h-9 animate-pulse rounded-md bg-surface-strong" />
      </div>
    );
  }

  if (!entries.length) {
    return <p className="text-sm text-foreground-muted">No revisions captured for this snippet yet.</p>;
  }

  return (
    <ol className="flex flex-col gap-2" data-testid="snippet-timeline">
      {entries.map((entry) => {
        const isSelected = selectedRevision === entry.version.rev;
        return (
          <li key={entry.version.rev}>
            <button
              type="button"
              onClick={() => onSelect(entry.version.rev)}
              className={`${baseButtonClasses} ${isSelected ? selectedClasses : defaultClasses}`}
              aria-pressed={isSelected}
              aria-label={`Select revision ${entry.version.rev}`}
            >
              <div className="flex items-center justify-between text-xs text-foreground-muted">
                <span>{formatRelativeTime(entry.createdAt)}</span>
                <span>v{entry.version.rev}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
                <span>{entry.label}</span>
                {entry.isPinned ? (
                  <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                    Pinned
                  </span>
                ) : null}
                {entry.isHead && !entry.isPinned ? (
                  <span className="inline-flex items-center rounded-full bg-surface-strong px-2 py-0.5 text-xs text-foreground-muted">
                    Head
                  </span>
                ) : null}
              </div>
              {entry.version.note ? (
                <p className="mt-1 text-xs text-foreground-muted">{entry.version.note}</p>
              ) : null}
            </button>
          </li>
        );
      })}
    </ol>
  );
});

SnippetTimeline.displayName = 'SnippetTimeline';
