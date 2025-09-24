import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HarnessApp } from './App';

const mount = () => {
  const container = document.getElementById('root');
  if (!container) {
    console.error('Missing root element for harness mount');
    return;
  }
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <HarnessApp />
    </StrictMode>,
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount);
} else {
  mount();
}
