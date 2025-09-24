import type { AuditLogEntry, ExportRecipe, ISODateString, WorkspaceStatus } from '@moduprompt/types';
import { buildStatusIndex, findStatus } from './statusSchema';

export interface StatusTransitionInput {
  statuses: WorkspaceStatus[];
  from?: string | null;
  to: string;
}

export interface StatusTransitionResult {
  allowed: boolean;
  reason?: string;
  changed: boolean;
  from?: WorkspaceStatus | null;
  to?: WorkspaceStatus;
  unknownFrom?: boolean;
  targetFinal?: boolean;
}

const normalizeStatusKey = (value?: string | null): string => {
  if (!value) {
    return '';
  }
  return value.trim().toLowerCase();
};

export const normalizeTags = (tags: string[]): string[] => {
  const unique = new Set<string>();
  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (normalized.length > 0) {
      unique.add(normalized);
    }
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
};

export const validateStatusTransition = ({ statuses, from, to }: StatusTransitionInput): StatusTransitionResult => {
  const index = buildStatusIndex(statuses);
  if (index.ordered.length === 0) {
    return {
      allowed: false,
      changed: false,
      reason: 'Workspace status schema is empty.',
    } satisfies StatusTransitionResult;
  }

  const targetKey = normalizeStatusKey(to);
  const target = findStatus(index, targetKey);

  if (!target) {
    return {
      allowed: false,
      changed: false,
      reason: `Status "${to}" is not defined in the workspace schema.`,
    } satisfies StatusTransitionResult;
  }

  const fromKey = normalizeStatusKey(from);
  const current = findStatus(index, fromKey) ?? null;

  if (!current) {
    return {
      allowed: true,
      changed: true,
      to: target,
      from: null,
      unknownFrom: Boolean(fromKey),
      targetFinal: target.isFinal ?? false,
    } satisfies StatusTransitionResult;
  }

  if (current.key === target.key) {
    return {
      allowed: true,
      changed: false,
      to: target,
      from: current,
      targetFinal: target.isFinal ?? false,
    } satisfies StatusTransitionResult;
  }

  if (current.isFinal) {
    return {
      allowed: false,
      changed: true,
      from: current,
      to: target,
      reason: `Cannot transition from final status "${current.name}" to "${target.name}".`,
      targetFinal: target.isFinal ?? false,
    } satisfies StatusTransitionResult;
  }

  return {
    allowed: true,
    changed: true,
    from: current,
    to: target,
    targetFinal: target.isFinal ?? false,
  } satisfies StatusTransitionResult;
};

export interface ExportPolicyInput {
  statusKey: string | null | undefined;
  recipe: Pick<ExportRecipe, 'id' | 'name' | 'allowedStatuses'>;
  statuses?: WorkspaceStatus[];
}

export interface ExportPolicyResult {
  allowed: boolean;
  reason?: string;
  allowedStatuses: string[];
  status?: WorkspaceStatus | null;
}

export const isExportAllowed = ({ statusKey, recipe, statuses }: ExportPolicyInput): ExportPolicyResult => {
  const allowedStatuses = (recipe.allowedStatuses ?? [])
    .map((value) => normalizeStatusKey(value))
    .filter((value) => value.length > 0);

  const normalizedStatusKey = normalizeStatusKey(statusKey);
  const status = statuses ? findStatus(buildStatusIndex(statuses), normalizedStatusKey) ?? null : null;

  if (allowedStatuses.length === 0) {
    return {
      allowed: true,
      allowedStatuses,
      status,
    } satisfies ExportPolicyResult;
  }

  const allowed = allowedStatuses.includes(normalizedStatusKey);
  const displayStatusName = status?.name ?? (normalizedStatusKey.length > 0 ? normalizedStatusKey : 'unknown');
  return {
    allowed,
    allowedStatuses,
    status,
    reason: allowed
      ? undefined
      : `Status "${displayStatusName}" is not permitted for export recipe "${
          recipe.name ?? recipe.id
        }".`,
  } satisfies ExportPolicyResult;
};

export interface StatusChangeAuditInput {
  id: string;
  documentId: string;
  from?: string | null;
  to: string;
  actorId?: string;
  occurredAt: ISODateString;
  statuses?: WorkspaceStatus[];
  metadata?: Record<string, unknown>;
}

export const createStatusChangeAuditEntry = ({
  id,
  documentId,
  from,
  to,
  actorId,
  occurredAt,
  statuses,
  metadata,
}: StatusChangeAuditInput): AuditLogEntry => {
  const index = statuses ? buildStatusIndex(statuses) : undefined;
  const fromKey = normalizeStatusKey(from);
  const toKey = normalizeStatusKey(to);
  const fromStatus = index ? findStatus(index, fromKey) ?? null : null;
  const toStatus = index ? findStatus(index, toKey) ?? null : null;

  const normalizedMetadata: Record<string, unknown> = {
    from: fromStatus?.key ?? (fromKey || null),
    to: toStatus?.key ?? (toKey || null),
    fromLabel: fromStatus?.name ?? undefined,
    toLabel: toStatus?.name ?? undefined,
    changed: fromStatus?.key !== toStatus?.key,
    targetFinal: toStatus?.isFinal ?? false,
    ...metadata,
  };

  return {
    id,
    type: 'document.status.changed',
    subjectId: documentId,
    actorId,
    occurredAt,
    metadata: normalizedMetadata,
  } satisfies AuditLogEntry;
};

export interface TagChangeAuditInput {
  id: string;
  documentId: string;
  previous: string[];
  next: string[];
  actorId?: string;
  occurredAt: ISODateString;
  metadata?: Record<string, unknown>;
}

const diffTags = (previous: string[], next: string[]): { added: string[]; removed: string[] } => {
  const previousSet = new Set(previous);
  const nextSet = new Set(next);
  const added: string[] = [];
  const removed: string[] = [];

  for (const tag of nextSet) {
    if (!previousSet.has(tag)) {
      added.push(tag);
    }
  }

  for (const tag of previousSet) {
    if (!nextSet.has(tag)) {
      removed.push(tag);
    }
  }

  added.sort();
  removed.sort();
  return { added, removed };
};

export const createTagChangeAuditEntry = ({
  id,
  documentId,
  previous,
  next,
  actorId,
  occurredAt,
  metadata,
}: TagChangeAuditInput): AuditLogEntry => {
  const normalizedPrevious = normalizeTags(previous);
  const normalizedNext = normalizeTags(next);
  const { added, removed } = diffTags(normalizedPrevious, normalizedNext);

  const normalizedMetadata: Record<string, unknown> = {
    previous: normalizedPrevious,
    next: normalizedNext,
    added,
    removed,
    changed: added.length > 0 || removed.length > 0,
    ...metadata,
  };

  return {
    id,
    type: 'document.tags.changed',
    subjectId: documentId,
    actorId,
    occurredAt,
    metadata: normalizedMetadata,
  } satisfies AuditLogEntry;
};
