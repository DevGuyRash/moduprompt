import { Prisma } from '@prisma/client';

export const toInputJson = (value: unknown): Prisma.InputJsonValue =>
  (value ?? Prisma.JsonNull) as Prisma.InputJsonValue;

export const toOptionalInputJson = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined ? undefined : toInputJson(value);

export const toJsonObject = (value: Record<string, unknown>): Prisma.JsonObject =>
  value as unknown as Prisma.JsonObject;

export const toStringArrayJson = (value: string[]): Prisma.InputJsonValue =>
  value as unknown as Prisma.InputJsonValue;

export const requireJson = <T>(value: Prisma.JsonValue | null | undefined): T => {
  if (value == null) {
    throw new Error('Expected JSON value');
  }
  return value as unknown as T;
};

export const fromJsonOrUndefined = <T>(value: Prisma.JsonValue | null | undefined): T | undefined =>
  value == null ? undefined : (value as unknown as T);

export const fromJsonOrNull = <T>(value: Prisma.JsonValue | null | undefined): T | null =>
  value == null ? null : (value as unknown as T);

export const fromJson = <T>(value: Prisma.JsonValue | null | undefined, fallback: T): T =>
  value == null ? fallback : (value as unknown as T);
