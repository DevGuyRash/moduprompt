import type { WorkspaceMigration } from '../../migrations/types.js';

const REQUIRED_TABLES = ['documents', 'snippets', 'snippetVersions', 'workspaceSettings'];

export class MigrationValidationError extends Error {}

const assertSequential = (current: number, previous: number): void => {
  if (!Number.isInteger(current) || current <= 0) {
    throw new MigrationValidationError(`Migration version must be a positive integer. Received: ${current}`);
  }
  if (current !== previous + 1) {
    throw new MigrationValidationError(
      `Migration versions must be sequential. Expected ${previous + 1}, received ${current}.`,
    );
  }
};

const assertRequiredTables = (migration: WorkspaceMigration): void => {
  for (const table of REQUIRED_TABLES) {
    if (!(table in migration.stores)) {
      throw new MigrationValidationError(`Migration ${migration.version} is missing required table "${table}".`);
    }
  }
};

const assertNoTableRemoval = (
  migration: WorkspaceMigration,
  previousTables: ReadonlySet<string>,
): void => {
  for (const table of previousTables) {
    if (!(table in migration.stores)) {
      throw new MigrationValidationError(
        `Migration ${migration.version} removes table "${table}" which is not permitted for deterministic upgrades.`,
      );
    }
  }
};

export const validateMigrationList = (migrations: WorkspaceMigration[]): void => {
  if (!Array.isArray(migrations) || migrations.length === 0) {
    throw new MigrationValidationError('At least one migration is required for workspace persistence.');
  }

  let previousVersion = 0;
  let previousTables: Set<string> = new Set();

  for (const migration of migrations) {
    assertSequential(migration.version, previousVersion);
    assertRequiredTables(migration);
    if (previousTables.size > 0) {
      assertNoTableRemoval(migration, previousTables);
    }

    previousVersion = migration.version;
    previousTables = new Set(Object.keys(migration.stores));
  }
};
