import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.js';
import { runtimeEnv } from './config/env.js';

const container = document.querySelector('#root');

if (!container) {
  throw new Error('Unable to find root container for ModuPrompt web app');
}

const root = createRoot(container);

root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

if (import.meta.hot) {
  import.meta.hot.accept();
}

if ('serviceWorker' in navigator && runtimeEnv.featureFlags.offlinePersistence) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(new URL('./service-worker.ts', import.meta.url), { type: 'module' })
      .catch((error) => {
        console.error('Service worker registration failed', error);
      });
  });
}
