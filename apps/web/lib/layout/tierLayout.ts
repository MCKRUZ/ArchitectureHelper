/**
 * Tier-Based Manual Layout Algorithm
 *
 * Implements Microsoft Azure Architecture Center patterns:
 * - Left-to-right flow by functional tier
 * - Simple grid positioning (no complex graph algorithms)
 * - Predictable, clean layouts that match professional diagrams
 *
 * Based on research:
 * - Microsoft: https://learn.microsoft.com/en-us/azure/well-architected/architect-role/design-diagrams
 * - Cloudcraft: Relationship-based arrangement with manual refinement
 */

import type { AzureNode, AzureEdge, AzureServiceCategory } from '@/lib/state/types';
import { snapToIsoGrid, snapGroupToIsoGrid, snapGroupDimensions } from './isoSnap';
import { snapToCartesianGrid, snapCartesianGroupDimensions } from './cartesianSnap';

type ViewMode = '2d' | 'isometric' | 'cost-heatmap' | 'compliance';

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  groupDimensions: Map<string, { width: number; height: number }>;
  groupNesting: Map<string, string>; // childGroupId -> parentGroupId
}

// Tier X positions - left to right flow
const TIER_X_POSITIONS: Record<AzureServiceCategory, number> = {
  // Layer 0: Entry & Monitoring (leftmost)
  'management': 50,
  'devops': 50,
  'security': 150,
  'identity': 150,

  // Layer 1: Networking (ingress)
  'networking': 350,

  // Layer 2: Compute (application tier)
  'compute': 650,
  'containers': 650,
  'web': 650,

  // Layer 3: Integration/Messaging
  'integration': 950,
  'messaging': 950,

  // Layer 4: Data (rightmost)
  'databases': 1250,
  'storage': 1250,

  // Layer 5: AI/Analytics (far right)
  'ai-ml': 1550,
  'analytics': 1550,
};

// Spacing constants
const NODE_VERTICAL_SPACING = 160; // Vertical gap between nodes in same tier
const TIER_START_Y = 100; // Starting Y position for first node in tier
const GROUP_PADDING = 60; // Padding inside groups
const GROUP_HEADER_HEIGHT = 60; // Space for group label

/**
 * Calculate tier-based layout for nodes and groups
 * Simple, predictable positioning based on service categories
 */
export async function calculateTierLayout(
  nodes: AzureNode[],
  edges: AzureEdge[],
  viewMode: ViewMode
): Promise<LayoutResult> {
  const positions = new Map<string, { x: number; y: number }>();
  const groupDimensions = new Map<string, { width: number; height: number }>();
  const groupNesting = new Map<string, string>();

  const isIso = viewMode === 'isometric';

  // Separate groups and services
  const groupNodes = nodes.filter(n => n.type === 'group');
  const serviceNodes = nodes.filter(n => n.type !== 'group');

  // 1. Detect group nesting (Resource Group > VNet > Subnet)
  const GROUP_TYPE_RANK: Record<string, number> = {
    'resource-group': 0,
    'virtual-network': 1,
    'subnet': 2,
  };

  const groupsByRank = [...groupNodes].sort((a, b) => {
    const aRank = GROUP_TYPE_RANK[a.data.groupType ?? 'resource-group'] ?? 0;
    const bRank = GROUP_TYPE_RANK[b.data.groupType ?? 'resource-group'] ?? 0;
    return bRank - aRank; // Most specific first (subnet, then vnet, then rg)
  });

  for (const childGroup of groupsByRank) {
    const childRank = GROUP_TYPE_RANK[childGroup.data.groupType ?? 'resource-group'] ?? 0;
    if (childRank === 0) continue; // Resource groups never have parents

    let bestParent: AzureNode | null = null;
    let bestParentRank = -1;

    for (const candidate of groupNodes) {
      if (candidate.id === childGroup.id) continue;
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

  // 2. Position services
  // Strategy: Position ungrouped services at tier positions
  //           Position grouped services compactly within their groups (relative positioning)

  const ungroupedServices = serviceNodes.filter(n => !n.parentId);
  const groupedServices = serviceNodes.filter(n => n.parentId);

  // Position ungrouped services at their tier positions
  const servicesByTier = new Map<AzureServiceCategory, AzureNode[]>();
  for (const service of ungroupedServices) {
    const category = service.data.category;
    if (!servicesByTier.has(category)) {
      servicesByTier.set(category, []);
    }
    servicesByTier.get(category)!.push(service);
  }

  // Position each tier
  for (const [category, servicesInTier] of servicesByTier.entries()) {
    const tierX = TIER_X_POSITIONS[category];
    let currentY = TIER_START_Y;

    for (const service of servicesInTier) {
      const pos = isIso
        ? snapToIsoGrid(tierX, currentY)
        : snapToCartesianGrid(tierX, currentY);

      positions.set(service.id, pos);
      currentY += NODE_VERTICAL_SPACING;
    }
  }

  // Position grouped services compactly within their groups (we'll calculate exact positions after group sizing)
  // For now, give them temporary relative positions
  for (const service of groupedServices) {
    // Temporary position - will be recalculated based on group
    positions.set(service.id, { x: 0, y: 0 });
  }

  // 3. Calculate group positions and dimensions
  // Bottom-up: start with innermost groups (subnets), then vnets, then resource groups
  const groupsByNestingLevel = [...groupNodes].sort((a, b) => {
    const aRank = GROUP_TYPE_RANK[a.data.groupType ?? 'resource-group'] ?? 0;
    const bRank = GROUP_TYPE_RANK[b.data.groupType ?? 'resource-group'] ?? 0;
    return bRank - aRank; // Process subnets first, then vnets, then RGs
  });

  for (const group of groupsByNestingLevel) {
    // Find all children (services + nested groups)
    const childServices = serviceNodes.filter(n => n.parentId === group.id);
    const childGroups = groupNodes.filter(g => groupNesting.get(g.id) === group.id);
    const allChildren = [...childServices, ...childGroups];

    if (allChildren.length === 0) {
      // Empty group: fixed size
      const pos = isIso
        ? snapGroupToIsoGrid(100, 100, 400)
        : snapToCartesianGrid(100, 100);
      positions.set(group.id, pos);

      const dims = isIso
        ? snapGroupDimensions(400)
        : { width: 400, height: 250 };
      groupDimensions.set(group.id, dims);
      continue;
    }

    // Position children compactly within this group
    // Layout children in a grid (2 columns for better aspect ratio)
    const nodeWidth = isIso ? 75 : 180;
    const nodeHeight = isIso ? 90 : 56;
    const nodeSpacing = 40;
    const columnsPerRow = 2;

    let childX = GROUP_PADDING;
    let childY = GROUP_HEADER_HEIGHT;
    let maxRowWidth = 0;
    let currentRowWidth = 0;
    let currentRowHeight = 0;
    let rowWidths: number[] = [];

    allChildren.forEach((child, index) => {
      const childWidth = child.type === 'group'
        ? (groupDimensions.get(child.id)?.width ?? 400)
        : nodeWidth;
      const childHeight = child.type === 'group'
        ? (groupDimensions.get(child.id)?.height ?? 200)
        : nodeHeight;

      // New row after every N columns
      if (index > 0 && index % columnsPerRow === 0) {
        // Store this row's width (without trailing spacing)
        rowWidths.push(currentRowWidth - nodeSpacing);
        currentRowWidth = 0;
        childX = GROUP_PADDING;
        childY += currentRowHeight + nodeSpacing;
        currentRowHeight = 0;
      }

      positions.set(child.id, { x: childX, y: childY });
      childX += childWidth + nodeSpacing;
      currentRowWidth += childWidth + nodeSpacing;
      currentRowHeight = Math.max(currentRowHeight, childHeight);
    });

    // Don't forget the last row
    if (currentRowWidth > 0) {
      rowWidths.push(currentRowWidth - nodeSpacing);
    }

    maxRowWidth = Math.max(...rowWidths, 0);

    // Calculate group dimensions based on children layout
    const groupWidth = Math.max(400, maxRowWidth + GROUP_PADDING * 2);
    const groupHeight = childY + currentRowHeight + GROUP_PADDING;

    // Position group at an appropriate tier location
    // Use the average tier of children, or middle tier if no children have tiers
    let avgTierX = 500; // Default middle position
    if (childServices.length > 0) {
      const tierXValues = childServices.map(s => TIER_X_POSITIONS[s.data.category] ?? 500);
      avgTierX = tierXValues.reduce((sum, x) => sum + x, 0) / tierXValues.length;
    }

    const groupX = avgTierX - groupWidth / 2; // Center the group around tier
    const groupY = TIER_START_Y;

    const groupPos = isIso
      ? snapGroupToIsoGrid(groupX, groupY, groupWidth)
      : snapToCartesianGrid(groupX, groupY);
    positions.set(group.id, groupPos);

    const groupDims = isIso
      ? snapGroupDimensions(groupWidth)
      : snapCartesianGroupDimensions(groupWidth, groupHeight);
    groupDimensions.set(group.id, groupDims);
  }

  return {
    positions,
    groupDimensions,
    groupNesting,
  };
}

/**
 * Calculate position for a single new service node
 * Used when adding individual services via AI
 */
export function calculateTierBasedPosition(
  category: AzureServiceCategory,
  existingNodes: AzureNode[],
  viewMode: ViewMode
): { x: number; y: number } {
  const isIso = viewMode === 'isometric';

  // Get tier X position
  const tierX = TIER_X_POSITIONS[category];

  // Count existing nodes in this tier
  const nodesInTier = existingNodes.filter(
    n => n.type !== 'group' && n.data.category === category
  );

  // Stack vertically
  const tierY = TIER_START_Y + (nodesInTier.length * NODE_VERTICAL_SPACING);

  return isIso
    ? snapToIsoGrid(tierX, tierY)
    : snapToCartesianGrid(tierX, tierY);
}
