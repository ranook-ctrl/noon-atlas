/**
 * Throw physics for a dragged board.
 *
 * Ported from robot-components' `FloatingPanel`, with one structural change forced by
 * this app: there, panels live in fixed viewport space and bounce off `window.innerWidth`.
 * Here boards live on a pannable, zoomable world plane, so the walls are the *visible
 * viewport projected into world coordinates* — recomputed every frame, because the camera
 * can move mid-flight. A board thrown off the left of the screen therefore bounces off
 * the edge of what you can see, not off an invisible absolute boundary you'd have no way
 * to predict.
 *
 * Kept faithfully from the reference:
 *
 *  · **Velocity is sampled, not measured at release.** The last pointer delta alone is
 *    noisy and often zero — people decelerate before letting go, so a flick measured on
 *    the final event frequently reads as a dead stop. Instead the last few samples inside
 *    an 80ms window are averaged with linear recency weighting.
 *
 *  · **Friction is interpolated by speed, not switched.** A fast board sheds momentum
 *    faster (0.94/frame) than a slow one (0.975/frame), which is what stops a hard throw
 *    from sailing across the plane while still letting a gentle nudge glide.
 *
 *  · **A bounce boosts friction for one frame.** Without it, a board dropped into a
 *    corner jitters between two walls for an unreasonably long time.
 *
 * The known flaw in the reference is fixed here: it advances position by a fixed
 * per-frame velocity with no delta-time, so a 120Hz display decays momentum in half the
 * wall-clock time. This version scales by elapsed time against a 60fps reference frame,
 * so the throw feels identical on any refresh rate.
 */

import type { Vec } from '../domain/types'

export type PhysicsConfig = {
  /** Gap kept between a board and the wall, in world units. */
  boundaryMargin: number
  /** Ceiling on release speed, in world units per 60fps frame. */
  maxVelocity: number
  /** Velocity retained per frame at rest. */
  baseFriction: number
  /** Velocity retained per frame at max speed. */
  highSpeedFriction: number
  /** Fraction of speed kept through a wall bounce. */
  bounceDamping: number
  /** Extra friction multiplier applied for one frame after a bounce. */
  bounceFrictionBoost: number
  /** Below this speed the flight ends. */
  minVelocity: number
  /** Release speed under which we don't coast at all. */
  momentumThreshold: number
  /**
   * Impact speed that counts as a full-force hit.
   *
   * Deliberately *not* `maxVelocity`. A board only reaches top speed at the instant of
   * release, and the walls here are most of a viewport away, so by the time it arrives it
   * has shed most of its momentum — normalising against the ceiling produced impact
   * values around 0.05 for every bounce, which rounded to no ripple and no sound at all.
   * This is instead the speed at which a collision already looks hard.
   */
  impactReference: number
  /** How many pointer samples to keep. */
  velocitySampleCount: number
}

/**
 * Tuning, in **screen** pixels per 60fps frame.
 *
 * This is the important unit choice in the file. The obvious thing is to tune in world
 * units, since that's the space the flight integrates in — but the plane zooms from 10%
 * to 400%, and a world-space throw would then travel ~40× further across the screen when
 * zoomed out than when zoomed in. At fit-all it would crawl; at 400% a flick would fire
 * a board off the viewport instantly. Neither is what the gesture meant.
 *
 * So these are screen-space values, divided by the live zoom at the moment of release
 * (`scaledPhysics`). A flick of a given speed then covers the same visible distance at
 * any zoom, which is the only definition of "consistent" that a person can perceive.
 */
export const PHYSICS: PhysicsConfig = {
  boundaryMargin: 10,
  // The reference's 40px/frame ceiling assumes a small panel in a large viewport. Here a
  // board fills a good part of the plane at working zooms, and 40 measured out at ~2.5s
  // of coasting across two viewport widths — long enough that you stop reading it as a
  // throw and start waiting for it. 24px/frame lands a hard flick a little over half a
  // viewport away in ~1.2s.
  maxVelocity: 24,
  baseFriction: 0.962,
  highSpeedFriction: 0.93,
  bounceDamping: 0.45,
  bounceFrictionBoost: 0.85,
  // Deliberately *not* the reference's 0.15. That's 9px/s — imperceptible, but it keeps
  // the flight alive (and the board scaled up, and the shadow deep) for a good half
  // second after it has visually stopped. Ending at 0.5px/frame ends it when it looks
  // ended, which is the only thing that matters.
  minVelocity: 0.5,
  momentumThreshold: 1.5,
  impactReference: 8,
  velocitySampleCount: 6,
}

/**
 * Project the screen-space tuning into world units for a given zoom.
 *
 * Only the distance-per-frame quantities convert; the frictions and the damping are
 * dimensionless ratios and must not be touched.
 */
export function scaledPhysics(scale: number): PhysicsConfig {
  const k = 1 / Math.max(scale, 0.0001)
  return {
    ...PHYSICS,
    boundaryMargin: PHYSICS.boundaryMargin * k,
    maxVelocity: PHYSICS.maxVelocity * k,
    minVelocity: PHYSICS.minVelocity * k,
    momentumThreshold: PHYSICS.momentumThreshold * k,
    impactReference: PHYSICS.impactReference * k,
  }
}

/** Reference frame duration. Velocities are expressed per-frame at 60fps. */
const FRAME_MS = 1000 / 60
/** Samples older than this are ignored, so a pause before release kills the throw. */
const SAMPLE_WINDOW_MS = 80

export type Sample = { x: number; y: number; t: number }

/**
 * Weighted average velocity over the recent samples, in world units per 60fps frame.
 *
 * Returns zero if the newest sample is stale — holding a board still for a moment and
 * then releasing should drop it, not fling it with whatever velocity it had before.
 */
export function velocityFromSamples(samples: Sample[], now: number): Vec {
  if (samples.length < 2) return { x: 0, y: 0 }
  if (now - samples[samples.length - 1].t > SAMPLE_WINDOW_MS) return { x: 0, y: 0 }

  let weight = 0
  let vx = 0
  let vy = 0

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1]
    const curr = samples[i]
    const dt = curr.t - prev.t
    const age = now - curr.t
    // Reject implausible gaps: under 8ms is sub-frame jitter that inflates the estimate,
    // over 100ms means the pointer stalled and the pair says nothing about intent.
    if (age > SAMPLE_WINDOW_MS || dt < 8 || dt >= 100) continue
    const w = i / samples.length
    vx += ((curr.x - prev.x) / dt) * FRAME_MS * w
    vy += ((curr.y - prev.y) / dt) * FRAME_MS * w
    weight += w
  }

  if (weight === 0) return { x: 0, y: 0 }
  return { x: vx / weight, y: vy / weight }
}

/** Clamp speed while preserving direction. */
export function clampVelocity(v: Vec, max: number): Vec {
  const speed = Math.hypot(v.x, v.y)
  if (speed <= max) return v
  const k = max / speed
  return { x: v.x * k, y: v.y * k }
}

export type Walls = { minX: number; maxX: number; minY: number; maxY: number }

export type BounceInfo = {
  /** World point of impact, on the board's edge. */
  at: Vec
  /** 0–1, impact speed over max speed. */
  force: number
}

export type FlightCallbacks = {
  /** Every frame, with the new position. Must not touch React state. */
  onFrame: (pos: Vec, velocity: Vec) => void
  /** A wall was hit. */
  onBounce?: (info: BounceInfo) => void
  /** Motion ended; safe to commit. */
  onRest: (pos: Vec) => void
  /** Live walls in world coordinates, re-read every frame so the camera can move. */
  walls: () => Walls
  /** Board size in world units, needed to place the far edges. */
  size: { w: number; h: number }
}

/**
 * Coast a board from `start` at `velocity` until it stops.
 *
 * Returns a cancel function. Position is reported through `onFrame` rather than written
 * here, because the caller owns how it reaches the DOM (a direct style write during
 * flight, avoiding 60 renders/s).
 */
export function startFlight(
  start: Vec,
  velocity: Vec,
  cb: FlightCallbacks,
  config: PhysicsConfig = PHYSICS,
): () => void {
  let { x, y } = start
  let v = clampVelocity(velocity, config.maxVelocity)
  let bouncedX = false
  let bouncedY = false
  let raf = 0
  let last = performance.now()
  let cancelled = false

  /**
   * Which walls are currently allowed to reflect this board.
   *
   * A board can legitimately start *outside* the viewport — at any zoom above fit-all
   * most of the 17 boards are off-screen, and you can grab one that's only half in view.
   * Clamping unconditionally then teleports it to the wall on the first frame, which is
   * what a naive port of the reference does here (there, panels are always on screen, so
   * the case can't arise).
   *
   * So each wall stays open until the board is on the inside of it, and only then starts
   * containing it. The wall closes behind you.
   */
  const armed = { minX: false, maxX: false, minY: false, maxY: false }

  const step = () => {
    if (cancelled) return
    const now = performance.now()
    // Clamped so a tab that was backgrounded doesn't teleport the board on return.
    const dt = Math.min((now - last) / FRAME_MS, 3)
    last = now

    const speed = Math.hypot(v.x, v.y)
    const ratio = Math.min(speed / config.maxVelocity, 1)
    const friction =
      config.baseFriction - ratio * (config.baseFriction - config.highSpeedFriction)

    // Friction is per-frame, so raising it to dt keeps decay identical at any refresh rate.
    const decayX = Math.pow(friction * (bouncedX ? config.bounceFrictionBoost : 1), dt)
    const decayY = Math.pow(friction * (bouncedY ? config.bounceFrictionBoost : 1), dt)
    v = { x: v.x * decayX, y: v.y * decayY }
    bouncedX = false
    bouncedY = false

    x += v.x * dt
    y += v.y * dt

    const walls = cb.walls()
    const maxX = walls.maxX - cb.size.w
    const maxY = walls.maxY - cb.size.h
    const impact = Math.min(Math.hypot(v.x, v.y) / config.impactReference, 1)
    let hit = false

    // Arm each wall as soon as the board is on its inner side.
    if (x >= walls.minX) armed.minX = true
    if (x <= maxX) armed.maxX = true
    if (y >= walls.minY) armed.minY = true
    if (y <= maxY) armed.maxY = true

    // Axes are independent, so a corner hit reflects both and reports two impacts —
    // which is correct: you can see and hear it strike twice.
    if (armed.minX && x < walls.minX) {
      x = walls.minX
      v = { x: Math.abs(v.x) * config.bounceDamping, y: v.y }
      bouncedX = true
      hit = true
      cb.onBounce?.({ at: { x, y: y + cb.size.h / 2 }, force: impact })
    } else if (armed.maxX && x > maxX) {
      x = maxX
      v = { x: -Math.abs(v.x) * config.bounceDamping, y: v.y }
      bouncedX = true
      hit = true
      cb.onBounce?.({ at: { x: x + cb.size.w, y: y + cb.size.h / 2 }, force: impact })
    }

    if (armed.minY && y < walls.minY) {
      y = walls.minY
      v = { x: v.x, y: Math.abs(v.y) * config.bounceDamping }
      bouncedY = true
      hit = true
      cb.onBounce?.({ at: { x: x + cb.size.w / 2, y }, force: impact })
    } else if (armed.maxY && y > maxY) {
      y = maxY
      v = { x: v.x, y: -Math.abs(v.y) * config.bounceDamping }
      bouncedY = true
      hit = true
      cb.onBounce?.({ at: { x: x + cb.size.w / 2, y: y + cb.size.h }, force: impact })
    }

    cb.onFrame({ x, y }, v)

    // A bounce can leave the board pinned against a wall with almost no speed; ending on
    // the frame it lands avoids a long tail of sub-pixel jitter in the corner.
    if (Math.hypot(v.x, v.y) > config.minVelocity && !(hit && impact < 0.02)) {
      raf = requestAnimationFrame(step)
    } else {
      raf = 0
      cb.onRest({ x, y })
    }
  }

  raf = requestAnimationFrame(step)

  return () => {
    cancelled = true
    if (raf) cancelAnimationFrame(raf)
  }
}

/**
 * Tilt a board banks to while moving, in degrees.
 *
 * There is no reference for this — robot-components has no 3D anywhere — so the rule is
 * chosen to make the tilt *mean* something rather than merely decorate: the board leans
 * as though the plane were resisting it, so `rotateY` tracks horizontal velocity and
 * `rotateX` tracks vertical. It reads as weight, and because it's driven by the same
 * velocity the momentum uses, it decays to flat exactly as the board comes to rest
 * without needing its own animation.
 */
export const MAX_TILT = 10
/**
 * Screen-space speed at which the tilt saturates. Deliberately well under the top speed,
 * so an ordinary drag banks visibly instead of only a maximum-effort flick.
 */
const TILT_SATURATION = 16

export function tiltFromVelocity(v: Vec, scale = 1): { rx: number; ry: number } {
  // Velocity arrives in world units; the tilt should respond to how fast the board looks
  // like it's moving, which is the screen-space speed.
  const clamp = (n: number) => Math.max(-1, Math.min(1, (n * scale) / TILT_SATURATION))
  return {
    // Moving right lifts the right edge away from the viewer → negative rotateY.
    ry: -clamp(v.x) * MAX_TILT,
    // Moving down lifts the near edge → positive rotateX.
    rx: clamp(v.y) * MAX_TILT,
  }
}
