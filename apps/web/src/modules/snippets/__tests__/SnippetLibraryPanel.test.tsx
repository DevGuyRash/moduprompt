import '@testing-library/jest-dom/vitest';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import type { Snippet, SnippetVersion } from '@moduprompt/types';
import { computeIntegrityHash, type WorkspaceStore } from '@moduprompt/snippet-store';
import { SnippetLibraryPanel } from '../SnippetLibraryPanel.js';
import { SnippetLibraryProvider } from '../provider.js';
import { SNIPPET_DRAG_MIME } from '../utils/constants.js';

class MemoryWorkspaceStore {
  private snippets = new Map<string, Snippet>();
  private versions = new Map<string, SnippetVersion[]>();

  constructor(snippets: Snippet[], versions: SnippetVersion[][]) {
    for (const snippet of snippets) {
      this.snippets.set(snippet.id, { ...snippet });
    }
    for (const list of versions) {
      if (!list.length) continue;
      this.versions.set(list[0]!.snippetId, list.map((item) => ({ ...item })));
    }
  }

  async listSnippets(): Promise<Snippet[]> {
    return Array.from(this.snippets.values()).map((item) => ({ ...item }));
  }

  async getSnippet(id: string): Promise<Snippet | undefined> {
    const snippet = this.snippets.get(id);
    return snippet ? { ...snippet, frontmatter: { ...snippet.frontmatter } } : undefined;
  }

  async upsertSnippet(snippet: Snippet): Promise<void> {
    this.snippets.set(snippet.id, { ...snippet, frontmatter: { ...snippet.frontmatter } });
  }

  async putSnippetVersion(version: SnippetVersion): Promise<void> {
    const list = this.versions.get(version.snippetId) ?? [];
    list.push({ ...version, frontmatter: { ...version.frontmatter } });
    this.versions.set(version.snippetId, list);
    const snippet = this.snippets.get(version.snippetId);
    if (snippet) {
      this.snippets.set(version.snippetId, {
        ...snippet,
        headRev: version.rev,
        updatedAt: version.timestamp,
        body: version.body,
        frontmatter: { ...version.frontmatter },
      });
    }
  }

  async listSnippetVersions(snippetId: string): Promise<SnippetVersion[]> {
    return (this.versions.get(snippetId) ?? []).map((item) => ({ ...item, frontmatter: { ...item.frontmatter } }));
  }
}

type WorkspaceStoreLike = Pick<MemoryWorkspaceStore, 'listSnippets' | 'getSnippet' | 'upsertSnippet' | 'putSnippetVersion' | 'listSnippetVersions'>;

const createVersion = async (
  base: Snippet,
  rev: number,
  overrides: Partial<SnippetVersion> = {},
): Promise<SnippetVersion> => {
  const body = (overrides.body ?? base.body) as string;
  const frontmatter = (overrides.frontmatter ?? base.frontmatter) as SnippetVersion['frontmatter'];
  const hash = await computeIntegrityHash(body, frontmatter);
  return {
    snippetId: base.id,
    rev,
    parentRev: rev === 1 ? undefined : rev - 1,
    timestamp: Date.now() - rev * 1_000,
    note: overrides.note,
    author: overrides.author,
    body,
    frontmatter,
    hash,
  };
};

const createFixtureStore = async (): Promise<WorkspaceStoreLike> => {
  const snippets: Snippet[] = [
    {
      id: 'snippet-alpha',
      title: 'Alpha snippet',
      path: 'a/core',
      body: 'Initial body',
      headRev: 2,
      frontmatter: { schemaVersion: 1, tags: ['core', 'alpha'] },
      createdAt: Date.now() - 10_000,
      updatedAt: Date.now() - 1_000,
    },
    {
      id: 'snippet-beta',
      title: 'Beta snippet',
      path: 'b',
      body: 'console.log("beta")',
      headRev: 1,
      frontmatter: { schemaVersion: 1, tags: ['beta'] },
      createdAt: Date.now() - 9_000,
      updatedAt: Date.now() - 2_000,
    },
  ];

  const versions: SnippetVersion[][] = [
    [
      await createVersion(snippets[0]!, 1, { body: 'Initial body' }),
      await createVersion(snippets[0]!, 2, { body: 'Updated body' }),
    ],
    [await createVersion(snippets[1]!, 1, { body: 'console.log("beta")' })],
  ];

  return new MemoryWorkspaceStore(snippets, versions);
};

const renderPanel = async (store: WorkspaceStoreLike, expectedName: RegExp = /snippet/i) => {
  render(
    <SnippetLibraryProvider store={store as unknown as WorkspaceStore}>
      <SnippetLibraryPanel store={store as unknown as WorkspaceStore} />
    </SnippetLibraryProvider>,
  );

  await screen.findByRole('button', { name: expectedName });
};

describe('SnippetLibraryPanel', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('renders snippet tree with deterministic ordering and smart folders', async () => {
    const store = await createFixtureStore();
    await renderPanel(store, /alpha snippet/i);

    const tree = screen.getByTestId('snippet-tree');
    const buttons = within(tree)
      .getAllByRole('button')
      .filter((button) => button.getAttribute('draggable') === 'true');
    const titles = buttons.map((button) => {
      const label = within(button).getByText(/snippet/i).textContent ?? '';
      return label.replace(/ v\d+$/i, '').trim();
    });
    expect(titles).toEqual(['Alpha snippet', 'Beta snippet']);
  });

  it('populates drag data with snippet payload', async () => {
    const store = await createFixtureStore();
    await renderPanel(store, /alpha snippet/i);

    const snippetButton = screen.getByRole('button', { name: /alpha snippet/i });
    const setData = vi.fn();
    fireEvent.dragStart(snippetButton, {
      dataTransfer: {
        setData,
        effectAllowed: '',
      },
    });

    expect(setData).toHaveBeenCalledWith(SNIPPET_DRAG_MIME, expect.stringContaining('snippet-alpha'));
    expect(setData).toHaveBeenCalledWith('text/plain', 'Alpha snippet');
  });

  it('restores a revision by creating a new head version immutably', async () => {
    const store = await createFixtureStore();
    await renderPanel(store, /alpha snippet/i);

    const versionList = await screen.findByTestId('snippet-timeline');
    const revisionButtons = within(versionList).getAllByRole('button');
    // Select the oldest revision (last button)
    await waitFor(() => {
      fireEvent.click(revisionButtons[revisionButtons.length - 1]!);
    });

    const restoreButton = screen.getByRole('button', { name: /restore revision/i });
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText(/restored new head/i)).toBeInTheDocument();
    });

    const snippet = await store.getSnippet('snippet-alpha');
    expect(snippet?.headRev).toBe(3);
    const versions = await store.listSnippetVersions('snippet-alpha');
    const revs = versions.map((version) => version.rev).sort((a, b) => a - b);
    expect(revs).toEqual([1, 2, 3]);
  });

  it('pins and unpins revisions using the workspace store', async () => {
    const store = await createFixtureStore();
    await renderPanel(store, /alpha snippet/i);

    const pinButton = screen.getByRole('button', { name: /pin revision/i });
    fireEvent.click(pinButton);

    await waitFor(async () => {
      const snippet = await store.getSnippet('snippet-alpha');
      expect(snippet?.frontmatter.pinnedRevision).toBe(snippet?.headRev);
    });

    fireEvent.click(screen.getByRole('button', { name: /unpin revision/i }));
    await waitFor(async () => {
      const snippet = await store.getSnippet('snippet-alpha');
      expect((snippet?.frontmatter as Record<string, unknown>).pinnedRevision).toBeUndefined();
    });
  });

  it('sanitizes diff output and exposes literal markdown content', async () => {
    const baseSnippet: Snippet = {
      id: 'snippet-xss',
      title: 'Dangerous snippet',
      path: 'security',
      body: '<script>alert(1)</script>',
      headRev: 2,
      frontmatter: { schemaVersion: 1 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const versions = [
      await createVersion(baseSnippet, 1, { body: '<script>alert(1)</script>' }),
      await createVersion(baseSnippet, 2, { body: '<strong>Safe</strong>' }),
    ];
    const store = new MemoryWorkspaceStore([baseSnippet], [versions]);

    await renderPanel(store, /dangerous snippet/i);
    const diff = screen.getByTestId('snippet-diff-viewer');
    expect(diff.textContent).toContain('<script>alert(1)</script>');
    expect(diff.innerHTML).not.toContain('script>');
  });

  it('copies snippet body to clipboard via safe copy mode', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const store = await createFixtureStore();
    await renderPanel(store, /alpha snippet/i);

    fireEvent.click(screen.getByRole('button', { name: /copy body/i }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('Updated body');
    });
  });
});
