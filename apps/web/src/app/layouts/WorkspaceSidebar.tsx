import { NavLink } from 'react-router-dom';

interface NavItem {
  segment: string;
  label: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { segment: 'notebook', label: 'Notebook', description: 'Linear authoring surface' },
  { segment: 'graph', label: 'Node graph', description: 'Visual flow editor' },
  { segment: 'snippets', label: 'Snippets', description: 'Reusable prompt fragments' },
  { segment: 'governance', label: 'Governance', description: 'Statuses, tags, audit trail' },
  { segment: 'compiler', label: 'Compiler', description: 'Deterministic preview & exports' },
];

export interface WorkspaceSidebarProps {
  workspaceId: string;
  documentId?: string;
}

const buildPath = (workspaceId: string, documentId: string, segment: string): string =>
  `/workspace/${workspaceId}/documents/${documentId}/${segment}`;

export const WorkspaceSidebar = ({ workspaceId, documentId }: WorkspaceSidebarProps): JSX.Element => (
  <nav aria-label="Workspace navigation" className="flex h-full flex-col justify-between px-4 py-6 md:px-5">
    <ul className="flex flex-col gap-2">
      {NAV_ITEMS.map((item) => {
        const disabled = !documentId;
        const target = documentId ? buildPath(workspaceId, documentId, item.segment) : '#';
        return (
          <li key={item.segment}>
            <NavLink
              to={target}
              className={({ isActive }) =>
                `group flex flex-col gap-1 rounded-md border px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                  isActive
                    ? 'border-brand/40 bg-brand/10 text-brand-strong shadow-sm'
                    : 'border-transparent bg-surface text-foreground hover:border-border hover:bg-surface-strong'
                } ${disabled ? 'pointer-events-none opacity-50' : ''}`
              }
              aria-disabled={disabled}
              end={item.segment === 'notebook'}
            >
              <span className="font-semibold">{item.label}</span>
              <span className="text-xs text-foreground-muted">{item.description}</span>
            </NavLink>
          </li>
        );
      })}
    </ul>
    <div className="hidden text-xs text-foreground-muted md:block">
      <p className="font-semibold uppercase tracking-wide text-foreground">Shortcuts</p>
      <p>• Press <kbd className="rounded bg-surface-strong px-1">?</kbd> to open the command palette (coming soon)</p>
      <p>• Use <kbd className="rounded bg-surface-strong px-1">Alt</kbd> + <kbd className="rounded bg-surface-strong px-1">1-5</kbd> to jump between views</p>
    </div>
  </nav>
);
