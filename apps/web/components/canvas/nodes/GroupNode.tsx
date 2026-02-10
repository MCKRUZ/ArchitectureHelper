'use client';

import { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import type { AzureNodeData, GroupType } from '@/lib/state/types';

interface GroupNodeProps extends NodeProps {
  data: AzureNodeData;
}

const GROUP_COLORS: Record<GroupType, string> = {
  'resource-group': '#3B82F6',
  'virtual-network': '#10B981',
  'subnet': '#8B5CF6',
};

type DiamondVertex = 'north' | 'south' | 'east' | 'west';

const MIN_W = 160;

export const GroupNode = memo(function GroupNode({
  id,
  data,
  selected,
}: GroupNodeProps) {
  const groupType = data.groupType ?? 'resource-group';
  const color = GROUP_COLORS[groupType];
  const [isHovered, setIsHovered] = useState(false);
  const { setNodes, getViewport, getNode } = useReactFlow();

  const active = selected || isHovered;

  // Custom resize: anchors the OPPOSITE diamond vertex, maintains 2:1 ratio
  const startResize = useCallback((vertex: DiamondVertex, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const node = getNode(id);
    if (!node) return;

    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startW = (node.style?.width as number) || 400;
    const startH = (node.style?.height as number) || 200;
    const startX = node.position.x;
    const startY = node.position.y;

    // Anchor = the opposite diamond vertex (stays fixed during resize)
    let anchor: { x: number; y: number };
    switch (vertex) {
      case 'north': anchor = { x: startX + startW / 2, y: startY + startH }; break;
      case 'south': anchor = { x: startX + startW / 2, y: startY }; break;
      case 'east':  anchor = { x: startX, y: startY + startH / 2 }; break;
      case 'west':  anchor = { x: startX + startW, y: startY + startH / 2 }; break;
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      const zoom = getViewport().zoom;
      const deltaX = (moveEvent.clientX - startMouseX) / zoom;
      const deltaY = (moveEvent.clientY - startMouseY) / zoom;

      let newW: number, newH: number, newX: number, newY: number;

      switch (vertex) {
        case 'south': // drag down → bigger
          newH = Math.max(MIN_W / 2, startH + deltaY);
          newW = 2 * newH;
          newX = anchor.x - newW / 2;
          newY = anchor.y; // north vertex stays fixed
          break;
        case 'north': // drag up → bigger
          newH = Math.max(MIN_W / 2, startH - deltaY);
          newW = 2 * newH;
          newX = anchor.x - newW / 2;
          newY = anchor.y - newH; // south vertex stays fixed
          break;
        case 'east': // drag right → bigger
          newW = Math.max(MIN_W, startW + deltaX);
          newH = newW / 2;
          newX = anchor.x; // west vertex stays fixed
          newY = anchor.y - newH / 2;
          break;
        case 'west': // drag left → bigger
          newW = Math.max(MIN_W, startW - deltaX);
          newH = newW / 2;
          newX = anchor.x - newW; // east vertex stays fixed
          newY = anchor.y - newH / 2;
          break;
      }

      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, position: { x: newX, y: newY }, style: { ...n.style, width: newW, height: newH } }
            : n
        )
      );
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [id, getNode, getViewport, setNodes]);

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Custom resize handles at diamond vertices */}
      {active && (
        <>
          <div className="group-resize-handle group-resize-handle--north"
            onMouseDown={(e) => startResize('north', e)} />
          <div className="group-resize-handle group-resize-handle--east"
            onMouseDown={(e) => startResize('east', e)} />
          <div className="group-resize-handle group-resize-handle--south"
            onMouseDown={(e) => startResize('south', e)} />
          <div className="group-resize-handle group-resize-handle--west"
            onMouseDown={(e) => startResize('west', e)} />
        </>
      )}

      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
      >
        {/* Visible dashed outline */}
        <polygon
          points="100,0 200,50 100,100 0,50"
          fill="none"
          stroke={color}
          strokeWidth={selected ? 6 : 4}
          strokeDasharray="8 4"
          vectorEffect="non-scaling-stroke"
          opacity={active ? 1 : 0.6}
          style={{ transition: 'opacity 0.15s ease' }}
        />

        {/* Label — drag handle for moving */}
        <path
          className="group-label"
          d="M 110.2,5.1 L 183.8,41.9 Q 186,43 188.2,41.9 L 198.8,36.6 Q 201,35.5 198.8,34.4 L 125.2,-1.4 Q 123,-2.5 120.8,-1.4 L 110.2,3.9 Q 108,5 110.2,5.1 Z"
          fill={color}
          opacity={active ? 1 : 0.85}
          style={{ transition: 'opacity 0.15s ease, filter 0.15s ease', filter: isHovered ? 'brightness(1.15)' : 'none' }}
        />

        <text
          transform="matrix(1, 0.5, -1, 0.5, 161, 20)"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="7"
          fontWeight="600"
          style={{ fontFamily: 'system-ui, -apple-system, sans-serif', pointerEvents: 'none' }}
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
