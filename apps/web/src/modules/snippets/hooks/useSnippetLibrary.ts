import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Snippet, SnippetVersion, SnippetFrontmatter } from '@moduprompt/types';
import { computeIntegrityHash } from '@moduprompt/snippet-store';
import type { WorkspaceStore } from '@moduprompt/snippet-store';
import { useSnippetLibraryContext } from '../provider.js';
import type {
  SnippetLibrarySelection,
  SnippetLibraryState,
  SnippetTimelineEntry,
  SnippetTreeItem,
} from '../types.js';
import { buildFolderTree, buildSmartFolders, computeDuplicateIds, filterSnippets } from '../utils/tree.js';
import type { SmartFolderConfig } from '../utils/constants.js';

interface UseSnippetLibraryOptions {
  initialSnippetId?: string;
  store?: WorkspaceStore;
  onSelectionChange?: (selection: SnippetLibrarySelection) => void;
}

const findPinnedRevision = (snippet: Snippet | undefined): number | undefined => {
  if (!snippet) return undefined;
  const fm = snippet.frontmatter ?? {};
  const candidate = (fm as { pinnedRevision?: number; pinnedRev?: number }).pinnedRevision ?? (
    fm as { pinnedRevision?: number; pinnedRev?: number }
  ).pinnedRev;
  return typeof candidate === 'number' ? candidate : undefined;
};

const formatTimelineLabel = (version: SnippetVersion, isHead: boolean): string => {
  const formatter = Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const timestamp = formatter.format(new Date(version.timestamp));
  return isHead ? `Head · v${version.rev} · ${timestamp}` : `v${version.rev} · ${timestamp}`;
};

export const useSnippetLibrary = ({
  initialSnippetId,
  store: storeOverride,
  onSelectionChange,
}: UseSnippetLibraryOptions = {}) => {
  const contextStore = useSnippetLibraryContext();
  const store = storeOverride ?? contextStore;

  const [state, setState] = useState<SnippetLibraryState>(() => ({
    store,
    loading: true,
    query: '',
    snippets: [],
    versions: [],
    duplicateIds: new Set<string>(),
    smartFolderId: undefined,
    selectedSnippetId: initialSnippetId,
    selectedRevision: undefined,
    pinnedRevision: undefined,
  }));
  const [smartFolders, setSmartFolders] = useState<Array<SnippetTreeItem & { config: SmartFolderConfig }>>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    setState((prev) => ({ ...prev, store }));
  }, [store]);

  const refreshSnippets = useCallback(
    async (preferredId?: string, options?: { signal?: AbortSignal }) => {
      setState((prev) => ({ ...prev, loading: true, error: undefined }));
      try {
        const list = await store.listSnippets();
        if (options?.signal?.aborted) return;
        const duplicates = computeDuplicateIds(list);
        const smart = buildSmartFolders(list, duplicates);
        setSmartFolders(smart);
        if (options?.signal?.aborted) return;
        setState((prev) => {
          const desiredId = preferredId ?? prev.selectedSnippetId ?? initialSnippetId;
          const resolvedId = desiredId && list.some((item) => item.id === desiredId) ? desiredId : list[0]?.id;
          return {
            ...prev,
            loading: false,
            snippets: list,
            duplicateIds: duplicates,
            selectedSnippetId: resolvedId,
            selectedRevision: prev.selectedSnippetId === resolvedId ? prev.selectedRevision : undefined,
          };
        });
      } catch (error) {
        if (options?.signal?.aborted) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load snippets',
        }));
      }
    },
    [initialSnippetId, store],
  );

  useEffect(() => {
    const controller = new AbortController();
    void refreshSnippets(initialSnippetId, { signal: controller.signal });
    return () => controller.abort();
  }, [initialSnippetId, refreshSnippets]);

  const loadVersions = useCallback(
    async (snippetId: string, options?: { signal?: AbortSignal }) => {
      setTimelineLoading(true);
      try {
        const [snippet, versions] = await Promise.all([
          store.getSnippet(snippetId),
          store.listSnippetVersions(snippetId),
        ]);
        if (options?.signal?.aborted) return;
        const ordered = [...versions].sort((a, b) => b.rev - a.rev);
        setState((prev) => ({
          ...prev,
          versions: ordered,
          selectedRevision: prev.selectedRevision ?? ordered[0]?.rev,
          pinnedRevision: findPinnedRevision(snippet ?? undefined),
        }));
      } catch (error) {
        if (options?.signal?.aborted) return;
        setState((prev) => ({
          ...prev,
          versions: [],
          selectedRevision: undefined,
          pinnedRevision: undefined,
          error: error instanceof Error ? error.message : 'Failed to load revisions',
        }));
      } finally {
        if (!options?.signal?.aborted) {
          setTimelineLoading(false);
        }
      }
    },
    [store],
  );

  useEffect(() => {
    if (!state.selectedSnippetId) {
      setState((prev) => ({ ...prev, versions: [], selectedRevision: undefined, pinnedRevision: undefined }));
      return;
    }
    const controller = new AbortController();
    void loadVersions(state.selectedSnippetId, { signal: controller.signal });
    return () => controller.abort();
  }, [loadVersions, state.selectedSnippetId]);

  const activeSnippet = useMemo(
    () => state.snippets.find((snippet) => snippet.id === state.selectedSnippetId),
    [state.snippets, state.selectedSnippetId],
  );

  const activeVersion = useMemo(() => {
    if (!state.selectedRevision) {
      return state.versions[0];
    }
    return state.versions.find((version) => version.rev === state.selectedRevision) ?? state.versions[0];
  }, [state.selectedRevision, state.versions]);

  useEffect(() => {
    if (!onSelectionChange) return;
    onSelectionChange({ snippet: activeSnippet, version: activeVersion });
  }, [activeSnippet, activeVersion, onSelectionChange]);

  const filteredSnippets = useMemo(
    () => filterSnippets(state.snippets, state.query, state.smartFolderId, state.duplicateIds),
    [state.duplicateIds, state.query, state.smartFolderId, state.snippets],
  );

  const folderTree = useMemo<SnippetTreeItem[]>(() => buildFolderTree(filteredSnippets), [filteredSnippets]);

  const timeline = useMemo<SnippetTimelineEntry[]>(() => {
    if (!state.versions.length) return [];
    return state.versions.map((version, index) => ({
      version,
      previous: state.versions[index + 1],
      createdAt: new Date(version.timestamp),
      label: formatTimelineLabel(version, index === 0),
      isHead: index === 0,
      isPinned: state.pinnedRevision === version.rev,
    }));
  }, [state.pinnedRevision, state.versions]);

  const setQuery = useCallback((query: string) => {
    setState((prev) => {
      const filtered = filterSnippets(prev.snippets, query, prev.smartFolderId, prev.duplicateIds);
      const nextSelected = filtered.some((snippet) => snippet.id === prev.selectedSnippetId)
        ? prev.selectedSnippetId
        : filtered[0]?.id;
      return {
        ...prev,
        query,
        selectedSnippetId: nextSelected,
        selectedRevision: nextSelected === prev.selectedSnippetId ? prev.selectedRevision : undefined,
      };
    });
  }, []);

  const setSmartFolderId = useCallback((smartFolderId?: string) => {
    setState((prev) => {
      const filtered = filterSnippets(prev.snippets, prev.query, smartFolderId, prev.duplicateIds);
      const nextSelected = filtered.some((snippet) => snippet.id === prev.selectedSnippetId)
        ? prev.selectedSnippetId
        : filtered[0]?.id;
      return {
        ...prev,
        smartFolderId,
        selectedSnippetId: nextSelected,
        selectedRevision: nextSelected === prev.selectedSnippetId ? prev.selectedRevision : undefined,
      };
    });
  }, []);

  const selectSnippet = useCallback((snippetId: string) => {
    setState((prev) => ({
      ...prev,
      selectedSnippetId: snippetId,
      selectedRevision: undefined,
      pinnedRevision: findPinnedRevision(prev.snippets.find((snippet) => snippet.id === snippetId)),
    }));
  }, []);

  const selectRevision = useCallback((revision: number) => {
    setState((prev) => ({ ...prev, selectedRevision: revision }));
  }, []);

  const refresh = useCallback(() => void refreshSnippets(state.selectedSnippetId), [refreshSnippets, state.selectedSnippetId]);

  const restoreRevision = useCallback(
    async (revision: number, note?: string) => {
      if (!state.selectedSnippetId) return;
      const snippet = await store.getSnippet(state.selectedSnippetId);
      if (!snippet) {
        throw new Error(`Snippet ${state.selectedSnippetId} not found`);
      }
      const sourceVersion = state.versions.find((item) => item.rev === revision);
      if (!sourceVersion) {
        throw new Error(`Revision ${revision} not found for snippet ${state.selectedSnippetId}`);
      }
      const nextRev = snippet.headRev + 1;
      const timestamp = Date.now();
      const hash = await computeIntegrityHash(sourceVersion.body, sourceVersion.frontmatter);
      const newVersion: SnippetVersion = {
        snippetId: snippet.id,
        rev: nextRev,
        parentRev: snippet.headRev,
        author: sourceVersion.author,
        note: note ?? `Restore v${revision}`,
        timestamp,
        body: sourceVersion.body,
        frontmatter: sourceVersion.frontmatter,
        hash,
      };
      await store.putSnippetVersion(newVersion);
      await store.upsertSnippet({
        ...snippet,
        headRev: nextRev,
        updatedAt: timestamp,
        body: sourceVersion.body,
        frontmatter: sourceVersion.frontmatter,
      });
      await refreshSnippets(snippet.id);
      await loadVersions(snippet.id);
      setState((prev) => ({ ...prev, selectedRevision: nextRev }));
    },
    [loadVersions, refreshSnippets, state.selectedSnippetId, state.versions, store],
  );

  const pinRevision = useCallback(
    async (revision?: number) => {
      if (!state.selectedSnippetId) return;
      const snippet = await store.getSnippet(state.selectedSnippetId);
      if (!snippet) {
        throw new Error(`Snippet ${state.selectedSnippetId} not found`);
      }
      const frontmatter: SnippetFrontmatter = { ...snippet.frontmatter };
      if (typeof revision === 'number') {
        frontmatter.pinnedRevision = revision;
      } else {
        delete frontmatter.pinnedRevision;
        delete frontmatter.pinnedRev;
      }
      const timestamp = Date.now();
      await store.upsertSnippet({
        ...snippet,
        frontmatter,
        updatedAt: timestamp,
      });
      setState((prev) => ({ ...prev, pinnedRevision: revision }));
      await refreshSnippets(snippet.id);
    },
    [refreshSnippets, state.selectedSnippetId, store],
  );

  return {
    state,
    smartFolders,
    folderTree,
    timeline,
    timelineLoading,
    activeSnippet,
    activeVersion,
    actions: {
      setQuery,
      setSmartFolderId,
      selectSnippet,
      selectRevision,
      refresh,
      restoreRevision,
      pinRevision,
    },
  } as const;
};
