'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { AzureNodeData, AzureServiceCategory } from '@/lib/state/types';
import { AzureServiceIcon } from '@/components/icons/AzureServiceIcon';

interface FlatAzureNodeProps extends NodeProps {
  data: AzureNodeData;
}

const CATEGORY_ACCENT: Record<AzureServiceCategory, string> = {
  compute:     '#F97316',
  networking:  '#3B82F6',
  databases:   '#8B5CF6',
  storage:     '#10B981',
  security:    '#EF4444',
  identity:    '#F59E0B',
  integration: '#06B6D4',
  messaging:   '#EC4899',
  'ai-ml':     '#8B5CF6',
  analytics:   '#6366F1',
  devops:      '#14B8A6',
  management:  '#64748B',
  web:         '#0EA5E9',
  containers:  '#3B82F6',
};

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

const NODE_W = 180;
const NODE_H = 56;

export const FlatAzureNode = memo(function FlatAzureNode({
  data,
  selected,
}: FlatAzureNodeProps) {
  const accent = CATEGORY_ACCENT[data.category] ?? '#64748B';

  return (
    <div className="group/node relative">
      <div
        className={cn(
          'flat-node-card',
          selected && 'flat-node-card--selected',
        )}
        style={{ width: NODE_W, height: NODE_H }}
      >
        {/* Colored left accent bar */}
        <div
          className="flat-node-accent"
          style={{ backgroundColor: accent }}
        />

        {/* Icon */}
        <div className="flat-node-icon">
          <AzureServiceIcon serviceType={data.serviceType} className="w-6 h-6" />
        </div>

        {/* Label */}
        <div className="flat-node-label">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-1">
            {data.displayName}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">
            {data.serviceType.replace(/-/g, ' ')}
          </span>
        </div>

        {/* Handles */}
        <Handle type="source" position={Position.Right} id="center"
          className="!opacity-0"
          style={{
            width: 8, height: 8,
            border: 'none', background: 'transparent',
          }}
        />
        <Handle type="target" position={Position.Left} id="center"
          className="!opacity-0"
          style={{
            width: 8, height: 8,
            border: 'none', background: 'transparent',
          }}
        />
      </div>

      {/* Hover popover — shows description and metadata */}
      {data.description && (
        <div className="node-popover">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: accent }}
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
