import type { Transaction } from 'dexie';

export interface WorkspaceMigration {
  /**
   * Dexie version number for the migration.
   */
  version: number;
  /**
   * Table schema definitions keyed by table name.
   */
  stores: Record<string, string>;
  /**
   * Optional upgrade hook executed within the versioned transaction.
   */
  upgrade?: (tx: Transaction) => Promise<void> | void;
}

export type MigrationList = WorkspaceMigration[];
