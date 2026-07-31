import { createContext, useContext } from 'react'

export interface CanvasApi {
  /** Current zoom factor — used to convert screen drag deltas to world units. */
  scale: number
  /** Screen point (relative to the canvas) → world coordinates. */
  screenToWorld: (sx: number, sy: number) => { x: number; y: number }
  /** Animate the camera so a world-space rect is centred at 60% viewport height. */
  focusRect: (rect: { x: number; y: number; w: number; h: number }) => void
}

export const CanvasContext = createContext<CanvasApi | null>(null)

/** Access the surrounding InfiniteCanvas — scale, coordinate mapping, camera. */
export function useCanvas(): CanvasApi {
  const ctx = useContext(CanvasContext)
  if (!ctx) throw new Error('useCanvas must be used inside <InfiniteCanvas>')
  return ctx
}
