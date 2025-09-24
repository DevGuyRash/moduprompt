import type { NodeProjection } from '../../state/selectors/documentSelectors';

export interface NodePosition {
  x: number;
  y: number;
}

export interface LayoutResult {
  positions: Record<string, NodePosition>;
  width: number;
  height: number;
}

const HORIZONTAL_SPACING = 320;
const VERTICAL_SPACING = 140;
const LAYER_OFFSET_Y = 70;

const sortIds = (ids: string[], order: Record<string, number>): string[] =>
  [...ids].sort((a, b) => {
    const orderDiff = (order[a] ?? 0) - (order[b] ?? 0);
    return orderDiff !== 0 ? orderDiff : a.localeCompare(b);
  });

export const computeLayout = (projection: NodeProjection | undefined): LayoutResult => {
  if (!projection) {
    return { positions: {}, width: 0, height: 0 };
  }

  const orderIndex = projection.topologicalOrder.reduce<Record<string, number>>((acc, id, index) => {
    acc[id] = index;
    return acc;
  }, {});

  const depthByNode = new Map<string, number>();
  for (const nodeId of projection.topologicalOrder) {
    const incoming = projection.reverseAdjacency[nodeId] ?? [];
    if (incoming.length === 0) {
      depthByNode.set(nodeId, 0);
      continue;
    }
    let depth = 0;
    for (const sourceId of incoming) {
      depth = Math.max(depth, (depthByNode.get(sourceId) ?? 0) + 1);
    }
    depthByNode.set(nodeId, depth);
  }

  const layered: Record<number, string[]> = {};
  let deepestLayer = 0;
  for (const nodeId of projection.topologicalOrder) {
    const depth = depthByNode.get(nodeId) ?? 0;
    deepestLayer = Math.max(deepestLayer, depth);
    (layered[depth] ??= []).push(nodeId);
  }

  const positions: Record<string, NodePosition> = {};
  let maxNodesPerLayer = 0;
  for (let layer = 0; layer <= deepestLayer; layer += 1) {
    const ids = sortIds(layered[layer] ?? [], orderIndex);
    maxNodesPerLayer = Math.max(maxNodesPerLayer, ids.length);
    ids.forEach((nodeId, index) => {
      positions[nodeId] = {
        x: layer * HORIZONTAL_SPACING,
        y: index * VERTICAL_SPACING + layer * LAYER_OFFSET_Y,
      };
    });
  }

  const width = (deepestLayer + 1) * HORIZONTAL_SPACING;
  const height = Math.max(1, maxNodesPerLayer) * VERTICAL_SPACING + deepestLayer * LAYER_OFFSET_Y;

  return { positions, width, height };
};
