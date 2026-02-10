'use client';

import { useStore } from '@xyflow/react';

const GRID_SPACING = 20;
const LINE_COLOR = 'rgba(148, 163, 184, 0.12)';
const MAJOR_LINE_COLOR = 'rgba(148, 163, 184, 0.25)';

/**
 * Cartesian grid background for 2D mode.
 * Renders horizontal + vertical lines with major lines every 5th.
 */
export function CartesianGrid() {
  const transform = useStore((s) => s.transform);
  const [tx, ty, zoom] = transform;

  const gap = GRID_SPACING * zoom;
  const majorGap = gap * 5;

  const offsetX = tx % majorGap;
  const offsetY = ty % majorGap;

  return (
    <svg
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <defs>
        {/* Minor grid */}
        <pattern
          id="cart-grid-minor"
          x={tx % gap}
          y={ty % gap}
          width={gap}
          height={gap}
          patternUnits="userSpaceOnUse"
        >
          <line x1={0} y1={0} x2={gap} y2={0} stroke={LINE_COLOR} strokeWidth={0.5} />
          <line x1={0} y1={0} x2={0} y2={gap} stroke={LINE_COLOR} strokeWidth={0.5} />
        </pattern>

        {/* Major grid */}
        <pattern
          id="cart-grid-major"
          x={offsetX}
          y={offsetY}
          width={majorGap}
          height={majorGap}
          patternUnits="userSpaceOnUse"
        >
          <rect width={majorGap} height={majorGap} fill="url(#cart-grid-minor)" />
          <line x1={0} y1={0} x2={majorGap} y2={0} stroke={MAJOR_LINE_COLOR} strokeWidth={1} />
          <line x1={0} y1={0} x2={0} y2={majorGap} stroke={MAJOR_LINE_COLOR} strokeWidth={1} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cart-grid-major)" />
    </svg>
  );
}
