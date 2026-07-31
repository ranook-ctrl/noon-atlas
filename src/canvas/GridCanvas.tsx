import { useCallback, useEffect, useRef } from 'react'
import type { Viewport } from './useViewport'
import { drawGrid } from './crossGrid'

/**
 * A full-viewport <canvas> that paints the plus grid in screen space. The grid
 * is redrawn on every viewport change and on resize; plusses stay a constant
 * pixel size at all zoom levels.
 */
export function GridCanvas({ viewport }: { viewport: Viewport }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const vpRef = useRef(viewport)
  vpRef.current = viewport

  const draw = useCallback(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight

    // Resize the backing store only when it actually changed (it clears the
    // canvas), keeping the grid crisp on high-DPR displays.
    const bw = Math.round(w * dpr)
    const bh = Math.round(h * dpr)
    if (canvas.width !== bw) canvas.width = bw
    if (canvas.height !== bh) canvas.height = bh

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    drawGrid(ctx, vpRef.current, w, h)
  }, [])

  // Redraw whenever the viewport (pan/zoom) changes.
  useEffect(() => {
    draw()
  }, [viewport, draw])

  // Redraw on window resize.
  useEffect(() => {
    window.addEventListener('resize', draw)
    return () => window.removeEventListener('resize', draw)
  }, [draw])

  return <canvas ref={ref} className="atlas-canvas__grid" />
}
