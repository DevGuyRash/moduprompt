import type { PrismaClient, Prisma, ExportJobStatus } from '@prisma/client';
import type { SnippetBundle } from '@moduprompt/compiler';
import { mapDocument, mapExportRecipe, mapSnippet, mapSnippetVersion } from '../shared/mapper.js';

export interface ExportJobFilters {
  documentId?: string;
  recipeId?: string;
}

export interface CreateExportJobInput {
  documentId: string;
  recipeId: string;
  requestedBy?: string;
}

export interface UpdateExportJobInput {
  status: ExportJobStatus;
  artifactUri?: string;
  error?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export interface ExportJobContext {
  job: ExportJobView;
  document: ReturnType<typeof mapDocument>;
  recipe: ReturnType<typeof mapExportRecipe>;
}

export interface ExportJobView {
  id: string;
  status: ExportJobStatus;
  documentId: string;
  recipeId: string;
  artifactUri?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
  requestedBy?: string | null;
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
}

type ExportJobRecord = {
  id: string;
  status: ExportJobStatus;
  documentId: string;
  recipeId: string;
  artifactUri: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  requestedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

export class ExportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: ExportJobFilters = {}): Promise<ExportJobView[]> {
    const jobs = await this.prisma.exportJob.findMany({
      where: {
        documentId: filters.documentId,
        recipeId: filters.recipeId,
      },
      orderBy: { createdAt: 'desc' },
    });
    return jobs.map((job) => this.mapJob(job as unknown as ExportJobRecord));
  }

  async getJob(id: string): Promise<ExportJobView | null> {
    const job = await this.prisma.exportJob.findUnique({ where: { id } });
    return job ? this.mapJob(job as unknown as ExportJobRecord) : null;
  }

  async createJob(input: CreateExportJobInput): Promise<ExportJobView> {
    const job = await this.prisma.exportJob.create({
      data: {
        documentId: input.documentId,
        recipeId: input.recipeId,
        requestedBy: input.requestedBy,
        status: 'queued',
      },
    });
    return this.mapJob(job as unknown as ExportJobRecord);
  }

  async updateJob(id: string, input: UpdateExportJobInput): Promise<ExportJobView> {
    const job = await this.prisma.exportJob.update({
      where: { id },
      data: {
        status: input.status,
        artifactUri: input.artifactUri,
        error: input.error,
        metadata: input.metadata !== undefined ? (input.metadata as Prisma.InputJsonValue) : undefined,
        completedAt: input.status === 'completed' || input.status === 'failed' ? new Date() : undefined,
      },
    });
    return this.mapJob(job as unknown as ExportJobRecord);
  }

  async markProcessing(id: string, metadata?: Record<string, unknown>): Promise<ExportJobView> {
    const job = await this.prisma.exportJob.update({
      where: { id },
      data: {
        status: 'processing',
        error: null,
        metadata: metadata !== undefined ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
    return this.mapJob(job as unknown as ExportJobRecord);
  }

  async markQueued(id: string, metadata?: Record<string, unknown>): Promise<ExportJobView> {
    const job = await this.prisma.exportJob.update({
      where: { id },
      data: {
        status: 'queued',
        metadata: metadata !== undefined ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
    return this.mapJob(job as unknown as ExportJobRecord);
  }

  async markCompleted(
    id: string,
    input: { artifactUri: string; metadata: Record<string, unknown>; },
  ): Promise<ExportJobView> {
    const job = await this.prisma.exportJob.update({
      where: { id },
      data: {
        status: 'completed',
        artifactUri: input.artifactUri,
        metadata: input.metadata as Prisma.InputJsonValue,
        error: null,
        completedAt: new Date(),
      },
    });
    return this.mapJob(job as unknown as ExportJobRecord);
  }

  async markFailed(id: string, input: { error: string; metadata?: Record<string, unknown> }): Promise<ExportJobView> {
    const job = await this.prisma.exportJob.update({
      where: { id },
      data: {
        status: 'failed',
        error: input.error,
        metadata: input.metadata !== undefined ? (input.metadata as Prisma.InputJsonValue) : undefined,
        completedAt: new Date(),
      },
    });
    return this.mapJob(job as unknown as ExportJobRecord);
  }

  async getJobContext(id: string): Promise<ExportJobContext | null> {
    const job = await this.prisma.exportJob.findUnique({
      where: { id },
      include: { document: true, recipe: true },
    });
    if (!job || !job.document || !job.recipe) {
      return null;
    }
    return {
      job: this.mapJob(job as unknown as ExportJobRecord),
      document: mapDocument(job.document),
      recipe: mapExportRecipe(job.recipe),
    };
  }

  async getSnippetBundles(ids: string[]): Promise<SnippetBundle[]> {
    const uniqueIds = Array.from(new Set(ids));
    const where: Prisma.SnippetWhereInput = uniqueIds.length > 0 ? { id: { in: uniqueIds } } : {};
    const records = await this.prisma.snippet.findMany({
      where,
      include: { versions: { orderBy: { rev: 'asc' } } },
    });
    return records.map((record) => {
      const { versions, ...snippet } = record;
      return {
        snippet: mapSnippet(snippet as unknown as Parameters<typeof mapSnippet>[0]),
        versions: versions.map((version) => mapSnippetVersion(version as unknown as Parameters<typeof mapSnippetVersion>[0])),
      };
    });
  }

  async getDocument(id: string) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    return document ? mapDocument(document) : null;
  }

  async getRecipe(id: string) {
    const recipe = await this.prisma.exportRecipe.findUnique({ where: { id } });
    return recipe ? mapExportRecipe(recipe) : null;
  }

  private mapJob(job: ExportJobRecord): ExportJobView {
    return {
      ...job,
      createdAt: job.createdAt.getTime(),
      updatedAt: job.updatedAt.getTime(),
      completedAt: job.completedAt?.getTime() ?? null,
    };
  }
}
