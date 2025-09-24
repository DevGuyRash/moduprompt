import type { Snippet, SnippetVersion } from '@moduprompt/types';
import {
  type SnippetBundle,
  type SnippetIndex,
  type SnippetIndexEntry,
} from './types.js';
import { normalizeNewlines } from './utils/text.js';

export interface ResolvedSnippet {
  snippet: Snippet;
  version: SnippetVersion;
  body: string;
}

const normalizeBody = (body: string): string => normalizeNewlines(body);

const selectHeadVersion = (snippet: Snippet, versions: Map<number, SnippetVersion>): SnippetVersion | undefined => {
  if (versions.has(snippet.headRev)) {
    return versions.get(snippet.headRev);
  }
  const sorted = Array.from(versions.values()).sort((a, b) => a.rev - b.rev);
  return sorted[sorted.length - 1];
};

export const buildSnippetIndex = (bundles?: SnippetBundle[]): SnippetIndex => {
  const byId = new Map<string, SnippetIndexEntry>();
  const byPath = new Map<string, SnippetIndexEntry>();
  if (!bundles) {
    return { byId, byPath } satisfies SnippetIndex;
  }

  for (const bundle of bundles) {
    const versionsByRevision = new Map<number, SnippetVersion>();
    for (const version of bundle.versions) {
      versionsByRevision.set(version.rev, version);
    }
    const head = selectHeadVersion(bundle.snippet, versionsByRevision);
    const entry: SnippetIndexEntry = {
      snippet: bundle.snippet,
      versionsByRevision,
      head,
    };
    byId.set(bundle.snippet.id, entry);
    byPath.set(bundle.snippet.path, entry);
  }

  return { byId, byPath } satisfies SnippetIndex;
};

const resolveFromEntry = (
  entry: SnippetIndexEntry | undefined,
  revision?: number,
): ResolvedSnippet | undefined => {
  if (!entry) {
    return undefined;
  }
  const version = revision != null ? entry.versionsByRevision.get(revision) : entry.head;
  if (!version) {
    return undefined;
  }
  return {
    snippet: entry.snippet,
    version,
    body: normalizeBody(version.body),
  } satisfies ResolvedSnippet;
};

export const resolveSnippetById = (
  index: SnippetIndex,
  snippetId: string,
  revision?: number,
): ResolvedSnippet | undefined => resolveFromEntry(index.byId.get(snippetId), revision);

export const resolveSnippetByPath = (
  index: SnippetIndex,
  path: string,
  revision?: number,
): ResolvedSnippet | undefined => resolveFromEntry(index.byPath.get(path), revision);

export interface TransclusionToken {
  raw: string;
  identifier: string;
  revision?: number;
}

const TRANSCLUSION_PATTERN = /\{\{\s*>\s*([a-zA-Z0-9/_-]+)(?:@([0-9]+))?\s*\}\}/g;

export const collectTransclusionTokens = (input: string): TransclusionToken[] => {
  const tokens: TransclusionToken[] = [];
  const normalized = normalizeNewlines(input);
  let match: RegExpExecArray | null;
  while ((match = TRANSCLUSION_PATTERN.exec(normalized)) != null) {
    const identifier = match[1] ?? '';
    const revision = match[2] != null ? Number.parseInt(match[2], 10) : undefined;
    tokens.push({ raw: match[0] ?? '', identifier, revision });
  }
  return tokens;
};
