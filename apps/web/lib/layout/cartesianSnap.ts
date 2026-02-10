/**
 * Cartesian Grid Snapping (2D mode)
 *
 * Simple snap-to-grid for flat rectangular nodes on a square grid.
 */

const CART_GRID = 20;

/**
 * Snap a position to the nearest cartesian grid point (20px spacing).
 */
export function snapToCartesianGrid(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.round(x / CART_GRID) * CART_GRID,
    y: Math.round(y / CART_GRID) * CART_GRID,
  };
}

/**
 * Snap group dimensions for 2D mode: width to nearest 40px, height to nearest 40px.
 */
export function snapCartesianGroupDimensions(rawW: number, rawH: number): { width: number; height: number } {
  return {
    width: Math.max(200, Math.round(rawW / 40) * 40),
    height: Math.max(120, Math.round(rawH / 40) * 40),
  };
}
