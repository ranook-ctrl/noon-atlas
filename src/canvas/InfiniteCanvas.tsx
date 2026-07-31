import { useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'
import { GridCanvas } from './GridCanvas'
import { useViewport, screenToWorld, MIN_SCALE, MAX_SCALE } from './useViewport'
import type { Viewport } from './useViewport'
import { CanvasContext } from './CanvasContext'
import type { CanvasApi } from './CanvasContext'
import { ZoomHud } from './ZoomHud'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

interface InfiniteCanvasProps {
  /** Sections to mount on the canvas, positioned in world space via CanvasSection. */
  children?: ReactNode
  /** Set false to hide the zoom controls. */
  showControls?: boolean
  /** Starting pan/zoom, e.g. to centre the mounted composition on load. */
  initial?: Partial<Viewport>
}

const ZOOM_STEP = 2.5

/**
 * The base infinite x-y canvas of the atlas. A pure-black plane with a faint
 * cross grid, pannable and zoomable, onto which sections are mounted.
 */
export function InfiniteCanvas({ children, showControls = true, initial }: InfiniteCanvasProps) {
  const { viewport, ref, panning, handlers, reset, zoomBy, animateTo } = useViewport(initial)

  // Camera command: centre a world rect and scale it to 60% of the viewport height.
  const focusRect = useCallback(
    (rect: { x: number; y: number; w: number; h: number }) => {
      const el = ref.current
      if (!el) return
      const vw = el.clientWidth
      const vh = el.clientHeight
      const scale = clamp((vh * 0.6) / rect.h, MIN_SCALE, MAX_SCALE)
      const cx = rect.x + rect.w / 2
      const cy = rect.y + rect.h / 2
      animateTo({ x: vw / 2 - cx * scale, y: vh / 2 - cy * scale, scale })
    },
    [animateTo, ref],
  )

  const api = useMemo<CanvasApi>(
    () => ({
      scale: viewport.scale,
      screenToWorld: (sx, sy) => screenToWorld(viewport, sx, sy),
      focusRect,
    }),
    [viewport, focusRect],
  )

  return (
    <div
      ref={ref}
      className="atlas-canvas"
      data-panning={panning}
      {...handlers}
    >
      <GridCanvas viewport={viewport} />
      <div
        className="atlas-canvas__world"
        style={{
          transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
        }}
      >
        <CanvasContext.Provider value={api}>{children}</CanvasContext.Provider>
      </div>
      {showControls && (
        <ZoomHud
          scale={viewport.scale}
          onZoomIn={() => zoomBy(ZOOM_STEP)}
          onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
          onReset={reset}
        />
      )}
    </div>
  )
}
