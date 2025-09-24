import { memo, useMemo } from 'react';
import type { SnippetVersion } from '@moduprompt/types';
import { computeDiff } from '../utils/diff';

export interface DiffViewerProps {
  current?: SnippetVersion;
  previous?: SnippetVersion;
}

const lineBaseClasses =
  'whitespace-pre-wrap break-words rounded-md border px-3 py-2 text-xs font-mono shadow-sm transition';
const lineVariants: Record<string, string> = {
  context: 'border-surface bg-surface text-foreground',
  added: 'border-success/40 bg-success/10 text-success-strong',
  removed: 'border-danger/40 bg-danger/10 text-danger-strong',
};

export const DiffViewer = memo(({ current, previous }: DiffViewerProps) => {
  const segments = useMemo(() => {
    if (!current) return [];
    if (!previous) {
      return [{ type: 'context', value: current.body }];
    }
    return computeDiff(previous.body, current.body);
  }, [current, previous]);

  if (!current) {
    return <div className="text-sm text-foreground-muted">Select a revision to view the diff.</div>;
  }

  if (!segments.length) {
    return (
      <div className="rounded-md border border-surface bg-surface px-4 py-3 text-sm text-foreground-muted">
        No changes detected between the selected revisions.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-testid="snippet-diff-viewer">
      {segments.map((segment, index) => (
        <div key={`${segment.type}-${index}`} className={`${lineBaseClasses} ${lineVariants[segment.type] ?? ''}`}>
          {segment.value || '∅'}
        </div>
      ))}
    </div>
  );
});

DiffViewer.displayName = 'DiffViewer';
