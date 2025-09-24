import { nanoid } from 'nanoid';
import type { FastifyInstance } from 'fastify';
import { PluginRepository, type PluginRecord } from './repository.js';

export class PluginService {
  private readonly repository: PluginRepository;

  constructor(private readonly app: FastifyInstance, repository?: PluginRepository) {
    this.repository = repository ?? new PluginRepository(app.prisma);
  }

  async list(enabled?: boolean): Promise<PluginRecord[]> {
    return this.repository.list(enabled);
  }

  async register(input: {
    name: string;
    version: string;
    kind: string;
    manifest: Record<string, unknown>;
    actorId?: string;
  }): Promise<PluginRecord> {
    const plugin = await this.repository.register(input);
    await this.app.events.dispatch({
      id: nanoid(),
      type: 'plugin.installed',
      occurredAt: new Date().toISOString(),
      actorId: input.actorId,
      pluginId: plugin.id,
      name: plugin.name,
      version: plugin.version,
    });
    return plugin;
  }
}
