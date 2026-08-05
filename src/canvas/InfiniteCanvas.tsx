import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { GridCanvas } from './GridCanvas'
import { useViewport, screenToWorld, MIN_SCALE, MAX_SCALE } from './useViewport'
import type { Viewport } from './useViewport'
import { CanvasContext, CanvasScaleContext } from './CanvasContext'
import type { CanvasApi } from './CanvasContext'
import { ZoomHud } from './ZoomHud'
import type { Box } from '../domain/types'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

interface InfiniteCanvasProps {
  /** Sections to mount on the canvas, positioned in world space via CanvasSection. */
  children?: ReactNode
  /** Set false to hide the zoom controls. */
  showControls?: boolean
  /** Starting pan/zoom, e.g. to centre the mounted composition on load. */
  initial?: Partial<Viewport>
  /**
   * A world-space rect to frame on mount, measured against this canvas's own size.
   *
   * Prefer this over `initial` for "open centred on X". Computing the camera in the
   * parent means measuring the window *before layout has settled*: if the parent
   * reads `innerHeight` as 0 on first paint, the derived scale clamps to MIN_SCALE
   * and — because `useViewport` freezes `initial` at mount — the camera stays
   * stranded at 10% zoom forever, with nothing thrown. Measuring here can't have
   * that failure mode.
   */
  initialFocus?: Box
  /**
   * World-space bounds of everything mounted here, so fit-to-content and the
   * zoom HUD can frame the whole composition.
   */
  contentBounds?: Box
  /**
   * Receives the camera API, so chrome rendered *outside* this component (the
   * keyboard shortcuts, the command palette) can drive it. The camera lives here
   * because the viewport state does; this is the seam rather than lifting all of
   * `useViewport` into the page.
   */
  controllerRef?: { current: CanvasApi | null }
  /**
   * Keep mounted but out of view.
   *
   * Switching to Screens used to unmount this entirely; coming back remounted it,
   * re-framed on the entry screen, and only then flew to whatever you'd picked — a
   * visible double jump on every return. Staying mounted preserves the camera, so
   * going Map → Screens → Map puts you exactly where you left off.
   */
  hidden?: boolean
}

const ZOOM_STEP = 1.6

/**
 * The base infinite x-y canvas of the atlas. A pure-black plane with a faint
 * cross grid, pannable and zoomable, onto which sections are mounted.
 *
 * ⚠️  `initial` is read at MOUNT ONLY (see `useViewport`), so a parent that loads
 * its content asynchronously must not mount this until the content is known —
 * otherwise the camera is stranded at the default and whatever it should have
 * framed is off-screen, with no error thrown. Gate on data-ready, and pass a
 * `key` that changes when the composition does.
 */
export function InfiniteCanvas({
  children,
  showControls = true,
  initial,
  initialFocus,
  contentBounds,
  controllerRef,
  hidden = false,
}: InfiniteCanvasProps) {
  const { viewport, ref, panning, handlers, zoomBy, zoomTo, animateTo, jumpTo } =
    useViewport(initial)

  // Live viewport for the ref-backed API readers below. Assigning during render is
  // safe here because it's only ever read from event handlers and effects.
  const vpRef = useRef(viewport)
  vpRef.current = viewport

  // Camera command: centre a world rect and scale it to 60% of the viewport height.
  const focusRect = useCallback(
    (rect: Box) => {
      const el = ref.current
      if (!el) return
      const vw = el.clientWidth
      const vh = el.clientHeight
      // A hidden or unlaid-out canvas measures 0, which would make the derived scale
      // Infinity and the offsets NaN — silently corrupting the viewport.
      if (vw === 0 || vh === 0) return
      const scale = clamp((vh * 0.6) / rect.h, MIN_SCALE, MAX_SCALE)
      const cx = rect.x + rect.w / 2
      const cy = rect.y + rect.h / 2
      animateTo({ x: vw / 2 - cx * scale, y: vh / 2 - cy * scale, scale })
    },
    [animateTo, ref],
  )

  /** Fit a rect fully inside the viewport — powers fit-to-content. */
  const fitRect = useCallback(
    (rect: Box, padding = 80) => {
      const el = ref.current
      if (!el || rect.w <= 0 || rect.h <= 0) return
      const vw = el.clientWidth
      const vh = el.clientHeight
      if (vw === 0 || vh === 0) return
      const scale = clamp(
        Math.min((vw - padding * 2) / rect.w, (vh - padding * 2) / rect.h),
        MIN_SCALE,
        MAX_SCALE,
      )
      const cx = rect.x + rect.w / 2
      const cy = rect.y + rect.h / 2
      animateTo({ x: vw / 2 - cx * scale, y: vh / 2 - cy * scale, scale })
    },
    [animateTo, ref],
  )

  /**
   * Frame `initialFocus` as soon as the element has a real size.
   *
   * A layout effect so the camera is right on the first painted frame, with no flash
   * of unframed canvas.
   *
   * The zero-size case is not hypothetical: the canvas can mount inside a container
   * that hasn't been laid out, or in a tab that is hidden or has not yet been sized,
   * in which case `clientHeight` is 0 and the derived scale would clamp to MIN_SCALE
   * and strand the camera at 10% zoom permanently — with nothing thrown.
   *
   * A ResizeObserver rather than an rAF retry loop, because rAF is throttled or
   * suspended outright in a background tab: the loop would simply never run again,
   * and the canvas would still be unframed when the tab was finally shown. The
   * observer fires on exactly the event we're waiting for.
   */
  const framedRef = useRef(false)
  useLayoutEffect(() => {
    if (!initialFocus || framedRef.current) return
    const el = ref.current
    if (!el) return

    const frame = (vw: number, vh: number) => {
      const scale = clamp((vh * 0.6) / initialFocus.h, MIN_SCALE, MAX_SCALE)
      const cx = initialFocus.x + initialFocus.w / 2
      const cy = initialFocus.y + initialFocus.h / 2
      jumpTo({ x: vw / 2 - cx * scale, y: vh / 2 - cy * scale, scale })
      framedRef.current = true
    }

    if (el.clientWidth > 0 && el.clientHeight > 0) {
      frame(el.clientWidth, el.clientHeight)
      return
    }

    const observer = new ResizeObserver(() => {
      const target = ref.current
      if (!target || framedRef.current) return
      if (target.clientWidth > 0 && target.clientHeight > 0) {
        frame(target.clientWidth, target.clientHeight)
        observer.disconnect()
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [initialFocus, jumpTo, ref])

  // `contentBounds` read through a ref so `fitContent` — and therefore the whole
  // API object — stays referentially stable as boards are dragged around.
  const boundsRef = useRef(contentBounds)
  boundsRef.current = contentBounds

  const fitContent = useCallback(() => {
    const bounds = boundsRef.current
    if (bounds) fitRect(bounds)
  }, [fitRect])

  // Stable across pan AND zoom: live values are read through the ref, so mounting
  // this context does not invalidate every child on each animation frame.
  const api = useMemo<CanvasApi>(
    () => ({
      getScale: () => vpRef.current.scale,
      getViewport: () => vpRef.current,
      screenToWorld: (sx, sy) => screenToWorld(vpRef.current, sx, sy),
      focusRect,
      fitRect,
      zoomBy,
      zoomTo,
      fitContent,
    }),
    [focusRect, fitRect, zoomBy, zoomTo, fitContent],
  )

  // Publish the camera to the page. Cleared on unmount so a stale camera from a
  // previous project can't be driven by a keystroke.
  useLayoutEffect(() => {
    if (!controllerRef) return
    controllerRef.current = api
    return () => {
      controllerRef.current = null
    }
  }, [api, controllerRef])

  return (
    <div
      ref={ref}
      className="atlas-canvas"
      data-panning={panning}
      // `visibility` + zero opacity rather than `display: none`: display:none would
      // collapse the element to 0×0, and the camera reads its size on every command.
      style={hidden ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
      aria-hidden={hidden || undefined}
      {...handlers}
    >
      <GridCanvas viewport={viewport} />
      <div
        className="atlas-canvas__world"
        style={
          {
            transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})`,
            // Published so descendants can counter-scale in pure CSS — board labels
            // use it to hold a near-constant on-screen size. Doing this with a
            // variable rather than React state means zooming re-renders nothing.
            '--canvas-scale': viewport.scale,
          } as CSSProperties
        }
      >
        <CanvasContext.Provider value={api}>
          <CanvasScaleContext.Provider value={viewport.scale}>
            {children}
          </CanvasScaleContext.Provider>
        </CanvasContext.Provider>
      </div>
      {showControls && (
        <ZoomHud
          scale={viewport.scale}
          onZoomIn={() => zoomBy(ZOOM_STEP)}
          onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
          onFit={contentBounds ? fitContent : undefined}
          // Reset *zoom*, holding position. `reset()` snapped the camera to world
          // origin 0,0 — which, from a plane centred on a screen at x:1583, threw you
          // into empty space. Clicking "68%" should mean "make that 100%".
          onReset={() => zoomTo(1)}
        />
      )}
    </div>
  )
}
