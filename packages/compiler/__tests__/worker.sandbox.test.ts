import { describe, it, expect, vi } from 'vitest';
import { registerCompilerWorker } from '../src/worker';

describe('compiler worker sandbox', () => {
  it('disables network APIs when registering worker scope', () => {
    const listeners: Array<(event: { data: unknown }) => void> = [];
    const scope: Record<string, unknown> = {
      fetch: vi.fn(async () => Promise.resolve()),
      XMLHttpRequest: function FakeXMLHttpRequest(this: unknown) {
        return this;
      },
      WebSocket: function FakeWebSocket(this: unknown) {
        return this;
      },
      navigator: {
        sendBeacon: vi.fn(),
      },
      addEventListener: vi.fn((event: string, handler: (event: { data: unknown }) => void) => {
        if (event === 'message') {
          listeners.push(handler);
        }
      }),
      postMessage: vi.fn(),
    };

    registerCompilerWorker({ scope: scope as unknown as typeof globalThis });

    expect(() => (scope.fetch as () => void)()).toThrowError('Network APIs are disabled inside ModuPrompt compiler workers.');
    expect(() => new (scope.XMLHttpRequest as unknown as new () => void)()).toThrowError(
      'Network APIs are disabled inside ModuPrompt compiler workers.',
    );
    expect(() => new (scope.WebSocket as unknown as new () => void)('wss://example.com')).toThrowError(
      'Network APIs are disabled inside ModuPrompt compiler workers.',
    );
    expect(() => (scope.navigator as { sendBeacon: () => void }).sendBeacon()).toThrowError(
      'Network APIs are disabled inside ModuPrompt compiler workers.',
    );

    expect(listeners.length).toBeGreaterThan(0);
  });
});
