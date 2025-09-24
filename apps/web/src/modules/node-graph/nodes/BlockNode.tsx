import { memo, useCallback } from 'react';
import type { Block, CommentBlock, GroupBlock, MarkdownBlock, SnippetBlock } from '@moduprompt/types';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { NodeHandleConfig, HandleKind } from '../graphUtils';

export interface BlockNodeData {
  block: Block;
  handleConfig: NodeHandleConfig;
  isSelected: boolean;
  onSelect?: (blockId: string) => void;
}

const nodeCardClasses =
  'group relative flex min-w-[220px] max-w-[320px] cursor-pointer flex-col gap-2 rounded-lg border border-surface bg-surface px-4 py-3 text-left shadow-sm transition hover:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40 data-[selected=true]:border-brand data-[selected=true]:ring-2 data-[selected=true]:ring-brand/40';
const headingClasses = 'flex items-center justify-between gap-2 text-sm font-semibold text-foreground';
const metaClasses = 'text-xs text-foreground-muted';
const handleBaseClasses =
  'h-3 w-3 rounded-full border border-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

const KIND_LABELS: Record<Block['kind'], string> = {
  markdown: 'Markdown block',
  snippet: 'Snippet block',
  group: 'Group block',
  comment: 'Comment',
  divider: 'Divider',
};

const HANDLE_KIND_COLOR: Record<HandleKind, string> = {
  default: 'bg-brand',
  conditional: 'bg-accent',
  error: 'bg-danger',
};

const HANDLE_KIND_LABEL: Record<HandleKind, string> = {
  default: 'Flow connector',
  conditional: 'Conditional connector',
  error: 'Error connector',
};

const buildHandleId = (direction: 'source' | 'target', kind: HandleKind): string => `${direction}:${kind}`;

const renderHandles = (
  direction: 'source' | 'target',
  kinds: HandleKind[],
): JSX.Element[] =>
  kinds.map((kind) => (
    <Handle
      key={`${direction}-${kind}`}
      id={buildHandleId(direction, kind)}
      type={direction === 'source' ? 'source' : 'target'}
      position={direction === 'source' ? Position.Right : Position.Left}
      className={`${handleBaseClasses} ${HANDLE_KIND_COLOR[kind]}`}
      aria-label={HANDLE_KIND_LABEL[kind]}
    />
  ));

const renderSnippetMeta = (block: SnippetBlock): JSX.Element => (
  <div className="flex flex-col gap-1 text-xs text-foreground-muted">
    <span>Snippet: {block.snippetId}</span>
    {block.revision != null ? <span>Revision {block.revision}</span> : null}
    <span>Mode: {block.mode}</span>
  </div>
);

const renderGroupMeta = (block: GroupBlock): JSX.Element => (
  <div className="flex flex-col gap-1 text-xs text-foreground-muted">
    <span>Group members: {block.children.length}</span>
    {block.collapsed ? <span>Status: Collapsed</span> : <span>Status: Expanded</span>}
  </div>
);

const renderMarkdownMeta = (block: MarkdownBlock): JSX.Element => (
  <div className="text-xs text-foreground-muted truncate">
    {block.body.slice(0, 120) || 'Empty markdown body'}
  </div>
);

const renderCommentMeta = (block: CommentBlock): JSX.Element => (
  <div className="flex items-center justify-between text-xs text-foreground-muted">
    <span className="truncate">{block.body}</span>
    <span className="font-medium text-foreground">{block.resolved ? 'Resolved' : 'Open'}</span>
  </div>
);

const NodeBody = ({ block }: { block: Block }) => {
  switch (block.kind) {
    case 'snippet':
      return renderSnippetMeta(block);
    case 'group':
      return renderGroupMeta(block);
    case 'markdown':
      return renderMarkdownMeta(block);
    case 'comment':
      return renderCommentMeta(block);
    default:
      return <div className="text-xs text-foreground-muted">Divider</div>;
  }
};

const BlockNodeComponent = ({ id, data }: NodeProps<BlockNodeData>) => {
  const handleClick = useCallback(() => {
    data.onSelect?.(id);
  }, [data, id]);

  const { block, handleConfig, isSelected } = data;

  return (
    <button
      type="button"
      className={nodeCardClasses}
      data-selected={isSelected}
      aria-pressed={isSelected}
      onClick={handleClick}
    >
      <span className={headingClasses}>
        <span>{block.label ?? KIND_LABELS[block.kind]}</span>
        <span className={metaClasses}>#{block.sequence}</span>
      </span>
      <NodeBody block={block} />
      <span className="text-xs text-foreground-muted">Updated {new Date(block.updatedAt).toLocaleString()}</span>
      <div className="absolute left-0 top-1/2 flex -translate-y-1/2 flex-col gap-2 pl-1">
        {renderHandles('target', handleConfig.inputs)}
      </div>
      <div className="absolute right-0 top-1/2 flex -translate-y-1/2 flex-col gap-2 pr-1">
        {renderHandles('source', handleConfig.outputs)}
      </div>
    </button>
  );
};

export const BlockNode = memo(BlockNodeComponent);
