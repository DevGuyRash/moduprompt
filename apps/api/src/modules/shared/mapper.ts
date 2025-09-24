import type {
  DocumentModel,
  ExportRecipe,
  Snippet,
  SnippetFrontmatter,
  SnippetVersion,
  WorkspaceStatus,
} from '@moduprompt/types';
import type {
  Document as DocumentModelRecord,
  ExportRecipe as ExportRecipeRecord,
  Snippet as SnippetRecord,
  SnippetVersion as SnippetVersionRecord,
  WorkspaceStatus as WorkspaceStatusRecord,
} from '@prisma/client';

const toMillis = (value: Date): number => value.getTime();

export const mapSnippet = (record: SnippetRecord): Snippet => ({
  id: record.id,
  title: record.title,
  path: record.path,
  frontmatter: record.frontmatter as SnippetFrontmatter,
  body: record.body,
  headRev: record.headRev,
  createdAt: toMillis(record.createdAt),
  updatedAt: toMillis(record.updatedAt),
});

export const mapSnippetVersion = (record: SnippetVersionRecord): SnippetVersion => ({
  snippetId: record.snippetId,
  rev: record.rev,
  parentRev: record.parentRev ?? undefined,
  author: record.authorId
    ? {
        id: record.authorId,
        name: record.authorName ?? undefined,
        email: record.authorEmail ?? undefined,
      }
    : undefined,
  note: record.note ?? undefined,
  timestamp: toMillis(record.timestamp),
  body: record.body,
  frontmatter: record.frontmatter as SnippetFrontmatter,
  hash: record.hash,
});

export const mapDocument = (record: DocumentModelRecord): DocumentModel => ({
  id: record.id,
  title: record.title,
  schemaVersion: record.schemaVersion as 2,
  blocks: record.blocks as DocumentModel['blocks'],
  edges: record.edges as DocumentModel['edges'],
  variables: record.variables as DocumentModel['variables'],
  exportRecipes: record.exportRecipes as DocumentModel['exportRecipes'],
  tags: (record.tags as string[]) ?? [],
  statusKey: record.statusKey,
  settings: record.settings as DocumentModel['settings'],
  createdAt: toMillis(record.createdAt),
  updatedAt: toMillis(record.updatedAt),
});

export const mapExportRecipe = (record: ExportRecipeRecord): ExportRecipe => ({
  id: record.id,
  name: record.name,
  type: record.type as ExportRecipe['type'],
  include: record.include as ExportRecipe['include'],
  theme: record.theme ?? undefined,
  pdf: record.pdf as ExportRecipe['pdf'],
  allowedStatuses: (record.allowedStatuses as string[]) ?? undefined,
  createdAt: toMillis(record.createdAt),
  updatedAt: toMillis(record.updatedAt),
});

export const mapWorkspaceStatus = (record: WorkspaceStatusRecord): WorkspaceStatus => ({
  key: record.key,
  name: record.name,
  color: record.color as WorkspaceStatus['color'],
  description: record.description ?? undefined,
  order: record.order ?? undefined,
  isFinal: record.isFinal,
  createdAt: toMillis(record.createdAt),
  updatedAt: toMillis(record.updatedAt),
});
