import { AppShell } from './AppShell.js';
import { AppProviders } from './providers.js';
import '../styles/main.css';

export function App(): JSX.Element {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}

export default App;
