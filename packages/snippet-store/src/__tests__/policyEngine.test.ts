import { describe, expect, it } from 'vitest';
import type { WorkspaceStatus, ExportRecipe } from '@moduprompt/types';
import {
  normalizeTags,
  validateStatusTransition,
  isExportAllowed,
  createStatusChangeAuditEntry,
  createTagChangeAuditEntry,
} from '../governance/policyEngine.js';

const statuses: WorkspaceStatus[] = [
  {
    key: 'draft',
    name: 'Draft',
    color: '#6b7280',
    description: 'Work in progress',
    order: 0,
  },
  {
    key: 'review',
    name: 'In Review',
    color: '#f59e0b',
    order: 1,
  },
  {
    key: 'ready',
    name: 'Ready for Export',
    color: '#22c55e',
    isFinal: true,
    order: 2,
  },
];

describe('policyEngine', () => {
  it('normalizes tags deterministically', () => {
    const normalized = normalizeTags([' Draft ', 'ALPHA', 'draft', 'go-Live']);
    expect(normalized).toEqual(['alpha', 'draft', 'go-live']);
  });

  it('validates transitions, preventing moves away from final statuses', () => {
    const start = validateStatusTransition({ statuses, from: 'draft', to: 'review' });
    expect(start).toMatchObject({ allowed: true, changed: true });

    const alreadyFinal = validateStatusTransition({ statuses, from: 'ready', to: 'draft' });
    expect(alreadyFinal.allowed).toBe(false);
    expect(alreadyFinal.reason).toMatch(/final status/i);
    expect(alreadyFinal.targetFinal).toBe(false);

    const unknown = validateStatusTransition({ statuses, from: 'unknown', to: 'ready' });
    expect(unknown.allowed).toBe(true);
    expect(unknown.from).toBeNull();
    expect(unknown.targetFinal).toBe(true);
    expect(unknown.unknownFrom).toBe(true);
  });

  it('enforces export policies and reports allowed statuses deterministically', () => {
    const recipe: Pick<ExportRecipe, 'id' | 'name' | 'allowedStatuses'> = {
      id: 'recipe-1',
      name: 'PDF',
      allowedStatuses: ['ready', 'archived'],
    };

    const allowed = isExportAllowed({ statusKey: 'ready', recipe, statuses });
    expect(allowed.allowed).toBe(true);
    expect(allowed.allowedStatuses).toEqual(['ready', 'archived']);

    const blocked = isExportAllowed({ statusKey: 'draft', recipe, statuses });
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toMatch(/not permitted/i);
    expect(blocked.allowedStatuses).toEqual(['ready', 'archived']);
  });

  it('produces audit entries with normalized metadata for status changes', () => {
    const entry = createStatusChangeAuditEntry({
      id: 'audit-1',
      documentId: 'doc-1',
      from: 'draft',
      to: 'ready',
      actorId: 'user-123',
      occurredAt: '2025-09-24T00:00:00.000Z',
      statuses,
      metadata: { note: 'Approved' },
    });

    expect(entry.type).toBe('document.status.changed');
    expect(entry.metadata).toMatchObject({
      from: 'draft',
      to: 'ready',
      fromLabel: 'Draft',
      toLabel: 'Ready for Export',
      changed: true,
      targetFinal: true,
      note: 'Approved',
    });
  });

  it('captures added and removed tags while preserving stable ordering', () => {
    const entry = createTagChangeAuditEntry({
      id: 'audit-2',
      documentId: 'doc-2',
      previous: ['Draft', 'Marketing'],
      next: ['marketing', 'Launch', 'Approved'],
      actorId: 'system',
      occurredAt: '2025-09-24T00:00:00.000Z',
    });

    expect(entry.metadata).toMatchObject({
      previous: ['draft', 'marketing'],
      next: ['approved', 'launch', 'marketing'],
      added: ['approved', 'launch'],
      removed: ['draft'],
      changed: true,
    });
  });
});
