import type { PrismaClient } from '@prisma/client';

export interface PluginRecord {
  id: string;
  name: string;
  version: string;
  kind: string;
  manifest: Record<string, unknown>;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export class PluginRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(enabled?: boolean): Promise<PluginRecord[]> {
    const plugins = await this.prisma.pluginRegistry.findMany({
      where: typeof enabled === 'boolean' ? { enabled } : undefined,
      orderBy: { createdAt: 'desc' },
    });
    return plugins.map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      kind: plugin.kind,
      manifest: plugin.manifest as Record<string, unknown>,
      enabled: plugin.enabled,
      createdAt: plugin.createdAt.getTime(),
      updatedAt: plugin.updatedAt.getTime(),
    }));
  }

  async register(input: { name: string; version: string; kind: string; manifest: Record<string, unknown> }): Promise<PluginRecord> {
    const plugin = await this.prisma.pluginRegistry.upsert({
      where: {
        name_version_kind: {
          name: input.name,
          version: input.version,
          kind: input.kind,
        },
      },
      update: {
        manifest: input.manifest,
        enabled: true,
      },
      create: {
        name: input.name,
        version: input.version,
        kind: input.kind,
        manifest: input.manifest,
      },
    });
    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      kind: plugin.kind,
      manifest: plugin.manifest as Record<string, unknown>,
      enabled: plugin.enabled,
      createdAt: plugin.createdAt.getTime(),
      updatedAt: plugin.updatedAt.getTime(),
    };
  }
}
