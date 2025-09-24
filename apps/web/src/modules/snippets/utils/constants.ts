export const SNIPPET_DRAG_MIME = 'application/x-moduprompt-snippet';

export interface SmartFolderConfig {
  id: string;
  name: string;
  description: string;
  predicate: (input: {
    id: string;
    updatedAt: number;
    tags: string[];
    duplicateIds: Set<string>;
  }) => boolean;
}

export const SMART_FOLDERS: SmartFolderConfig[] = [
  {
    id: 'recent',
    name: 'Recently Updated',
    description: 'Changes within the last 7 days.',
    predicate: ({ updatedAt }) => {
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - updatedAt <= sevenDaysMs;
    },
  },
  {
    id: 'duplicates',
    name: 'Possible Duplicates',
    description: 'Snippets flagged by hash-similarity checks.',
    predicate: ({ id, duplicateIds }) => duplicateIds.has(id),
  },
];
