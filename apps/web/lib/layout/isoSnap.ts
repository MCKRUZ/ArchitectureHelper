/**
 * Isometric Grid Snapping
 *
 * Pure functions for snapping node positions to the 2:1 isometric diamond grid.
 * Used by AzureCanvas (interactive drag), autoLayout (computed positions),
 * and useCopilotActions (AI-generated positions).
 */

// Grid constants
const ISO_G = 40;
const DIAMOND_HALF_W = 40;
const CUBE_BOTTOM_Y = 55; // DH(40) + D(15) — bottom vertex offset from node top

/**
 * Snap a service node's position so its BOTTOM vertex sits on the nearest
 * isometric grid vertex. Grid vertices are at (k*40, j*20) where k+j is even.
 */
export function snapToIsoGrid(nodeX: number, nodeY: number): { x: number; y: number } {
  const botX = nodeX + DIAMOND_HALF_W;
  const botY = nodeY + CUBE_BOTTOM_Y;
  const halfG = ISO_G / 2;

  const kFloor = Math.floor(botX / ISO_G);
  const kCeil = kFloor + 1;
  const jFloor = Math.floor(botY / halfG);
  const jCeil = jFloor + 1;

  let bestDist = Infinity;
  let bestX = nodeX;
  let bestY = nodeY;

  for (const k of [kFloor, kCeil]) {
    for (const j of [jFloor, jCeil]) {
      if ((k + j) % 2 !== 0) continue;
      const gx = k * ISO_G;
      const gy = j * halfG;
      const d = (gx - botX) ** 2 + (gy - botY) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestX = gx - DIAMOND_HALF_W;
        bestY = gy - CUBE_BOTTOM_Y;
      }
    }
  }

  return { x: bestX, y: bestY };
}

/**
 * Snap a group node's position so its TOP vertex sits on the nearest
 * isometric grid vertex. The diamond's top vertex is at (nodeX + W/2, nodeY).
 */
export function snapGroupToIsoGrid(nodeX: number, nodeY: number, nodeW: number): { x: number; y: number } {
  const topX = nodeX + nodeW / 2;
  const topY = nodeY;
  const halfG = ISO_G / 2;

  const kFloor = Math.floor(topX / ISO_G);
  const kCeil = kFloor + 1;
  const jFloor = Math.floor(topY / halfG);
  const jCeil = jFloor + 1;

  let bestDist = Infinity;
  let bestX = nodeX;
  let bestY = nodeY;

  for (const k of [kFloor, kCeil]) {
    for (const j of [jFloor, jCeil]) {
      if ((k + j) % 2 !== 0) continue;
      const gx = k * ISO_G;
      const gy = j * halfG;
      const d = (gx - topX) ** 2 + (gy - topY) ** 2;
      if (d < bestDist) {
        bestDist = d;
        bestX = gx - nodeW / 2;
        bestY = gy;
      }
    }
  }

  return { x: bestX, y: bestY };
}

/**
 * Snap group dimensions: W to nearest multiple of 80 (min 160), H = W/2.
 * This keeps all four diamond vertices on grid intersections.
 */
export function snapGroupDimensions(rawW: number): { width: number; height: number } {
  const width = Math.max(160, Math.round(rawW / 80) * 80);
  const height = width / 2;
  return { width, height };
}
