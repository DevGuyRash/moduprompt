import { createHash } from 'node:crypto';
import type { JsonObject } from '@moduprompt/types';
import type { Prisma, PrismaClient } from '@prisma/client';
import type {
  SnippetFrontmatter,
  Snippet,
  SnippetVersion,
} from '@moduprompt/types';
import { mapSnippet, mapSnippetVersion } from '../shared/mapper.js';

export interface SnippetListFilters {
  path?: string;
  search?: string;
  tag?: string;
}

export interface CreateSnippetInput {
  title: string;
  path: string;
  frontmatter: SnippetFrontmatter;
  body: string;
}

export interface UpdateSnippetInput {
  title?: string;
  path?: string;
  frontmatter?: Partial<SnippetFrontmatter>;
  body?: string;
}

export interface CreateSnippetVersionInput {
  body: string;
  frontmatter?: Partial<SnippetFrontmatter>;
  authorId?: string;
  authorName?: string;
  authorEmail?: string;
  note?: string;
  copyFromRev?: number;
}

export interface RevertSnippetVersionInput {
  targetRev: number;
  actorId?: string;
}

const computeHash = (body: string, frontmatter: Partial<SnippetFrontmatter> | SnippetFrontmatter): string =>
  createHash('sha256')
    .update(body)
    .update(JSON.stringify(frontmatter))
    .digest('hex');

export class SnippetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: SnippetListFilters = {}): Promise<Snippet[]> {
    const where: Prisma.SnippetWhereInput = {};
    if (filters.path) {
      where.path = { startsWith: filters.path };
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { body: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    const snippets = await this.prisma.snippet.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    const mapped = snippets.map(mapSnippet);
    if (!filters.tag) {
      return mapped;
    }
    return mapped.filter((snippet) => snippet.frontmatter.tags?.includes(filters.tag as string));
  }

  async getById(id: string): Promise<{ snippet: Snippet; versions: SnippetVersion[] } | null> {
    const record = await this.prisma.snippet.findUnique({
      where: { id },
      include: { versions: { orderBy: { rev: 'desc' } } },
    });
    if (!record) {
      return null;
    }
    return {
      snippet: mapSnippet(record),
      versions: record.versions.map(mapSnippetVersion),
    };
  }

  async create(input: CreateSnippetInput): Promise<{ snippet: Snippet; version: SnippetVersion }> {
    return this.prisma.$transaction(async (tx) => {
      const hash = computeHash(input.body, input.frontmatter);
      const snippet = await tx.snippet.create({
        data: {
          title: input.title,
          path: input.path,
          frontmatter: input.frontmatter as unknown as JsonObject,
          body: input.body,
          headRev: 1,
        },
      });
      const version = await tx.snippetVersion.create({
        data: {
          snippetId: snippet.id,
          rev: 1,
          body: input.body,
          frontmatter: input.frontmatter as unknown as JsonObject,
          hash,
        },
      });
      return {
        snippet: mapSnippet(snippet),
        version: mapSnippetVersion(version),
      };
    });
  }

  async update(id: string, input: UpdateSnippetInput): Promise<Snippet | null> {
    const record = await this.prisma.snippet.update({
      where: { id },
      data: {
        title: input.title,
        path: input.path,
        frontmatter: input.frontmatter
          ? (input.frontmatter as unknown as JsonObject)
          : undefined,
        body: input.body,
      },
    });
    return mapSnippet(record);
  }

  async createVersion(id: string, input: CreateSnippetVersionInput): Promise<SnippetVersion> {
    return this.prisma.$transaction(async (tx) => {
      const snippet = await tx.snippet.findUnique({ where: { id } });
      if (!snippet) {
        throw new Error(`Snippet ${id} not found`);
      }

      const nextRev = snippet.headRev + 1;
      let body = input.body;
      let frontmatter = input.frontmatter ?? (snippet.frontmatter as SnippetFrontmatter);

      if (input.copyFromRev) {
        const baseVersion = await tx.snippetVersion.findUnique({
          where: { snippetId_rev: { snippetId: id, rev: input.copyFromRev } },
        });
        if (!baseVersion) {
          throw new Error(`Revision ${input.copyFromRev} not found for snippet ${id}`);
        }
        body = baseVersion.body;
        frontmatter = baseVersion.frontmatter as SnippetFrontmatter;
      }

      const hash = computeHash(body, frontmatter);
      const version = await tx.snippetVersion.create({
        data: {
          snippetId: id,
          rev: nextRev,
          parentRev: snippet.headRev,
          authorId: input.authorId,
          authorName: input.authorName,
          authorEmail: input.authorEmail,
          note: input.note,
          body,
          frontmatter: frontmatter as unknown as JsonObject,
          hash,
        },
      });

      await tx.snippet.update({
        where: { id },
        data: {
          headRev: nextRev,
          body,
          frontmatter: frontmatter as unknown as JsonObject,
          updatedAt: new Date(),
        },
      });

      return mapSnippetVersion(version);
    });
  }

  async revert(id: string, input: RevertSnippetVersionInput): Promise<{ snippet: Snippet; version: SnippetVersion }> {
    return this.prisma.$transaction(async (tx) => {
      const target = await tx.snippetVersion.findUnique({
        where: { snippetId_rev: { snippetId: id, rev: input.targetRev } },
      });
      if (!target) {
        throw new Error(`Revision ${input.targetRev} not found for snippet ${id}`);
      }

      const snippet = await tx.snippet.findUnique({ where: { id } });
      if (!snippet) {
        throw new Error(`Snippet ${id} not found`);
      }

      const nextRev = snippet.headRev + 1;
      const version = await tx.snippetVersion.create({
        data: {
          snippetId: id,
          rev: nextRev,
          parentRev: snippet.headRev,
          authorId: input.actorId,
          body: target.body,
          frontmatter: target.frontmatter,
          hash: target.hash,
          note: `revert-to-${input.targetRev}`,
        },
      });

      const updated = await tx.snippet.update({
        where: { id },
        data: {
          headRev: nextRev,
          body: target.body,
          frontmatter: target.frontmatter,
        },
      });

      return {
        snippet: mapSnippet(updated),
        version: mapSnippetVersion(version),
      };
    });
  }
}
