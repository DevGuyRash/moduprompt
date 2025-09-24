import type { WorkspaceStore } from '@moduprompt/snippet-store';

export interface GovernancePanelProps {
  documentId: string;
  className?: string;
  canEditTags?: boolean;
  canEditStatus?: boolean;
  canManageStatuses?: boolean;
  store?: WorkspaceStore;
  onTagsChange?: (tags: string[]) => void;
  onStatusChange?: (statusKey: string) => void;
}
