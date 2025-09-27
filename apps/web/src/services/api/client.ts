import type { z } from 'zod';
import { runtimeEnv } from '../../config/env.js';

export interface RequestOptions<TSchema extends z.ZodTypeAny | undefined = undefined> {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  schema?: TSchema;
  signal?: AbortSignal;
}

export interface ApiErrorPayload {
  message?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: ApiErrorPayload | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const acceptsJson = new Set(['application/json', 'application/problem+json']);

const isJsonResponse = (contentType: string | null): boolean => {
  if (!contentType) return false;
  const [type] = contentType.split(';');
  return type != null && acceptsJson.has(type.trim().toLowerCase());
};

export class ApiClient {
  constructor(private readonly baseUrl: string = runtimeEnv.apiBaseUrl) {}

  private buildUrl(path: string): string {
    if (/^https?:/i.test(path)) {
      return path;
    }
    const normalizedBase = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  async request<TResult, TSchema extends z.ZodTypeAny | undefined = undefined>(
    path: string,
    { method = 'GET', body, headers, schema, signal }: RequestOptions<TSchema> = {},
  ): Promise<TResult> {
    const url = this.buildUrl(path);
    const init: RequestInit = {
      method,
      headers: {
        Accept: 'application/json',
        ...(body != null ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      signal,
    };

    if (body != null) {
      init.body = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, init);
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Network request failed',
        0,
        null,
      );
    }

    const contentType = response.headers.get('content-type');
    let payload: unknown = undefined;

    if (response.status !== 204 && isJsonResponse(contentType)) {
      try {
        payload = await response.json();
      } catch (error) {
        if (response.ok) {
          throw new ApiError(
            error instanceof Error ? error.message : 'Failed to parse response payload',
            response.status,
            null,
          );
        }
      }
    }

    if (!response.ok) {
      const errorPayload = (payload && typeof payload === 'object' ? (payload as ApiErrorPayload) : null) ?? null;
      const message = errorPayload?.message ?? `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, errorPayload);
    }

    if (!schema) {
      return payload as TResult;
    }

    const parsed = schema.parse(payload);
    return parsed as TResult;
  }

  get<TResult, TSchema extends z.ZodTypeAny | undefined = undefined>(
    path: string,
    options: Omit<RequestOptions<TSchema>, 'method' | 'body'> = {},
  ): Promise<TResult> {
    return this.request<TResult, TSchema>(path, { ...options, method: 'GET' });
  }

  post<TResult, TSchema extends z.ZodTypeAny | undefined = undefined>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions<TSchema>, 'method' | 'body'> = {},
  ): Promise<TResult> {
    return this.request<TResult, TSchema>(path, { ...options, method: 'POST', body });
  }

  patch<TResult, TSchema extends z.ZodTypeAny | undefined = undefined>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions<TSchema>, 'method' | 'body'> = {},
  ): Promise<TResult> {
    return this.request<TResult, TSchema>(path, { ...options, method: 'PATCH', body });
  }
}
