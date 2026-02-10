'use client';

import { memo } from 'react';
import { EdgeProps, useInternalNode } from '@xyflow/react';
import type { AzureEdgeData } from '@/lib/state/types';
import { useDiagramState } from '@/lib/state/useDiagramState';
import {
  buildOrthogonal2DPath,
  buildOrthogonalIsoPath,
  get2DDotPositions,
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
    const dots = get2DDotPositions(dx, dy, FLAT_NODE_W, FLAT_NODE_H);
    sx = srcX + dots.src.x;
    sy = srcY + dots.src.y;
    tx = tgtX + dots.tgt.x;
    ty = tgtY + dots.tgt.y;

    edgePath = buildOrthogonal2DPath(sx, sy, tx, ty);
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
