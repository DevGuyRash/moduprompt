import { ApiClient } from './client.js';
import {
  documentListResponseSchema,
  documentResponseSchema,
  setStatusRequestSchema,
  setTagsRequestSchema,
  updateDocumentRequestSchema,
  type DocumentListResponse,
  type DocumentResponse,
  type SetStatusRequest,
  type SetTagsRequest,
  type UpdateDocumentRequest,
} from '@moduprompt/api/modules/documents/contracts.js';

export interface ListDocumentsOptions {
  signal?: AbortSignal;
}

export interface UpdateDocumentOptions {
  signal?: AbortSignal;
}

export interface SetTagsOptions {
  signal?: AbortSignal;
}

export interface SetStatusOptions {
  signal?: AbortSignal;
}

export class DocumentsApi {
  constructor(private readonly client: ApiClient) {}

  async list(options: ListDocumentsOptions = {}): Promise<DocumentListResponse> {
    return this.client.get<DocumentListResponse>('/documents', {
      schema: documentListResponseSchema,
      signal: options.signal,
    });
  }

  async get(id: string, options: { signal?: AbortSignal } = {}): Promise<DocumentResponse> {
    return this.client.get<DocumentResponse>(`/documents/${encodeURIComponent(id)}`, {
      schema: documentResponseSchema,
      signal: options.signal,
    });
  }

  async update(
    id: string,
    payload: UpdateDocumentRequest,
    options: UpdateDocumentOptions = {},
  ): Promise<DocumentResponse> {
    const body = updateDocumentRequestSchema.parse(payload);
    return this.client.patch<DocumentResponse>(`/documents/${encodeURIComponent(id)}`, body, {
      schema: documentResponseSchema,
      signal: options.signal,
    });
  }

  async setTags(id: string, payload: SetTagsRequest, options: SetTagsOptions = {}): Promise<DocumentResponse> {
    const body = setTagsRequestSchema.parse(payload);
    return this.client.patch<DocumentResponse>(`/documents/${encodeURIComponent(id)}/tags`, body, {
      schema: documentResponseSchema,
      signal: options.signal,
    });
  }

  async setStatus(
    id: string,
    payload: SetStatusRequest,
    options: SetStatusOptions = {},
  ): Promise<DocumentResponse> {
    const body = setStatusRequestSchema.parse(payload);
    return this.client.patch<DocumentResponse>(`/documents/${encodeURIComponent(id)}/status`, body, {
      schema: documentResponseSchema,
      signal: options.signal,
    });
  }
}
