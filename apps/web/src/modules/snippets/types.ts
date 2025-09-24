import type { Snippet, SnippetVersion } from '@moduprompt/types';
import type { WorkspaceStore } from '@moduprompt/snippet-store';

export interface SnippetInsertPayload {
  id: string;
  title: string;
  revision: number;
  body: string;
  frontmatter: Snippet['frontmatter'];
}

export interface SnippetLibrarySelection {
  snippet?: Snippet;
  version?: SnippetVersion;
}

export interface SnippetLibraryPanelProps {
  className?: string;
  store?: WorkspaceStore;
  /**
   * When provided, the panel will attempt to select the snippet matching the id on mount.
   */
  initialSnippetId?: string;
  /**
   * Callback triggered when the user explicitly chooses to insert a snippet.
   */
  onSnippetInsert?: (payload: SnippetInsertPayload) => void;
  /**
   * Callback fired whenever the active snippet or revision changes.
   */
  onSelectionChange?: (selection: SnippetLibrarySelection) => void;
}

export interface SnippetTreeItem {
  type: 'folder' | 'snippet' | 'smart-folder';
  id: string;
  name: string;
  depth: number;
  path: string;
  snippet?: Snippet;
  count?: number;
  badge?: string;
}

export interface SnippetTimelineEntry {
  version: SnippetVersion;
  previous?: SnippetVersion;
  label: string;
  createdAt: Date;
  isHead: boolean;
  isPinned: boolean;
}

export interface SnippetLibraryState {
  store: WorkspaceStore;
  loading: boolean;
  error?: string;
  query: string;
  smartFolderId?: string;
  snippets: Snippet[];
  versions: SnippetVersion[];
  selectedSnippetId?: string;
  selectedRevision?: number;
  pinnedRevision?: number;
  duplicateIds: Set<string>;
}
