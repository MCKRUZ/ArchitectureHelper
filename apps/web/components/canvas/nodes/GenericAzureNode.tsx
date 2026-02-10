'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { AzureNodeData, AzureServiceCategory } from '@/lib/state/types';
import { AzureServiceIcon } from '@/components/icons/AzureServiceIcon';

interface GenericAzureNodeProps extends NodeProps {
  data: AzureNodeData;
}

const CATEGORY_LABEL: Record<AzureServiceCategory, string> = {
  compute:     'Compute',
  networking:  'Networking',
  databases:   'Databases',
  storage:     'Storage',
  security:    'Security',
  identity:    'Identity',
  integration: 'Integration',
  messaging:   'Messaging',
  'ai-ml':     'AI / ML',
  analytics:   'Analytics',
  devops:      'DevOps',
  management:  'Management',
  web:         'Web',
  containers:  'Containers',
};

const CATEGORY_COLORS: Record<AzureServiceCategory, { left: string; right: string; accent: string }> = {
  compute:     { left: '#E2E8F0', right: '#CBD5E1', accent: '#F97316' },
  networking:  { left: '#DBEAFE', right: '#BFDBFE', accent: '#3B82F6' },
  databases:   { left: '#EDE9FE', right: '#DDD6FE', accent: '#8B5CF6' },
  storage:     { left: '#D1FAE5', right: '#A7F3D0', accent: '#10B981' },
  security:    { left: '#FEE2E2', right: '#FECACA', accent: '#EF4444' },
  identity:    { left: '#FEF3C7', right: '#FDE68A', accent: '#F59E0B' },
  integration: { left: '#CFFAFE', right: '#A5F3FC', accent: '#06B6D4' },
  messaging:   { left: '#FCE7F3', right: '#FBCFE8', accent: '#EC4899' },
  'ai-ml':     { left: '#EDE9FE', right: '#DDD6FE', accent: '#8B5CF6' },
  analytics:   { left: '#E0E7FF', right: '#C7D2FE', accent: '#6366F1' },
  devops:      { left: '#CCFBF1', right: '#99F6E4', accent: '#14B8A6' },
  management:  { left: '#E2E8F0', right: '#CBD5E1', accent: '#64748B' },
  web:         { left: '#E0F2FE', right: '#BAE6FD', accent: '#0EA5E9' },
  containers:  { left: '#DBEAFE', right: '#BFDBFE', accent: '#3B82F6' },
};

// Isometric diamond with 3D extrusion downward
const DW = 80;          // diamond width (horizontal diagonal)
const DH = DW / 2;     // diamond height (vertical diagonal) = 40
const D = 15;           // 3D depth (vertical extrusion below diamond)

const SVG_W = DW;
const SVG_H = DH + D;  // 55

// Edge midpoints of the diamond (where orange dots go)
// top-left: (20, 10), top-right: (60, 10)
// bottom-left: (20, 30), bottom-right: (60, 30)
const DOT_R = 4;

export const GenericAzureNode = memo(function GenericAzureNode({
  data,
  selected,
}: GenericAzureNodeProps) {
  const c = CATEGORY_COLORS[data.category] || CATEGORY_COLORS.compute;

  // Diamond vertices
  const top = `${DW / 2},0`;
  const right = `${DW},${DH / 2}`;
  const bottom = `${DW / 2},${DH}`;
  const left = `0,${DH / 2}`;

  // Extruded vertices (shifted straight down by D)
  const bottomD = `${DW / 2},${DH + D}`;
  const leftD = `0,${DH / 2 + D}`;
  const rightD = `${DW},${DH / 2 + D}`;

  return (
    <div className="group/node relative">
      <div
        className={cn('iso-node-container', selected && 'z-10')}
        style={{ width: SVG_W }}
      >
        <div className="relative" style={{ width: SVG_W, height: SVG_H }}>
          <svg
            width={SVG_W}
            height={SVG_H}
            className="absolute top-0 left-0"
            style={{ zIndex: 1, pointerEvents: 'none' }}
          >
            {/* Left 3D face */}
            <polygon
              points={`${left} ${bottom} ${bottomD} ${leftD}`}
              fill={c.left}
            />
            {/* Right 3D face */}
            <polygon
              points={`${bottom} ${right} ${rightD} ${bottomD}`}
              fill={c.right}
            />
            {/* Top face (diamond) */}
            <polygon
              points={`${top} ${right} ${bottom} ${left}`}
              fill="white"
              stroke={selected ? '#3B82F6' : 'rgba(0,0,0,0.1)'}
              strokeWidth={selected ? 1.5 : 0.5}
            />
            {/* Decorative orange dots at edge midpoints */}
            <circle cx={20} cy={10} r={DOT_R} fill="white" stroke={c.accent} strokeWidth={1.5} />
            <circle cx={60} cy={10} r={DOT_R} fill="white" stroke={c.accent} strokeWidth={1.5} />
            <circle cx={60} cy={30} r={DOT_R} fill="white" stroke={c.accent} strokeWidth={1.5} />
            <circle cx={20} cy={30} r={DOT_R} fill="white" stroke={c.accent} strokeWidth={1.5} />
          </svg>

          {/* Icon — isometric transform so it lays flat on the diamond face */}
          <div
            className="absolute flex items-center justify-center"
            style={{ top: 0, left: 0, width: DW, height: DH, zIndex: 2, pointerEvents: 'none' }}
          >
            <div style={{ transform: 'scaleY(0.5) rotate(45deg) scale(1.5)' }}>
              <AzureServiceIcon serviceType={data.serviceType} className="w-8 h-8" />
            </div>
          </div>

          {/* Single source + target handle at diamond center for React Flow connections */}
          <Handle type="source" position={Position.Top} id="center"
            className="!opacity-0"
            style={{
              position: 'absolute',
              left: DW / 2,
              top: DH / 2,
              width: DW,
              height: DH,
              right: 'auto',
              bottom: 'auto',
              transform: 'translate(-50%, -50%)',
              borderRadius: 0,
              border: 'none',
              background: 'transparent',
              pointerEvents: 'auto',
              cursor: 'crosshair',
            }} />
          <Handle type="target" position={Position.Bottom} id="center"
            className="!opacity-0"
            style={{
              position: 'absolute',
              left: DW / 2,
              top: DH / 2,
              width: DW,
              height: DH,
              right: 'auto',
              bottom: 'auto',
              transform: 'translate(-50%, -50%)',
              borderRadius: 0,
              border: 'none',
              background: 'transparent',
              pointerEvents: 'auto',
              cursor: 'crosshair',
            }} />
        </div>

        {/* Label */}
        <div className="text-center mt-1 select-none" style={{ width: DW }}>
          <span className="text-[10px] font-medium leading-[1.2] text-slate-500 line-clamp-2">
            {data.displayName}
          </span>
        </div>
      </div>

      {/* Hover popover — shows description and metadata */}
      {data.description && (
        <div className="node-popover">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: c.accent }}
            />
            <span className="text-xs font-semibold text-slate-100 truncate">
              {data.displayName}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-300">
            {data.description}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-500">
            <span className="px-1.5 py-0.5 rounded bg-slate-700/50">
              {CATEGORY_LABEL[data.category] ?? data.category}
            </span>
            <span className="capitalize">
              {data.serviceType.replace(/-/g, ' ')}
            </span>
          </div>
          {/* Arrow */}
          <div className="node-popover-arrow" />
        </div>
      )}
    </div>
  );
});
