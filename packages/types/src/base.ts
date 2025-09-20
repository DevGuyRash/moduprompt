export type ISODateString = string;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

/**
 * Identifiable resources share a stable unique identifier.
 */
export interface Identifiable {
  id: string;
}

/**
 * Timestamped resources capture millisecond epoch boundaries aligned with Dexie/Prisma conventions.
 */
export interface Timestamped {
  createdAt: number;
  updatedAt: number;
}

/**
 * Revisioned resources encode a schema version to support migrations.
 */
export interface Revisioned {
  schemaVersion: number;
}

/**
 * Common author metadata attached to snippet revisions and audit records.
 */
export interface AuthorMeta {
  id: string;
  name?: string;
  email?: string;
}

/**
 * Color tokens stored as hex values validated elsewhere (governance UI enforces AA contrast).
 */
export type HexColor = `#${string}`;

/**
 * Shared base contract for domain entities captured in the export pipeline.
 */
export interface DomainEntity extends Identifiable, Timestamped {}

export interface RevisionedEntity extends DomainEntity, Revisioned {}
