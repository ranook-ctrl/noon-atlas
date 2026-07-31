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
  animateTo: (target: Partial<Viewport>, duration?: number) => void
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
    (target: Partial<Viewport>, duration = 450) => {
      cancelAnim()
      const from = vpRef.current
      const to = { ...from, ...target }
      const start = performance.now()
      const ease = (t: number) => 1 - Math.pow(1 - t, 3) // easeOutCubic
      const tick = (now: number) => {
        const k = ease(Math.min(1, (now - start) / duration))
        setViewport({
          x: from.x + (to.x - from.x) * k,
          y: from.y + (to.y - from.y) * k,
          scale: from.scale + (to.scale - from.scale) * k,
        })
        anim.current = k < 1 ? requestAnimationFrame(tick) : null
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
