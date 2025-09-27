import { runtimeEnv } from '../config/env.js';
import '../styles/main.css';

export function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-[color:var(--mp-color-surface)] text-[color:var(--mp-color-text-primary)]">
      <header className="px-6 py-4 border-b border-[color:var(--mp-color-border)] flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">ModuPrompt Workspace</span>
        <span className="text-xs uppercase tracking-widest text-[color:var(--mp-color-text-secondary)]">
          {runtimeEnv.releaseVersion}
        </span>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="max-w-xl text-center space-y-4">
          <h1 className="text-3xl font-semibold">Frontend shell scaffolding in progress</h1>
          <p className="text-base text-[color:var(--mp-color-text-secondary)]">
            Vite dev server and Tailwind pipeline are configured. Upcoming tasks will
            attach notebook, node graph, snippets, governance, and compiler modules to this shell.
          </p>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div className="rounded-lg border border-[color:var(--mp-color-border)] px-4 py-3 text-left">
              <dt className="font-medium text-[color:var(--mp-color-text-secondary)]">API base URL</dt>
              <dd className="font-mono text-sm">{runtimeEnv.apiBaseUrl}</dd>
            </div>
            <div className="rounded-lg border border-[color:var(--mp-color-border)] px-4 py-3 text-left">
              <dt className="font-medium text-[color:var(--mp-color-text-secondary)]">Offline persistence</dt>
              <dd>{runtimeEnv.featureFlags.offlinePersistence ? 'Enabled' : 'Disabled'}</dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}

export default App;
