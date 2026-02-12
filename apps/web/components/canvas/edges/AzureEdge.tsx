'use client';

import { memo } from 'react';
import { EdgeProps, useInternalNode, getSmoothStepPath, BaseEdge } from '@xyflow/react';
import type { AzureEdgeData } from '@/lib/state/types';
import { useDiagramState } from '@/lib/state/useDiagramState';
import {
  buildOrthogonalIsoPath,
} from '@/lib/edges/orthogonalPath';

interface AzureEdgeProps extends EdgeProps {
  data?: AzureEdgeData;
}

// Orange dot positions relative to node top-left (isometric diamond edge midpoints)
const ISO_DOTS = {
  topLeft:     { x: 20, y: 10 },
  topRight:    { x: 60, y: 10 },
  bottomLeft:  { x: 20, y: 30 },
  bottomRight: { x: 60, y: 30 },
};

// 2D flat node dimensions (must match FlatAzureNode)
const FLAT_NODE_W = 180;
const FLAT_NODE_H = 56;

const ARROW_SIZE = 6;

export const AzureEdge = memo(function AzureEdge({
  id,
  source,
  target,
  selected,
}: AzureEdgeProps) {
  const { state } = useDiagramState();
  const isIso = state.viewMode === 'isometric';

  // Iteration 18: Edge bundling offset to prevent overlap
  // Use edge ID hash to create consistent but varied offsets
  const edgeHash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const bundleOffset = ((edgeHash % 7) - 3) * 2; // Range: -6 to +6

  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (
    !sourceNode || !targetNode ||
    !sourceNode.internals?.positionAbsolute ||
    !targetNode.internals?.positionAbsolute
  ) {
    return null;
  }

  const srcX = sourceNode.internals.positionAbsolute.x;
  const srcY = sourceNode.internals.positionAbsolute.y;
  const tgtX = targetNode.internals.positionAbsolute.x;
  const tgtY = targetNode.internals.positionAbsolute.y;

  const dx = tgtX - srcX;
  const dy = tgtY - srcY;

  let edgePath: string;
  let sx: number, sy: number, tx: number, ty: number;

  if (isIso) {
    let srcDot: { x: number; y: number };
    let tgtDot: { x: number; y: number };

    if (dx >= 0 && dy <= 0) {
      srcDot = ISO_DOTS.topRight;
      tgtDot = ISO_DOTS.bottomLeft;
    } else if (dx < 0 && dy <= 0) {
      srcDot = ISO_DOTS.topLeft;
      tgtDot = ISO_DOTS.bottomRight;
    } else if (dx >= 0 && dy > 0) {
      srcDot = ISO_DOTS.bottomRight;
      tgtDot = ISO_DOTS.topLeft;
    } else {
      srcDot = ISO_DOTS.bottomLeft;
      tgtDot = ISO_DOTS.topRight;
    }

    sx = srcX + srcDot.x;
    sy = srcY + srcDot.y;
    tx = tgtX + tgtDot.x;
    ty = tgtY + tgtDot.y;

    edgePath = buildOrthogonalIsoPath(sx, sy, tx, ty);
  } else {
    // Iteration 9: Adaptive exit/entry points for optimal routing
    // Determine best exit point on source node
    const srcCenterX = srcX + FLAT_NODE_W / 2;
    const srcCenterY = srcY + FLAT_NODE_H / 2;
    const tgtCenterX = tgtX + FLAT_NODE_W / 2;
    const tgtCenterY = tgtY + FLAT_NODE_H / 2;

    // Always exit from right and enter from left for left-to-right flow
    sx = srcX + FLAT_NODE_W;
    sy = srcCenterY;
    tx = tgtX;
    ty = tgtCenterY;

    const horizontalDist = Math.abs(tx - sx);
    const verticalDist = Math.abs(ty - sy);
    const minY = Math.min(sy, ty);
    const maxY = Math.max(sy, ty);

    // Iteration 20: Path simplification - direct routing when safe
    let channelY: number;

    // Try direct middle path first if it's collision-free
    const directMiddle = (sy + ty) / 2;
    const canGoDirectly = verticalDist < 50;

    if (canGoDirectly) {
      // Nearly horizontal - route directly
      channelY = directMiddle;
    } else {
      // Get all nodes for collision detection
      const allNodes = state.nodes || [];

      // Iteration 19: Adaptive collision margins based on diagram density
      const checkCollision = (y: number, exitDist: number): number => {
        let collisions = 0;

        // Count nodes in the routing area to determine density
        let nodesInArea = 0;
        for (const node of allNodes) {
          if (node.type === 'group') continue;
          const nodeY = node.position.y;
          if (nodeY > (minY - 100) && nodeY < (maxY + 100)) {
            nodesInArea++;
          }
        }

        // Adaptive margin: more nodes = larger margin for safety
        const channelMargin = Math.min(30, Math.max(15, 15 + nodesInArea * 1.5));

        for (const node of allNodes) {
          // Skip source and target nodes
          if (node.id === source || node.id === target) continue;
          if (node.type === 'group') continue; // Skip group nodes

          const nodeX = node.position.x;
          const nodeY = node.position.y;
          const nodeW = node.measured?.width || FLAT_NODE_W;
          const nodeH = node.measured?.height || FLAT_NODE_H;

          // Check horizontal segment collision
          const horizontalOverlap =
            (sx + exitDist) < (nodeX + nodeW) &&
            (tx - exitDist) > nodeX;

          const verticalOverlap =
            (y - channelMargin) < (nodeY + nodeH) &&
            (y + channelMargin) > nodeY;

          if (horizontalOverlap && verticalOverlap) {
            collisions++;
          }

          // Check source vertical segment collision
          const srcVerticalSegmentOverlap =
            (sx + exitDist - 10) < (nodeX + nodeW) &&
            (sx + exitDist + 10) > nodeX;

          const srcVerticalSpan =
            Math.min(sy, y) < (nodeY + nodeH) &&
            Math.max(sy, y) > nodeY;

          if (srcVerticalSegmentOverlap && srcVerticalSpan) {
            collisions += 0.5; // Lower penalty for vertical segment
          }

          // Check target vertical segment collision
          const tgtVerticalSegmentOverlap =
            (tx - exitDist - 10) < (nodeX + nodeW) &&
            (tx - exitDist + 10) > nodeX;

          const tgtVerticalSpan =
            Math.min(ty, y) < (nodeY + nodeH) &&
            Math.max(ty, y) > nodeY;

          if (tgtVerticalSegmentOverlap && tgtVerticalSpan) {
            collisions += 0.5; // Lower penalty for vertical segment
          }
        }
        return collisions;
      };

      // Iteration 13: Expanded channel options for better routing flexibility
      const spanHeight = maxY - minY;
      const channelOffset = Math.min(120, Math.max(60, spanHeight * 0.3));

      const channels = [
        minY - channelOffset * 1.5,  // Far above
        minY - channelOffset,         // Above
        (sy + ty) / 2,                // Middle
        maxY + channelOffset,         // Below
        maxY + channelOffset * 1.5,   // Far below
      ];

      // Iteration 17: Middle-biased channel selection for balanced routing
      let bestScore = Infinity;
      let bestChannel = channels[1];
      const tempExitDist = Math.min(40, horizontalDist * 0.15);
      const middleY = (sy + ty) / 2;

      for (let i = 0; i < channels.length; i++) {
        const ch = channels[i];

        // Calculate path length
        const pathLength =
          tempExitDist + // Exit source
          Math.abs(ch - sy) + // Vertical to channel
          horizontalDist + // Horizontal across
          Math.abs(ty - ch) + // Vertical to target
          tempExitDist; // Enter target

        // Check for node collisions (including vertical segments)
        const collisions = checkCollision(ch, tempExitDist);
        const collisionPenalty = collisions * 500; // Heavy penalty for collisions

        // Prefer channels with good clearance from endpoints
        const clearanceBonus = (Math.abs(ch - minY) > 50 && Math.abs(ch - maxY) > 50) ? -20 : 0;

        // Prefer middle channels when scores are close (within 10%)
        const distanceFromMiddle = Math.abs(ch - middleY);
        const middleBias = distanceFromMiddle * 0.05;

        const score = pathLength + collisionPenalty + clearanceBonus + middleBias;

        if (score < bestScore) {
          bestScore = score;
          bestChannel = ch;
        }
      }

      channelY = bestChannel + bundleOffset; // Apply bundle offset to prevent overlap

      // Path simplification: If direct middle has no collisions and score is close, use it
      const directCollisions = checkCollision(directMiddle, tempExitDist);
      if (directCollisions === 0 && Math.abs(directMiddle - bestChannel) < 50) {
        const directPathLength =
          tempExitDist + Math.abs(directMiddle - sy) + horizontalDist +
          Math.abs(ty - directMiddle) + tempExitDist;
        const currentPathLength =
          tempExitDist + Math.abs(channelY - sy) + horizontalDist +
          Math.abs(ty - channelY) + tempExitDist;

        // If direct path is not significantly longer, use it for simplicity
        if (directPathLength <= currentPathLength * 1.1) {
          channelY = directMiddle + bundleOffset;
        }
      }
    }

    // Iteration 16: Adaptive corner radius based on path geometry
    const exitDist = Math.min(40, horizontalDist * 0.15); // Scale with distance
    const verticalSpan = Math.abs(channelY - sy) + Math.abs(channelY - ty);
    const r = Math.min(12, Math.max(6, verticalSpan * 0.08)); // Scale radius with vertical span

    const pathSegments = [
      `M ${sx} ${sy}`,
      `L ${sx + exitDist - r} ${sy}`,
      // Smooth corner from horizontal to vertical
      `Q ${sx + exitDist} ${sy} ${sx + exitDist} ${sy < channelY ? sy + r : sy - r}`,
      `L ${sx + exitDist} ${sy < channelY ? channelY - r : channelY + r}`,
      // Smooth corner to horizontal channel
      `Q ${sx + exitDist} ${channelY} ${sx + exitDist + r} ${channelY}`,
      `L ${tx - exitDist - r} ${channelY}`,
      // Smooth corner from horizontal to vertical
      `Q ${tx - exitDist} ${channelY} ${tx - exitDist} ${channelY < ty ? channelY + r : channelY - r}`,
      `L ${tx - exitDist} ${ty < channelY ? ty - r : ty + r}`,
      // Smooth corner to target
      `Q ${tx - exitDist} ${ty} ${tx - exitDist + r} ${ty}`,
      `L ${tx} ${ty}`,
    ];

    edgePath = pathSegments.join(' ');
  }

  const color = selected ? '#3B82F6' : '#94A3B8';
  const selectedColor = '#3B82F6';
  const markerId = `arrow-${id}`;

  return (
    <>
      {/* Arrowhead marker definition */}
      <defs>
        <marker
          id={markerId}
          viewBox={`0 0 ${ARROW_SIZE * 2} ${ARROW_SIZE * 2}`}
          refX={ARROW_SIZE}
          refY={ARROW_SIZE}
          markerWidth={ARROW_SIZE}
          markerHeight={ARROW_SIZE}
          orient="auto-start-reverse"
        >
          <path
            d={`M 0 0 L ${ARROW_SIZE * 2} ${ARROW_SIZE} L 0 ${ARROW_SIZE * 2} z`}
            fill={selected ? selectedColor : color}
          />
        </marker>
      </defs>

      {/* Invisible wider hit area for easier selection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        className="react-flow__edge-interaction"
      />

      {/* Solid background path (subtle) */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 2 : 1.5}
        strokeOpacity={0.2}
        className="azure-edge"
      />

      {/* Animated dashed path showing flow direction */}
      <path
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={selected ? 2 : 1.5}
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
        className="azure-edge-flow"
      />

      {/* Source dot */}
      <circle cx={sx} cy={sy} r={2.5} fill={color} />
      {/* Target dot */}
      <circle cx={tx} cy={ty} r={2.5} fill={color} />
    </>
  );
});
