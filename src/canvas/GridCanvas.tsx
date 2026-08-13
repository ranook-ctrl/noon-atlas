import { useEffect, useRef } from 'react'
import type { Viewport } from './useViewport'
import { GRID_UNIT, CROSS_ARM, CROSS_STROKE } from './crossGrid'
import { gridField } from './gridField'

/**
 * The plane the atlas sits on — a deformable mesh rather than a static pattern.
 *
 * The pattern primitive is unchanged: a 7px plus, drawn in screen space so it stays the
 * same physical size at any zoom, on a pitch that halves and doubles to stay in a
 * comfortable band. What's new is that the vertices are no longer fixed. Three forces
 * act on them, and all three exist to make the plane feel like a *material* the boards
 * are resting on instead of wallpaper behind them:
 *
 *  1. **Boards push the mesh away.** Each vertex is displaced along the vector from the
 *     nearest point on the nearest board frame, falling off quadratically. Crucially the
 *     displacement is reached through a spring-damper, not applied directly — so the
 *     mesh lags a moving board, overshoots slightly, and settles. That lag is the entire
 *     reason it reads as fabric; snapping straight to the target reads as a shader.
 *
 *  2. **The cursor brightens it.** A tight halo, on the vertices *and* the hairlines
 *     between them. Recomputed per frame with no easing, so it tracks the pointer
 *     exactly — the lag belongs to the geometry, not the light.
 *
 *  3. **Impacts ripple through it.** A board thrown into a wall emits a pulse (see
 *     `gridField`), which travels outward as a ring. Inside the wave a hidden mesh at
 *     *half* pitch fades in, so the plane appears to subdivide in the wake of the
 *     impact and resolve back afterwards.
 *
 * Every plus is drawn at the same fixed size, and displacement is hard-capped below half
 * a pitch. Both matter: without the cap, seventeen boards bunched together at fit-all
 * summed into displacements several pitches wide, rows crossed over each other and the
 * lattice stopped reading as a grid at all. The plane should look the same density at 10%
 * as at 100% — only dented, never dissolved.
 *
 * Everything reads from `gridField` inside the rAF loop rather than from props, so a
 * drag never re-renders this component — see that module for why.
 */

/** Screen-space pitch band. Same values the static grid used, so the look is continuous. */
const MIN_SCREEN_SPACING = 24

/** How far a board's influence reaches, in screen px. */
const PUSH_RADIUS = 150
/** Peak displacement at the face of a board, in screen px. */
const PUSH_STRENGTH = 11
/**
 * Hard ceiling on how far any vertex may be displaced, as a fraction of the grid pitch.
 *
 * This is the load-bearing constant. Board influences *sum*, and at fit-all zoom all 17
 * boards fall inside a couple of hundred screen pixels — so the naive sum displaced
 * vertices by several multiples of the pitch, vertices from different rows crossed over
 * each other, and the lattice stopped reading as a grid at all. It looked like a lens
 * distortion rather than a plane under tension.
 *
 * Capping below half a pitch means neighbouring vertices can never swap places, so the
 * grid stays a legible, evenly-spaced lattice at any zoom while still visibly denting
 * around a board.
 */
const MAX_DISPLACE_FRACTION = 0.3
/** Spring constant pulling a vertex toward its displaced target. Lower = more lag. */
const SPRING = 0.085
/** Velocity retained per frame. Lower = settles faster, less overshoot. */
const DAMPING = 0.76

/** Cursor halo. */
const HOVER_RADIUS = 150
const HOVER_MAX = 0.55

/** Base alpha of a plus with nothing acting on it. Matches the previous static grid. */
const BASE_ALPHA = 0.07
/** Alpha of a plus directly under the cursor. */
const LIT_ALPHA = 0.5
/** Hairlines between vertices sit well under the plusses — structure, not pattern. */
const LINE_BASE_ALPHA = 0.035
const LINE_LIT_ALPHA = 0.3

/** Pulse ring. */
const PULSE_SPEED = 460 // screen px per second
const PULSE_WIDTH = 90 // thickness of the wavefront, screen px
const PULSE_TTL = 2000

const ACCENT = { r: 247, g: 48, b: 111 } // noon pink, used only inside a pulse

type Vertex = {
  /** Current drawn position, screen px. */
  x: number
  y: number
  vx: number
  vy: number
}

function resolvePitch(scale: number) {
  let worldStep = GRID_UNIT
  let spacing = worldStep * scale
  while (spacing < MIN_SCREEN_SPACING) {
    worldStep *= 2
    spacing = worldStep * scale
  }
  while (spacing >= MIN_SCREEN_SPACING * 2) {
    worldStep /= 2
    spacing = worldStep * scale
  }
  return spacing
}

export function GridCanvas({ viewport }: { viewport: Viewport }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const vpRef = useRef(viewport)
  vpRef.current = viewport

  const mouseRef = useRef<{ x: number; y: number } | null>(null)
  const rafRef = useRef(0)
  /** Vertex state, keyed by grid cell. Survives across frames; that's where the lag lives. */
  const meshRef = useRef(new Map<string, Vertex>())
  /** Pitch the mesh was built at — a zoom change invalidates every key. */
  const pitchRef = useRef(0)
  /**
   * The loop parks itself when the plane is still, so anything outside the animation
   * effect that needs to restart it goes through here. Held in a ref because the only
   * closure that can legally touch the loop lives inside that effect.
   */
  const wakeRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let width = 0
    let height = 0
    /** Frames since anything last moved; used to park the loop when the plane is still. */
    let idleFrames = 0
    let lastRevision = -1
    let running = true

    const sizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      width = canvas.clientWidth
      height = canvas.clientHeight
      const bw = Math.round(width * dpr)
      const bh = Math.round(height * dpr)
      if (canvas.width !== bw) canvas.width = bw
      if (canvas.height !== bh) canvas.height = bh
      return dpr
    }

    const frame = () => {
      if (!running) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const dpr = sizeCanvas()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)

      const v = vpRef.current
      const now = performance.now()
      const pitch = resolvePitch(v.scale)

      // A pitch change (zoom crossing a LOD boundary) remaps every cell key, so the
      // spring state is meaningless — drop it rather than let vertices teleport.
      const mesh = meshRef.current
      if (Math.abs(pitch - pitchRef.current) > 0.01) {
        mesh.clear()
        pitchRef.current = pitch
      }

      // Board frames, converted world → screen once per frame and pre-expanded by the
      // push radius so the inner loop can reject a board with four comparisons.
      const boards: { l: number; t: number; r: number; b: number }[] = []
      for (const rect of gridField.rects()) {
        const l = rect.x * v.scale + v.x
        const t = rect.y * v.scale + v.y
        boards.push({ l, t, r: l + rect.w * v.scale, b: t + rect.h * v.scale })
      }

      const pulses = gridField.livePulses(now)
      const mouse = mouseRef.current

      // Screen-space pulse rings for this frame. Precomputed so the per-vertex test is
      // one distance and one subtraction per live pulse.
      const rings = pulses.map((p) => {
        const age = now - p.time
        const scaleF = 0.5 + p.intensity * 0.5
        return {
          x: p.x * v.scale + v.x,
          y: p.y * v.scale + v.y,
          radius: (age / 1000) * PULSE_SPEED * scaleF,
          width: PULSE_WIDTH * scaleF,
          fade: (1 - age / PULSE_TTL) * p.intensity,
        }
      })

      /** Ring brightness at a screen point, 0–1. */
      const pulseAt = (x: number, y: number) => {
        let best = 0
        for (const ring of rings) {
          if (ring.fade <= 0) continue
          const d = Math.abs(Math.hypot(x - ring.x, y - ring.y) - ring.radius)
          if (d < ring.width) best = Math.max(best, (1 - d / ring.width) * ring.fade)
        }
        return best
      }

      /** Cursor brightness at a screen point, 0–1. */
      const hoverAt = (x: number, y: number) => {
        if (!mouse) return 0
        const d = Math.hypot(x - mouse.x, y - mouse.y)
        if (d > HOVER_RADIUS) return 0
        const t = 1 - d / HOVER_RADIUS
        return t * t * HOVER_MAX
      }

      /**
       * Displacement target for a lattice point, plus its distance to the nearest board.
       * Distance is measured to the closest point *on the rectangle*, not to its centre,
       * so the falloff hugs the frame's silhouette instead of radiating from the middle
       * of it — which is what keeps the deformation reading as contact.
       */
      const maxDisplace = pitch * MAX_DISPLACE_FRACTION

      const fieldAt = (bx: number, by: number) => {
        let pushX = 0
        let pushY = 0
        let nearest = Infinity
        for (const b of boards) {
          // Cheap reject: outside the expanded box, no contribution.
          if (
            bx < b.l - PUSH_RADIUS ||
            bx > b.r + PUSH_RADIUS ||
            by < b.t - PUSH_RADIUS ||
            by > b.b + PUSH_RADIUS
          ) {
            continue
          }
          const cx = Math.max(b.l, Math.min(bx, b.r))
          const cy = Math.max(b.t, Math.min(by, b.b))
          const dx = bx - cx
          const dy = by - cy
          const d = Math.hypot(dx, dy)
          if (d < nearest) nearest = d
          if (d > 0 && d < PUSH_RADIUS) {
            const falloff = 1 - d / PUSH_RADIUS
            const amount = falloff * falloff * PUSH_STRENGTH
            pushX += (dx / d) * amount
            pushY += (dy / d) * amount
          }
        }
        // Clamp the *combined* push, preserving its direction. Clamping each board's
        // contribution separately wouldn't help — it's the sum of seventeen of them that
        // tears the lattice apart when they're all bunched together on screen.
        const mag = Math.hypot(pushX, pushY)
        if (mag > maxDisplace) {
          const k = maxDisplace / mag
          pushX *= k
          pushY *= k
        }
        return { tx: bx + pushX, ty: by + pushY, nearest }
      }

      const phaseX = ((v.x % pitch) + pitch) % pitch
      const phaseY = ((v.y % pitch) + pitch) % pitch
      const arm = CROSS_ARM / 2
      const half = CROSS_STROKE / 2

      // One extra ring of cells beyond each edge, so a vertex pushed inward from
      // off-screen still appears rather than popping in at the boundary.
      const startX = phaseX - pitch
      const startY = phaseY - pitch

      /** Live vertices for this frame, indexed by column then row, for the hairlines. */
      const columns: Vertex[][] = []
      let moving = false

      for (let sx = startX, col = 0; sx <= width + pitch; sx += pitch, col++) {
        const column: Vertex[] = []
        columns.push(column)
        for (let sy = startY; sy <= height + pitch; sy += pitch) {
          // Key on the *world* lattice index, so a vertex keeps its spring state as the
          // plane pans under it. Keying on screen position would reset it every frame.
          const gx = Math.round((sx - v.x) / pitch)
          const gy = Math.round((sy - v.y) / pitch)
          const key = `${gx},${gy}`

          const { tx, ty } = fieldAt(sx, sy)

          let vert = mesh.get(key)
          if (!vert) {
            // Born already at its target — a new vertex must not visibly fly in from
            // the undisplaced lattice as you pan.
            vert = { x: tx, y: ty, vx: 0, vy: 0 }
            mesh.set(key, vert)
          }

          vert.vx = (vert.vx + (tx - vert.x) * SPRING) * DAMPING
          vert.vy = (vert.vy + (ty - vert.y) * SPRING) * DAMPING
          vert.x += vert.vx
          vert.y += vert.vy
          if (Math.abs(vert.vx) > 0.02 || Math.abs(vert.vy) > 0.02) moving = true

          // Every plus is the same size. A previous version scaled them by distance to the
          // nearest board (a sine "pressure gradient"), which peaked mid-field and shrank
          // to 0.75× both against a frame *and* far from one — so when zoomed out, where
          // almost every vertex is close to something, the whole grid rendered at minimum
          // size and read as missing. The pattern primitive is a fixed 7px plus; keeping it
          // fixed is what makes the plane look the same density at 10% as at 100%.
          column.push(vert)
        }
      }

      // Prune vertices that have scrolled far out of play, or the map grows without
      // bound over a long panning session.
      if (mesh.size > 12000) mesh.clear()

      // ---- Hairlines, under the plusses ----------------------------------------
      ctx.lineCap = 'butt'
      for (let c = 0; c < columns.length; c++) {
        const column = columns[c]
        const next = columns[c + 1]
        for (let r = 0; r < column.length; r++) {
          const a = column[r]
          const down = column[r + 1]
          const right = next?.[r]

          for (const b of [right, down]) {
            if (!b) continue
            const mx = (a.x + b.x) / 2
            const my = (a.y + b.y) / 2
            const lit = Math.max(hoverAt(mx, my), pulseAt(mx, my))
            const alpha = LINE_BASE_ALPHA + lit * (LINE_LIT_ALPHA - LINE_BASE_ALPHA)
            if (alpha < 0.012) continue
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.lineWidth = 0.5 + lit * 0.9
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`
            ctx.stroke()
          }
        }
      }

      // ---- The dense sub-mesh, visible only inside a passing wave ---------------
      // Half pitch, so the plane appears to subdivide behind the impact and resolve
      // again once the ring moves on. Skipped entirely when no pulse is live, which is
      // almost always — this is the expensive pass and it must not cost anything at rest.
      if (rings.some((r) => r.fade > 0)) {
        const dense = pitch / 2
        for (let sx = startX; sx <= width + pitch; sx += dense) {
          for (let sy = startY; sy <= height + pitch; sy += dense) {
            // Points that coincide with the main lattice are already drawn.
            const onMain =
              Math.abs(((sx - startX) / pitch) % 1) < 0.01 &&
              Math.abs(((sy - startY) / pitch) % 1) < 0.01
            if (onMain) continue

            const { tx, ty } = fieldAt(sx, sy)
            const lit = pulseAt(tx, ty)
            if (lit < 0.06) continue

            // Pink inside the wave: this is an impact, and pink is already this
            // system's "look here". Everything else on the plane stays monochrome, so
            // the ripple can't be mistaken for part of the pattern.
            ctx.fillStyle = `rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},${lit * 0.85})`
            const a2 = (CROSS_ARM * 0.6) / 2
            ctx.fillRect(tx - half, ty - a2, CROSS_STROKE, a2 * 2)
            ctx.fillRect(tx - a2, ty - half, a2 * 2, CROSS_STROKE)
          }
        }
      }

      // ---- The plusses ---------------------------------------------------------
      for (const column of columns) {
        for (const vert of column) {
          const hover = hoverAt(vert.x, vert.y)
          const pulse = pulseAt(vert.x, vert.y)
          const lit = Math.max(hover, pulse)
          const alpha = BASE_ALPHA + lit * (LIT_ALPHA - BASE_ALPHA)

          const a = arm
          // Pulse-lit vertices take the accent; cursor-lit ones just brighten. Two
          // different causes should not look like the same effect.
          ctx.fillStyle =
            pulse > hover && pulse > 0.05
              ? `rgba(${ACCENT.r},${ACCENT.g},${ACCENT.b},${alpha})`
              : `rgba(255,255,255,${alpha})`
          ctx.fillRect(vert.x - half, vert.y - a, CROSS_STROKE, a * 2)
          ctx.fillRect(vert.x - a, vert.y - half, a * 2, CROSS_STROKE)
        }
      }

      // ---- Loop parking --------------------------------------------------------
      // Keep animating while anything can still change: springs in flight, a live
      // ripple, a cursor on the plane, or a board that moved since the last frame.
      const revision = gridField.revision()
      const active =
        moving || rings.some((r) => r.fade > 0) || !!mouse || revision !== lastRevision
      lastRevision = revision
      idleFrames = active ? 0 : idleFrames + 1

      // A short grace period rather than an immediate stop: springs cross zero velocity
      // momentarily at the top of an overshoot, and halting there would freeze the mesh
      // mid-deformation.
      if (idleFrames < 20) {
        rafRef.current = requestAnimationFrame(frame)
      } else {
        rafRef.current = 0
      }
    }

    const wake = () => {
      idleFrames = 0
      if (!rafRef.current) rafRef.current = requestAnimationFrame(frame)
    }
    wakeRef.current = wake

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      mouseRef.current =
        x < 0 || y < 0 || x > rect.width || y > rect.height ? null : { x, y }
      wake()
    }
    const onLeave = () => {
      mouseRef.current = null
      wake()
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    window.addEventListener('resize', wake)
    wake()

    return () => {
      running = false
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('resize', wake)
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
  }, [])

  // A viewport change must restart a parked loop, or panning with the cursor held still
  // would leave the mesh frozen where it was when the loop stopped.
  useEffect(() => {
    wakeRef.current()
  }, [viewport])

  return <canvas ref={canvasRef} className="atlas-canvas__grid" />
}
