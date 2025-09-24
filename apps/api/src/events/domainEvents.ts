import type { AuditLogEntry, DocumentModel, ExportRecipe, Snippet, SnippetVersion } from '@moduprompt/types';

export type DomainEventType =
  | 'snippet.version.created'
  | 'snippet.version.reverted'
  | 'document.status.changed'
  | 'document.tags.changed'
  | 'export.created'
  | 'export.completed'
  | 'export.failed'
  | 'plugin.installed';

export interface DomainEventBase {
  id: string;
  type: DomainEventType;
  occurredAt: string;
  actorId?: string;
}

export interface SnippetVersionCreatedEvent extends DomainEventBase {
  type: 'snippet.version.created';
  snippet: Snippet;
  version: SnippetVersion;
}

export interface SnippetVersionRevertedEvent extends DomainEventBase {
  type: 'snippet.version.reverted';
  snippet: Snippet;
  version: SnippetVersion;
  revertedToRev: number;
}

export interface DocumentStatusChangedEvent extends DomainEventBase {
  type: 'document.status.changed';
  document: DocumentModel;
  previousStatus?: string | null;
}

export interface DocumentTagsChangedEvent extends DomainEventBase {
  type: 'document.tags.changed';
  document: DocumentModel;
  previousTags: string[];
}

export interface ExportCreatedEvent extends DomainEventBase {
  type: 'export.created';
  exportJobId: string;
  documentId: string;
  recipe: ExportRecipe;
}

export interface ExportCompletedEvent extends DomainEventBase {
  type: 'export.completed';
  exportJobId: string;
  documentId: string;
  recipe: ExportRecipe;
  artifactUri: string;
}

export interface ExportFailedEvent extends DomainEventBase {
  type: 'export.failed';
  exportJobId: string;
  documentId: string;
  recipe: ExportRecipe;
  error: string;
}

export interface PluginInstalledEvent extends DomainEventBase {
  type: 'plugin.installed';
  pluginId: string;
  name: string;
  version: string;
}

export type DomainEvent =
  | SnippetVersionCreatedEvent
  | SnippetVersionRevertedEvent
  | DocumentStatusChangedEvent
  | DocumentTagsChangedEvent
  | ExportCreatedEvent
  | ExportCompletedEvent
  | ExportFailedEvent
  | PluginInstalledEvent;

export interface AuditLogFactory {
  (event: DomainEvent): AuditLogEntry;
}
