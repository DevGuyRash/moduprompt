export interface SnippetType {
  id: string;
  title: string;
  content: string;
  folder: string;
  frontmatter?: Record<string, any>;
  createdAt: number;
  updatedAt: number;
}

export interface FolderType {
  path: string;
  name: string;
  isExpanded?: boolean;
}
