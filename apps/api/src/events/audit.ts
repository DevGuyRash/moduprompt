import type { AuditLogEntry } from '@moduprompt/types';
import { nanoid } from 'nanoid';
import type { DomainEvent } from './domainEvents.js';

export const toAuditLogEntry = (event: DomainEvent): AuditLogEntry => {
  const base: AuditLogEntry = {
    id: nanoid(),
    type: event.type === 'export.created' ? 'export.completed' : event.type,
    subjectId: 'unknown',
    metadata: {},
    actorId: event.actorId,
    occurredAt: event.occurredAt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as AuditLogEntry;

  switch (event.type) {
    case 'snippet.version.created':
      return {
        ...base,
        type: 'snippet.version.created',
        subjectId: event.snippet.id,
        metadata: {
          rev: event.version.rev,
          headRev: event.snippet.headRev,
        },
      } satisfies AuditLogEntry;
    case 'snippet.version.reverted':
      return {
        ...base,
        type: 'snippet.version.reverted',
        subjectId: event.snippet.id,
        metadata: {
          rev: event.version.rev,
          revertedToRev: event.revertedToRev,
        },
      } satisfies AuditLogEntry;
    case 'document.status.changed':
      return {
        ...base,
        type: 'document.status.changed',
        subjectId: event.document.id,
        metadata: {
          previousStatus: event.previousStatus,
          nextStatus: event.document.statusKey,
        },
      } satisfies AuditLogEntry;
    case 'document.tags.changed':
      return {
        ...base,
        type: 'document.tags.changed',
        subjectId: event.document.id,
        metadata: {
          previousTags: event.previousTags,
          nextTags: event.document.tags,
        },
      } satisfies AuditLogEntry;
    case 'export.created':
      return {
        ...base,
        type: 'export.completed',
        subjectId: event.exportJobId,
        metadata: {
          documentId: event.documentId,
          recipeId: event.recipe.id,
          status: 'queued',
        },
      } satisfies AuditLogEntry;
    case 'export.completed':
      return {
        ...base,
        type: 'export.completed',
        subjectId: event.exportJobId,
        metadata: {
          documentId: event.documentId,
          recipeId: event.recipe.id,
          artifactUri: event.artifactUri,
        },
      } satisfies AuditLogEntry;
    case 'export.failed':
      return {
        ...base,
        type: 'export.completed',
        subjectId: event.exportJobId,
        metadata: {
          documentId: event.documentId,
          recipeId: event.recipe.id,
          error: event.error,
        },
      } satisfies AuditLogEntry;
    case 'plugin.installed':
      return {
        ...base,
        type: 'plugin.installed',
        subjectId: event.pluginId,
        metadata: {
          name: event.name,
          version: event.version,
        },
      } satisfies AuditLogEntry;
    default:
      return base;
  }
};
