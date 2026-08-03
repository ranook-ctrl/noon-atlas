import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'

export interface Viewport {
  /** Screen-space x offset of the world origin, in px. */
  x: number
  /** Screen-space y offset of the world origin, in px. */
  y: number
  /** Zoom factor (1 = 100%). */
  scale: number
}

export const MIN_SCALE = 0.1
export const MAX_SCALE = 4
const ZOOM_SENSITIVITY = 0.02

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/**
 * A CSS-style `cubic-bezier(x1, y1, x2, y2)` timing function, returned as an
 * easing `(t) => eased`. Endpoints P0=(0,0) and P3=(1,1) are fixed; for a given
 * progress `t` we solve x(s)=t with a few Newton steps and return y(s).
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (s: number) => ((ax * s + bx) * s + cx) * s
  const sampleY = (s: number) => ((ay * s + by) * s + cy) * s
  const slopeX = (s: number) => (3 * ax * s + 2 * bx) * s + cx
  return (t: number) => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let s = t
    for (let i = 0; i < 5; i++) {
      const dx = sampleX(s) - t
      if (Math.abs(dx) < 1e-4) break
      const d = slopeX(s)
      if (Math.abs(d) < 1e-6) break
      s -= dx / d
    }
    return sampleY(clamp(s, 0, 1))
  }
}

/** Options for {@link ViewportController.animateTo}. */
export interface AnimateOpts {
  /** Duration in ms (default 450). */
  duration?: number
  /** Easing `(t) => eased`, both in [0,1] (default easeOutCubic). */
  easing?: (t: number) => number
}

/** Convert a screen point (relative to the canvas element) into world coordinates. */
export function screenToWorld(viewport: Viewport, sx: number, sy: number) {
  return {
    x: (sx - viewport.x) / viewport.scale,
    y: (sy - viewport.y) / viewport.scale,
  }
}

export interface ViewportController {
  viewport: Viewport
  /** Attach to the interactive canvas root. */
  ref: RefObject<HTMLDivElement | null>
  panning: boolean
  handlers: {
    onPointerDown: (e: ReactPointerEvent) => void
  }
  reset: () => void
  zoomBy: (factor: number) => void
  /** Smoothly animate the viewport to a target pan/zoom (eased). */
  animateTo: (target: Partial<Viewport>, opts?: AnimateOpts) => void
}

/**
 * Drives an infinite, pannable/zoomable canvas.
 * - Trackpad two-finger scroll → pan
 * - Ctrl/Cmd + scroll or pinch → zoom toward the cursor
 * - Left/middle drag on the background → pan
 */
export function useViewport(initial?: Partial<Viewport>): ViewportController {
  const [viewport, setViewport] = useState<Viewport>({
    x: initial?.x ?? 0,
    y: initial?.y ?? 0,
    scale: initial?.scale ?? 1,
  })
  const [panning, setPanning] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const drag = useRef({ active: false, lastX: 0, lastY: 0 })
  // Cleanup for the in-flight drag's window listeners, if any.
  const stopDrag = useRef<(() => void) | null>(null)
  // Latest viewport + any running focus animation (rAF handle).
  const vpRef = useRef(viewport)
  vpRef.current = viewport
  const anim = useRef<number | null>(null)

  const cancelAnim = useCallback(() => {
    if (anim.current != null) {
      cancelAnimationFrame(anim.current)
      anim.current = null
    }
  }, [])

  const animateTo = useCallback(
    (target: Partial<Viewport>, opts?: AnimateOpts) => {
      cancelAnim()
      const from = vpRef.current
      const to = { ...from, ...target }
      const duration = opts?.duration ?? 450
      const ease = opts?.easing ?? easeOutCubic
      const start = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration)
        const k = ease(t)
        setViewport({
          x: from.x + (to.x - from.x) * k,
          y: from.y + (to.y - from.y) * k,
          scale: from.scale + (to.scale - from.scale) * k,
        })
        anim.current = t < 1 ? requestAnimationFrame(tick) : null
      }
      anim.current = requestAnimationFrame(tick)
    },
    [cancelAnim],
  )

  // Any direct interaction (drag, pan, zoom) cancels a running focus animation.
  useEffect(() => {
    window.addEventListener('pointerdown', cancelAnim, true)
    return () => window.removeEventListener('pointerdown', cancelAnim, true)
  }, [cancelAnim])

  /** Zoom by `factor`, keeping the world point under (cx, cy) fixed on screen. */
  const zoomAt = useCallback((cx: number, cy: number, factor: number) => {
    setViewport((v) => {
      const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE)
      if (scale === v.scale) return v
      const worldX = (cx - v.x) / v.scale
      const worldY = (cy - v.y) / v.scale
      return { scale, x: cx - worldX * scale, y: cy - worldY * scale }
    })
  }, [])

  // Native wheel listener so we can preventDefault (React's onWheel is passive).
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      cancelAnim()
      const rect = el.getBoundingClientRect()
      const cx = e.clientX - rect.left
      const cy = e.clientY - rect.top
      if (e.ctrlKey || e.metaKey) {
        zoomAt(cx, cy, Math.exp(-e.deltaY * ZOOM_SENSITIVITY))
      } else {
        setViewport((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [zoomAt, cancelAnim])

  // Drag-to-pan. Move/up are tracked on `window` rather than via pointer
  // capture so the very first drag after a zoom (or any re-render) is picked up
  // immediately — no stray click needed to "wake up" panning.
  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0 && e.button !== 1) return // primary or middle only
    stopDrag.current?.() // clear any leftover listeners from a prior drag
    drag.current = { active: true, lastX: e.clientX, lastY: e.clientY }
    setPanning(true)

    const onMove = (ev: PointerEvent) => {
      if (!drag.current.active) return
      const dx = ev.clientX - drag.current.lastX
      const dy = ev.clientY - drag.current.lastY
      drag.current.lastX = ev.clientX
      drag.current.lastY = ev.clientY
      setViewport((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
    }
    const end = () => {
      drag.current.active = false
      setPanning(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      stopDrag.current = null
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    stopDrag.current = end
  }, [])

  // Tear down a drag still in flight when the hook unmounts.
  useEffect(() => () => {
    stopDrag.current?.()
    cancelAnim()
  }, [cancelAnim])

  const reset = useCallback(() => setViewport({ x: 0, y: 0, scale: 1 }), [])

  const zoomBy = useCallback(
    (factor: number) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      zoomAt(rect.width / 2, rect.height / 2, factor)
    },
    [zoomAt],
  )

  return {
    viewport,
    ref,
    panning,
    handlers: {
      onPointerDown,
    },
    reset,
    zoomBy,
    animateTo,
  }
}
