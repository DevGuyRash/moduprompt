export interface SnippetType {
  id: string;
  name: string;
  title: string;
  content: string;
  folder: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SnippetFolder {
  id: string;
  name: string;
  parentId: string | null;
  path: string; // Add path property
}

export type FolderType = SnippetFolder;
