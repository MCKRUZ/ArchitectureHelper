/**
 * GroupBackgrounds Component
 *
 * Renders visual group boundaries as SVG overlays on top of the React Flow canvas.
 * This allows visual grouping without React Flow's parent-child positioning constraints.
 *
 * Groups are rendered as:
 * - Resource Groups: Blue border, light blue fill
 * - Virtual Networks: Green border, light green fill
 * - Subnets: Purple border, light purple fill
 */

'use client';

import { useMemo } from 'react';
import { ViewportPortal } from '@xyflow/react';
import type { AzureNode } from '@/lib/state/types';
import type { LogicalTree } from '@/lib/state/useLogicalTree';
import { getDepth } from '@/lib/state/useLogicalTree';

interface GroupBackgroundsProps {
  nodes: AzureNode[];
  logicalTree: LogicalTree;
  viewMode: '2d' | 'isometric' | 'cost-heatmap' | 'compliance';
}

interface GroupStyle {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  opacity: number;
}

const GROUP_STYLES: Record<string, GroupStyle> = {
  'resource-group': {
    strokeColor: '#3b82f6', // blue-500
    fillColor: '#dbeafe', // blue-100
    strokeWidth: 2,
    opacity: 0.1,
  },
  'virtual-network': {
    strokeColor: '#10b981', // green-500
    fillColor: '#d1fae5', // green-100
    strokeWidth: 2,
    opacity: 0.15,
  },
  'subnet': {
    strokeColor: '#8b5cf6', // purple-500
    fillColor: '#ede9fe', // purple-100
    strokeWidth: 1.5,
    opacity: 0.2,
  },
};

export function GroupBackgrounds({ nodes, logicalTree, viewMode }: GroupBackgroundsProps) {
  const groups = useMemo(() => {
    return nodes.filter(n => n.type === 'group');
  }, [nodes]);

  const sortedGroups = useMemo(() => {
    // Sort by depth (deepest first) so nested groups render on top
    return [...groups].sort((a, b) => {
      const depthA = getDepth(a.id, logicalTree);
      const depthB = getDepth(b.id, logicalTree);
      return depthA - depthB; // Shallowest (RG) first, deepest (Subnet) last
    });
  }, [groups, logicalTree]);

  if (groups.length === 0) return null;

  return (
    <ViewportPortal>
      <svg
        className="pointer-events-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          overflow: 'visible',
        }}
      >
      {sortedGroups.map(group => {
        const groupType = group.data.groupType ?? 'resource-group';
        const style = GROUP_STYLES[groupType] || GROUP_STYLES['resource-group'];

        // Get group dimensions
        const width = (group.data.properties?.width as number) ?? 400;
        const height = (group.data.properties?.height as number) ?? 250;

        // Isometric view uses diamond shapes, 2D uses rectangles
        if (viewMode === 'isometric') {
          // Diamond shape for isometric groups
          const x = group.position.x;
          const y = group.position.y;
          const w = width;
          const h = height;

          // Diamond points (top, right, bottom, left)
          const points = [
            [x + w / 2, y].join(','),
            [x + w, y + h / 2].join(','),
            [x + w / 2, y + h].join(','),
            [x, y + h / 2].join(','),
          ].join(' ');

          return (
            <g key={group.id}>
              <polygon
                points={points}
                fill={style.fillColor}
                stroke={style.strokeColor}
                strokeWidth={style.strokeWidth}
                opacity={style.opacity}
              />
              <text
                x={x + w / 2}
                y={y + 20}
                textAnchor="middle"
                className="text-xs font-semibold"
                fill={style.strokeColor}
                opacity={0.8}
              >
                {group.data.displayName}
              </text>
            </g>
          );
        } else {
          // Rectangle for 2D view
          return (
            <g key={group.id}>
              <rect
                x={group.position.x}
                y={group.position.y}
                width={width}
                height={height}
                fill={style.fillColor}
                stroke={style.strokeColor}
                strokeWidth={style.strokeWidth}
                opacity={style.opacity}
                rx={8}
              />
              <text
                x={group.position.x + 12}
                y={group.position.y + 24}
                className="text-sm font-semibold"
                fill={style.strokeColor}
                opacity={0.9}
              >
                {group.data.displayName}
              </text>
            </g>
          );
        }
      })}
    </svg>
    </ViewportPortal>
  );
}
