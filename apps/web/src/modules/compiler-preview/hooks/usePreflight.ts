import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  DocumentModel,
  ExportRecipe,
  Snippet,
  SnippetVersion,
} from '@moduprompt/types';
import type { WorkspaceStore } from '@moduprompt/snippet-store';
import { computeIntegrityHash } from '@moduprompt/snippet-store';
import { type CompileResult, type SnippetBundle } from '@moduprompt/compiler';
import { useDocumentStore } from '../../../state/document-model.js';
import { CompilerWorkerBridge } from '../../../services/workers/compilerBridge.js';

interface UsePreflightOptions {
  documentId: string;
  store: WorkspaceStore;
  recipe?: ExportRecipe;
  variables?: Record<string, string | number | boolean | null>;
}

interface UsePreflightResult {
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  result?: CompileResult;
  snippetBundles: SnippetBundle[];
  documentVersion?: number;
  hasBlockingIssues: boolean;
}

interface DocumentSnapshot {
  document: DocumentModel;
  version: number;
}

const cloneDocument = (document: DocumentModel): DocumentModel => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(document);
  }
  return JSON.parse(JSON.stringify(document)) as DocumentModel;
};

const ensureVersions = async (
  snippet: Snippet,
  versions: SnippetVersion[],
): Promise<SnippetVersion[]> => {
  if (versions.length > 0) {
    return versions
      .map((version) => ({
        ...version,
        frontmatter: { ...version.frontmatter },
      }))
      .sort((a, b) => a.rev - b.rev);
  }

  const hash = await computeIntegrityHash(snippet.body, snippet.frontmatter);
  return [
    {
      snippetId: snippet.id,
      rev: snippet.headRev,
      parentRev: snippet.headRev > 1 ? snippet.headRev - 1 : undefined,
      body: snippet.body,
      frontmatter: { ...snippet.frontmatter },
      timestamp: snippet.updatedAt,
      hash,
      note: undefined,
      author: undefined,
    },
  ];
};

const loadSnippetBundles = async (store: WorkspaceStore): Promise<SnippetBundle[]> => {
  const snippets = await store.listSnippets();
  if (!snippets.length) {
    return [];
  }

  const sorted = [...snippets].sort((a, b) => a.id.localeCompare(b.id));
  const bundles = await Promise.all(
    sorted.map(async (snippet) => {
      try {
        const versions = await store.listSnippetVersions(snippet.id);
        const ensured = await ensureVersions(snippet, versions);
        return {
          snippet: { ...snippet, frontmatter: { ...snippet.frontmatter } },
          versions: ensured,
        } satisfies SnippetBundle;
      } catch {
        return null;
      }
    }),
  );

  return bundles.filter((bundle): bundle is SnippetBundle => bundle != null);
};

export const usePreflight = ({ documentId, store, recipe, variables }: UsePreflightOptions): UsePreflightResult => {
  const snapshot = useDocumentStore(
    useMemo(
      () =>
        (state) => {
          const record = state.documents[documentId];
          if (!record) {
            return undefined;
          }
          return {
            document: record.model,
            version: record.version,
          } satisfies DocumentSnapshot;
        },
      [documentId],
    ),
  );

  const [state, setState] = useState<UsePreflightResult>({
    status: 'idle',
    snippetBundles: [],
    hasBlockingIssues: false,
  });

  const bridgeRef = useRef<CompilerWorkerBridge>();
  if (!bridgeRef.current) {
    bridgeRef.current = new CompilerWorkerBridge({ timeoutMs: 10_000 });
  }

  const recipeKey = useMemo(() => {
    if (!recipe) {
      return 'none';
    }
    const allowed = recipe.allowedStatuses?.join('|') ?? 'all';
    return `${recipe.id}:${allowed}`;
  }, [recipe]);

  const variablesKey = useMemo(() => JSON.stringify(variables ?? {}), [variables]);
  const resolvedVariables = useMemo(() => variables ?? {}, [variablesKey]);
  const allowedStatuses = useMemo(() => recipe?.allowedStatuses, [recipeKey]);

  useEffect(() => {
    if (!snapshot) {
      setState({ status: 'idle', snippetBundles: [], hasBlockingIssues: false });
      return;
    }

    let cancelled = false;

    const runPreflight = async () => {
      setState((prev) => ({
        status: 'loading',
        snippetBundles: prev.snippetBundles,
        hasBlockingIssues: false,
        documentVersion: snapshot.version,
        error: undefined,
        result: undefined,
      }));

      try {
        const bundles = await loadSnippetBundles(store);
        if (cancelled) {
          return;
        }

        const documentClone = cloneDocument(snapshot.document);
        const bridge = bridgeRef.current!;
        const result = await bridge.compile(
          {
            document: documentClone,
            snippets: bundles,
            variables: resolvedVariables,
            allowedStatuses,
          },
          { timeoutMs: 10_000 },
        );

        if (cancelled) {
          return;
        }

        const hasBlockingIssues = (result.preflight.summary.errors ?? 0) > 0;

        setState({
          status: 'success',
          result,
          snippetBundles: bundles,
          documentVersion: snapshot.version,
          hasBlockingIssues,
          error: undefined,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          status: 'error',
          error: error instanceof Error ? error.message : 'Failed to generate preview.',
          snippetBundles: [],
          hasBlockingIssues: true,
          documentVersion: snapshot.version,
          result: undefined,
        });
      }
    };

    void runPreflight();

    return () => {
      cancelled = true;
    };
  }, [snapshot, store, recipeKey, variablesKey, resolvedVariables, allowedStatuses]);

  useEffect(() => () => bridgeRef.current?.dispose(), []);

  return state;
};
