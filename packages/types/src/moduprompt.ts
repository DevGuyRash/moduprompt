import type {
  AuthorMeta,
  DomainEntity,
  HexColor,
  Identifiable,
  ISODateString,
  JsonObject,
  JsonValue,
  RevisionedEntity,
  Timestamped,
} from './base';

export type BlockKind =
  | 'markdown'
  | 'snippet'
  | 'group'
  | 'comment'
  | 'divider';

export interface BlockBase extends DomainEntity {
  kind: BlockKind;
  /**
   * Stable ordering index used for deterministic exports and node graph layout.
   */
  sequence: number;
  /**
   * Optional label surfaced in previews and governance reports.
   */
  label?: string;
  /**
   * Arbitrary metadata stored with a block (e.g., formatter configuration).
   */
  metadata?: JsonObject;
}

export interface MarkdownBlock extends BlockBase {
  kind: 'markdown';
  /**
   * Markdown (GFM) body content.
   */
  body: string;
  /**
   * Optional syntax highlighting language override for fenced code blocks.
   */
  languageHint?: string;
}

export interface SnippetBlock extends BlockBase {
  kind: 'snippet';
  /**
   * Snippet identifier inserted into the document.
   */
  snippetId: string;
  /**
   * Optional pinned revision providing deterministic provenance.
   */
  revision?: number;
  /**
   * Render mode controls inline copy vs. live transclusion behaviour.
   */
  mode: 'transclude' | 'inline';
}

export interface GroupBlock extends BlockBase {
  kind: 'group';
  /**
   * Child block identifiers contained in the group.
   */
  children: string[];
  /**
   * When true the group renders collapsed in notebook view.
   */
  collapsed?: boolean;
}

export interface CommentBlock extends BlockBase {
  kind: 'comment';
  /**
   * Free-form governance notes.
   */
  body: string;
  author?: AuthorMeta;
  resolved?: boolean;
}

export interface DividerBlock extends BlockBase {
  kind: 'divider';
  style?: 'line' | 'space';
}

export type Block =
  | MarkdownBlock
  | SnippetBlock
  | GroupBlock
  | CommentBlock
  | DividerBlock;

export type EdgeKind = 'default' | 'conditional' | 'error';

export interface EdgeCondition {
  expression: string;
  language: 'liquid' | 'jsonata' | 'jq' | 'javascript';
}

export interface Edge extends Identifiable {
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  kind: EdgeKind;
  condition?: EdgeCondition;
  metadata?: JsonObject;
}

export type VariableType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'choice'
  | 'multiselect'
  | 'json';

export interface VariableOption {
  value: string;
  label?: string;
}

export interface VariableDefinition extends Identifiable {
  key: string;
  label?: string;
  description?: string;
  type: VariableType;
  defaultValue?: JsonValue;
  required?: boolean;
  secret?: boolean;
  options?: VariableOption[];
  metadata?: JsonObject;
}

export type DocumentMaxWidth = '80ch' | '96ch' | '120ch';

export interface DocumentSettings {
  maxWidth: DocumentMaxWidth;
  theme?: string;
  pageNumbering?: 'none' | 'decimal' | 'roman';
}

export interface ExportRecipeBinding {
  recipeId: string;
  includeProvenance?: boolean;
  lastRunAt?: number;
}

export interface DocumentModel extends RevisionedEntity {
  schemaVersion: 2;
  title: string;
  blocks: Block[];
  edges: Edge[];
  variables: VariableDefinition[];
  exportRecipes: ExportRecipeBinding[];
  tags: string[];
  statusKey: string;
  settings: DocumentSettings;
}

export interface SnippetFrontmatter extends JsonObject {
  schemaVersion: 1;
  tags?: string[];
  status?: string;
  description?: string;
  language?: string;
}

export interface Snippet extends DomainEntity {
  title: string;
  path: string;
  frontmatter: SnippetFrontmatter;
  body: string;
  headRev: number;
}

export interface SnippetVersion {
  snippetId: string;
  rev: number;
  parentRev?: number;
  author?: AuthorMeta;
  note?: string;
  timestamp: number;
  body: string;
  frontmatter: SnippetFrontmatter;
  hash: string;
}

export type ExportRecipeType = 'markdown' | 'html' | 'pdf' | 'text';

export interface ExportRecipeInclude {
  blocks?: string[];
  groups?: string[];
  all?: true;
}

export interface ExportRecipePdfConfig {
  margin: string;
  headerFooter?: boolean;
}

export interface ExportRecipe extends DomainEntity {
  name: string;
  type: ExportRecipeType;
  include: ExportRecipeInclude;
  theme?: string;
  pdf?: ExportRecipePdfConfig;
  allowedStatuses?: string[];
}

export interface WorkspaceStatus {
  key: string;
  name: string;
  color: HexColor;
  description?: string;
  order?: number;
  isFinal?: boolean;
}

export type AuditLogEventType =
  | 'snippet.version.created'
  | 'snippet.version.reverted'
  | 'document.status.changed'
  | 'document.tags.changed'
  | 'export.completed'
  | 'plugin.installed';

export interface AuditLogEntry extends Identifiable, Timestamped {
  type: AuditLogEventType;
  subjectId: string;
  metadata: JsonObject;
  actorId?: string;
  occurredAt: ISODateString;
}
