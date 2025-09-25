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
import { fromJson, fromJsonOrUndefined, requireJson } from './prismaJson.js';

const toMillis = (value: Date): number => value.getTime();

export const mapSnippet = (record: SnippetRecord): Snippet => ({
  id: record.id,
  title: record.title,
  path: record.path,
  frontmatter: requireJson<SnippetFrontmatter>(record.frontmatter),
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
  frontmatter: requireJson<SnippetFrontmatter>(record.frontmatter),
  hash: record.hash,
});

export const mapDocument = (record: DocumentModelRecord): DocumentModel => ({
  id: record.id,
  title: record.title,
  schemaVersion: record.schemaVersion as 2,
  blocks: fromJson<DocumentModel['blocks']>(record.blocks, []),
  edges: fromJson<DocumentModel['edges']>(record.edges, []),
  variables: fromJson<DocumentModel['variables']>(record.variables, []),
  exportRecipes: fromJson<DocumentModel['exportRecipes']>(record.exportRecipes, []),
  tags: fromJson<string[]>(record.tags, []),
  statusKey: record.statusKey,
  settings: requireJson<DocumentModel['settings']>(record.settings),
  createdAt: toMillis(record.createdAt),
  updatedAt: toMillis(record.updatedAt),
});

export const mapExportRecipe = (record: ExportRecipeRecord): ExportRecipe => ({
  id: record.id,
  name: record.name,
  type: record.type as ExportRecipe['type'],
  include: requireJson<ExportRecipe['include']>(record.include),
  theme: record.theme ?? undefined,
  pdf: fromJsonOrUndefined<ExportRecipe['pdf']>(record.pdf),
  allowedStatuses: fromJsonOrUndefined<string[]>(record.allowedStatuses),
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
});
