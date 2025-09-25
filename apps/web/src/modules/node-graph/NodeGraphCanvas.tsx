import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Edge } from '@moduprompt/types';
import {
  Background,
  Connection,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge as ReactFlowEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useDocumentStore, useDocumentStoreApi } from '../../state/document-model.js';
import { selectNodeProjection } from '../../state/selectors/documentSelectors.js';
import { computeLayout } from './layout.js';
import {
  buildReactFlowEdges,
  buildReactFlowNodes,
  deriveEdgeKind,
  edgeExists,
  isConnectionTyped,
  parseHandleKind,
  removeEdgesById,
  wouldCreateCycle,
} from './graphUtils.js';
import { useNodeGraphState } from './state.js';

export interface NodeGraphCanvasProps {
  documentId: string;
  className?: string;
}

const containerClasses =
  'bg-surface-subtle text-foreground flex h-full min-h-[480px] flex-col gap-2 rounded-lg border border-surface shadow-sm';
const headerClasses = 'flex items-center justify-between px-4 pt-3 text-sm font-semibold';
const errorClasses = 'mx-4 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger';
const graphWrapperClasses = 'relative h-full min-h-[420px] overflow-hidden px-2 pb-3';

const createEdgeId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    try {
      return crypto.randomUUID();
    } catch (error) {
      // fall through to deterministic id
    }
  }
  return `edge-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
};

const InnerCanvas = ({ documentId }: NodeGraphCanvasProps) => {
  const storeApi = useDocumentStoreApi();
  const projection = useDocumentStore(
    useCallback((state) => selectNodeProjection(state, documentId), [documentId]),
  );
  const { fitView } = useReactFlow();
  const graphState = useNodeGraphState();
  const [error, setError] = useState<string | null>(null);

  const layout = useMemo(() => computeLayout(projection), [projection?.version]);
  const nodes = useMemo(() => {
    if (!projection) return [];
    return buildReactFlowNodes(projection, layout, graphState.selectedNodeId, graphState.setSelectedNodeId);
  }, [graphState.selectedNodeId, projection, layout, graphState.setSelectedNodeId]);

  const rawEdges = useMemo(() => {
    if (!projection) return [];
    return buildReactFlowEdges(projection);
  }, [projection]);

  const edges = useMemo(() => {
    if (!rawEdges.length) return rawEdges;
    return rawEdges.map((edge) =>
      edge.id === graphState.selectedEdgeId
        ? {
            ...edge,
            style: { ...edge.style, strokeWidth: 3 },
            data: { ...edge.data, selected: true },
          }
        : edge,
    );
  }, [graphState.selectedEdgeId, rawEdges]);

  useEffect(() => {
    if (!nodes.length) return;
    const handle = requestAnimationFrame(() => {
      fitView({ padding: 0.2, duration: 250 });
    });
    return () => cancelAnimationFrame(handle);
  }, [fitView, nodes.length, projection?.version]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!projection || !connection.source || !connection.target) {
        return;
      }
      if (!isConnectionTyped(connection)) {
        setError('Connector types are incompatible.');
        return;
      }
      if (wouldCreateCycle(projection, connection.source, connection.target)) {
        setError('Connection would introduce a cycle.');
        return;
      }

      const nextEdge: Edge = {
        id: createEdgeId(),
        source: connection.source,
        target: connection.target,
        kind: deriveEdgeKind(connection),
        sourcePort: parseHandleKind(connection.sourceHandle),
        targetPort: parseHandleKind(connection.targetHandle),
      };

      storeApi.getState().updateEdges(documentId, (draft) => {
        if (edgeExists(draft as Edge[], nextEdge)) {
          return;
        }
        (draft as Edge[]).push(nextEdge);
      });
      graphState.clearSelection();
      setError(null);
    },
    [documentId, graphState.clearSelection, projection, storeApi],
  );

  const handleEdgesDelete = useCallback(
    (deleted: ReactFlowEdge<Edge>[]) => {
      if (!projection || deleted.length === 0) return;
      const ids = new Set(deleted.map((edge) => edge.id));
      storeApi.getState().updateEdges(documentId, (draft) => {
        const draftEdges = draft as Edge[];
        const remaining = removeEdgesById(draftEdges, ids);
        draftEdges.length = 0;
        draftEdges.push(...remaining);
      });
      graphState.clearSelection();
    },
    [documentId, graphState.clearSelection, projection, storeApi],
  );

  const handlePaneClick = useCallback(() => {
    graphState.clearSelection();
    setError(null);
  }, [graphState.clearSelection]);

  if (!projection) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-6 text-sm text-foreground-muted">
        No document loaded.
      </div>
    );
  }

  return (
    <>
      <div className={headerClasses}>
        <span>Node graph</span>
        <span className="text-xs font-normal text-foreground-muted">
          {projection.nodes.length} nodes · {projection.edges.length} connections
        </span>
      </div>
      {error ? <div className={errorClasses}>{error}</div> : null}
      <div className={graphWrapperClasses}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onConnect={handleConnect}
          onEdgesDelete={handleEdgesDelete}
          onPaneClick={handlePaneClick}
          onNodeClick={(_, node) => graphState.setSelectedNodeId(node.id)}
          onEdgeClick={(_, edge) => graphState.setSelectedEdgeId(edge.id)}
          connectionMode={ConnectionMode.Loose}
          fitView
          panOnScroll
          zoomOnScroll
          nodesDraggable={false}
          nodesConnectable
          elevateNodesOnSelect
          onlyRenderVisibleElements
          minZoom={0.3}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          className="h-full"
        >
          <Background color="var(--color-surface-strong, #e5e7eb)" gap={18} />
          <MiniMap
            pannable
            zoomable
            className="rounded-md border border-surface bg-surface/90 text-xs"
          />
          <Controls className="rounded-md border border-surface bg-surface/90" showInteractive={false} />
        </ReactFlow>
      </div>
    </>
  );
};

export const NodeGraphCanvas = ({ className, ...props }: NodeGraphCanvasProps): JSX.Element => {
  return (
    <div className={`${containerClasses} ${className ?? ''}`}>
      <ReactFlowProvider>
        <InnerCanvas {...props} />
      </ReactFlowProvider>
    </div>
  );
};
