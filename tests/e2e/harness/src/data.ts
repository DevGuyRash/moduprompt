import { createHash } from 'node:crypto';
import type { DocumentModel, ExportRecipe, JsonValue, Snippet, SnippetVersion } from '@moduprompt/types';
import type { WorkspaceSnapshot } from '@moduprompt/snippet-store';
import { computeIntegrityHash } from '@moduprompt/snippet-store';
import {
  DOCUMENT_ID,
  EXPORT_RECIPE_APPROVED_ID,
  EXPORT_RECIPE_APPROVED_NAME,
  EXPORT_RECIPE_DRAFT_ID,
  EXPORT_RECIPE_DRAFT_NAME,
  SNIPPET_CALL_TO_ACTION_ID,
  SNIPPET_GREETING_ID,
  STATUS_APPROVED,
  STATUS_DRAFT,
  STATUS_REVIEW,
  WORKSPACE_DB_NAME,
} from '../../fixtures/constants';

const BASE_TIMESTAMP = 1_738_934_400_000; // 2025-09-20T00:00:00.000Z

const normalizeJsonValue = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item as JsonValue));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const normalized: Record<string, JsonValue> = {};
    for (const [key, val] of entries) {
      normalized[key] = normalizeJsonValue(val as JsonValue);
    }
    return normalized as JsonValue;
  }

  return value;
};

const stableStringify = (value: JsonValue): string => JSON.stringify(normalizeJsonValue(value));

const computeSnapshotIntegrity = (snapshot: Omit<WorkspaceSnapshot, 'integrityHash'>): string =>
  createHash('sha256').update(stableStringify(snapshot as JsonValue)).digest('hex');

const WORKSPACE_SCHEMA_VERSION = 3;

const createSnippet = (
  id: string,
  title: string,
  path: string,
  body: string,
  headRev: number,
  timestamp: number,
  tags: string[] = [],
): Snippet => ({
  id,
  title,
  path,
  body,
  headRev,
  frontmatter: {
    schemaVersion: 1,
    tags,
    description: `${title} snippet`,
  },
  createdAt: timestamp,
  updatedAt: timestamp,
});

const createSnippetVersion = async (
  snippet: Snippet,
  rev: number,
  body: string,
  timestampOffset: number,
  note?: string,
): Promise<SnippetVersion> => {
  const timestamp = snippet.createdAt + timestampOffset;
  return {
    snippetId: snippet.id,
    rev,
    parentRev: rev - 1 > 0 ? rev - 1 : undefined,
    timestamp,
    body,
    frontmatter: { ...snippet.frontmatter },
    author: { id: 'user-e2e', name: 'E2E Harness' },
    note,
    hash: await computeIntegrityHash(body, snippet.frontmatter),
  } satisfies SnippetVersion;
};

const createDocumentModel = (timestamp: number): DocumentModel => ({
  id: DOCUMENT_ID,
  title: 'Demo Prompt – Product Tour',
  schemaVersion: 2,
  blocks: [
    {
      id: 'block-intro',
      kind: 'markdown',
      sequence: timestamp,
      body: '# ModuPrompt product tour\\nWelcome to the governed workspace! 🎉',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'block-groups',
      kind: 'group',
      sequence: timestamp + 10,
      label: 'Reusable content',
      children: ['block-greeting-snippet'],
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'block-greeting-snippet',
      kind: 'snippet',
      snippetId: SNIPPET_GREETING_ID,
      mode: 'transclude',
      sequence: timestamp + 15,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: 'block-body',
      kind: 'markdown',
      sequence: timestamp + 20,
      body: 'Share snippet changes confidently with deterministic exports.',
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ],
  edges: [
    {
      id: 'edge-flow-1',
      source: 'block-intro',
      target: 'block-greeting-snippet',
      kind: 'default',
    },
    {
      id: 'edge-flow-2',
      source: 'block-greeting-snippet',
      target: 'block-body',
      kind: 'default',
    },
  ],
  variables: [],
  exportRecipes: [
    {
      recipeId: EXPORT_RECIPE_APPROVED_ID,
      includeProvenance: true,
      lastRunAt: undefined,
    },
  ],
  tags: ['demo'],
  statusKey: STATUS_DRAFT,
  settings: {
    maxWidth: '96ch',
  },
  createdAt: timestamp,
  updatedAt: timestamp,
});

export interface HarnessData {
  document: DocumentModel;
  workspaceSnapshot: WorkspaceSnapshot;
  exportRecipes: ExportRecipe[];
  snippetOptions: Array<{ id: string; title: string; description?: string }>;
}

export const createHarnessData = async (): Promise<HarnessData> => {
  const document = createDocumentModel(BASE_TIMESTAMP);

  const greetingSnippet = createSnippet(
    SNIPPET_GREETING_ID,
    'Greetings block',
    'core/onboarding',
    'Thank you for evaluating **ModuPrompt**. This content stays deterministic across exports.',
    2,
    BASE_TIMESTAMP,
    ['welcome', 'intro'],
  );

  const ctaSnippet = createSnippet(
    SNIPPET_CALL_TO_ACTION_ID,
    'Call to action',
    'core/actions',
    '→ Next: configure your governance statuses and export recipes.',
    1,
    BASE_TIMESTAMP + 2000,
    ['cta'],
  );

  const greetingVersions: SnippetVersion[] = [
    await createSnippetVersion(
      greetingSnippet,
      1,
      'Thanks for trying **ModuPrompt**. Build audit-ready prompt pipelines with confidence.',
      500,
      'Initial draft',
    ),
    await createSnippetVersion(
      greetingSnippet,
      2,
      greetingSnippet.body,
      1_000,
      'Refined copy with emphasis',
    ),
  ];

  const exportRecipes: ExportRecipe[] = [
    {
      id: EXPORT_RECIPE_APPROVED_ID,
      name: EXPORT_RECIPE_APPROVED_NAME,
      type: 'markdown',
      include: { all: true },
      allowedStatuses: [STATUS_APPROVED],
    },
    {
      id: EXPORT_RECIPE_DRAFT_ID,
      name: EXPORT_RECIPE_DRAFT_NAME,
      type: 'markdown',
      include: { all: true },
      allowedStatuses: [STATUS_DRAFT, STATUS_APPROVED],
    },
  ];

  const baseSnapshot = {
    exportedAt: BASE_TIMESTAMP + 5_000,
    schemaVersion: WORKSPACE_SCHEMA_VERSION,
    documents: [document],
    snippets: [greetingSnippet, ctaSnippet],
    snippetVersions: [...greetingVersions],
    workspaceSettings: {
      id: 'workspace',
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      statuses: [
        { key: STATUS_DRAFT, name: 'Draft', color: '#64748b', order: 1 },
        { key: STATUS_REVIEW, name: 'In Review', color: '#f59e0b', order: 2 },
        { key: STATUS_APPROVED, name: 'Approved', color: '#10b981', order: 3, isFinal: true },
      ],
      exportRecipes,
      updatedAt: BASE_TIMESTAMP + 3_000,
      lastExportedAt: undefined,
    },
  } satisfies Omit<WorkspaceSnapshot, 'integrityHash'>;

  const workspaceSnapshot: WorkspaceSnapshot = {
    ...baseSnapshot,
    integrityHash: computeSnapshotIntegrity(baseSnapshot),
  } satisfies WorkspaceSnapshot;

  return {
    document,
    workspaceSnapshot,
    exportRecipes,
    snippetOptions: [
      { id: SNIPPET_GREETING_ID, title: 'Greetings block', description: 'Reusable welcome copy' },
      { id: SNIPPET_CALL_TO_ACTION_ID, title: 'Call to action', description: 'Next steps guidance' },
    ],
  } satisfies HarnessData;
};

export const HARNESS_DB_NAME = WORKSPACE_DB_NAME;
