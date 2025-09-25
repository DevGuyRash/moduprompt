import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Block,
  DocumentModel,
  GroupBlock,
  MarkdownBlock,
  SnippetBlock,
} from '@moduprompt/types';
import {
  DocumentStoreProvider,
  createDocumentStore,
  type DocumentStoreApi,
} from '../../../state/document-model.js';
import { NotebookView } from '../NotebookView.js';
import type { NotebookFormatter, NotebookSnippetOption } from '../types.js';
import { resetIdCounter } from '../id.js';

const timestamp = 1;

const createDocument = (): DocumentModel => ({
  id: 'doc-1',
  title: 'Unit Test Document',
  schemaVersion: 2,
  blocks: [
    {
      id: 'markdown-1',
      kind: 'markdown',
      sequence: 1,
      body: 'Hello world',
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies MarkdownBlock,
    {
      id: 'group-1',
      kind: 'group',
      label: 'Sample group',
      children: ['snippet-1'],
      sequence: 2,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies GroupBlock,
    {
      id: 'snippet-1',
      kind: 'snippet',
      snippetId: 'snippet-alpha',
      mode: 'transclude',
      sequence: 3,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies SnippetBlock,
  ],
  edges: [],
  variables: [],
  exportRecipes: [],
  tags: ['draft'],
  statusKey: 'draft',
  settings: { maxWidth: '80ch' },
  createdAt: timestamp,
  updatedAt: timestamp,
});

const loadDocument = (store: DocumentStoreApi, document: DocumentModel): void => {
  store.getState().loadDocument(document, { activate: true });
};

const renderNotebook = (
  store: DocumentStoreApi,
  props: Partial<React.ComponentProps<typeof NotebookView>> = {},
) => {
  render(
    <DocumentStoreProvider store={store}>
      <NotebookView documentId="doc-1" {...props} />
    </DocumentStoreProvider>,
  );
};

let clockValue = 1000;

beforeEach(() => {
  resetIdCounter();
  clockValue = 1000;
  vi.spyOn(Date, 'now').mockImplementation(() => {
    clockValue += 5;
    return clockValue;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NotebookView', () => {
  it('renders markdown block with formatting controls and updates document store on edit', async () => {
    const store = createDocumentStore();
    loadDocument(store, createDocument());

    renderNotebook(store);

    const textarea = screen.getByLabelText('Markdown content');
    await userEvent.clear(textarea);
    await userEvent.type(textarea, 'Updated copy');

    const updated = store.getState().getDocument('doc-1');
    expect(updated?.blocks.find((block) => block.id === 'markdown-1')).toMatchObject({
      kind: 'markdown',
      body: 'Updated copy',
    });
  });

  it('applies formatter to active block via toolbar button', async () => {
    const store = createDocumentStore();
    loadDocument(store, createDocument());

    const formatters: NotebookFormatter[] = [
      {
        id: 'uppercase',
        label: 'Uppercase',
        appliesTo: (block: Block) => block.kind === 'markdown',
        apply: (block) => {
          if (block.kind === 'markdown') {
            (block as MarkdownBlock).body = (block as MarkdownBlock).body.toUpperCase();
          }
        },
      },
    ];

    renderNotebook(store, { formatters });

    const formatterButtons = screen.getAllByRole('button', { name: 'Uppercase' });
    await userEvent.click(formatterButtons[0]);

    const updated = store.getState().getDocument('doc-1');
    expect(updated?.blocks.find((block) => block.id === 'markdown-1')).toMatchObject({
      kind: 'markdown',
      body: 'HELLO WORLD',
    });
  });

  it('opens snippet dialog and inserts snippet below block', async () => {
    const store = createDocumentStore();
    loadDocument(store, createDocument());

    const availableSnippets: NotebookSnippetOption[] = [
      { id: 'snippet-beta', title: 'Greeting snippet', description: 'Adds greeting block' },
      { id: 'snippet-gamma', title: 'CTA snippet' },
    ];
    const onSnippetInserted = vi.fn();

    renderNotebook(store, { availableSnippets, onSnippetInserted });

    const insertButtons = screen.getAllByRole('button', { name: /insert snippet/i });
    await userEvent.click(insertButtons[0]);

    const dialog = screen.getByRole('dialog', { name: /insert snippet/i });
    const snippetOption = within(dialog).getByRole('option', { name: /greeting snippet/i });
    await userEvent.click(snippetOption);

    const updated = store.getState().getDocument('doc-1');
    const snippetBlocks = updated?.blocks.filter((block) => block.kind === 'snippet') as SnippetBlock[] | undefined;
    expect(snippetBlocks?.some((block) => block.snippetId === 'snippet-beta')).toBe(true);
    expect(onSnippetInserted).toHaveBeenCalledWith(availableSnippets[0]);
  });

  it('toggles group collapse state with accessible control', async () => {
    const store = createDocumentStore();
    loadDocument(store, createDocument());

    renderNotebook(store);

    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true');
    await userEvent.click(collapseButton);
    expect(collapseButton).toHaveAttribute('aria-expanded', 'false');

    const groupContent = screen.queryByRole('group', { name: /group contents/i });
    expect(groupContent).not.toBeInTheDocument();
  });
});
