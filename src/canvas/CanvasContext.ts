import { createContext, useContext } from 'react'
import type { AnimateOpts, Viewport } from './useViewport'

export interface CanvasApi {
  /** Current zoom factor — used to convert screen drag deltas to world units. */
  scale: number
  /** Full camera transform (pan + zoom), for drawing world content in screen space. */
  viewport: Viewport
  /**
   * A screen-space overlay layer that sits OUTSIDE the composited (rasterised)
   * world layer. Vector content portalled here — e.g. SVG connectors — stays
   * crisp at any zoom instead of being bitmap-scaled with the world.
   */
  linksLayer: HTMLElement | null
  /** Screen point (relative to the canvas) → world coordinates. */
  screenToWorld: (sx: number, sy: number) => { x: number; y: number }
  /** Animate the camera so a world-space rect is centred at 60% viewport height. */
  focusRect: (rect: { x: number; y: number; w: number; h: number }, opts?: AnimateOpts) => void
}

export const CanvasContext = createContext<CanvasApi | null>(null)

/** Access the surrounding InfiniteCanvas — scale, coordinate mapping, camera. */
export function useCanvas(): CanvasApi {
  const ctx = useContext(CanvasContext)
  if (!ctx) throw new Error('useCanvas must be used inside <InfiniteCanvas>')
  return ctx
}
