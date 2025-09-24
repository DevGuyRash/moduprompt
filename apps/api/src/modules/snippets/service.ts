import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import type { Snippet, SnippetVersion } from '@moduprompt/types';
import { SnippetRepository } from './repository.js';
import type {
  CreateSnippetInput,
  CreateSnippetVersionInput,
  RevertSnippetVersionInput,
  SnippetListFilters,
  UpdateSnippetInput,
} from './repository.js';

export class SnippetService {
  constructor(private readonly app: FastifyInstance, private readonly repository = new SnippetRepository(app.prisma)) {}

  async list(filters: SnippetListFilters = {}): Promise<Snippet[]> {
    return this.repository.list(filters);
  }

  async get(id: string): Promise<{ snippet: Snippet; versions: SnippetVersion[] } | null> {
    return this.repository.getById(id);
  }

  async create(input: CreateSnippetInput, actorId?: string): Promise<{ snippet: Snippet; version: SnippetVersion }> {
    const result = await this.repository.create(input);
    await this.app.events.dispatch({
      id: nanoid(),
      type: 'snippet.version.created',
      occurredAt: new Date().toISOString(),
      actorId,
      snippet: result.snippet,
      version: result.version,
    });
    return result;
  }

  async update(id: string, input: UpdateSnippetInput): Promise<Snippet> {
    const snippet = await this.repository.update(id, input);
    if (!snippet) {
      throw new Error(`Snippet ${id} not found`);
    }
    return snippet;
  }

  async createVersion(id: string, input: CreateSnippetVersionInput): Promise<SnippetVersion> {
    const version = await this.repository.createVersion(id, input);
    const snapshot = await this.repository.getById(id);
    if (!snapshot) {
      throw new Error(`Snippet ${id} not found after creating version`);
    }
    await this.app.events.dispatch({
      id: nanoid(),
      type: 'snippet.version.created',
      occurredAt: new Date().toISOString(),
      actorId: input.authorId,
      snippet: snapshot.snippet,
      version,
    });
    return version;
  }

  async revert(id: string, input: RevertSnippetVersionInput): Promise<{ snippet: Snippet; version: SnippetVersion }> {
    const result = await this.repository.revert(id, input);
    await this.app.events.dispatch({
      id: nanoid(),
      type: 'snippet.version.reverted',
      occurredAt: new Date().toISOString(),
      actorId: input.actorId,
      snippet: result.snippet,
      version: result.version,
      revertedToRev: input.targetRev,
    });
    return result;
  }
}
