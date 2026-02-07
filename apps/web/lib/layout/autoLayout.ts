/**
 * Tier-Based Auto-Layout System
 *
 * Uses dagre for graph layout with tier-based positioning.
 * Organizes Azure services in a logical flow:
 * Security/Identity → Networking → Compute/Integration → Data/Storage
 */

import dagre from '@dagrejs/dagre';
import type { AzureNode, AzureEdge, AzureServiceCategory } from '@/lib/state/types';

// Tier order for horizontal layout (left to right)
// Lower tier number = further left
const TIER_ORDER: Record<AzureServiceCategory, number> = {
  // Tier 0: Security & Identity (leftmost)
  security: 0,
  identity: 0,

  // Tier 1: Networking
  networking: 1,

  // Tier 2: Compute & Integration
  compute: 2,
  containers: 2,
  integration: 2,
  messaging: 2,
  web: 2,

  // Tier 3: Data & Storage (rightmost)
  databases: 3,
  storage: 3,

  // Tier 4: AI/ML & Analytics
  'ai-ml': 4,
  analytics: 4,

  // Tier 5: Management & DevOps
  management: 5,
  devops: 5,
};

// Node dimensions for layout calculation (compact building-block cubes)
const NODE_WIDTH = 75;
const NODE_HEIGHT = 90;
const HORIZONTAL_SPACING = 140;
const VERTICAL_SPACING = 110;

// Tier X positions for manual positioning
const TIER_X_POSITIONS: Record<number, number> = {
  0: 50,
  1: 190,
  2: 330,
  3: 470,
  4: 610,
  5: 750,
};

// Track nodes per tier for vertical stacking
interface TierCounter {
  [tier: number]: number;
}

/**
 * Calculate position for a new node based on its category tier.
 * Used when adding individual nodes via CopilotKit.
 */
export function calculateTierBasedPosition(
  category: AzureServiceCategory,
  existingNodes: AzureNode[]
): { x: number; y: number } {
  const tier = TIER_ORDER[category] ?? 2;

  // Count existing nodes in this tier
  const nodesInTier = existingNodes.filter(
    (node) => TIER_ORDER[node.data.category] === tier
  );

  const x = TIER_X_POSITIONS[tier] ?? 50 + tier * HORIZONTAL_SPACING;
  const y = 50 + nodesInTier.length * VERTICAL_SPACING;

  return { x, y };
}

/**
 * Get the tier number for a category
 */
export function getTierForCategory(category: AzureServiceCategory): number {
  return TIER_ORDER[category] ?? 2;
}

// Padding inside group containers around children
const GROUP_PADDING = 40;
const GROUP_HEADER_HEIGHT = 36;

/**
 * Calculate auto-layout for all nodes using dagre.
 * Respects tier ordering while allowing dagre to optimize vertical positioning.
 * Group (container) nodes are excluded from dagre — their bounds are calculated
 * from their children positions after layout.
 */
export function calculateAutoLayout(
  nodes: AzureNode[],
  edges: AzureEdge[],
  direction: 'LR' | 'TB' = 'LR'
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  if (nodes.length === 0) {
    return positions;
  }

  // Separate group nodes from service nodes
  const groupNodes = nodes.filter((n) => n.type === 'group');
  const serviceNodes = nodes.filter((n) => n.type !== 'group');

  if (serviceNodes.length === 0) {
    return positions;
  }

  // Create dagre graph (services only)
  const g = new dagre.graphlib.Graph();

  g.setGraph({
    rankdir: direction,
    nodesep: VERTICAL_SPACING,
    ranksep: HORIZONTAL_SPACING,
    marginx: 50,
    marginy: 50,
  });

  g.setDefaultEdgeLabel(() => ({}));

  // Group service nodes by tier
  const nodesByTier: Map<number, AzureNode[]> = new Map();
  serviceNodes.forEach((node) => {
    const tier = TIER_ORDER[node.data.category] ?? 2;
    if (!nodesByTier.has(tier)) {
      nodesByTier.set(tier, []);
    }
    nodesByTier.get(tier)!.push(node);
  });

  // Add service nodes to dagre graph
  serviceNodes.forEach((node) => {
    g.setNode(node.id, {
      label: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  // Add edges to dagre graph (only if both ends are service nodes)
  edges.forEach((edge) => {
    if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  });

  // Run dagre layout
  dagre.layout(g);

  // Extract positions and apply tier-based X adjustment
  const sortedTiers = Array.from(nodesByTier.keys()).sort((a, b) => a - b);
  const tierXMap = new Map<number, number>();

  sortedTiers.forEach((tier, index) => {
    tierXMap.set(tier, 50 + index * HORIZONTAL_SPACING);
  });

  serviceNodes.forEach((node) => {
    const dagreNode = g.node(node.id);
    const tier = TIER_ORDER[node.data.category] ?? 2;
    const tierX = tierXMap.get(tier) ?? dagreNode.x;

    positions.set(node.id, {
      x: tierX,
      y: dagreNode.y - NODE_HEIGHT / 2,
    });
  });

  // Adjust Y positions within each tier to avoid overlap
  sortedTiers.forEach((tier) => {
    const tierNodes = nodesByTier.get(tier) || [];
    tierNodes.sort((a, b) => {
      const posA = positions.get(a.id);
      const posB = positions.get(b.id);
      return (posA?.y ?? 0) - (posB?.y ?? 0);
    });

    tierNodes.forEach((node, index) => {
      const pos = positions.get(node.id);
      if (pos) {
        pos.y = 50 + index * VERTICAL_SPACING;
        positions.set(node.id, pos);
      }
    });
  });

  // Calculate group bounds from children positions + padding
  groupNodes.forEach((group) => {
    const children = serviceNodes.filter((n) => n.parentId === group.id);
    if (children.length === 0) {
      // No children — keep current position
      positions.set(group.id, group.position);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    children.forEach((child) => {
      const childPos = positions.get(child.id);
      if (childPos) {
        minX = Math.min(minX, childPos.x);
        minY = Math.min(minY, childPos.y);
        maxX = Math.max(maxX, childPos.x + NODE_WIDTH);
        maxY = Math.max(maxY, childPos.y + NODE_HEIGHT);
      }
    });

    const groupX = minX - GROUP_PADDING;
    const groupY = minY - GROUP_PADDING - GROUP_HEADER_HEIGHT;

    positions.set(group.id, { x: groupX, y: groupY });

    // Convert children to relative positions
    children.forEach((child) => {
      const childPos = positions.get(child.id);
      if (childPos) {
        positions.set(child.id, {
          x: childPos.x - groupX,
          y: childPos.y - groupY,
        });
      }
    });
  });

  return positions;
}

/**
 * Apply layout positions to nodes.
 * Returns new node array with updated positions (immutable).
 */
export function applyLayout(
  nodes: AzureNode[],
  positions: Map<string, { x: number; y: number }>
): AzureNode[] {
  return nodes.map((node) => {
    const newPosition = positions.get(node.id);
    if (newPosition) {
      return {
        ...node,
        position: newPosition,
      };
    }
    return node;
  });
}

/**
 * Reorganize diagram using tier-based layout.
 * Convenience function that combines calculateAutoLayout and applyLayout.
 */
export function reorganizeDiagram(
  nodes: AzureNode[],
  edges: AzureEdge[],
  direction: 'LR' | 'TB' = 'LR'
): AzureNode[] {
  const positions = calculateAutoLayout(nodes, edges, direction);
  return applyLayout(nodes, positions);
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
