/**
 * ELK-Based Auto-Layout System
 *
 * Uses ELK (Eclipse Layout Kernel) for compound graph layout.
 * ELK handles group/container nodes natively as first-class citizens,
 * computes optimal positions for nested hierarchies, and minimizes
 * edge crossings with its Sugiyama layered algorithm.
 *
 * Replaces dagre which couldn't handle compound graphs properly.
 */

import type { AzureNode, AzureEdge, AzureServiceCategory } from '@/lib/state/types';
import { snapToIsoGrid, snapGroupToIsoGrid, snapGroupDimensions } from './isoSnap';
import { snapToCartesianGrid, snapCartesianGroupDimensions } from './cartesianSnap';

type ViewMode = '2d' | 'isometric' | 'cost-heatmap' | 'compliance';

// Lazy-load ELK to avoid blocking page load (bundle is ~1.2MB)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let elkInstance: any = null;

async function getElk() {
  if (!elkInstance) {
    const ELK = (await import('elkjs/lib/elk.bundled.js')).default;
    elkInstance = new ELK();
  }
  return elkInstance;
}

// Tier order for single-node positioning (addAzureService)
const TIER_ORDER: Record<AzureServiceCategory, number> = {
  security: 0,
  identity: 0,
  networking: 1,
  compute: 2,
  containers: 2,
  integration: 2,
  messaging: 2,
  web: 2,
  databases: 3,
  storage: 3,
  'ai-ml': 4,
  analytics: 4,
  management: 5,
  devops: 5,
};

// Node dimensions per view mode
const NODE_WIDTH = 75;
const NODE_HEIGHT = 90;
const FLAT_NODE_WIDTH = 180;
const FLAT_NODE_HEIGHT = 56;

// Spacing constants
const HORIZONTAL_SPACING = 140;
const VERTICAL_SPACING = 110;
const FLAT_H_SPACING = 200;
const FLAT_V_SPACING = 90;

// Group nesting hierarchy: lower rank = broader scope
const GROUP_TYPE_RANK: Record<string, number> = {
  'resource-group': 0,
  'virtual-network': 1,
  'subnet': 2,
};

/**
 * Result from calculateAutoLayout.
 * positions: snapped (x,y) for every node. Children are relative to parent.
 * groupDimensions: snapped (width, height) for each group node.
 * groupNesting: child group ID -> parent group ID.
 */
export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  groupDimensions: Map<string, { width: number; height: number }>;
  groupNesting: Map<string, string>;
}

/**
 * Calculate position for a new node based on its category tier.
 * Used when adding individual nodes. Synchronous (no ELK needed).
 */
export function calculateTierBasedPosition(
  category: AzureServiceCategory,
  existingNodes: AzureNode[],
  viewMode: ViewMode = 'isometric'
): { x: number; y: number } {
  const tier = TIER_ORDER[category] ?? 2;
  const isIso = viewMode === 'isometric';

  const nodesInTier = existingNodes.filter(
    (node) => node.type !== 'group' && TIER_ORDER[node.data.category] === tier
  );

  const hSpacing = isIso ? HORIZONTAL_SPACING : FLAT_H_SPACING;
  const vSpacing = isIso ? VERTICAL_SPACING : FLAT_V_SPACING;

  const x = 50 + tier * hSpacing;
  const y = 50 + nodesInTier.length * vSpacing;

  return isIso ? snapToIsoGrid(x, y) : snapToCartesianGrid(x, y);
}

/**
 * Get the tier number for a category
 */
export function getTierForCategory(category: AzureServiceCategory): number {
  return TIER_ORDER[category] ?? 2;
}

/**
 * Calculate auto-layout using ELK (Eclipse Layout Kernel).
 *
 * ELK's layered algorithm handles:
 * - Compound graphs: groups contain children natively
 * - Edge crossing minimization (Sugiyama LAYER_SWEEP)
 * - Orthogonal edge routing
 * - Automatic group sizing from children + padding
 *
 * All returned positions are snapped to the appropriate grid.
 */
export async function calculateAutoLayout(
  nodes: AzureNode[],
  edges: AzureEdge[],
  direction: 'LR' | 'TB' = 'LR',
  viewMode: ViewMode = 'isometric'
): Promise<LayoutResult> {
  const positions = new Map<string, { x: number; y: number }>();
  const groupDims = new Map<string, { width: number; height: number }>();
  const groupNesting = new Map<string, string>();
  const isIso = viewMode === 'isometric';

  const empty: LayoutResult = { positions, groupDimensions: groupDims, groupNesting };
  if (nodes.length === 0) return empty;

  const groupNodes = nodes.filter((n) => n.type === 'group');
  const serviceNodes = nodes.filter((n) => n.type !== 'group');
  if (serviceNodes.length === 0) return empty;

  const nodeW = isIso ? NODE_WIDTH : FLAT_NODE_WIDTH;
  const nodeH = isIso ? NODE_HEIGHT : FLAT_NODE_HEIGHT;
  const hSpacing = isIso ? HORIZONTAL_SPACING : FLAT_H_SPACING;
  const vSpacing = isIso ? VERTICAL_SPACING : FLAT_V_SPACING;

  // --- Detect group nesting via Azure type hierarchy ---
  // resource-group (0) > virtual-network (1) > subnet (2)
  const groupsByRank = [...groupNodes].sort((a, b) => {
    const aRank = GROUP_TYPE_RANK[a.data.groupType ?? 'resource-group'] ?? 0;
    const bRank = GROUP_TYPE_RANK[b.data.groupType ?? 'resource-group'] ?? 0;
    return bRank - aRank; // most specific first (subnet, then vnet, then rg)
  });

  for (const childGroup of groupsByRank) {
    const childRank = GROUP_TYPE_RANK[childGroup.data.groupType ?? 'resource-group'] ?? 0;
    if (childRank === 0) continue; // resource-groups are never children

    let bestParent: AzureNode | null = null;
    let bestParentRank = -1;

    for (const candidate of groupNodes) {
      if (candidate.id === childGroup.id) continue;
      // Avoid cycles
      if (groupNesting.has(candidate.id) && groupNesting.get(candidate.id) === childGroup.id) continue;
      const candidateRank = GROUP_TYPE_RANK[candidate.data.groupType ?? 'resource-group'] ?? 0;
      if (candidateRank < childRank && candidateRank > bestParentRank) {
        bestParent = candidate;
        bestParentRank = candidateRank;
      }
    }

    if (bestParent) {
      groupNesting.set(childGroup.id, bestParent.id);
    }
  }

  // --- Determine hierarchy ---
  const topLevelGroupIds = new Set(groupNodes.map((g) => g.id));
  groupNesting.forEach((_parentId, childId) => {
    topLevelGroupIds.delete(childId);
  });

  const groupIdSet = new Set(groupNodes.map((g) => g.id));

  // ELK padding: extra space inside groups for header + visual breathing room
  const groupPadding = isIso
    ? '[top=80,left=50,bottom=50,right=50]'
    : '[top=70,left=40,bottom=30,right=40]';

  // --- Build ELK compound graph ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildGroupElkNode(group: AzureNode): Record<string, any> {
    const childServices = serviceNodes.filter((n) => n.parentId === group.id);
    const childGroups = groupNodes.filter((g) => groupNesting.get(g.id) === group.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const children: Record<string, any>[] = [
      ...childServices.map((s) => ({
        id: s.id,
        width: nodeW,
        height: nodeH,
      })),
      ...childGroups.map((cg) => buildGroupElkNode(cg)),
    ];

    // Empty group: set fixed dimensions (ELK needs width/height for leaf nodes)
    if (children.length === 0) {
      return {
        id: group.id,
        width: isIso ? 400 : 400,
        height: isIso ? 200 : 200,
        layoutOptions: {
          'elk.padding': groupPadding,
        },
      };
    }

    return {
      id: group.id,
      children,
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': direction === 'LR' ? 'RIGHT' : 'DOWN',
        'elk.padding': groupPadding,
        'elk.spacing.nodeNode': String(Math.round(vSpacing * 0.8)),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(Math.round(hSpacing * 0.7)),
        'elk.edgeRouting': 'ORTHOGONAL',
      },
    };
  }

  // Root children: ungrouped services + top-level groups
  const ungroupedServices = serviceNodes.filter((n) => !n.parentId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rootChildren: Record<string, any>[] = [
    ...ungroupedServices.map((s) => ({
      id: s.id,
      width: nodeW,
      height: nodeH,
    })),
    ...groupNodes
      .filter((g) => topLevelGroupIds.has(g.id))
      .map((g) => buildGroupElkNode(g)),
  ];

  // All edges at root level — INCLUDE_CHILDREN handles cross-hierarchy routing
  const elkEdges = edges.map((e) => ({
    id: e.id,
    sources: [e.source],
    targets: [e.target],
  }));

  const elkDirection = direction === 'LR' ? 'RIGHT' : 'DOWN';

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': elkDirection,
      'elk.spacing.nodeNode': String(vSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(hSpacing),
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
    },
    children: rootChildren,
    edges: elkEdges,
  };

  // --- Run ELK layout ---
  try {
    const elk = await getElk();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const laid = await elk.layout(graph as any);

    // Extract positions recursively from ELK output
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function extractPositions(elkNode: Record<string, any>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const children = elkNode.children as Record<string, any>[] | undefined;
      if (!children) return;

      for (const child of children) {
        const x = (child.x as number) ?? 0;
        const y = (child.y as number) ?? 0;
        const isGroup = groupIdSet.has(child.id as string);

        if (isGroup) {
          // Group: snap position and extract dimensions computed by ELK
          const snappedPos = isIso
            ? snapGroupToIsoGrid(x, y, (child.width as number) ?? 400)
            : snapToCartesianGrid(x, y);
          positions.set(child.id, snappedPos);

          const w = (child.width as number) ?? 400;
          const h = (child.height as number) ?? 200;
          // Snap UP (ceiling) to ensure group never shrinks below ELK's computed size
          const snappedDims = isIso
            ? snapGroupDimensions(w)
            : snapCartesianGroupDimensions(w, h);
          groupDims.set(child.id, snappedDims);

          // Recurse: children have positions relative to this group
          extractPositions(child);
        } else {
          // Service node: snap to grid
          const snappedPos = isIso ? snapToIsoGrid(x, y) : snapToCartesianGrid(x, y);
          positions.set(child.id, snappedPos);
        }
      }
    }

    extractPositions(laid);
  } catch (error) {
    console.error('ELK layout failed, falling back to grid:', error);
    // Fallback: simple grid layout
    serviceNodes.forEach((node, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 50 + col * hSpacing;
      const y = 50 + row * vSpacing;
      positions.set(node.id, isIso ? snapToIsoGrid(x, y) : snapToCartesianGrid(x, y));
    });
    groupNodes.forEach((group, index) => {
      const pos = isIso
        ? snapGroupToIsoGrid(50, 50 + index * 300, 400)
        : snapToCartesianGrid(50, 50 + index * 300);
      positions.set(group.id, pos);
      groupDims.set(group.id, isIso ? snapGroupDimensions(400) : snapCartesianGroupDimensions(400, 200));
    });
  }

  return { positions, groupDimensions: groupDims, groupNesting };
}

/**
 * Apply layout positions and group dimensions to nodes.
 * Returns new node array with updated positions (immutable).
 */
export function applyLayout(
  nodes: AzureNode[],
  result: LayoutResult
): AzureNode[] {
  return nodes.map((node) => {
    const newPosition = result.positions.get(node.id);
    const dims = result.groupDimensions.get(node.id);
    const nestParentId = result.groupNesting.get(node.id);

    if (!newPosition && !dims && !nestParentId) return node;

    let updated = node;
    if (newPosition) {
      updated = { ...updated, position: newPosition };
    }
    if (nestParentId) {
      updated = { ...updated, parentId: nestParentId };
    }
    if (dims) {
      updated = {
        ...updated,
        data: {
          ...updated.data,
          properties: {
            ...updated.data.properties,
            width: dims.width,
            height: dims.height,
          },
        },
      };
    }
    return updated;
  });
}

/**
 * Reorganize diagram using ELK layout.
 * Convenience function that combines calculateAutoLayout and applyLayout.
 */
export async function reorganizeDiagram(
  nodes: AzureNode[],
  edges: AzureEdge[],
  direction: 'LR' | 'TB' = 'LR',
  viewMode: ViewMode = 'isometric'
): Promise<AzureNode[]> {
  const result = await calculateAutoLayout(nodes, edges, direction, viewMode);
  return applyLayout(nodes, result);
}

/**
 * Get tier label for display purposes
 */
export function getTierLabel(tier: number): string {
  const labels: Record<number, string> = {
    0: 'Security & Identity',
    1: 'Networking',
    2: 'Compute & Integration',
    3: 'Data & Storage',
    4: 'AI/ML & Analytics',
    5: 'Management & DevOps',
  };
  return labels[tier] ?? 'Other';
}
