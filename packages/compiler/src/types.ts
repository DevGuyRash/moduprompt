import type {
  Block,
  DocumentModel,
  Snippet,
  SnippetBlock,
  SnippetVersion,
} from '@moduprompt/types';

export type DiagnosticSeverity = 'error' | 'warning';

export interface CompilerDiagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  path?: string;
  details?: Record<string, unknown>;
}

export interface ProvenanceEntry {
  snippetId: string;
  revision: number;
  hash: string;
  mode: SnippetBlock['mode'];
  path?: string;
}

export interface FormatterContext {
  document: DocumentModel;
  block: Block;
  variables: Record<string, string>;
}

export type FormatterFn = (input: string, context: FormatterContext) => string;

export interface FormatterDefinition {
  id: string;
  apply: FormatterFn;
  description?: string;
}

export interface FilterContext {
  document: DocumentModel;
  variables: Record<string, string>;
}

export type FilterFn = (input: string, context: FilterContext) => string;

export interface FilterDefinition {
  id: string;
  apply: FilterFn;
  description?: string;
}

export interface SnippetBundle {
  snippet: Snippet;
  versions: SnippetVersion[];
}

export interface SnippetIndexEntry {
  snippet: Snippet;
  versionsByRevision: Map<number, SnippetVersion>;
  head?: SnippetVersion;
}

export interface SnippetIndex {
  byId: Map<string, SnippetIndexEntry>;
  byPath: Map<string, SnippetIndexEntry>;
}

export interface CompilerConfiguration {
  formatters?: FormatterDefinition[];
  filters?: FilterDefinition[];
}

export interface CompileOptions extends CompilerConfiguration {
  document: DocumentModel;
  snippets?: SnippetBundle[];
  variables?: Record<string, string | number | boolean | null>;
  allowedStatuses?: string[];
  includeComments?: boolean;
  newline?: string;
}

export interface CompileResult {
  documentId: string;
  markdown: string;
  text: string;
  hash: string;
  provenance: ProvenanceEntry[];
  diagnostics: CompilerDiagnostic[];
  preflight: PreflightReport;
}

export interface PreflightIssue {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  path?: string;
  details?: Record<string, unknown>;
}

export interface PreflightReport {
  issues: PreflightIssue[];
  summary: {
    errors: number;
    warnings: number;
  };
}

export interface PreflightOptions {
  document: DocumentModel;
  snippets?: SnippetBundle[];
  variables?: Record<string, string>;
  allowedStatuses?: string[];
}

export interface WorkerCompilePayload {
  document: DocumentModel;
  snippets?: SnippetBundle[];
  variables?: Record<string, string | number | boolean | null>;
  allowedStatuses?: string[];
  includeComments?: boolean;
  newline?: string;
}

export interface WorkerCompileRequest {
  type: 'compile';
  id: string;
  payload: WorkerCompilePayload;
}

export interface WorkerCompileSuccess {
  type: 'result';
  id: string;
  result: CompileResult;
}

export interface WorkerCompileFailure {
  type: 'error';
  id: string;
  error: {
    message: string;
    code?: string;
  };
}

export type WorkerResponse = WorkerCompileSuccess | WorkerCompileFailure;

export type WorkerMessage = WorkerCompileRequest | WorkerResponse;

export interface WorkerMessageEvent<T> {
  data: T;
}

export interface WorkerLike {
  postMessage(message: WorkerMessage): void;
  addEventListener(event: 'message', listener: (event: WorkerMessageEvent<WorkerResponse>) => void): void;
  removeEventListener(event: 'message', listener: (event: WorkerMessageEvent<WorkerResponse>) => void): void;
}

export interface CompilerWorkerScope {
  postMessage(message: WorkerResponse): void;
  addEventListener(
    event: 'message',
    listener: (event: WorkerMessageEvent<WorkerCompileRequest>) => void,
  ): void;
}

export interface RegisterWorkerOptions extends CompilerConfiguration {
  scope?: CompilerWorkerScope;
}

export interface WorkerClientOptions {
  timeoutMs?: number;
}
