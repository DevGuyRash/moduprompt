import type { Draft } from 'immer';
import type { Block } from '@moduprompt/types';

export interface NotebookFormatter {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  appliesTo: (block: Block) => boolean;
  apply: (block: Draft<Block>) => void;
}

export interface NotebookSnippetOption {
  id: string;
  title: string;
  description?: string;
  revision?: number;
}

export interface NotebookCommandContext {
  documentId: string;
  blockId?: string;
}

export interface NotebookCommand {
  id: string;
  label: string;
  run: () => void | Promise<void>;
  category?: string;
  shortcut?: string;
  ariaDescription?: string;
}

export interface NotebookViewProps {
  documentId: string;
  className?: string;
  formatters?: NotebookFormatter[];
  availableSnippets?: NotebookSnippetOption[];
  onSnippetInserted?: (option: NotebookSnippetOption) => void;
  onFormatterApplied?: (formatterId: string, blockId: string) => void;
}
