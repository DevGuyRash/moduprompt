import { describe, expect, it } from 'vitest';
import type { Block, Edge } from '@moduprompt/types';
import type { Connection } from 'reactflow';
import type { NodeProjection } from '../../../state/selectors/documentSelectors.js';
import { computeLayout } from '../layout.js';
import {
  buildReactFlowEdges,
  buildReactFlowNodes,
  deriveEdgeKind,
  edgeExists,
  isConnectionTyped,
  parseHandleKind,
  wouldCreateCycle,
} from '../graphUtils.js';

const createBlock = (id: string, overrides: Partial<Block> = {}): Block => ({
  id,
  kind: 'markdown',
  sequence: overrides.sequence ?? 0,
  body: '',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
});

const buildProjection = (): NodeProjection => {
  const a = createBlock('a', { sequence: 0 });
  const b = createBlock('b', { sequence: 1 });
  const c = createBlock('c', { sequence: 2 });
  const edgeAB: Edge = { id: 'edge-ab', source: 'a', target: 'b', kind: 'default' };
  const edgeBC: Edge = { id: 'edge-bc', source: 'b', target: 'c', kind: 'conditional', condition: { expression: 'status == "ok"', language: 'liquid' } };
  return {
    documentId: 'doc-1',
    nodes: [
      { id: 'a', kind: a.kind, sequence: a.sequence, block: a, incoming: [], outgoing: ['b'] },
      { id: 'b', kind: b.kind, sequence: b.sequence, block: b, incoming: ['a'], outgoing: ['c'] },
      { id: 'c', kind: c.kind, sequence: c.sequence, block: c, incoming: ['b'], outgoing: [] },
    ],
    edges: [
      { id: edgeAB.id, source: edgeAB.source, target: edgeAB.target, kind: edgeAB.kind, order: 0 },
      {
        id: edgeBC.id,
        source: edgeBC.source,
        target: edgeBC.target,
        kind: edgeBC.kind,
        order: 1,
        condition: edgeBC.condition,
      },
    ],
    adjacency: {
      a: ['b'],
      b: ['c'],
      c: [],
    },
    reverseAdjacency: {
      a: [],
      b: ['a'],
      c: ['b'],
    },
    topologicalOrder: ['a', 'b', 'c'],
    version: 1,
  } as NodeProjection;
};

describe('graph utilities', () => {
  const projection = buildProjection();

  it('prevents cycles when validating new connections', () => {
    expect(wouldCreateCycle(projection, 'c', 'a')).toBe(true);
    expect(wouldCreateCycle(projection, 'a', 'c')).toBe(false);
  });

  it('validates connector typing based on handles', () => {
    const valid: Connection = {
      source: 'a',
      target: 'b',
      sourceHandle: 'source:conditional',
      targetHandle: 'target:default',
    } as Connection;
    const invalid: Connection = {
      source: 'a',
      target: 'b',
      sourceHandle: 'source:error',
      targetHandle: 'target:conditional',
    } as Connection;

    expect(isConnectionTyped(valid)).toBe(true);
    expect(isConnectionTyped(invalid)).toBe(false);
  });

  it('derives edge kind from handle metadata', () => {
    const connection: Connection = {
      source: 'a',
      target: 'b',
      sourceHandle: 'source:error',
      targetHandle: 'target:default',
    } as Connection;
    expect(deriveEdgeKind(connection)).toBe('error');
    expect(parseHandleKind(undefined)).toBe('default');
  });

  it('builds reactflow nodes with stable positions', () => {
    const layout = computeLayout(projection);
    const nodes = buildReactFlowNodes(projection, layout, undefined, () => undefined);
    expect(nodes).toHaveLength(3);
    expect(nodes[0]?.data.block.id).toBe('a');
    expect(nodes[1]?.position.x).toBeGreaterThanOrEqual(nodes[0]?.position.x ?? 0);
  });

  it('builds reactflow edges honoring connectors and labels', () => {
    const edges = buildReactFlowEdges(projection);
    expect(edges).toHaveLength(2);
    expect(edges[0]?.sourceHandle).toBe('source:default');
    expect(edges[1]?.label).toContain('status');
  });

  it('detects duplicate edges', () => {
    const edge: Edge = { id: 'dup', source: 'a', target: 'b', kind: 'default' };
    expect(edgeExists([edge], { ...edge, id: 'different' })).toBe(true);
    expect(edgeExists([edge], { ...edge, sourcePort: 'conditional' })).toBe(false);
  });
});
