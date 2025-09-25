import type { PrismaClient } from '@prisma/client';
import type { DocumentModel } from '@moduprompt/types';
import { mapDocument } from '../shared/mapper.js';
import { toInputJson } from '../shared/prismaJson.js';

export interface DocumentListFilters {
  status?: string;
  tag?: string;
  search?: string;
}

export interface CreateDocumentInput extends Omit<DocumentModel, 'createdAt' | 'updatedAt' | 'id'> {}

export interface UpdateDocumentInput extends Partial<Omit<DocumentModel, 'id' | 'createdAt' | 'updatedAt'>> {}

export class DocumentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: DocumentListFilters = {}): Promise<DocumentModel[]> {
    const records = await this.prisma.document.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return records
      .map(mapDocument)
      .filter((document) => {
        if (filters.status && document.statusKey !== filters.status) {
          return false;
        }
        if (filters.tag && !document.tags.includes(filters.tag)) {
          return false;
        }
        if (filters.search) {
          const haystack = `${document.title}\n${JSON.stringify(document.blocks)}`.toLowerCase();
          if (!haystack.includes(filters.search.toLowerCase())) {
            return false;
          }
        }
        return true;
      });
  }

  async getById(id: string): Promise<DocumentModel | null> {
    const record = await this.prisma.document.findUnique({ where: { id } });
    return record ? mapDocument(record) : null;
  }

  async create(input: CreateDocumentInput & { id: string }): Promise<DocumentModel> {
    const record = await this.prisma.document.create({
      data: {
        id: input.id,
        title: input.title,
        schemaVersion: input.schemaVersion,
        blocks: toInputJson(input.blocks),
        edges: toInputJson(input.edges),
        variables: toInputJson(input.variables),
        exportRecipes: toInputJson(input.exportRecipes),
        tags: toInputJson(input.tags),
        statusKey: input.statusKey,
        settings: toInputJson(input.settings),
      },
    });
    return mapDocument(record);
  }

  async update(id: string, input: UpdateDocumentInput): Promise<DocumentModel> {
    const record = await this.prisma.document.update({
      where: { id },
      data: {
        title: input.title,
        blocks: input.blocks ? toInputJson(input.blocks) : undefined,
        edges: input.edges ? toInputJson(input.edges) : undefined,
        variables: input.variables ? toInputJson(input.variables) : undefined,
        exportRecipes: input.exportRecipes ? toInputJson(input.exportRecipes) : undefined,
        tags: input.tags ? toInputJson(input.tags) : undefined,
        statusKey: input.statusKey,
        settings: input.settings ? toInputJson(input.settings) : undefined,
      },
    });
    return mapDocument(record);
  }

  async setTags(id: string, tags: string[]): Promise<DocumentModel> {
    const record = await this.prisma.document.update({
      where: { id },
      data: {
        tags: toInputJson(tags),
      },
    });
    return mapDocument(record);
  }

  async setStatus(id: string, statusKey: string): Promise<DocumentModel> {
    const record = await this.prisma.document.update({
      where: { id },
      data: {
        statusKey,
      },
    });
    return mapDocument(record);
  }
}
