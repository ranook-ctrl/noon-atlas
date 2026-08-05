import { createContext, useContext } from 'react'

import type { Box, Vec } from '../domain/types'

/**
 * The canvas API, deliberately shaped so this object is *referentially stable*
 * across pan and zoom.
 *
 * Why it matters: the previous version put `scale` on the context value and
 * memoised on the whole viewport, so every single pointermove frame produced a new
 * context value → `AtlasBoards` re-rendered → all 17 artboards and all 18 bezier
 * paths were recomputed, 60 times a second, while nothing about them had changed.
 * Nothing in the tree was memoised, so there was no backstop.
 *
 * The fix is that live values are read through functions backed by a ref rather
 * than passed as props. Consumers that genuinely need to re-render when the zoom
 * changes (level-of-detail rendering, for instance) can opt in via
 * `useCanvasScale()`; the drag maths just calls `getScale()` at the moment it
 * needs a number.
 */
export interface CanvasApi {
  /** Current zoom factor, read live. Does NOT trigger a re-render. */
  getScale: () => number
  /** Current viewport, read live. Does NOT trigger a re-render. */
  getViewport: () => Vec & { scale: number }
  /** Screen point (relative to the canvas) → world coordinates. */
  screenToWorld: (sx: number, sy: number) => Vec
  /** Animate the camera so a world-space rect is centred at 60% viewport height. */
  focusRect: (rect: Box) => void
  /** Animate the camera so a world-space rect fits inside the viewport. */
  fitRect: (rect: Box, padding?: number) => void
  /** Zoom about the viewport centre by a factor, eased. */
  zoomBy: (factor: number) => void
  /** Ease to an absolute zoom, holding the viewport centre. */
  zoomTo: (scale: number) => void
  /** Frame everything mounted on the plane. No-op when there's nothing to fit. */
  fitContent: () => void
}

export const CanvasContext = createContext<CanvasApi | null>(null)

/** The current zoom, as reactive state. Only subscribe if you must re-render. */
export const CanvasScaleContext = createContext<number>(1)

/** Access the surrounding InfiniteCanvas — coordinate mapping and camera commands. */
export function useCanvas(): CanvasApi {
  const ctx = useContext(CanvasContext)
  if (!ctx) throw new Error('useCanvas must be used inside <InfiniteCanvas>')
  return ctx
}

/** Subscribe to the zoom factor. Re-renders on zoom (but not on pan). */
export function useCanvasScale(): number {
  return useContext(CanvasScaleContext)
}
