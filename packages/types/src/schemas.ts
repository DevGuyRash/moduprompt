import { createRequire } from 'node:module';
import type { JSONSchema7 } from 'json-schema';

const requireJson = createRequire(import.meta.url);

export const DocumentModelSchema = requireJson('../schema/document-model.json') as JSONSchema7;
export const BlockSchema = requireJson('../schema/block.json') as JSONSchema7;
export const EdgeSchema = requireJson('../schema/edge.json') as JSONSchema7;
export const VariableDefinitionSchema = requireJson('../schema/variable-definition.json') as JSONSchema7;
export const SnippetSchema = requireJson('../schema/snippet.json') as JSONSchema7;
export const SnippetVersionSchema = requireJson('../schema/snippet-version.json') as JSONSchema7;
export const ExportRecipeSchema = requireJson('../schema/export-recipe.json') as JSONSchema7;
export const WorkspaceStatusSchema = requireJson('../schema/workspace-status.json') as JSONSchema7;
export const AuditLogEntrySchema = requireJson('../schema/audit-log-entry.json') as JSONSchema7;
export const ModuPromptSchema = requireJson('../schema/moduprompt.json') as JSONSchema7;

export const SchemaIndex = requireJson('../schema/index.json') as Record<string, string>;

export type ModuPromptSchemaMap = {
  DocumentModel: JSONSchema7;
  Block: JSONSchema7;
  Edge: JSONSchema7;
  VariableDefinition: JSONSchema7;
  Snippet: JSONSchema7;
  SnippetVersion: JSONSchema7;
  ExportRecipe: JSONSchema7;
  WorkspaceStatus: JSONSchema7;
  AuditLogEntry: JSONSchema7;
};

export const schemas: ModuPromptSchemaMap = {
  DocumentModel: DocumentModelSchema,
  Block: BlockSchema,
  Edge: EdgeSchema,
  VariableDefinition: VariableDefinitionSchema,
  Snippet: SnippetSchema,
  SnippetVersion: SnippetVersionSchema,
  ExportRecipe: ExportRecipeSchema,
  WorkspaceStatus: WorkspaceStatusSchema,
  AuditLogEntry: AuditLogEntrySchema,
};
