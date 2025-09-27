import type { AuditLogEntry, JsonObject } from '@moduprompt/types';

const toIso = (epochMillis: number): string => new Date(epochMillis).toISOString();

export interface MigrationAuditMetadata extends JsonObject {
  fromVersion: number;
  toVersion: number;
  durationMs: number;
  itemsProcessed?: number;
  itemsUpdated?: number;
  notes?: string;
}

export interface MigrationAuditInput {
  id: string;
  subjectId?: string;
  fromVersion: number;
  toVersion: number;
  startedAt: number;
  finishedAt: number;
  metadata?: Omit<MigrationAuditMetadata, 'fromVersion' | 'toVersion' | 'durationMs'> &
    Partial<Pick<MigrationAuditMetadata, 'itemsProcessed' | 'itemsUpdated' | 'notes'>>;
}

export const createMigrationAuditEntry = ({
  id,
  subjectId = 'workspace',
  fromVersion,
  toVersion,
  startedAt,
  finishedAt,
  metadata,
}: MigrationAuditInput): AuditLogEntry => {
  const occurredAt = toIso(finishedAt);
  const durationMs = Math.max(0, finishedAt - startedAt);

  const normalizedMetadata: MigrationAuditMetadata = {
    fromVersion,
    toVersion,
    durationMs,
  };

  if (metadata?.itemsProcessed !== undefined) {
    normalizedMetadata.itemsProcessed = metadata.itemsProcessed;
  }
  if (metadata?.itemsUpdated !== undefined) {
    normalizedMetadata.itemsUpdated = metadata.itemsUpdated;
  }
  if (metadata?.notes) {
    normalizedMetadata.notes = metadata.notes;
  }

  return {
    id,
    type: 'workspace.migration.applied',
    subjectId,
    occurredAt,
    metadata: normalizedMetadata,
    createdAt: finishedAt,
    updatedAt: finishedAt,
  } satisfies AuditLogEntry;
};
