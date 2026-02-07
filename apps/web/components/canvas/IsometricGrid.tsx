'use client';

import { useStore } from '@xyflow/react';

const GRID_SPACING = 40;
const LINE_COLOR = 'rgba(148, 163, 184, 0.15)';

/**
 * Isometric diamond grid background for React Flow.
 * Renders two families of diagonal lines at ~27° forming diamond shapes.
 * Follows viewport pan/zoom.
 */
export function IsometricGrid() {
  const transform = useStore((s) => s.transform);
  const [tx, ty, zoom] = transform;

  const gap = GRID_SPACING * zoom;
  // 2:1 isometric: pattern is 2*gap wide, gap tall → lines at arctan(0.5) ≈ 26.57°
  const patW = gap * 2;
  const patH = gap;

  // Offset with viewport pan for seamless scrolling
  const offsetX = tx % patW;
  const offsetY = ty % patH;

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
        <pattern
          id="iso-grid"
          x={offsetX}
          y={offsetY}
          width={patW}
          height={patH}
          patternUnits="userSpaceOnUse"
        >
          {/* Line going up-right ↗ */}
          <line
            x1={0}
            y1={patH}
            x2={patW}
            y2={0}
            stroke={LINE_COLOR}
            strokeWidth={1}
          />
          {/* Line going down-right ↘ */}
          <line
            x1={0}
            y1={0}
            x2={patW}
            y2={patH}
            stroke={LINE_COLOR}
            strokeWidth={1}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#iso-grid)" />
    </svg>
  );
}
