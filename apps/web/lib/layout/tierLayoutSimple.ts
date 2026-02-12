/**
 * SIMPLE Tier-Based Layout - Rewrite from scratch
 *
 * Goals:
 * 1. Make it WORK first
 * 2. Clean, predictable, easy to debug
 * 3. No over-engineering
 */

import type { AzureNode, AzureEdge, AzureServiceCategory } from '@/lib/state/types';
import { snapToIsoGrid, snapGroupDimensions } from './isoSnap';
import { snapToCartesianGrid, snapCartesianGroupDimensions } from './cartesianSnap';

type ViewMode = '2d' | 'isometric' | 'cost-heatmap' | 'compliance';

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  groupDimensions: Map<string, { width: number; height: number }>;
  groupNesting: Map<string, string>; // nodeId -> parentId
}

// Tier X positions (left to right)
const TIER_X: Record<AzureServiceCategory, number> = {
  'security': 150,
  'identity': 150,
  'networking': 350,
  'compute': 650,
  'containers': 650,
  'web': 650,
  'integration': 950,
  'messaging': 950,
  'databases': 1250,
  'storage': 1250,
  'ai-ml': 1550,
  'analytics': 1550,
  'management': 50,
  'devops': 50,
};

const NODE_SPACING = 160;
const GROUP_PADDING = 60;
const GROUP_HEADER = 60;
const TIER_START_Y = 100;

/**
 * Simple tier-based layout
 */
export async function calculateTierLayoutSimple(
  nodes: AzureNode[],
  edges: AzureEdge[],
  viewMode: ViewMode
): Promise<LayoutResult> {
  console.log(`[tierLayoutSimple] Starting simple layout: ${nodes.length} nodes, viewMode=${viewMode}`);

  const positions = new Map<string, { x: number; y: number }>();
  const groupDimensions = new Map<string, { width: number; height: number }>();
  const groupNesting = new Map<string, string>();

  const isIso = viewMode === 'isometric';
  const nodeW = isIso ? 75 : 180;
  const nodeH = isIso ? 90 : 56;

  // Separate groups and services
  const groups = nodes.filter(n => n.type === 'group');
  const services = nodes.filter(n => n.type !== 'group');

  // Step 0: Build group nesting map from EXISTING parentIds (preserve user's structure!)
  const GROUP_TYPE_RANK: Record<string, number> = {
    'resource-group': 0,
    'virtual-network': 1,
    'subnet': 2,
  };

  // First, preserve any existing group parentIds from the original nodes
  groups.forEach(group => {
    if (group.parentId) {
      groupNesting.set(group.id, group.parentId);
      console.log(`[tierLayoutSimple] Preserved group nesting: "${group.data.displayName}" -> parent ID ${group.parentId}`);
    }
  });

  // Also track service parentIds
  services.forEach(service => {
    if (service.parentId) {
      groupNesting.set(service.id, service.parentId);
    }
  });

  // Step 1: Layout services INSIDE groups (relative positions)
  const servicesByGroup = new Map<string, AzureNode[]>();

  services.forEach(service => {
    if (service.parentId) {
      if (!servicesByGroup.has(service.parentId)) {
        servicesByGroup.set(service.parentId, []);
      }
      servicesByGroup.get(service.parentId)!.push(service);

      // Track parentId assignment
      groupNesting.set(service.id, service.parentId);
    }
  });

  // Layout grouped services in 2-column grid
  // IMPORTANT: Child positions are RELATIVE to parent, never snap in isometric!
  servicesByGroup.forEach((groupServices, groupId) => {
    let x = GROUP_PADDING;
    let y = GROUP_HEADER;
    let row = 0;

    groupServices.forEach((service, index) => {
      const col = index % 2; // 2 columns

      if (col === 0 && index > 0) {
        // New row
        row++;
        x = GROUP_PADDING;
        y = GROUP_HEADER + (row * (nodeH + 40));
      }

      // Children use RELATIVE positions - NO snapping in isometric!
      positions.set(service.id, { x, y });

      if (col === 0) {
        x += nodeW + 40;
      }
    });
  });

  // Step 2: Calculate group dimensions bottom-up (subnets first, then vnets, then rgs)
  // This ensures parent dimensions include their nested children
  const groupsByRankForDims = [...groups].sort((a, b) => {
    const aRank = GROUP_TYPE_RANK[a.data.groupType ?? 'resource-group'] ?? 0;
    const bRank = GROUP_TYPE_RANK[b.data.groupType ?? 'resource-group'] ?? 0;
    return bRank - aRank; // Process subnets first
  });

  for (const group of groupsByRankForDims) {
    // Get direct service children
    const serviceChildren = servicesByGroup.get(group.id) || [];

    // Get nested group children
    const nestedGroupChildren = groups.filter(g => groupNesting.get(g.id) === group.id);

    // All children (services + nested groups)
    const allChildren = [...serviceChildren, ...nestedGroupChildren];

    if (allChildren.length === 0) {
      // Empty group
      const dims = isIso
        ? snapGroupDimensions(400)
        : { width: 400, height: 250 };
      groupDimensions.set(group.id, dims);
    } else {
      // Calculate dimensions to fit all children in 2-column grid
      const cols = 2;
      const rows = Math.ceil(allChildren.length / cols);

      // Calculate width needed for children
      let maxChildWidth = 0;
      allChildren.forEach(child => {
        if (child.type === 'group') {
          const childDims = groupDimensions.get(child.id);
          if (childDims) maxChildWidth = Math.max(maxChildWidth, childDims.width);
        } else {
          maxChildWidth = Math.max(maxChildWidth, nodeW);
        }
      });

      // Add extra width for ungrouped services column if this is a Resource Group
      const leftColumnWidth = group.data.groupType === 'resource-group' ? 250 : 0;
      const width = Math.max(400, GROUP_PADDING * 2 + leftColumnWidth + cols * maxChildWidth + (cols - 1) * 40);

      // Calculate height
      let maxChildHeight = 0;
      allChildren.forEach(child => {
        if (child.type === 'group') {
          const childDims = groupDimensions.get(child.id);
          if (childDims) maxChildHeight = Math.max(maxChildHeight, childDims.height);
        } else {
          maxChildHeight = Math.max(maxChildHeight, nodeH);
        }
      });

      // Also account for ungrouped services height if this is a Resource Group
      const ungroupedServicesInGroup = services.filter(s => s.parentId === group.id);
      const ungroupedHeight = ungroupedServicesInGroup.length > 0
        ? GROUP_HEADER + ungroupedServicesInGroup.length * (nodeH + 20)
        : 0;

      const childrenHeight = GROUP_HEADER + rows * maxChildHeight + (rows - 1) * 40 + GROUP_PADDING;
      const height = Math.max(childrenHeight, ungroupedHeight + GROUP_PADDING);

      const dims = isIso
        ? snapGroupDimensions(width)
        : snapCartesianGroupDimensions(width, height);

      groupDimensions.set(group.id, dims);
    }
  }

  // Step 3: Position groups WITHOUT OVERLAP
  // Process groups bottom-up (subnets -> vnets -> rgs) to calculate dimensions first
  const groupsByNestingLevel = [...groups].sort((a, b) => {
    const aRank = GROUP_TYPE_RANK[a.data.groupType ?? 'resource-group'] ?? 0;
    const bRank = GROUP_TYPE_RANK[b.data.groupType ?? 'resource-group'] ?? 0;
    return bRank - aRank; // Process subnets first, then vnets, then RGs
  });

  // Position nested groups (subnets, vnets) INSIDE their parents in a grid
  const childGroupsByParent = new Map<string, AzureNode[]>();

  for (const group of groups) {
    const parentId = groupNesting.get(group.id);
    if (parentId) {
      if (!childGroupsByParent.has(parentId)) {
        childGroupsByParent.set(parentId, []);
      }
      childGroupsByParent.get(parentId)!.push(group);
    }
  }

  childGroupsByParent.forEach((childGroups, parentId) => {
    // Find parent node to check if it has ungrouped service siblings
    const parentNode = groups.find(g => g.id === parentId);
    const parentGroupType = parentNode?.data.groupType;

    // If parent is a Resource Group, offset nested groups to the right to leave room for ungrouped services
    const leftColumnWidth = parentGroupType === 'resource-group' ? 250 : 0;

    // Layout child groups in horizontal row (or grid) within parent
    // Start at same Y as ungrouped services (GROUP_HEADER) to align horizontally
    let x = GROUP_PADDING + leftColumnWidth;
    let y = GROUP_HEADER; // Align with top of ungrouped services column
    let row = 0;

    childGroups.forEach((childGroup, index) => {
      const col = index % 2; // 2 columns

      if (col === 0 && index > 0) {
        // New row
        row++;
        const prevGroupDims = groupDimensions.get(childGroups[index - 2].id) || { width: 400, height: 250 };
        x = GROUP_PADDING + leftColumnWidth;
        y += prevGroupDims.height + 40;
      }

      // Child group position is RELATIVE to parent
      positions.set(childGroup.id, { x, y });

      console.log(`[tierLayoutSimple] Nested group "${childGroup.data.displayName}" positioned at (${x}, ${y}) inside parent "${parentId}"`);

      if (col === 0) {
        const dims = groupDimensions.get(childGroup.id) || { width: 400, height: 250 };
        x += dims.width + 40;
      }
    });
  });

  // Position top-level groups (Resource Groups) sequentially left-to-right
  const topLevelGroups = groups.filter(g => !groupNesting.has(g.id));

  let currentX = 50; // Start position
  const GROUP_HORIZONTAL_GAP = 100; // Gap between groups

  topLevelGroups.forEach(group => {
    const dims = groupDimensions.get(group.id) || { width: 400, height: 250 };

    const groupX = currentX;
    const groupY = TIER_START_Y;

    const pos = isIso
      ? snapToIsoGrid(groupX, groupY)
      : { x: groupX, y: groupY };

    positions.set(group.id, pos);

    console.log(`[tierLayoutSimple] Top-level group "${group.data.displayName}" at ${JSON.stringify(pos)}, dims ${JSON.stringify(dims)}`);

    // Advance X for next group (current width + gap)
    currentX += dims.width + GROUP_HORIZONTAL_GAP;
  });

  // Step 4: Position ungrouped services in a vertical stack on the LEFT
  // This creates a left-to-right layout: ungrouped services | VNet (with subnets)
  const ungrouped = services.filter(s => !s.parentId);

  // Position ungrouped services in a single vertical column on the left
  ungrouped.forEach((service, index) => {
    const x = GROUP_PADDING;
    const y = GROUP_HEADER + index * (nodeH + 20);

    positions.set(service.id, { x, y });
  });

  console.log(`[tierLayoutSimple] Complete: ${positions.size} positions, ${groupDimensions.size} group dims, ${groupNesting.size} parent assignments`);

  return { positions, groupDimensions, groupNesting };
}
