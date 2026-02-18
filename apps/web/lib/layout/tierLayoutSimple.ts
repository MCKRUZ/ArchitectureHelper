/**
 * Tier-Based Layout with Dual Model Pattern
 *
 * Uses ABSOLUTE positioning for all nodes (no React Flow parent-child nesting).
 * Logical relationships stored in node.data.logicalParent for business logic.
 * Visual grouping rendered via GroupBackgrounds component (SVG overlays).
 *
 * NEW APPROACH: Position groups FIRST, then services INSIDE groups.
 * This ensures proper hierarchy: RG > VNet > Subnets > Services
 */

import type { AzureNode, AzureEdge, AzureServiceCategory } from '@/lib/state/types';
import { snapToIsoGrid, snapGroupDimensions } from './isoSnap';
import { snapToCartesianGrid, snapCartesianGroupDimensions } from './cartesianSnap';

type ViewMode = '2d' | 'isometric' | 'cost-heatmap' | 'compliance';

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>;
  groupDimensions: Map<string, { width: number; height: number }>;
  groupNesting: Map<string, string>; // DEPRECATED - kept for backward compat, always empty
}

// CRITICAL: These must match the actual rendered dimensions in KonvaCanvas.tsx!
const NODE_SPACING = 20; // Vertical spacing between nodes
const NODE_W_2D = 280; // Matches KonvaCanvas NODE_W
const NODE_H_2D = 72;  // Matches KonvaCanvas NODE_H
const NODE_W_ISO = 75;
const NODE_H_ISO = 90;
const GROUP_PADDING = 60;
const GROUP_HEADER_HEIGHT = 60;
const SUBNET_SPACING = 80; // Increased horizontal spacing between subnets

/**
 * Hierarchy-First Layout Algorithm
 *
 * 1. Build logical tree (RG → VNet → Subnets → Services)
 * 2. Position services inside their parent subnet (stack vertically)
 * 3. Position subnets side-by-side
 * 4. Position VNet to wrap subnets
 * 5. Position RG to wrap VNet + global services
 */
export async function calculateTierLayoutSimple(
  nodes: AzureNode[],
  edges: AzureEdge[],
  viewMode: ViewMode
): Promise<LayoutResult> {
  console.log(`[tierLayout] Starting hierarchy-first layout: ${nodes.length} nodes, viewMode=${viewMode}`);

  const positions = new Map<string, { x: number; y: number }>();
  const groupDimensions = new Map<string, { width: number; height: number }>();

  const isIso = viewMode === 'isometric';
  const nodeW = isIso ? NODE_W_ISO : NODE_W_2D;
  const nodeH = isIso ? NODE_H_ISO : NODE_H_2D;

  // Separate groups and services
  const groups = nodes.filter(n => n.type === 'group');
  const services = nodes.filter(n => n.type !== 'group');

  // Build logical tree
  const logicalChildren = new Map<string, AzureNode[]>();
  nodes.forEach(node => {
    const parentId = node.data.logicalParent;
    if (parentId) {
      if (!logicalChildren.has(parentId)) {
        logicalChildren.set(parentId, []);
      }
      logicalChildren.get(parentId)!.push(node);
    }
  });

  // Find top-level nodes (no logical parent)
  const topLevelNodes = nodes.filter(n => !n.data.logicalParent);

  // Find the Resource Group (should be top-level)
  const resourceGroup = groups.find(g => g.data.groupType === 'resource-group');

  // Find the VNet (logical parent = RG)
  const vnet = groups.find(g => g.data.groupType === 'virtual-network');

  // Find subnets (logical parent = VNet)
  const subnets = groups.filter(g => g.data.groupType === 'subnet');

  console.log(`[tierLayout] Found: RG=${!!resourceGroup}, VNet=${!!vnet}, Subnets=${subnets.length}`);

  // STEP 1: Position global services in LEFT column (inside RG, outside VNet)
  // Left-to-right pattern: Global Services → VNet (App Subnet | Data Subnet)
  const globalServices = services.filter(s => s.data.logicalParent === resourceGroup?.id);
  console.log(`[tierLayout] Found ${globalServices.length} global services (RG level)`);

  const GLOBAL_COL_SPACING = GROUP_PADDING; // Gap between global col and VNet
  const globalColWidth = globalServices.length > 0 ? nodeW + GROUP_PADDING : 0;
  const globalX = GROUP_PADDING; // Left edge inside RG padding
  const globalStartY = GROUP_HEADER_HEIGHT + GROUP_PADDING; // Below RG header

  globalServices.forEach((service, index) => {
    const x = globalX;
    const y = globalStartY + index * (nodeH + NODE_SPACING);
    const pos = isIso ? snapToIsoGrid(x, y) : snapToCartesianGrid(x, y);
    positions.set(service.id, pos);
    console.log(`[tierLayout] Global service "${service.data.displayName}" at (${pos.x}, ${pos.y})`);
  });

  // STEP 2: Define VNet position — shifted RIGHT by global services column
  const VNET_X = GROUP_PADDING + globalColWidth + (globalServices.length > 0 ? GLOBAL_COL_SPACING : 0);
  const VNET_Y = GROUP_HEADER_HEIGHT; // Leave room for RG header

  // STEP 3: Position subnets inside VNet (with padding for VNet header)
  const SUBNET_Y = VNET_Y + GROUP_HEADER_HEIGHT; // Leave room for VNet header
  let currentSubnetX = VNET_X + GROUP_PADDING;   // Leave room for VNet left padding

  subnets.forEach((subnet) => {
    const subnetServices = logicalChildren.get(subnet.id) || [];
    console.log(`[tierLayout] Subnet "${subnet.data.displayName}" has ${subnetServices.length} services`);

    // Position services vertically inside subnet
    subnetServices.forEach((service, index) => {
      const x = currentSubnetX + GROUP_PADDING;
      const y = SUBNET_Y + GROUP_HEADER_HEIGHT + index * (nodeH + NODE_SPACING);
      const pos = isIso ? snapToIsoGrid(x, y) : snapToCartesianGrid(x, y);
      positions.set(service.id, pos);
      console.log(`[tierLayout]   Service "${service.data.displayName}" at (${pos.x}, ${pos.y}) inside ${subnet.data.displayName}`);
    });

    // Calculate subnet dimensions
    const subnetWidth = nodeW + GROUP_PADDING * 2;
    const subnetHeight = Math.max(
      250,
      GROUP_HEADER_HEIGHT + subnetServices.length * (nodeH + NODE_SPACING) + GROUP_PADDING
    );

    const dims = isIso
      ? snapGroupDimensions(subnetWidth)
      : snapCartesianGroupDimensions(subnetWidth, subnetHeight);

    groupDimensions.set(subnet.id, dims);

    const subnetPos = isIso
      ? snapToIsoGrid(currentSubnetX, SUBNET_Y)
      : { x: currentSubnetX, y: SUBNET_Y };
    positions.set(subnet.id, subnetPos);

    console.log(`[tierLayout] Subnet "${subnet.data.displayName}" at (${subnetPos.x}, ${subnetPos.y}), size ${dims.width}x${dims.height}`);

    currentSubnetX += dims.width + SUBNET_SPACING;
  });

  // STEP 4: Position VNet to wrap subnets
  let vnetWidth = 0;
  let vnetHeight = 0;

  if (vnet && subnets.length > 0) {
    vnetWidth = currentSubnetX - (VNET_X + GROUP_PADDING) + GROUP_PADDING * 2;
    vnetHeight = Math.max(
      ...subnets.map(s => (groupDimensions.get(s.id)?.height || 250))
    ) + GROUP_PADDING + GROUP_HEADER_HEIGHT;

    const dims = isIso
      ? snapGroupDimensions(vnetWidth)
      : snapCartesianGroupDimensions(vnetWidth, vnetHeight);

    groupDimensions.set(vnet.id, dims);
    vnetWidth = dims.width;
    vnetHeight = dims.height;

    positions.set(vnet.id, { x: VNET_X, y: VNET_Y });
    console.log(`[tierLayout] VNet "${vnet.data.displayName}" at (${VNET_X}, ${VNET_Y}), size ${vnetWidth}x${vnetHeight}`);
  }

  // STEP 5: Position RG to wrap global services + VNet side by side
  if (resourceGroup) {
    const globalColHeight = globalServices.length > 0
      ? globalStartY + globalServices.length * (nodeH + NODE_SPACING) + GROUP_PADDING
      : 0;

    const rgWidth = VNET_X + vnetWidth + GROUP_PADDING;
    const rgHeight = Math.max(
      vnetHeight + VNET_Y + GROUP_PADDING,
      globalColHeight
    );

    const dims = isIso
      ? snapGroupDimensions(rgWidth)
      : snapCartesianGroupDimensions(rgWidth, rgHeight);

    groupDimensions.set(resourceGroup.id, dims);
    positions.set(resourceGroup.id, { x: 0, y: 0 });

    console.log(`[tierLayout] RG "${resourceGroup.data.displayName}" at (0, 0), size ${dims.width}x${dims.height}`);
  }

  // STEP 5: Handle orphaned services (no logical parent)
  const orphanedServices = services.filter(s => !s.data.logicalParent);
  console.log(`[tierLayout] Found ${orphanedServices.length} orphaned services`);

  orphanedServices.forEach((service, index) => {
    const x = (resourceGroup && vnet)
      ? (groupDimensions.get(resourceGroup.id)?.width || 0) + 100
      : 100;
    const y = 100 + index * (nodeH + NODE_SPACING);

    const pos = isIso ? snapToIsoGrid(x, y) : snapToCartesianGrid(x, y);
    positions.set(service.id, pos);

    console.log(`[tierLayout] Orphaned service "${service.data.displayName}" at (${pos.x}, ${pos.y})`);
  });

  // Store group dimensions in node.data.properties for GroupBackgrounds component
  groups.forEach(group => {
    const dims = groupDimensions.get(group.id);
    if (dims && group.data.properties) {
      group.data.properties.width = dims.width;
      group.data.properties.height = dims.height;
    }
  });

  // STEP 5: Collision detection - ensure no nodes overlap
  console.log('[tierLayout] Running collision detection...');
  const allNodes = [...services, ...groups];
  let collisionCount = 0;

  allNodes.forEach((node, index) => {
    const pos1 = positions.get(node.id);
    if (!pos1) return;

    const width1 = node.type === 'group' ? (groupDimensions.get(node.id)?.width || 0) : nodeW;
    const height1 = node.type === 'group' ? (groupDimensions.get(node.id)?.height || 0) : nodeH;

    // Check against all OTHER nodes
    allNodes.forEach((otherNode, otherIndex) => {
      if (index >= otherIndex) return; // Skip self and already-checked pairs

      const pos2 = positions.get(otherNode.id);
      if (!pos2) return;

      const width2 = otherNode.type === 'group' ? (groupDimensions.get(otherNode.id)?.width || 0) : nodeW;
      const height2 = otherNode.type === 'group' ? (groupDimensions.get(otherNode.id)?.height || 0) : nodeH;

      // CRITICAL: Only check collisions between SIBLING nodes (same logical parent)
      // Nodes at different levels in the hierarchy should NOT be checked against each other
      // Example: Services inside subnets SHOULD overlap their parent subnets - that's intentional nesting
      const hasSameParent = node.data.logicalParent === otherNode.data.logicalParent;
      if (!hasSameParent) return; // Different hierarchy levels, skip collision check

      // Check for overlap (with 10px margin)
      const margin = 10;
      const overlapsX = pos1.x < pos2.x + width2 + margin && pos1.x + width1 + margin > pos2.x;
      const overlapsY = pos1.y < pos2.y + height2 + margin && pos1.y + height1 + margin > pos2.y;

      if (overlapsX && overlapsY) {
        collisionCount++;
        console.warn(`[tierLayout] COLLISION DETECTED: "${node.data.displayName}" overlaps "${otherNode.data.displayName}"`);
        console.warn(`  Node 1: (${pos1.x}, ${pos1.y}) ${width1}x${height1}`);
        console.warn(`  Node 2: (${pos2.x}, ${pos2.y}) ${width2}x${height2}`);

        // Move node2 down to avoid overlap
        const newY = pos1.y + height1 + NODE_SPACING;
        positions.set(otherNode.id, { x: pos2.x, y: newY });
        console.warn(`  → Moved "${otherNode.data.displayName}" to (${pos2.x}, ${newY})`);
      }
    });
  });

  console.log(`[tierLayout] Collision detection complete: ${collisionCount} collisions fixed`);
  console.log(`[tierLayout] Complete: ${positions.size} positions, ${groupDimensions.size} group dims`);

  return {
    positions,
    groupDimensions,
    groupNesting: new Map(), // Empty - no longer used with Dual Model Pattern
  };
}
