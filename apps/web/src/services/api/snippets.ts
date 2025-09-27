import { ApiClient } from './client.js';
import {
  createSnippetRequestSchema,
  createSnippetVersionRequestSchema,
  revertSnippetVersionRequestSchema,
  snippetListResponseSchema,
  snippetParamsSchema,
  snippetResponseSchema,
  snippetVersionParamsSchema,
  snippetVersionResponseSchema,
  updateSnippetRequestSchema,
  type CreateSnippetRequest,
  type CreateSnippetVersionRequest,
  type RevertSnippetVersionRequest,
  type SnippetListResponse,
  type SnippetResponse,
  type SnippetVersionParams,
  type SnippetVersionResponse,
  type UpdateSnippetRequest,
} from '@moduprompt/api/modules/snippets/contracts.js';

export class SnippetsApi {
  constructor(private readonly client: ApiClient) {}

  async list(options: { signal?: AbortSignal } = {}): Promise<SnippetListResponse> {
    return this.client.get<SnippetListResponse>('/snippets', {
      schema: snippetListResponseSchema,
      signal: options.signal,
    });
  }

  async get(id: string, options: { signal?: AbortSignal } = {}): Promise<SnippetResponse> {
    const params = snippetParamsSchema.parse({ id });
    return this.client.get<SnippetResponse>(`/snippets/${encodeURIComponent(params.id)}`, {
      schema: snippetResponseSchema,
      signal: options.signal,
    });
  }

  async create(payload: CreateSnippetRequest, options: { signal?: AbortSignal } = {}): Promise<SnippetResponse> {
    const body = createSnippetRequestSchema.parse(payload);
    return this.client.post<SnippetResponse>('/snippets', body, {
      schema: snippetResponseSchema,
      signal: options.signal,
    });
  }

  async update(id: string, payload: UpdateSnippetRequest, options: { signal?: AbortSignal } = {}): Promise<SnippetResponse['snippet']> {
    const params = snippetParamsSchema.parse({ id });
    const body = updateSnippetRequestSchema.parse(payload);
    return this.client.patch<SnippetResponse['snippet']>(`/snippets/${encodeURIComponent(params.id)}`, body, {
      schema: snippetResponseSchema.shape.snippet,
      signal: options.signal,
    });
  }

  async createVersion(
    id: string,
    payload: CreateSnippetVersionRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<SnippetVersionResponse> {
    const params = snippetParamsSchema.parse({ id });
    const body = createSnippetVersionRequestSchema.parse(payload);
    return this.client.post<SnippetVersionResponse>(
      `/snippets/${encodeURIComponent(params.id)}/versions`,
      body,
      {
        schema: snippetVersionResponseSchema,
        signal: options.signal,
      },
    );
  }

  async revertVersion(
    id: string,
    params: SnippetVersionParams,
    payload: RevertSnippetVersionRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<SnippetResponse> {
    const parsedParams = snippetVersionParamsSchema.parse({ id, rev: params.rev });
    const body = revertSnippetVersionRequestSchema.parse(payload);
    return this.client.post<SnippetResponse>(
      `/snippets/${encodeURIComponent(parsedParams.id)}/versions/${parsedParams.rev}/revert`,
      body,
      {
        schema: snippetResponseSchema,
        signal: options.signal,
      },
    );
  }
}
