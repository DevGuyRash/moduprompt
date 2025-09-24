import type {
  AuditLogEntry,
  ExportRecipe,
  ISODateString,
  WorkspaceStatus,
} from '@moduprompt/types';
import {
  createStatusChangeAuditEntry,
  createTagChangeAuditEntry,
  isExportAllowed,
  normalizeStatusSchema,
  validateStatusTransition,
  type ExportPolicyResult,
  type StatusTransitionResult,
} from '@moduprompt/snippet-store';

export interface GovernancePolicyContext {
  statuses: WorkspaceStatus[];
}

export interface StatusChangeEvaluation {
  result: StatusTransitionResult;
  audit?: AuditLogEntry;
}

export interface StatusChangeAuditOptions {
  auditId: string;
  occurredAt: ISODateString;
  actorId?: string;
  documentId: string;
}

export const evaluateStatusChange = (
  context: GovernancePolicyContext,
  transition: { from?: string | null; to: string },
  audit?: StatusChangeAuditOptions,
): StatusChangeEvaluation => {
  const normalizedStatuses = normalizeStatusSchema(context.statuses);
  const evaluation = validateStatusTransition({
    statuses: normalizedStatuses,
    from: transition.from,
    to: transition.to,
  });

  if (!audit || !evaluation.allowed || !evaluation.changed) {
    return { result: evaluation } satisfies StatusChangeEvaluation;
  }

  const auditEntry = createStatusChangeAuditEntry({
    id: audit.auditId,
    documentId: audit.documentId,
    from: transition.from,
    to: transition.to,
    actorId: audit.actorId,
    occurredAt: audit.occurredAt,
    statuses: normalizedStatuses,
  });

  return {
    result: evaluation,
    audit: auditEntry,
  } satisfies StatusChangeEvaluation;
};

export interface TagChangeAuditOptions {
  auditId: string;
  occurredAt: ISODateString;
  actorId?: string;
  documentId: string;
}

export const createTagsAudit = (
  options: TagChangeAuditOptions,
  changes: { previous: string[]; next: string[] },
): AuditLogEntry =>
  createTagChangeAuditEntry({
    id: options.auditId,
    documentId: options.documentId,
    previous: changes.previous,
    next: changes.next,
    actorId: options.actorId,
    occurredAt: options.occurredAt,
  });

export interface ExportPolicyEvaluation {
  result: ExportPolicyResult;
}

export class ExportPolicyViolation extends Error {
  constructor(message: string, readonly result: ExportPolicyResult) {
    super(message);
    this.name = 'ExportPolicyViolation';
  }
}

export const evaluateExportPolicy = (
  context: GovernancePolicyContext,
  input: { statusKey: string | null | undefined; recipe: Pick<ExportRecipe, 'id' | 'name' | 'allowedStatuses'> },
): ExportPolicyEvaluation => {
  const normalizedStatuses = normalizeStatusSchema(context.statuses);
  const result = isExportAllowed({
    statusKey: input.statusKey,
    recipe: input.recipe,
    statuses: normalizedStatuses,
  });
  return { result } satisfies ExportPolicyEvaluation;
};

export const assertExportAllowed = (
  context: GovernancePolicyContext,
  input: { statusKey: string | null | undefined; recipe: Pick<ExportRecipe, 'id' | 'name' | 'allowedStatuses'> },
): ExportPolicyResult => {
  const evaluation = evaluateExportPolicy(context, input);
  if (!evaluation.result.allowed) {
    throw new ExportPolicyViolation(
      evaluation.result.reason ?? 'Export blocked by governance policy.',
      evaluation.result,
    );
  }
  return evaluation.result;
};
