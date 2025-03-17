export interface SnippetType {
  id: string;
  name: string;
  content: string;
  folder: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SnippetFolder {
  id: string;
  name: string;
  parentId: string | null;
}
