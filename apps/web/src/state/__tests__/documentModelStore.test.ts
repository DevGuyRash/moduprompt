import { describe, expect, it } from 'vitest';
import type { DocumentModel, MarkdownBlock, Edge, CommentBlock } from '@moduprompt/types';
import {
  createDocumentStore,
  selectNotebookProjection,
  selectNodeProjection,
  selectDocumentModel,
} from '../..';

const createDocument = (): DocumentModel => ({
  id: 'doc-1',
  title: 'Test Document',
  schemaVersion: 2,
  blocks: [
    {
      id: 'block-1',
      kind: 'markdown',
      sequence: 1,
      body: 'Hello world',
      createdAt: 1,
      updatedAt: 1,
    } satisfies MarkdownBlock,
    {
      id: 'group-1',
      kind: 'group',
      sequence: 1,
      children: ['block-2'],
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'block-2',
      kind: 'snippet',
      sequence: 2,
      snippetId: 'snippet-1',
      mode: 'transclude',
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'block-1',
      target: 'block-2',
      kind: 'default',
      createdAt: 1,
      updatedAt: 1,
    } satisfies Edge,
  ],
  variables: [],
  exportRecipes: [],
  tags: ['Draft', 'alpha'],
  statusKey: 'draft',
  settings: {
    maxWidth: '80ch',
  },
  createdAt: 1,
  updatedAt: 1,
});

describe('DocumentModelStore', () => {
  it('normalizes document on load and exposes notebook/node projections', () => {
    const store = createDocumentStore();
    store.getState().loadDocument(createDocument());

    const model = selectDocumentModel(store.getState());
    expect(model?.tags).toEqual(['alpha', 'draft']);

    const notebook = selectNotebookProjection(store.getState());
    expect(notebook?.blocks.map((node) => node.id)).toEqual(['block-1', 'group-1']);
    expect(notebook?.blocks[1]?.children?.map((child) => child.id)).toEqual(['block-2']);

    const nodeGraph = selectNodeProjection(store.getState());
    expect(nodeGraph?.nodes.map((node) => node.id)).toEqual(['block-1', 'group-1', 'block-2']);
    expect(nodeGraph?.edges.map((edge) => edge.id)).toEqual(['edge-1']);
    expect(nodeGraph?.topologicalOrder[0]).toBe('block-1');
  });

  it('executes transactional updates with parity across projections', () => {
    const store = createDocumentStore();
    store.getState().loadDocument(createDocument());

    let updates = 0;
    const unsubscribe = store.subscribe(() => {
      updates += 1;
    });

    store.getState().runTransaction('doc-1', (draft) => {
      const block = draft.blocks.find((item) => item.id === 'block-1') as MarkdownBlock;
      block.body = 'Updated copy';
      draft.edges.push({
        id: 'edge-2',
        source: 'block-2',
        target: 'block-1',
        kind: 'default',
        createdAt: 2,
        updatedAt: 2,
      });
    });

    unsubscribe();
    expect(updates).toBe(1);

    const notebook = selectNotebookProjection(store.getState());
    expect(
      notebook?.blocks.find((node) => node.id === 'block-1')?.block,
    ).toMatchObject({ body: 'Updated copy' });

    const nodeGraph = selectNodeProjection(store.getState());
    expect(nodeGraph?.edges.map((edge) => edge.id)).toEqual(['edge-1', 'edge-2']);
    expect(nodeGraph?.topologicalOrder.includes('block-2')).toBe(true);
  });

  it('supports block insertion with deterministic ordering', () => {
    const store = createDocumentStore();
    store.getState().loadDocument(createDocument());

    store.getState().insertBlock('doc-1', {
      id: 'block-3',
      kind: 'comment',
      sequence: 5,
      body: 'Note',
      createdAt: 3,
      updatedAt: 3,
    } satisfies CommentBlock);

    const notebook = selectNotebookProjection(store.getState());
    expect(notebook?.blocks.map((node) => node.id)).toEqual(['block-1', 'group-1', 'block-3']);

    const nodeGraph = selectNodeProjection(store.getState());
    expect(nodeGraph?.nodes.map((node) => node.id)).toEqual(['block-1', 'group-1', 'block-2', 'block-3']);
    expect(nodeGraph?.topologicalOrder.length).toBe(4);
  });

  it('captures history and performs undo/redo transitions', () => {
    const store = createDocumentStore();
    store.getState().loadDocument(createDocument());

    store.getState().setTags('doc-1', ['ready']);
    expect(store.getState().canUndo('doc-1')).toBe(true);

    store.getState().undo('doc-1');
    const afterUndo = selectDocumentModel(store.getState());
    expect(afterUndo?.tags).toEqual(['alpha', 'draft']);
    expect(store.getState().canRedo('doc-1')).toBe(true);

    store.getState().redo('doc-1');
    const afterRedo = selectDocumentModel(store.getState());
    expect(afterRedo?.tags).toEqual(['ready']);
  });
});
