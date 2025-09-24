import { useCallback, useState } from 'react';

export interface NodeGraphState {
  selectedNodeId?: string;
  selectedEdgeId?: string;
  setSelectedNodeId: (nodeId?: string) => void;
  setSelectedEdgeId: (edgeId?: string) => void;
  clearSelection: () => void;
}

export const useNodeGraphState = (): NodeGraphState => {
  const [selectedNodeId, setSelectedNodeIdInternal] = useState<string | undefined>();
  const [selectedEdgeId, setSelectedEdgeIdInternal] = useState<string | undefined>();

  const setSelectedNodeId = useCallback((nodeId?: string) => {
    setSelectedNodeIdInternal(nodeId);
    if (nodeId != null) {
      setSelectedEdgeIdInternal(undefined);
    }
  }, []);

  const setSelectedEdgeId = useCallback((edgeId?: string) => {
    setSelectedEdgeIdInternal(edgeId);
    if (edgeId != null) {
      setSelectedNodeIdInternal(undefined);
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeIdInternal(undefined);
    setSelectedEdgeIdInternal(undefined);
  }, []);

  const state: NodeGraphState = {
    selectedNodeId,
    selectedEdgeId,
    setSelectedNodeId,
    setSelectedEdgeId,
    clearSelection,
  };
  return state;
};
