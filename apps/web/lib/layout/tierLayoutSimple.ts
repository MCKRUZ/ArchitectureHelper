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
const NODE_W_ISO = 80;  // matches KonvaCanvas ISO_DW (small cube style)
const NODE_H_ISO = 80;  // ISO_DH(40) + ISO_D(15) + label clearance(25)
const GROUP_PADDING = 60;
const GROUP_HEADER_HEIGHT = 60;
const SUBNET_SPACING = 80; // gap between subnets
// Iso 2-column layout constants
const ISO_COLS = 2;     // services per row in iso mode
const ISO_COL_GAP = 20; // horizontal gap between iso columns

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
  // In iso mode use 2-column grid for globals; in 2D use single column
  const globalColWidth = globalServices.length > 0
    ? (isIso ? ISO_COLS * nodeW + (ISO_COLS - 1) * ISO_COL_GAP + GROUP_PADDING : nodeW + GROUP_PADDING)
    : 0;
  const globalX = GROUP_PADDING; // Left edge inside RG padding
  const globalStartY = GROUP_HEADER_HEIGHT + GROUP_PADDING; // Below RG header

  globalServices.forEach((service, index) => {
    let x: number, y: number;
    if (isIso) {
      const col = index % ISO_COLS;
      const row = Math.floor(index / ISO_COLS);
      x = globalX + col * (nodeW + ISO_COL_GAP);
      y = globalStartY + row * (nodeH + NODE_SPACING);
    } else {
      x = globalX;
      y = globalStartY + index * (nodeH + NODE_SPACING);
    }
    const pos = isIso ? snapToIsoGrid(x, y) : snapToCartesianGrid(x, y);
    positions.set(service.id, pos);
    console.log(`[tierLayout] Global service "${service.data.displayName}" at (${pos.x}, ${pos.y})`);
  });

  // STEP 2: Define VNet position — shifted RIGHT by global services column
  const VNET_X = GROUP_PADDING + globalColWidth + (globalServices.length > 0 ? GLOBAL_COL_SPACING : 0);
  // In iso mode, the RG container uses a parallelogram with slope 0.5 (matches grid lines).
  // The RG top border at x=VNET_X has y = VNET_X * 0.5.  VNet must start BELOW this border.
  // Add GROUP_PADDING/2 as visual clearance from the sloped top edge.
  const VNET_Y = isIso
    ? Math.round(VNET_X * 0.5 + GROUP_PADDING / 2)
    : GROUP_HEADER_HEIGHT;

  // STEP 3: Position subnets inside VNet (with padding for VNet header)
  const SUBNET_Y = VNET_Y + GROUP_HEADER_HEIGHT; // Leave room for VNet header
  let currentSubnetX = VNET_X + GROUP_PADDING;   // Leave room for VNet left padding

  // In iso mode, service columns have different x offsets from the subnet origin.
  // The rightmost column is at x_rel = GROUP_PADDING + (ISO_COLS-1)*(nodeW+ISO_COL_GAP) = 160.
  // The subnet parallelogram (slope 0.5) at that x needs y >= 160*0.5 = 80.
  // So services must start at y_offset = ceil(rightmostColX * 0.5) + clearance.
  const isoRightmostColRelX = GROUP_PADDING + (ISO_COLS - 1) * (nodeW + ISO_COL_GAP); // 60+100=160
  const ISO_SERVICE_START_Y = isIso
    ? Math.ceil(isoRightmostColRelX * 0.5) + 20  // 80 + 20 = 100
    : GROUP_HEADER_HEIGHT;

  subnets.forEach((subnet) => {
    const subnetServices = logicalChildren.get(subnet.id) || [];
    console.log(`[tierLayout] Subnet "${subnet.data.displayName}" has ${subnetServices.length} services`);

    // Position services inside subnet — 2-column grid in iso, single column in 2D
    subnetServices.forEach((service, index) => {
      let x: number, y: number;
      if (isIso) {
        const col = index % ISO_COLS;
        const row = Math.floor(index / ISO_COLS);
        x = currentSubnetX + GROUP_PADDING + col * (nodeW + ISO_COL_GAP);
        y = SUBNET_Y + ISO_SERVICE_START_Y + row * (nodeH + NODE_SPACING);
      } else {
        x = currentSubnetX + GROUP_PADDING;
        y = SUBNET_Y + GROUP_HEADER_HEIGHT + index * (nodeH + NODE_SPACING);
      }
      const pos = isIso ? snapToIsoGrid(x, y) : snapToCartesianGrid(x, y);
      positions.set(service.id, pos);
      console.log(`[tierLayout]   Service "${service.data.displayName}" at (${pos.x}, ${pos.y}) inside ${subnet.data.displayName}`);
    });

    // Calculate subnet dimensions — iso uses 2-column bounding box, 2D uses single column
    let dims: { width: number; height: number };
    if (isIso) {
      const numRows = Math.ceil(Math.max(1, subnetServices.length) / ISO_COLS);
      const w = GROUP_PADDING + ISO_COLS * nodeW + (ISO_COLS - 1) * ISO_COL_GAP + GROUP_PADDING;
      // Height uses ISO_SERVICE_START_Y (larger than GROUP_HEADER_HEIGHT) to account for slope offset
      const h = Math.max(300, ISO_SERVICE_START_Y + numRows * (nodeH + NODE_SPACING) + GROUP_PADDING);
      dims = { width: w, height: h };
    } else {
      const subnetWidth = nodeW + GROUP_PADDING * 2;
      const subnetHeight = Math.max(
        250,
        GROUP_HEADER_HEIGHT + subnetServices.length * (nodeH + NODE_SPACING) + GROUP_PADDING
      );
      dims = snapCartesianGroupDimensions(subnetWidth, subnetHeight);
    }

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
    const vnetContentH = Math.max(
      ...subnets.map(s => (groupDimensions.get(s.id)?.height || 250))
    ) + GROUP_PADDING + GROUP_HEADER_HEIGHT;

    // For iso diamond: H = W/2. Choose W = max(content_width, content_height*2) so diamond fits content.
    const dims = isIso
      ? (() => {
          const w = Math.max(vnetWidth, vnetContentH * 2) + GROUP_PADDING;
          return { width: w, height: Math.round(w / 2) };
        })()
      : snapCartesianGroupDimensions(vnetWidth, vnetContentH);

    groupDimensions.set(vnet.id, dims);
    vnetWidth = dims.width;
    vnetHeight = dims.height;

    positions.set(vnet.id, { x: VNET_X, y: VNET_Y });
    console.log(`[tierLayout] VNet "${vnet.data.displayName}" at (${VNET_X}, ${VNET_Y}), size ${vnetWidth}x${vnetHeight}`);
  }

  // STEP 5: Position RG to wrap global services + VNet side by side
  if (resourceGroup) {
    const globalNumRows = globalServices.length > 0
      ? (isIso ? Math.ceil(globalServices.length / ISO_COLS) : globalServices.length)
      : 0;
    const globalColHeight = globalNumRows > 0
      ? globalStartY + globalNumRows * (nodeH + NODE_SPACING) + GROUP_PADDING
      : 0;

    const rgContentW = VNET_X + vnetWidth + GROUP_PADDING;
    const rgContentH = Math.max(vnetHeight + VNET_Y + GROUP_PADDING, globalColHeight);

    // For iso diamond: H = W/2. Choose W = max(content_width, content_height*2) + padding.
    const dims = isIso
      ? (() => {
          const w = Math.max(rgContentW, rgContentH * 2) + GROUP_PADDING * 2;
          return { width: w, height: Math.round(w / 2) };
        })()
      : snapCartesianGroupDimensions(rgContentW, rgContentH);

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

  // ISO POST-PROCESSING: Center each diamond on its service content.
  // Diamond bounding box center = (W/2, W/4). Shift group position so this aligns with service centroid.
  if (isIso) {
    const centerGroupOnContent = (groupId: string, memberServiceIds: string[]) => {
      const dims = groupDimensions.get(groupId);
      if (!dims || memberServiceIds.length === 0) return;

      const memberPositions = memberServiceIds.map(id => positions.get(id)).filter((p): p is {x: number; y: number} => !!p);
      if (memberPositions.length === 0) return;

      const minY = Math.min(...memberPositions.map(p => p.y));
      const maxY = Math.max(...memberPositions.map(p => p.y + nodeH));
      const contentCenterY = (minY + maxY) / 2;

      // Diamond center Y (relative to group origin) = dims.height / 2 = W/4
      const diamondCenterY = dims.height / 2;
      const currentPos = positions.get(groupId) ?? { x: 0, y: 0 };
      const newY = Math.round(contentCenterY - diamondCenterY);
      positions.set(groupId, { x: currentPos.x, y: newY });
      console.log(`[tierLayout] ISO center-diamond: "${groupId}" shifted to y=${newY} (content center y=${Math.round(contentCenterY)})`);
    };

    // Center subnet diamonds on their direct service children
    subnets.forEach(subnet => {
      const memberIds = (logicalChildren.get(subnet.id) ?? []).map(s => s.id);
      centerGroupOnContent(subnet.id, memberIds);
    });

    // Center VNet diamond on all services within its subnets + direct children
    if (vnet) {
      const vnetMemberIds = [
        ...(logicalChildren.get(vnet.id) ?? []).map(s => s.id),
        ...subnets.flatMap(sn => (logicalChildren.get(sn.id) ?? []).map(s => s.id)),
      ];
      centerGroupOnContent(vnet.id, vnetMemberIds);
    }

    // Center RG diamond on all services
    if (resourceGroup) {
      centerGroupOnContent(resourceGroup.id, services.map(s => s.id));
    }
  }

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
