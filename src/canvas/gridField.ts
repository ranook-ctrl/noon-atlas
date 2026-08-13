/**
 * The shared field the grid reacts to.
 *
 * `GridCanvas` draws a mesh that bends around the boards and ripples when one hits a
 * wall. Both of those inputs originate in `AtlasBoards`, which is a sibling — not an
 * ancestor — so the obvious wiring would be to lift board rects and bounce events up
 * through `InfiniteCanvas` and back down as props.
 *
 * That would be wrong here for a specific reason: these values change on every frame of
 * a drag and every frame of a momentum flight. Routing them through React state would
 * re-render the canvas tree ~60×/s, which is the exact cascade the context split was
 * built to eliminate (see `CanvasContext`). So this is a plain module-level store, read
 * imperatively from inside the grid's `requestAnimationFrame` loop and never subscribed
 * to. No renders, no reconciliation, no props.
 *
 * Everything here is in **world** coordinates. The grid converts to screen space itself
 * using the live viewport, so the mesh deformation and the ripples stay pinned to the
 * boards while you pan and zoom, rather than sliding out from under them.
 */

export type FieldRect = { x: number; y: number; w: number; h: number }

export type FieldPulse = {
  x: number
  y: number
  /** `performance.now()` at emission. */
  time: number
  /** 0–1 impact force; scales the wave's speed, width and brightness. */
  intensity: number
}

/** A pulse is dead after this long, and is pruned on the next write. */
const PULSE_TTL = 2000

const rects = new Map<string, FieldRect>()
let pulses: FieldPulse[] = []
/** Bumped on every write, so the grid can tell "nothing moved" cheaply. */
let revision = 0

export const gridField = {
  /** Publish (or update) one board's world-space frame. */
  setRect(id: string, rect: FieldRect) {
    const prev = rects.get(id)
    if (prev && prev.x === rect.x && prev.y === rect.y && prev.w === rect.w && prev.h === rect.h) {
      return
    }
    rects.set(id, rect)
    revision++
  },

  removeRect(id: string) {
    if (rects.delete(id)) revision++
  },

  /** Replace the whole set — used when the layout is reloaded or a project switches. */
  replaceRects(next: Iterable<readonly [string, FieldRect]>) {
    rects.clear()
    for (const [id, rect] of next) rects.set(id, rect)
    revision++
  },

  rects(): IterableIterator<FieldRect> {
    return rects.values()
  },

  rectCount() {
    return rects.size
  },

  /** Emit a ripple at a world point. Called on wall impacts. */
  pulse(x: number, y: number, intensity: number) {
    const now = performance.now()
    pulses = pulses.filter((p) => now - p.time < PULSE_TTL)
    pulses.push({ x, y, time: now, intensity })
    revision++
  },

  /** Live pulses, already pruned of expired ones. */
  livePulses(now: number): FieldPulse[] {
    if (pulses.length === 0) return pulses
    const live = pulses.filter((p) => now - p.time < PULSE_TTL)
    // Only reassign when something actually expired, so `revision` stays meaningful.
    if (live.length !== pulses.length) pulses = live
    return pulses
  },

  revision() {
    return revision
  },
}
