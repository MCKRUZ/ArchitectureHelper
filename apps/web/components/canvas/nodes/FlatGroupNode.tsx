'use client';

import { memo, useState } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { AzureNodeData, GroupType } from '@/lib/state/types';

interface FlatGroupNodeProps extends NodeProps {
  data: AzureNodeData;
}

const GROUP_COLORS: Record<GroupType, { border: string; bg: string; text: string }> = {
  'resource-group':  { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.05)',  text: '#2563EB' },
  'virtual-network': { border: '#10B981', bg: 'rgba(16, 185, 129, 0.05)', text: '#059669' },
  'subnet':          { border: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.05)', text: '#7C3AED' },
};

export const FlatGroupNode = memo(function FlatGroupNode({
  data,
  selected,
}: FlatGroupNodeProps) {
  const groupType = data.groupType ?? 'resource-group';
  const colors = GROUP_COLORS[groupType];
  const [isHovered, setIsHovered] = useState(false);

  const active = selected || isHovered;

  return (
    <div
      className={cn('flat-group-container', active && 'flat-group-container--active')}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        borderColor: colors.border,
        backgroundColor: colors.bg,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <NodeResizer
        minWidth={200}
        minHeight={120}
        isVisible={active}
        lineStyle={{ borderColor: colors.border, borderWidth: 1 }}
        handleStyle={{ backgroundColor: colors.border, width: 8, height: 8 }}
      />

      {/* Header bar */}
      <div
        className="flat-group-header"
        style={{ backgroundColor: colors.border }}
      >
        <span className="text-[11px] font-semibold text-white px-3 py-1 leading-tight">
          {data.displayName}
        </span>
        {data.subtitle && (
          <span className="text-[10px] text-white/70 px-3 leading-tight">
            {data.subtitle}
          </span>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="center"
        style={{ opacity: 0, width: 10, height: 10, border: 'none', background: 'transparent' }}
      />
      <Handle type="target" position={Position.Left} id="center"
        style={{ opacity: 0, width: 10, height: 10, border: 'none', background: 'transparent' }}
      />
    </div>
  );
});
