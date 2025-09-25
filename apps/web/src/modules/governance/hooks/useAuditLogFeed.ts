import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AuditLogEntry } from '@moduprompt/types';
import {
  flushBufferedAuditEntries,
  listBufferedAuditEntries,
  mergeAuditFeeds,
  type AuditBufferRecord,
} from '@moduprompt/snippet-store';
import { useGovernanceStore } from '../provider.js';

interface AuditFeedState {
  entries: Array<AuditLogEntry & { pending?: boolean; bufferedAt?: number; attempts?: number; lastError?: string | null }>;
  buffered: AuditBufferRecord[];
  loading: boolean;
  error?: string;
}

const DEFAULT_LIMIT = 100;

const fetchAuditLogs = async (limit: number): Promise<AuditLogEntry[]> => {
  const response = await fetch(`/api/audit/logs?limit=${limit}`, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch audit logs (${response.status})`);
  }
  const body = (await response.json()) as { items?: AuditLogEntry[] };
  return Array.isArray(body.items) ? body.items : [];
};

export const useAuditLogFeed = (limit: number = DEFAULT_LIMIT) => {
  const store = useGovernanceStore();
  const [state, setState] = useState<AuditFeedState>({
    entries: [],
    buffered: [],
    loading: true,
    error: undefined,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const [remote, buffered] = await Promise.all([
        fetchAuditLogs(limit).catch((error: unknown) => {
          if (error instanceof Error) {
            throw error;
          }
          throw new Error('Unable to fetch audit logs.');
        }),
        listBufferedAuditEntries(store),
      ]);

      const merged = mergeAuditFeeds(remote, buffered).map((entry) => {
        const bufferedEntry = buffered.find((record) => record.id === entry.id);
        if (bufferedEntry) {
          return {
            ...entry,
            bufferedAt: bufferedEntry.bufferedAt,
            attempts: bufferedEntry.attempts,
            lastError: bufferedEntry.lastError ?? null,
            pending: true as const,
          };
        }
        return entry;
      });

      setState({
        entries: merged,
        buffered,
        loading: false,
        error: undefined,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load audit logs.';
      const buffered = await listBufferedAuditEntries(store);
      const merged = mergeAuditFeeds([], buffered).map((entry) => {
        const bufferedEntry = buffered.find((record) => record.id === entry.id);
        if (bufferedEntry) {
          return {
            ...entry,
            bufferedAt: bufferedEntry.bufferedAt,
            attempts: bufferedEntry.attempts,
            lastError: bufferedEntry.lastError ?? null,
            pending: true as const,
          };
        }
        return entry;
      });

      setState({
        entries: merged,
        buffered,
        loading: false,
        error: message,
      });
    }
  }, [limit, store]);

  useEffect(() => {
    void load();
  }, [load]);

  const flush = useCallback(async () => {
    const buffered = await listBufferedAuditEntries(store);
    if (!buffered.length) {
      return;
    }
    await flushBufferedAuditEntries(store, async (entries) => {
      const response = await fetch('/api/audit/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items: entries }),
      });
      if (!response.ok) {
        const message = `Failed to deliver audit logs (${response.status})`;
        throw new Error(message);
      }
    }, {
      onError: (error) => {
        setState((prev) => ({ ...prev, error: error.message }));
      },
    });
    await load();
  }, [load, store]);

  const bufferedCount = useMemo(() => state.buffered.length, [state.buffered.length]);

  return {
    entries: state.entries,
    bufferedCount,
    loading: state.loading,
    error: state.error,
    refresh: load,
    flush,
  } as const;
};
