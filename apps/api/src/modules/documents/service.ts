import { nanoid } from 'nanoid';
import type { FastifyInstance } from 'fastify';
import type { DocumentModel } from '@moduprompt/types';
import { DocumentRepository } from './repository.js';
import type {
  CreateDocumentInput,
  DocumentListFilters,
  UpdateDocumentInput,
} from './repository.js';
import { createTagsAudit, evaluateStatusChange, type GovernancePolicyContext } from '../governance/policy.js';
import { mapWorkspaceStatus } from '../shared/mapper.js';

export interface SetTagsInput {
  tags: string[];
  actorId?: string;
}

export interface SetStatusInput {
  statusKey: string;
  actorId?: string;
}

const nowIso = (): string => new Date().toISOString();

export class DocumentService {
  private readonly repository: DocumentRepository;

  constructor(private readonly app: FastifyInstance, repository?: DocumentRepository) {
    this.repository = repository ?? new DocumentRepository(app.prisma);
  }

  async list(filters: DocumentListFilters = {}): Promise<DocumentModel[]> {
    return this.repository.list(filters);
  }

  async get(id: string): Promise<DocumentModel | null> {
    return this.repository.getById(id);
  }

  async create(input: CreateDocumentInput & { id?: string }, actorId?: string): Promise<DocumentModel> {
    const document = await this.repository.create({
      ...input,
      id: input.id ?? nanoid(),
    });
    await this.app.events.dispatch({
      id: nanoid(),
      type: 'document.tags.changed',
      occurredAt: nowIso(),
      actorId,
      document,
      previousTags: [],
    });
    return document;
  }

  async update(id: string, input: UpdateDocumentInput): Promise<DocumentModel> {
    return this.repository.update(id, input);
  }

  async setTags(id: string, input: SetTagsInput): Promise<DocumentModel> {
    const current = await this.repository.getById(id);
    if (!current) {
      throw new Error(`Document ${id} not found`);
    }
    const normalize = (tags: string[]) => [...tags].sort();
    if (JSON.stringify(normalize(current.tags)) === JSON.stringify(normalize(input.tags))) {
      return current;
    }

    const updated = await this.repository.setTags(id, normalize(input.tags));
    const audit = createTagsAudit(
      {
        auditId: nanoid(),
        actorId: input.actorId,
        documentId: id,
        occurredAt: nowIso(),
      },
      { previous: current.tags, next: updated.tags },
    );
    await this.app.prisma.auditLogEntry.create({
      data: {
        id: audit.id,
        type: audit.type,
        subjectId: audit.subjectId,
        metadata: audit.metadata as Record<string, unknown>,
        actorId: audit.actorId,
        occurredAt: new Date(audit.occurredAt),
      },
    });
    await this.app.events.dispatch(
      {
        id: nanoid(),
        type: 'document.tags.changed',
        occurredAt: nowIso(),
        actorId: input.actorId,
        document: updated,
        previousTags: current.tags,
      },
      { persistAudit: false },
    );
    return updated;
  }

  async setStatus(id: string, input: SetStatusInput): Promise<DocumentModel> {
    const current = await this.repository.getById(id);
    if (!current) {
      throw new Error(`Document ${id} not found`);
    }
    const policy = await this.getPolicyContext();
    const evaluation = evaluateStatusChange(
      policy,
      { from: current.statusKey, to: input.statusKey },
      {
        auditId: nanoid(),
        actorId: input.actorId,
        documentId: current.id,
        occurredAt: nowIso(),
      },
    );

    if (!evaluation.result.allowed) {
      throw new Error(evaluation.result.reason ?? 'Status transition blocked by policy');
    }

    if (!evaluation.result.changed) {
      return current;
    }

    const updated = await this.repository.setStatus(id, input.statusKey);

    if (evaluation.audit) {
      await this.app.prisma.auditLogEntry.create({
        data: {
          id: evaluation.audit.id,
          type: evaluation.audit.type,
          subjectId: evaluation.audit.subjectId,
          metadata: evaluation.audit.metadata as Record<string, unknown>,
          actorId: evaluation.audit.actorId,
          occurredAt: new Date(evaluation.audit.occurredAt),
        },
      });
    }

    await this.app.events.dispatch(
      {
        id: nanoid(),
        type: 'document.status.changed',
        occurredAt: nowIso(),
        actorId: input.actorId,
        document: updated,
        previousStatus: current.statusKey,
      },
      { persistAudit: !evaluation.audit },
    );

    return updated;
  }

  private async getPolicyContext(): Promise<GovernancePolicyContext> {
    const statuses = await this.app.prisma.workspaceStatus.findMany();
    return { statuses: statuses.map(mapWorkspaceStatus) };
  }
}
