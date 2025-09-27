import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiClient } from '../client.js';

declare global {
  // eslint-disable-next-line no-var
  var fetch: typeof fetch;
}

const originalFetch = globalThis.fetch;

describe('ApiClient', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('parses successful JSON responses with schema validation', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 'doc-1', title: 'Test Title' }),
    } as Partial<Response>;

    (fetch as unknown as vi.Mock).mockResolvedValue(mockResponse);

    const client = new ApiClient('https://api.example.test');
    const schema = z.object({ id: z.string(), title: z.string() });

    await expect(client.get('/documents/doc-1', { schema })).resolves.toStrictEqual({
      id: 'doc-1',
      title: 'Test Title',
    });

    const call = (fetch as unknown as vi.Mock).mock.calls[0];
    expect(call[0]).toBe('https://api.example.test/documents/doc-1');
    expect(call[1]?.method).toBe('GET');
    expect(call[1]?.headers).toMatchObject({ Accept: 'application/json' });
  });

  it('throws ApiError with payload details for error responses', async () => {
    const mockResponse = {
      ok: false,
      status: 422,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ message: 'Validation failed', issues: ['title required'] }),
    } as Partial<Response>;

    (fetch as unknown as vi.Mock).mockResolvedValue(mockResponse);

    const client = new ApiClient('https://api.example.test');

    await expect(client.post('/documents', { title: '' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 422,
      payload: { message: 'Validation failed', issues: ['title required'] },
      message: 'Validation failed',
    });
  });

  it('wraps network failures with status 0', async () => {
    (fetch as unknown as vi.Mock).mockRejectedValue(new Error('connect ECONNREFUSED'));

    const client = new ApiClient('https://api.example.test');

    await expect(client.get('/health')).rejects.toMatchObject({
      name: 'ApiError',
      status: 0,
      message: 'connect ECONNREFUSED',
    });
  });

  it('returns undefined for 204 responses without schema enforcement', async () => {
    const mockResponse = {
      ok: true,
      status: 204,
      headers: new Headers(),
      json: async () => ({}),
    } as Partial<Response>;

    (fetch as unknown as vi.Mock).mockResolvedValue(mockResponse);

    const client = new ApiClient('https://api.example.test');

    await expect(
      client.request('/documents/doc-1', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
  });

  it('bubbles schema validation failures with context', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ id: 123, title: 'Wrong Type' }),
    } as Partial<Response>;

    (fetch as unknown as vi.Mock).mockResolvedValue(mockResponse);

    const client = new ApiClient('https://api.example.test');
    const schema = z.object({ id: z.string(), title: z.string() });

    await expect(client.get('/documents/doc-1', { schema })).rejects.toMatchObject({
      name: 'ZodError',
    });
  });
});
