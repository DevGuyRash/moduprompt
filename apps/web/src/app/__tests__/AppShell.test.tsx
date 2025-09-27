import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it } from 'vitest';
class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
}

if (typeof globalThis !== 'undefined' && !('ResizeObserver' in globalThis)) {
  (globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    MockResizeObserver as unknown as typeof ResizeObserver;
}

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App.js';

describe('AppShell integration', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = '';
  });

  it('renders the welcome document in the notebook view by default', async () => {
    render(<App />);

    await screen.findByText(/welcome prompt workspace/i);
    const addBlockButton = await screen.findByRole('button', { name: /add markdown block/i });

    expect(addBlockButton).toBeInTheDocument();
    expect(screen.getByLabelText(/active document/i)).toHaveDisplayValue('Welcome prompt workspace');
  });

  it('preserves notebook changes when navigating between workspace routes', async () => {
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText(/welcome prompt workspace/i);
    const initialBlocks = screen.getAllByRole('listitem');
    const addBlockButton = await screen.findByRole('button', { name: /add markdown block/i });

    await user.click(addBlockButton);

    await waitFor(() => {
      expect(screen.getAllByRole('listitem')).toHaveLength(initialBlocks.length + 1);
    });

    const nodeGraphLink = await screen.findByRole('link', { name: /node graph/i });
    await user.click(nodeGraphLink);

    await waitFor(() => {
      expect(window.location.pathname).toContain('/graph');
    });

    const notebookLink = await screen.findByRole('link', { name: /notebook/i });
    await user.click(notebookLink);

    await waitFor(() => {
      expect(window.location.pathname).toContain('/notebook');
      expect(screen.getAllByRole('listitem')).toHaveLength(initialBlocks.length + 1);
    });
  });

  it('allows switching between light and dark themes from the header control', async () => {
    const user = userEvent.setup();
    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBeDefined();
    });

    const initialTheme = document.documentElement.dataset.theme;
    const toggleButton = await screen.findByRole('button', { name: /switch to (dark|light) theme/i });

    await user.click(toggleButton);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).not.toBe(initialTheme);
    });
  });
});
