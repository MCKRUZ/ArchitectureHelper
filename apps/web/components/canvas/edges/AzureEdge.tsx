'use client';

import { memo } from 'react';
import { BaseEdge, EdgeProps, useInternalNode } from '@xyflow/react';
import type { AzureEdgeData } from '@/lib/state/types';

interface AzureEdgeProps extends EdgeProps {
  data?: AzureEdgeData;
}

// Orange dot positions relative to node top-left (matches SVG circles in GenericAzureNode)
const DOTS = {
  topLeft:     { x: 20, y: 10 },
  topRight:    { x: 60, y: 10 },
  bottomLeft:  { x: 20, y: 30 },
  bottomRight: { x: 60, y: 30 },
};

export const AzureEdge = memo(function AzureEdge({
  id,
  source,
  target,
  selected,
}: AzureEdgeProps) {
  // Get real-time node positions directly — bypasses handle coordinate system entirely
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const srcX = sourceNode.internals.positionAbsolute.x;
  const srcY = sourceNode.internals.positionAbsolute.y;
  const tgtX = targetNode.internals.positionAbsolute.x;
  const tgtY = targetNode.internals.positionAbsolute.y;

  // Pick the best exit/entry dots based on direction between nodes
  const dx = tgtX - srcX;
  const dy = tgtY - srcY;

  let srcDot: { x: number; y: number };
  let tgtDot: { x: number; y: number };

  if (dx >= 0 && dy <= 0) {
    // Target is upper-right
    srcDot = DOTS.topRight;
    tgtDot = DOTS.bottomLeft;
  } else if (dx < 0 && dy <= 0) {
    // Target is upper-left
    srcDot = DOTS.topLeft;
    tgtDot = DOTS.bottomRight;
  } else if (dx >= 0 && dy > 0) {
    // Target is lower-right
    srcDot = DOTS.bottomRight;
    tgtDot = DOTS.topLeft;
  } else {
    // Target is lower-left
    srcDot = DOTS.bottomLeft;
    tgtDot = DOTS.topRight;
  }

  const sx = srcX + srcDot.x;
  const sy = srcY + srcDot.y;
  const tx = tgtX + tgtDot.x;
  const ty = tgtY + tgtDot.y;

  const edgePath = `M ${sx} ${sy} L ${tx} ${ty}`;

  const color = selected ? '#3B82F6' : '#94A3B8';
  const width = selected ? 2 : 1.5;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: width,
        }}
      />
      <circle cx={sx} cy={sy} r={2.5} fill={color} />
      <circle cx={tx} cy={ty} r={2.5} fill={color} />
    </>
  );
});
