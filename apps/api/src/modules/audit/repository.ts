import type { Prisma, PrismaClient } from '@prisma/client';
import type { AuditLogEntry, AuditLogEventType } from '@moduprompt/types';
import type { AuditLogListQuery } from './schemas.js';

export interface AuditLogRecord extends AuditLogEntry {}

const toJson = (value: Record<string, unknown>): Prisma.JsonObject => value as Prisma.JsonObject;

export class AuditRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLogEntry.upsert({
      where: { id: entry.id },
      update: {
        type: entry.type,
        subjectId: entry.subjectId,
        metadata: toJson(entry.metadata),
        actorId: entry.actorId,
        occurredAt: new Date(entry.occurredAt),
      },
      create: {
        id: entry.id,
        type: entry.type,
        subjectId: entry.subjectId,
        metadata: toJson(entry.metadata),
        actorId: entry.actorId,
        occurredAt: new Date(entry.occurredAt),
        createdAt: new Date(entry.createdAt),
      },
    });
  }

  async insertMany(entries: AuditLogEntry[]): Promise<void> {
    if (!entries.length) return;
    const data = entries.map((entry) => ({
      id: entry.id,
      type: entry.type,
      subjectId: entry.subjectId,
      metadata: toJson(entry.metadata),
      actorId: entry.actorId,
      occurredAt: new Date(entry.occurredAt),
      createdAt: new Date(entry.createdAt),
    } satisfies Prisma.AuditLogEntryCreateManyInput));

    await this.prisma.auditLogEntry.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async list({ limit, cursor }: AuditLogListQuery): Promise<{ items: AuditLogRecord[]; nextCursor: string | null }> {
    const records = await this.prisma.auditLogEntry.findMany({
      take: limit + 1,
      orderBy: [
        { occurredAt: 'desc' },
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    const items = records.slice(0, limit).map((record) => ({
      id: record.id,
      type: record.type as AuditLogEventType,
      subjectId: record.subjectId,
      metadata: (record.metadata as Prisma.JsonObject) ?? {},
      actorId: record.actorId ?? undefined,
      occurredAt: record.occurredAt.toISOString(),
      createdAt: record.createdAt.getTime(),
      updatedAt: record.createdAt.getTime(),
    } satisfies AuditLogRecord));

    const nextCursor = records.length > limit ? records[limit]?.id ?? null : null;

    return { items, nextCursor };
  }
}
