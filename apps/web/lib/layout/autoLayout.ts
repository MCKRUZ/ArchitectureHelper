/**
 * Tier-Based Auto-Layout System
 *
 * Uses manual tier-based positioning following Microsoft Azure Architecture Center patterns.
 * Simple, predictable layouts with left-to-right flow by functional tier.
 *
 * Replaced ELK (Eclipse Layout Kernel) with tier-based approach based on research:
 * - Microsoft diagrams use simple left-to-right tiers, not complex graph algorithms
 * - Cloudcraft uses relationship-based arrangement with manual refinement
 * - Professional diagrams prioritize clarity over algorithmic optimization
 */

import type { AzureNode, AzureEdge, AzureServiceCategory } from '@/lib/state/types';
import { calculateTierLayout, calculateTierBasedPosition } from './tierLayout';

type ViewMode = '2d' | 'isometric' | 'cost-heatmap' | 'compliance';

// Tier order for compatibility (used by getTierForCategory)
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

// Export the tier-based position function from tierLayout
export { calculateTierBasedPosition } from './tierLayout';

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
  // Simple tier-based layout - no complex algorithms needed
  return calculateTierLayout(nodes, edges, viewMode);
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
