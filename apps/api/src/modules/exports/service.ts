import { nanoid } from 'nanoid';
import type { FastifyInstance } from 'fastify';
import type { ExportJobStatus } from '@prisma/client';
import { ExportRepository } from './repository.js';
import type { CreateExportJobInput, ExportJobFilters, ExportJobView, UpdateExportJobInput } from './repository.js';
import { assertExportAllowed } from '../governance/policy.js';
import { mapWorkspaceStatus } from '../shared/mapper.js';

const nowIso = (): string => new Date().toISOString();

export class ExportService {
  private readonly repository: ExportRepository;

  constructor(private readonly app: FastifyInstance, repository?: ExportRepository) {
    this.repository = repository ?? new ExportRepository(app.prisma);
  }

  async list(filters: ExportJobFilters = {}): Promise<ExportJobView[]> {
    return this.repository.list(filters);
  }

  async get(id: string): Promise<ExportJobView | null> {
    return this.repository.getJob(id);
  }

  async create(input: CreateExportJobInput): Promise<ExportJobView> {
    const document = await this.repository.getDocument(input.documentId);
    if (!document) {
      throw new Error(`Document ${input.documentId} not found`);
    }
    const recipe = await this.repository.getRecipe(input.recipeId);
    if (!recipe) {
      throw new Error(`Export recipe ${input.recipeId} not found`);
    }

    const statuses = await this.app.prisma.workspaceStatus.findMany();
    assertExportAllowed(
      { statuses: statuses.map(mapWorkspaceStatus) },
      {
        statusKey: document.statusKey,
        recipe,
      },
    );

    const job = await this.repository.createJob(input);

    await this.app.events.dispatch({
      id: nanoid(),
      type: 'export.created',
      occurredAt: nowIso(),
      actorId: input.requestedBy,
      exportJobId: job.id,
      documentId: document.id,
      recipe,
    });

    void this.app.exportQueue.enqueue(job.id);

    return job;
  }

  async update(id: string, input: UpdateExportJobInput): Promise<ExportJobView> {
    const job = await this.repository.updateJob(id, input);
    const recipe = await this.repository.getRecipe(job.recipeId);
    const document = await this.repository.getDocument(job.documentId);
    if (!recipe || !document) {
      return job;
    }
    const baseEvent = {
      id: nanoid(),
      occurredAt: nowIso(),
      actorId: input.actorId,
      exportJobId: job.id,
      documentId: document.id,
      recipe,
    } as const;

    if (input.status === 'completed' && input.artifactUri) {
      await this.app.events.dispatch({
        ...baseEvent,
        type: 'export.completed',
        artifactUri: input.artifactUri,
      });
    }

    if (input.status === 'failed' && input.error) {
      await this.app.events.dispatch({
        ...baseEvent,
        type: 'export.failed',
        error: input.error,
      });
    }

    return job;
  }
}
