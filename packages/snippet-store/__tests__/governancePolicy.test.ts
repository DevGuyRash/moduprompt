import { describe, expect, it } from 'vitest';
import type { WorkspaceStatus } from '@moduprompt/types';
import {
  createStatusChangeAuditEntry,
  createTagChangeAuditEntry,
  isExportAllowed,
  normalizeStatusSchema,
  normalizeTags,
  validateStatusTransition,
} from '../src';

const sampleStatuses: WorkspaceStatus[] = [
  { key: 'Draft', name: 'Draft', color: '#475569', order: 2 },
  { key: 'Approved', name: 'Approved', color: '10B981', order: 3, isFinal: true },
  { key: 'Review', name: 'Review', color: '#f59E0B', order: 1 },
];

describe('normalizeTags', () => {
  it('trims, lowercases, deduplicates, and sorts tags', () => {
    expect(normalizeTags([' Alpha ', 'beta', 'ALPHA', 'Gamma '])).toEqual(['alpha', 'beta', 'gamma']);
  });
});

describe('normalizeStatusSchema', () => {
  it('produces deterministic ordering and normalized values', () => {
    const normalized = normalizeStatusSchema(sampleStatuses);
    expect(normalized).toEqual([
      { key: 'review', name: 'Review', color: '#f59e0b', order: 1, isFinal: false },
      { key: 'draft', name: 'Draft', color: '#475569', order: 2, isFinal: false },
      { key: 'approved', name: 'Approved', color: '#10b981', order: 3, isFinal: true },
    ]);
  });

  it('omits duplicate keys and empty entries', () => {
    const normalized = normalizeStatusSchema([
      { key: 'draft', name: 'Draft', color: '#475569' },
      { key: 'draft', name: 'Duplicate Draft', color: '#ff0000' },
      { key: '', name: '' },
    ]);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({ key: 'draft', name: 'Draft', color: '#475569' });
  });
});

describe('validateStatusTransition', () => {
  it('allows initial assignment when previous status is missing', () => {
    const result = validateStatusTransition({ statuses: sampleStatuses, from: undefined, to: 'draft' });
    expect(result.allowed).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.from).toBeNull();
    expect(result.to?.key).toBe('draft');
  });

  it('blocks transitions from final statuses', () => {
    const result = validateStatusTransition({ statuses: sampleStatuses, from: 'approved', to: 'review' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Cannot transition from final status');
  });

  it('returns unchanged when status remains the same', () => {
    const result = validateStatusTransition({ statuses: sampleStatuses, from: 'review', to: 'review' });
    expect(result.allowed).toBe(true);
    expect(result.changed).toBe(false);
  });

  it('rejects undefined target statuses', () => {
    const result = validateStatusTransition({ statuses: sampleStatuses, from: 'draft', to: 'archived' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not defined');
  });
});

describe('isExportAllowed', () => {
  it('allows export when recipe has no gating', () => {
    const evaluation = isExportAllowed({
      statusKey: 'draft',
      recipe: { id: 'r1', name: 'Default', allowedStatuses: undefined },
      statuses: sampleStatuses,
    });
    expect(evaluation.allowed).toBe(true);
  });

  it('enforces allowed statuses when provided', () => {
    const evaluation = isExportAllowed({
      statusKey: 'review',
      recipe: { id: 'r2', name: 'Approved Only', allowedStatuses: ['approved'] },
      statuses: sampleStatuses,
    });
    expect(evaluation.allowed).toBe(false);
    expect(evaluation.reason).toContain('not permitted');
  });
});

describe('audit helpers', () => {
  it('produces consistent metadata for status changes', () => {
    const audit = createStatusChangeAuditEntry({
      id: 'audit-1',
      documentId: 'doc-1',
      from: 'draft',
      to: 'approved',
      actorId: 'user-1',
      occurredAt: '2025-09-25T10:00:00.000Z',
      statuses: sampleStatuses,
    });

    expect(audit.metadata).toMatchObject({
      from: 'draft',
      to: 'approved',
      fromLabel: 'Draft',
      toLabel: 'Approved',
      changed: true,
      targetFinal: true,
    });
  });

  it('captures tag differences deterministically', () => {
    const audit = createTagChangeAuditEntry({
      id: 'audit-2',
      documentId: 'doc-1',
      previous: ['Alpha', 'Beta'],
      next: ['beta', 'Gamma'],
      actorId: 'user-2',
      occurredAt: '2025-09-25T10:01:00.000Z',
    });

    expect(audit.metadata).toMatchObject({
      previous: ['alpha', 'beta'],
      next: ['beta', 'gamma'],
      added: ['gamma'],
      removed: ['alpha'],
      changed: true,
    });
  });
});
