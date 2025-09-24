import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentModel, ExportRecipe, WorkspaceStatus } from '@moduprompt/types';
import { createDocumentStore, DocumentStoreProvider, type DocumentStoreApi } from '../../../state/document-model';
import { GovernancePanel } from '../GovernancePanel';
import { createWorkspaceStore, type WorkspaceStore } from '@moduprompt/snippet-store';

const timestamp = 42_000;

const baseStatuses: WorkspaceStatus[] = [
  { key: 'draft', name: 'Draft', color: '#475569', order: 1 },
  { key: 'approved', name: 'Approved', color: '#10b981', order: 2, isFinal: true },
];

const baseRecipes: ExportRecipe[] = [
  {
    id: 'regulated-export',
    name: 'Regulated PDF',
    type: 'pdf',
    include: { all: true },
    allowedStatuses: ['approved'],
    theme: 'default',
    pdf: { margin: '1in', headerFooter: true },
    createdAt: timestamp,
    updatedAt: timestamp,
  },
];

const createDocument = (overrides: Partial<DocumentModel> = {}): DocumentModel => ({
  id: 'doc-1',
  title: 'Governed prompt',
  schemaVersion: 2,
  blocks: [],
  edges: [],
  variables: [],
  exportRecipes: [],
  tags: [],
  statusKey: 'draft',
  settings: { maxWidth: '80ch' },
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
});

const loadDocument = (store: DocumentStoreApi, document: DocumentModel) => {
  store.getState().loadDocument(document, { activate: true });
};

const renderGovernance = (
  documentStore: DocumentStoreApi,
  governanceStore?: WorkspaceStore,
  props: Partial<Omit<React.ComponentProps<typeof GovernancePanel>, 'documentId'>> = {},
) => {
  render(
    <DocumentStoreProvider store={documentStore}>
      <GovernancePanel documentId="doc-1" store={governanceStore} {...props} />
    </DocumentStoreProvider>,
  );
};

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(timestamp);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GovernancePanel', () => {
  it('adds deduplicated tags and updates the document store', async () => {
    const documentStore = createDocumentStore();
    loadDocument(documentStore, createDocument());

    renderGovernance(documentStore);

    const input = screen.getByPlaceholderText(/enter tag/i);
    await userEvent.type(input, 'Draft');
    await userEvent.keyboard('{Enter}');
    await userEvent.type(input, 'draft');
    await userEvent.click(screen.getByRole('button', { name: /add tag/i }));

    await waitFor(() => {
      const document = documentStore.getState().getDocument('doc-1');
      expect(document?.tags).toEqual(['draft']);
    });

    expect(screen.getByRole('listitem')).toHaveTextContent('#draft');
  });

  it('disables status selection when editing is not permitted', () => {
    const documentStore = createDocumentStore();
    loadDocument(documentStore, createDocument());

    renderGovernance(documentStore, undefined, { canEditStatus: false });

    const radios = screen.getAllByRole('radio');
    radios.forEach((radio) => expect(radio).toBeDisabled());
  });

  it('surfaces policy gates when the current status is blocked', async () => {
    const documentStore = createDocumentStore();
    loadDocument(
      documentStore,
      createDocument({
        exportRecipes: [{ recipeId: 'regulated-export', includeProvenance: true }],
        statusKey: 'draft',
      }),
    );

    const governanceStore = createWorkspaceStore({ dbName: `governance-${Math.random()}` });
    let settingsMemory = {
      statuses: baseStatuses,
      exportRecipes: baseRecipes,
      schemaVersion: 1,
      updatedAt: timestamp,
    };
    vi.spyOn(governanceStore, 'getWorkspaceSettings').mockImplementation(async () => settingsMemory as any);
    vi.spyOn(governanceStore, 'saveWorkspaceSettings').mockImplementation(async (record) => {
      settingsMemory = { ...record };
    });

    renderGovernance(documentStore, governanceStore);

    await waitFor(() => {
      expect(
        screen.getByText(/regulated pdf export blocks status/i, { selector: 'span' }),
      ).toBeInTheDocument();
    });
  });

  it('allows administrators to add and persist a new status', async () => {
    const documentStore = createDocumentStore();
    loadDocument(documentStore, createDocument());

    const governanceStore = createWorkspaceStore({ dbName: `governance-${Math.random()}` });
    let settingsMemory = {
      statuses: baseStatuses,
      exportRecipes: baseRecipes,
      schemaVersion: 1,
      updatedAt: timestamp,
    };
    vi.spyOn(governanceStore, 'getWorkspaceSettings').mockImplementation(async () => settingsMemory as any);
    vi.spyOn(governanceStore, 'saveWorkspaceSettings').mockImplementation(async (record) => {
      settingsMemory = { ...record };
    });

    renderGovernance(documentStore, governanceStore, { canManageStatuses: true });

    await userEvent.click(screen.getByRole('button', { name: /configure statuses/i }));
    await screen.findAllByLabelText(/status name/i);
    await userEvent.click(screen.getByRole('button', { name: /add status/i }));

    const nameInputs = await screen.findAllByLabelText(/status name/i);
    expect(nameInputs).toHaveLength(3);

    const saveButton = screen.getByRole('button', { name: /save statuses/i });
    expect(saveButton).toBeEnabled();
    await userEvent.click(saveButton);

    expect(screen.queryByText(/at least one status is required/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(governanceStore.saveWorkspaceSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          statuses: expect.arrayContaining([
            expect.objectContaining({ name: 'New Status 3', key: 'new-status-3' }),
          ]),
        }),
      );
    });
  });

  it('warns administrators when status colors fall below contrast requirements', async () => {
    const documentStore = createDocumentStore();
    loadDocument(documentStore, createDocument());

    const governanceStore = createWorkspaceStore({ dbName: `governance-${Math.random()}` });
    let settingsMemory = {
      statuses: [
        { key: 'draft', name: 'Draft', color: '#006efa', order: 1 },
        { key: 'approved', name: 'Approved', color: '#10b981', order: 2, isFinal: true },
      ],
      exportRecipes: baseRecipes,
      schemaVersion: 1,
      updatedAt: timestamp,
    };
    vi.spyOn(governanceStore, 'getWorkspaceSettings').mockImplementation(async () => settingsMemory as any);
    vi.spyOn(governanceStore, 'saveWorkspaceSettings').mockImplementation(async (record) => {
      settingsMemory = { ...record };
    });

    renderGovernance(documentStore, governanceStore, { canManageStatuses: true });

    await userEvent.click(screen.getByRole('button', { name: /configure statuses/i }));

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((node) => /contrast .* is below wcag aa\./i.test(node.textContent ?? ''))).toBe(true);
  });
});
