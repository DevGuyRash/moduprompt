import type { Snippet } from '@moduprompt/types';
import type { SnippetTreeItem } from '../types';
import { SMART_FOLDERS, type SmartFolderConfig } from './constants';

const normalize = (value: string): string => value.trim().toLowerCase();

const splitPath = (path: string): string[] =>
  path
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);

export const computeDuplicateIds = (snippets: Snippet[]): Set<string> => {
  const groups = new Map<string, string[]>();
  for (const snippet of snippets) {
    const key = `${normalize(snippet.body)}::${JSON.stringify(snippet.frontmatter ?? {})}`;
    const group = groups.get(key);
    if (group) {
      group.push(snippet.id);
    } else {
      groups.set(key, [snippet.id]);
    }
  }

  const duplicates = new Set<string>();
  for (const group of groups.values()) {
    if (group.length > 1) {
      for (const id of group) {
        duplicates.add(id);
      }
    }
  }
  return duplicates;
};

const matchesQuery = (snippet: Snippet, query: string): boolean => {
  if (!query) return true;
  const term = normalize(query);
  if (normalize(snippet.title).includes(term)) return true;
  if (normalize(snippet.path ?? '').includes(term)) return true;
  if (normalize(snippet.body).includes(term)) return true;
  const tags = Array.isArray((snippet.frontmatter as { tags?: string[] } | undefined)?.tags)
    ? ((snippet.frontmatter as { tags?: string[] } | undefined)?.tags as string[])
    : [];
  return tags.some((tag) => normalize(tag).includes(term));
};

const matchesSmartFolder = (
  snippet: Snippet,
  folderId: string | undefined,
  duplicateIds: Set<string>,
  folders: SmartFolderConfig[] = SMART_FOLDERS,
): boolean => {
  if (!folderId) return true;
  const config = folders.find((item) => item.id === folderId);
  if (!config) return true;
  return config.predicate({
    id: snippet.id,
    updatedAt: snippet.updatedAt,
    tags: Array.isArray((snippet.frontmatter as { tags?: string[] } | undefined)?.tags)
      ? ((snippet.frontmatter as { tags?: string[] } | undefined)?.tags as string[])
      : [],
    duplicateIds,
  });
};

export const filterSnippets = (
  snippets: Snippet[],
  query: string,
  smartFolderId: string | undefined,
  duplicateIds: Set<string>,
): Snippet[] =>
  snippets.filter((snippet) => matchesQuery(snippet, query) && matchesSmartFolder(snippet, smartFolderId, duplicateIds));

const compareSnippet = (a: Snippet, b: Snippet): number => {
  const pathCompare = (a.path ?? '').localeCompare(b.path ?? '');
  if (pathCompare !== 0) return pathCompare;
  const titleCompare = a.title.localeCompare(b.title);
  if (titleCompare !== 0) return titleCompare;
  return a.id.localeCompare(b.id);
};

const ensureFolder = (
  map: Map<string, SnippetTreeItem>,
  segments: string[],
  depth: number,
): SnippetTreeItem => {
  const path = segments.slice(0, depth + 1).join('/');
  const existing = map.get(path);
  if (existing) {
    existing.count = (existing.count ?? 0) + 1;
    return existing;
  }
  const item: SnippetTreeItem = {
    id: `folder:${path}`,
    name: segments[depth]!,
    path,
    depth,
    type: 'folder',
    count: 1,
  };
  map.set(path, item);
  return item;
};

export const buildFolderTree = (snippets: Snippet[]): SnippetTreeItem[] => {
  const sorted = [...snippets].sort(compareSnippet);
  const folders = new Map<string, SnippetTreeItem>();
  const nodes: SnippetTreeItem[] = [];

  for (const snippet of sorted) {
    const segments = splitPath(snippet.path ?? '');
    segments.forEach((_, index) => {
      const folder = ensureFolder(folders, segments, index);
      if (!nodes.includes(folder)) {
        nodes.push(folder);
      }
    });

    nodes.push({
      id: `snippet:${snippet.id}`,
      name: snippet.title,
      path: segments.join('/'),
      depth: segments.length,
      type: 'snippet',
      snippet,
    });
  }

  return nodes;
};

export const buildSmartFolders = (
  snippets: Snippet[],
  duplicateIds: Set<string>,
): Array<SnippetTreeItem & { config: SmartFolderConfig }> => {
  const items: Array<SnippetTreeItem & { config: SmartFolderConfig }> = [];
  for (const config of SMART_FOLDERS) {
    const count = snippets.reduce((acc, snippet) => {
      if (config.predicate({
        id: snippet.id,
        updatedAt: snippet.updatedAt,
        tags: Array.isArray((snippet.frontmatter as { tags?: string[] } | undefined)?.tags)
          ? ((snippet.frontmatter as { tags?: string[] } | undefined)?.tags as string[])
          : [],
        duplicateIds,
      })) {
        return acc + 1;
      }
      return acc;
    }, 0);

    if (count > 0) {
      items.push({
        id: `smart:${config.id}`,
        name: config.name,
        path: `smart/${config.id}`,
        depth: 0,
        type: 'smart-folder',
        count,
        config,
      });
    }
  }
  return items;
};
