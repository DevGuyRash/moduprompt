import type { SnippetVersion } from '@moduprompt/types';
import type { MigrationList } from './types';
import { computeIntegrityHash } from '../src/internal/hash';

export const WORKSPACE_MIGRATIONS: MigrationList = [
  {
    version: 1,
    stores: {
      documents: '&id, updatedAt, title',
      snippets: '&id, path, updatedAt, headRev',
      snippetVersions: '&[snippetId+rev], snippetId, rev, timestamp',
      workspaceSettings: '&id, updatedAt',
    },
  },
  {
    version: 2,
    stores: {
      documents: '&id, updatedAt, title',
      snippets: '&id, path, updatedAt, headRev',
      snippetVersions: '&[snippetId+rev], snippetId, rev, timestamp, hash',
      workspaceSettings: '&id, updatedAt',
    },
    upgrade: async (tx) => {
      const table = tx.table('snippetVersions');
      const versions = (await table.toArray()) as SnippetVersion[];

      await Promise.all(
        versions.map(async (version) => {
          const expected = await computeIntegrityHash(version.body, version.frontmatter);
          if (version.hash !== expected) {
            const updated: SnippetVersion = {
              ...version,
              hash: expected,
            };
            await table.put(updated);
          }
        }),
      );
    },
  },
];
