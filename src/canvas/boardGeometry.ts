/**
 * Board and connector geometry — the pure maths behind the atlas canvas,
 * extracted from `AtlasBoards.tsx` so it can be unit-tested and reused by the
 * minimap, fit-to-content and export paths without dragging a component along.
 *
 * Every constant and formula here is byte-identical to the pre-refactor version;
 * the ratios come 1:1 from the Figma card component (node 14:9227).
 */

import type { Box, Vec } from '../domain/types'

/** Card width in world px — every other dimension derives from this. */
export const CARD_W = 200

/** Label line box ≈ 19.2 */
export const LABEL_H = CARD_W * (16 / 200) * 1.2
/** Label → frame gap = 16 */
export const GAP = CARD_W * (16 / 200)
/** Phone frame height ≈ 433.33 */
export const FRAME_H = CARD_W * (433.33 / 200)

export const CONNECTOR_COLOR = 'rgba(255, 255, 255, 0.35)'

/** The screenshot-frame box of a board in world coordinates (the arrow anchor). */
export function frameBox(p: Vec): Box {
  return { x: p.x, y: p.y + LABEL_H + GAP, w: CARD_W, h: FRAME_H }
}

/**
 * Gap between a frame edge and where its connector actually begins.
 *
 * Without it the line runs into the artboard and the arrowhead is half-buried in the
 * frame, which reads as unfinished — as if the drawing were clipped rather than
 * designed. Holding the curve off the board and marking the attachment with a tick on
 * the edge makes the connection read as docked into a port.
 */
/**
 * Socket geometry — a lead off the frame edge into a square pad.
 *
 * Rings were the wrong shape for this product. Nothing else in it is circular: the
 * background is a plus-grid, the typeface is pixel, the hover marks are square corner
 * brackets, every hairline is 1px and straight. A hollow circle filled with opaque
 * black, straddling the board's own pink focus ring, read as a sticker rather than a
 * connector — and the soft halo behind it read as a smudge.
 *
 * A short lead out of the edge into a small square pad is the same vocabulary as a
 * component pin on a board: rectilinear, hairline, and unmistakably *attached*. The pad
 * sits entirely outside the frame so it never muddies the focus ring, and "active" is a
 * solid fill rather than a blur — a crisp binary instead of a glow.
 */
/** Length of the lead from the frame edge to the pad. */
export const PORT_LEAD = 7
/** Half-width of the square pad. */
export const PORT_PAD = 3.4
/** Distance from the frame edge to where the curve begins (pad's outer face). */
export const PORT_STANDOFF = PORT_LEAD + PORT_PAD * 2
/**
 * Length of the shared trunk: the straight run every connector makes, perpendicular to
 * the edge, before it is allowed to curve.
 *
 * This is what makes the bundling real rather than approximate. Because sockets are no
 * longer spread along the edge, every flow leaving a board in a given direction starts at
 * the *same* point and runs the *same* distance along the *same* normal — so the stems
 * coincide exactly and ten flows out of the homepage draw as one stem with a fan at the
 * end of it. The previous version only used this as a floor on the bezier handle length,
 * which made the runs merely parallel-ish; they still separated from the first pixel.
 */
export const PORT_TRUNK = 46

export interface ConnectorGeometry {
  /** SVG path data for the curve, from standoff point to standoff point. */
  d: string
  /** Where the curve starts — held off the source frame by PORT_STANDOFF. */
  tail: Vec
  /** Where the curve ends — held off the target frame, arrowhead sits here. */
  tip: Vec
  /** Arrowhead rotation in degrees. */
  deg: number
  /** Source socket: edge anchor, lead end, and the outward normal. */
  portFrom: { edge: Vec; pad: Vec; n: Vec }
  /** Target socket: edge anchor, lead end, and the outward normal. */
  portTo: { edge: Vec; pad: Vec; n: Vec }
}

/*
 * There is deliberately no `PortSlot` / `spreadAlongEdge` here any more.
 *
 * Sockets used to be fanned along each frame edge so every connector had its own
 * attachment point. It did reduce crossings, but it made each board look like a
 * pin-header — a dozen pads at irregular spacings, none of them landing on the edge's
 * midpoint — and the boards read as busier than the graph actually is. One socket per
 * direction is cleaner, and with the shared trunk below it costs nothing in legibility:
 * co-directional flows now overlap *exactly* for the length of the trunk, which reads as
 * a single cable, rather than as several near-parallel lines at slightly wrong angles.
 */

/**
 * A connector between two frame boxes: out of S's facing edge, along a shared trunk,
 * curving across, then along T's trunk and into T's edge.
 *
 * The trunk segments are what bundle the graph. Both ends leave and arrive perpendicular
 * for a fixed `PORT_TRUNK`, so every flow sharing a direction out of a board traces the
 * identical stem before diverging — the ten-way fan-out from the homepage draws as one
 * cable that splits, instead of ten curves that separate immediately and cross.
 *
 * Known limitation, unchanged: the facing edge is chosen by a plain `|dx| vs |dy|`
 * compare, so a curve can still pass over an intervening board. That needs a collision
 * check against the other frames, which is a routing problem rather than a bundling one.
 */
export function connectorPath(s: Box, t: Box): ConnectorGeometry {
  const sc = { x: s.x + s.w / 2, y: s.y + s.h / 2 }
  const tc = { x: t.x + t.w / 2, y: t.y + t.h / 2 }
  const dx = tc.x - sc.x
  const dy = tc.y - sc.y

  let a: Vec // start anchor (edge midpoint of S)
  let an: Vec // outward normal at S
  let b: Vec // end anchor (edge midpoint of T)
  let bn: Vec // outward normal at T
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal: use left/right edges.
    const right = dx >= 0
    a = { x: right ? s.x + s.w : s.x, y: sc.y }
    an = { x: right ? 1 : -1, y: 0 }
    b = { x: right ? t.x : t.x + t.w, y: tc.y }
    bn = { x: right ? -1 : 1, y: 0 }
  } else {
    // Vertical: use top/bottom edges.
    const down = dy >= 0
    a = { x: sc.x, y: down ? s.y + s.h : s.y }
    an = { x: 0, y: down ? 1 : -1 }
    b = { x: tc.x, y: down ? t.y : t.y + t.h }
    bn = { x: 0, y: down ? -1 : 1 }
  }

  // Hold both ends off their frames along the outward normal, so the curve floats in
  // front of the board rather than colliding with it.
  const aOut = { x: a.x + an.x * PORT_STANDOFF, y: a.y + an.y * PORT_STANDOFF }
  const bOut = { x: b.x + bn.x * PORT_STANDOFF, y: b.y + bn.y * PORT_STANDOFF }

  // The bundle: a straight, shared run perpendicular to each edge. Identical for every
  // flow leaving the same board in the same direction, so their stems coincide exactly.
  const aTrunk = { x: aOut.x + an.x * PORT_TRUNK, y: aOut.y + an.y * PORT_TRUNK }
  const bTrunk = { x: bOut.x + bn.x * PORT_TRUNK, y: bOut.y + bn.y * PORT_TRUNK }

  // Handles are measured between the trunk ends, not the pads — using the full span would
  // double-count the trunk and overshoot, kinking the join where the straight meets the
  // curve. Scaled well under half so the curve stays taut at long distances.
  const span = Math.hypot(bTrunk.x - aTrunk.x, bTrunk.y - aTrunk.y)
  const h = Math.max(12, span * 0.42)
  const c1 = { x: aTrunk.x + an.x * h, y: aTrunk.y + an.y * h }
  const c2 = { x: bTrunk.x + bn.x * h, y: bTrunk.y + bn.y * h }

  // Arrowhead points into T along -bn (perpendicular to the edge).
  const deg = (Math.atan2(-bn.y, -bn.x) * 180) / Math.PI

  return {
    d:
      `M ${aOut.x} ${aOut.y} L ${aTrunk.x} ${aTrunk.y} ` +
      `C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${bTrunk.x} ${bTrunk.y} ` +
      `L ${bOut.x} ${bOut.y}`,
    tail: aOut,
    tip: bOut,
    deg,
    portFrom: { edge: a, pad: { x: a.x + an.x * PORT_LEAD, y: a.y + an.y * PORT_LEAD }, n: an },
    portTo: { edge: b, pad: { x: b.x + bn.x * PORT_LEAD, y: b.y + bn.y * PORT_LEAD }, n: bn },
  }
}

/*
 * There is deliberately no `atlasInitialViewport(vw, vh, rect)` here any more.
 *
 * Deriving the opening camera from a window size measured by a *parent* component
 * is a trap: on first paint that height can still be 0, the scale then clamps to
 * MIN_SCALE, and because `useViewport` freezes its initial value at mount the camera
 * stays stranded at 10% zoom with the entry screen off-screen and nothing thrown.
 * `InfiniteCanvas`'s `initialFocus` prop measures the canvas element itself instead,
 * which cannot fail that way. Pass a world-space rect, not a computed viewport.
 */

/** The bounding box of every board's frame — fit-to-content / minimap extents. */
export function boardsBounds(positions: Vec[]): Box | null {
  if (!positions.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of positions) {
    const fb = frameBox(p)
    minX = Math.min(minX, fb.x)
    minY = Math.min(minY, p.y) // include the label above the frame
    maxX = Math.max(maxX, fb.x + fb.w)
    maxY = Math.max(maxY, fb.y + fb.h)
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
}
