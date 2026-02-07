'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import type { AzureNodeData, GroupType } from '@/lib/state/types';

interface GroupNodeProps extends NodeProps {
  data: AzureNodeData;
}

const GROUP_COLORS: Record<GroupType, string> = {
  'resource-group': '#3B82F6',
  'virtual-network': '#10B981',
  'subnet': '#8B5CF6',
};

// The diamond is drawn in a 200x100 viewBox (2:1 ratio = slope +/-0.5).
// With preserveAspectRatio="none" it stretches to fill the node.
// At the default 2:1 node size the edges perfectly match the iso grid.
// atan(0.5) ≈ 26.57° — the angle of the top-right edge at 2:1.
const ISO_ANGLE = Math.atan(0.5) * (180 / Math.PI); // ~26.57°

export const GroupNode = memo(function GroupNode({
  data,
  selected,
}: GroupNodeProps) {
  const groupType = data.groupType ?? 'resource-group';
  const color = GROUP_COLORS[groupType];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <NodeResizer
        minWidth={160}
        minHeight={80}
        keepAspectRatio
        isVisible={selected}
        lineClassName="!border-transparent"
        handleClassName="!w-2.5 !h-2.5 !bg-blue-500 !border-white"
      />

      {/* Isometric diamond + flat label — fixed 2:1 viewBox, stretches to fill node */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
      >
        <polygon
          className="group-drag-handle"
          points="100,0 200,50 100,100 0,50"
          fill="none"
          stroke={color}
          strokeWidth={selected ? 6 : 4}
          strokeDasharray="8 4"
          vectorEffect="non-scaling-stroke"
        />
        {/* Isometric parallelogram label — centered on top-right edge.
             All 4 edges follow grid lines (slopes ±0.5).
             BL(120,10) BR(180,40) on edge; TL(132,4) TR(192,34) offset (12,-6).
             Rounded corners via quadratic bezier at each vertex. */}
        <path
          d="M 122.2,11.1 L 177.8,38.9 Q 180,40 182.2,38.9 L 189.8,35.1 Q 192,34 189.8,32.9 L 134.2,5.1 Q 132,4 129.8,5.1 L 122.2,8.9 Q 120,10 122.2,11.1 Z"
          fill={color}
        />
        {/* Text with isometric matrix so letters lie flat on the surface.
             matrix(1,0.5,-1,0.5) maps: +x→edge direction, +y→other iso direction.
             Vertical strokes in letters follow slope -0.5, horizontals follow +0.5. */}
        <text
          transform="matrix(1, 0.5, -1, 0.5, 156, 22)"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="6.5"
          fontWeight="600"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
        >
          {data.displayName}
        </text>
      </svg>

      <Handle type="source" position={Position.Top} id="center"
        style={{
          opacity: 0, left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 20, height: 20,
          border: 'none', background: 'transparent',
        }} />
      <Handle type="target" position={Position.Bottom} id="center"
        style={{
          opacity: 0, left: '50%', top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 20, height: 20,
          border: 'none', background: 'transparent',
        }} />
    </div>
  );
});
