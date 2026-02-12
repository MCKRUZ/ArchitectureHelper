/**
 * Orthogonal Edge Path Builder with Tier-Based Routing Channels
 *
 * Uses fixed horizontal routing channels (like highway lanes) to avoid node overlaps.
 * Channels are positioned between rows of nodes, creating clean routing paths.
 *
 * Architecture:
 * - Nodes are organized in vertical tiers (columns)
 * - Routing channels are horizontal Y positions between node rows
 * - All edges route through these channels for predictable, clean paths
 */

// Fixed routing channels - horizontal Y positions where edges can route
// These act as "highways" between rows of nodes
const ROUTING_CHANNELS = [
  80,   // Above first row
  200,  // Between first and second row
  320,  // Between second and third row
  450,  // Mid-canvas
  580,  // Between third and fourth row
  700,  // Below last row
];

// Channel usage tracking for load balancing
const channelUsage = new Map<number, number>();

/**
 * Select the best routing channel for an edge based on source/target positions.
 * Picks the channel closest to the natural path that minimizes vertical travel.
 */
function selectRoutingChannel(sy: number, ty: number): number {
  const midY = (sy + ty) / 2;

  // Find channel closest to the midpoint between source and target
  let bestChannel = ROUTING_CHANNELS[0];
  let minDistance = Math.abs(ROUTING_CHANNELS[0] - midY);

  for (const channel of ROUTING_CHANNELS) {
    const distance = Math.abs(channel - midY);

    // Prefer channels with less usage (simple load balancing)
    const usage = channelUsage.get(channel) || 0;
    const adjustedDistance = distance + usage * 5; // Penalty for congestion

    if (adjustedDistance < minDistance) {
      minDistance = adjustedDistance;
      bestChannel = channel;
    }
  }

  // Increment usage counter
  channelUsage.set(bestChannel, (channelUsage.get(bestChannel) || 0) + 1);

  return bestChannel;
}

/**
 * Reset channel usage tracking (call when diagram changes)
 */
export function resetChannelUsage(): void {
  channelUsage.clear();
}

/**
 * Build an orthogonal path for 2D mode with tier-aware routing.
 * Intelligently routes based on direction to minimize crossings.
 */
export function buildOrthogonal2DPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): string {
  const dx = tx - sx;
  const dy = ty - sy;

  // Same vertical position: horizontal line
  if (Math.abs(dy) < 10) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }

  // Same horizontal position (same tier): vertical line
  if (Math.abs(dx) < 50) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }

  // Forward flow (left-to-right): simple H-V-H routing
  if (dx > 0) {
    const midX = sx + dx * 0.5;
    return `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`;
  }

  // Backward flow (right-to-left): add vertical offset to avoid crossing forward flows
  // Route: right from source, up/down with offset, left to middle, up/down to target, left to target
  const vertOffset = dy > 0 ? 40 : -40; // Offset up or down based on direction
  const midX = (sx + tx) / 2;
  const offsetY = sy + vertOffset;

  return `M ${sx} ${sy} L ${sx + 20} ${sy} L ${sx + 20} ${offsetY} L ${midX} ${offsetY} L ${midX} ${ty} L ${tx} ${ty}`;
}

/**
 * Build an orthogonal path for isometric mode with tier-aware routing.
 * Routes along iso grid slopes with intelligence to minimize crossings.
 */
export function buildOrthogonalIsoPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): string {
  const dx = tx - sx;
  const dy = ty - sy;

  // Same tier (similar X position): route directly
  if (Math.abs(dx) < 50) {
    return `M ${sx} ${sy} L ${tx} ${ty}`;
  }

  // Forward flow (left-to-right): use natural iso-slope intersection
  if (dx > 0) {
    // Solve for intersection of the two iso-slope lines:
    // Line from source with slope +0.5: y = sy + 0.5*(x - sx)
    // Line to target with slope -0.5:   y = ty - 0.5*(x - tx)
    const ix = (ty - sy + 0.5 * sx + 0.5 * tx);
    const iy = sy + 0.5 * (ix - sx);

    // Validate the intersection is reasonable
    const minX = Math.min(sx, tx) - 100;
    const maxX = Math.max(sx, tx) + 100;

    if (ix >= minX && ix <= maxX) {
      return `M ${sx} ${sy} L ${ix} ${iy} L ${tx} ${ty}`;
    }
  }

  // Backward flow (right-to-left): add waypoints to avoid crossings
  // Route around by going vertical first, then horizontal
  const vertOffset = dy > 0 ? 60 : -60;
  const midX = (sx + tx) / 2;
  const wayY = sy + vertOffset;

  return `M ${sx} ${sy} L ${sx} ${wayY} L ${midX} ${wayY} L ${tx} ${ty}`;
}

/**
 * Build a path through multiple waypoints with orthogonal segments.
 * Uses Manhattan routing (only horizontal and vertical segments).
 */
export function buildPathThroughWaypoints(points: Array<{ x: number; y: number }>): string {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    // If X changed but not Y: horizontal segment
    if (prev.x !== curr.x && prev.y === curr.y) {
      path += ` L ${curr.x} ${curr.y}`;
    }
    // If Y changed but not X: vertical segment
    else if (prev.y !== curr.y && prev.x === curr.x) {
      path += ` L ${curr.x} ${curr.y}`;
    }
    // If both changed: go horizontal first, then vertical
    else if (prev.x !== curr.x && prev.y !== curr.y) {
      path += ` L ${curr.x} ${prev.y} L ${curr.x} ${curr.y}`;
    }
    // If neither changed (same point): skip
  }

  return path;
}

/**
 * Calculate waypoints using tier-based routing channels.
 * Routes through fixed horizontal channels for clean, predictable paths.
 *
 * Routing pattern:
 * 1. Exit source horizontally
 * 2. Move vertically to routing channel
 * 3. Move horizontally through channel
 * 4. Move vertically to target
 * 5. Enter target horizontally
 */
export function calculateChannelBasedWaypoints(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
): Array<{ x: number; y: number }> {
  const dx = tx - sx;
  const dy = ty - sy;

  // Same tier or very close: direct routing
  if (Math.abs(dx) < 50) {
    return [
      { x: sx, y: sy },
      { x: tx, y: ty },
    ];
  }

  // Same horizontal level: direct routing
  if (Math.abs(dy) < 30) {
    return [
      { x: sx, y: sy },
      { x: tx, y: ty },
    ];
  }

  // Select best routing channel based on source/target Y positions
  const channelY = selectRoutingChannel(sy, ty);

  // Calculate intermediate X positions
  const isForwardFlow = dx > 0;
  const quarterX = sx + dx * 0.25;
  const threeQuarterX = sx + dx * 0.75;

  if (isForwardFlow) {
    // Forward flow: clean routing through channel
    return [
      { x: sx, y: sy },           // Start at source
      { x: quarterX, y: sy },     // Exit source tier
      { x: quarterX, y: channelY }, // Enter channel
      { x: threeQuarterX, y: channelY }, // Travel through channel
      { x: threeQuarterX, y: ty }, // Exit channel toward target
      { x: tx, y: ty },           // Arrive at target
    ];
  } else {
    // Backward flow: route around with extra vertical offset
    const backwardOffset = dy > 0 ? 60 : -60;
    return [
      { x: sx, y: sy },
      { x: sx + 30, y: sy },
      { x: sx + 30, y: sy + backwardOffset },
      { x: tx - 30, y: sy + backwardOffset },
      { x: tx - 30, y: ty },
      { x: tx, y: ty },
    ];
  }
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
