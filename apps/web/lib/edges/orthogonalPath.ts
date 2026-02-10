/**
 * Orthogonal Edge Path Builder
 *
 * Generates SVG path strings with right-angle bends instead of diagonal lines.
 * Supports both 2D (H-V-H) and isometric (iso-slope) routing.
 */

/**
 * Build an orthogonal path for 2D mode.
 * Routes: horizontal to midpoint X, vertical to target Y, horizontal to target.
 * M sx sy -> L midX sy -> L midX ty -> L tx ty
 */
export function buildOrthogonal2DPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): string {
  const midX = (sx + tx) / 2;
  return `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
}

/**
 * Build an orthogonal path for isometric mode.
 * Routes along iso grid slopes: first segment at slope +0.5 (going right-down),
 * second segment at slope -0.5 (going right-up), meeting at intersection.
 *
 * Line 1 from source: y = sy + 0.5*(x - sx)
 * Line 2 to target:   y = ty - 0.5*(x - tx)
 *
 * Intersection: sy + 0.5*(x - sx) = ty - 0.5*(x - tx)
 *               x = (ty - sy + 0.5*sx + 0.5*tx)
 * Simplifies to: x = sx + tx + (ty - sy) mapped correctly.
 *
 * If target is directly above/below (same X), use a V shape with horizontal offset.
 */
export function buildOrthogonalIsoPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): string {
  // Solve for intersection of the two iso-slope lines:
  // Line from source with slope +0.5: y = sy + 0.5*(x - sx)
  // Line to target with slope -0.5:   y = ty - 0.5*(x - tx)
  // Setting equal: sy + 0.5*x - 0.5*sx = ty - 0.5*x + 0.5*tx
  //                x = (ty - sy + 0.5*sx + 0.5*tx)
  const ix = (ty - sy + 0.5 * sx + 0.5 * tx);
  const iy = sy + 0.5 * (ix - sx);

  // Validate the intersection is reasonable (between source and target X range expanded)
  const minX = Math.min(sx, tx) - 100;
  const maxX = Math.max(sx, tx) + 100;

  if (ix >= minX && ix <= maxX) {
    return `M ${sx} ${sy} L ${ix} ${iy} L ${tx} ${ty}`;
  }

  // Fallback: route via a midpoint using two segments
  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;
  return `M ${sx} ${sy} L ${midX} ${midY} L ${tx} ${ty}`;
}

/**
 * Connection dot positions on a rectangular node (2D mode).
 * Returns the best exit/entry points based on relative direction.
 * Node dimensions: width=80, height=36 (compact card).
 */
export function get2DDotPositions(
  dx: number,
  dy: number,
  nodeW: number,
  nodeH: number,
): { src: { x: number; y: number }; tgt: { x: number; y: number } } {
  // Determine primary direction
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx > absDy) {
    // Primarily horizontal
    if (dx >= 0) {
      return {
        src: { x: nodeW, y: nodeH / 2 },     // right edge
        tgt: { x: 0, y: nodeH / 2 },          // left edge
      };
    }
    return {
      src: { x: 0, y: nodeH / 2 },            // left edge
      tgt: { x: nodeW, y: nodeH / 2 },         // right edge
    };
  }

  // Primarily vertical
  if (dy >= 0) {
    return {
      src: { x: nodeW / 2, y: nodeH },         // bottom edge
      tgt: { x: nodeW / 2, y: 0 },             // top edge
    };
  }
  return {
    src: { x: nodeW / 2, y: 0 },               // top edge
    tgt: { x: nodeW / 2, y: nodeH },            // bottom edge
  };
}
