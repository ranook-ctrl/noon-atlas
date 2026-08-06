import { memo, useMemo } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import type { Flow, Screen, ScreenId } from '../domain/types'
import { boardsBounds, frameBox } from './boardGeometry'

const W = 168
const H = 116
const PAD = 8

/**
 * Overview of the whole plane, with click-to-jump.
 *
 * Cheap because the layout is already in the store: seventeen rects and a viewport
 * frame, no screenshots. It's the answer to the plane's one real navigation problem —
 * once you've zoomed into a screen you have no idea what else is out there or which
 * direction it lies in.
 */
export const Minimap = memo(function Minimap({
  screens,
  flows,
  focusedId,
  viewport,
  onPan,
}: {
  screens: Screen[]
  flows: Flow[]
  focusedId: ScreenId | null
  /** Visible world rect, so the frame can be drawn. */
  viewport: { x: number; y: number; w: number; h: number } | null
  /** Centre the camera on a world point. `animate:false` while dragging the lens. */
  onPan: (world: { x: number; y: number }, opts?: { animate?: boolean }) => void
}) {
  const bounds = useMemo(
    () => boardsBounds(screens.map((s) => s.position)),
    [screens],
  )

  const project = useMemo(() => {
    if (!bounds) return null
    const scale = Math.min((W - PAD * 2) / bounds.w, (H - PAD * 2) / bounds.h)
    const ox = PAD + ((W - PAD * 2) - bounds.w * scale) / 2
    const oy = PAD + ((H - PAD * 2) - bounds.h * scale) / 2
    return {
      scale,
      toMap: (wx: number, wy: number) => ({
        x: ox + (wx - bounds.x) * scale,
        y: oy + (wy - bounds.y) * scale,
      }),
      toWorld: (mx: number, my: number) => ({
        x: bounds.x + (mx - ox) / scale,
        y: bounds.y + (my - oy) / scale,
      }),
    }
  }, [bounds])

  if (!bounds || !project) return null

  const byId = new Map(screens.map((s) => [s.id, s]))

  /**
   * Press-and-drag the lens. Pointer-down centres the camera there (a plain click reads
   * as a jump); holding and moving glides it continuously — the minimap becomes a
   * steering wheel rather than only a locator. `project.toWorld` is captured per-gesture
   * so it can't go stale mid-drag.
   */
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    const r = e.currentTarget.getBoundingClientRect()
    const toWorld = (cx: number, cy: number) => project.toWorld(cx - r.left, cy - r.top)
    onPan(toWorld(e.clientX, e.clientY), { animate: false })
    const move = (ev: PointerEvent) => onPan(toWorld(ev.clientX, ev.clientY), { animate: false })
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="minimap tool-surface">
      <svg
        width={W}
        height={H}
        className="minimap__svg"
        onPointerDown={onPointerDown}
      >
        {/* Connectors as straight lines — curvature is meaningless at this size. */}
        {flows.map((f) => {
          const a = byId.get(f.from)
          const b = byId.get(f.to)
          if (!a || !b) return null
          const fa = frameBox(a.position)
          const fb = frameBox(b.position)
          const p1 = project.toMap(fa.x + fa.w / 2, fa.y + fa.h / 2)
          const p2 = project.toMap(fb.x + fb.w / 2, fb.y + fb.h / 2)
          return (
            <line
              key={f.id}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              stroke="rgba(255,255,255,0.14)"
              strokeWidth={0.7}
            />
          )
        })}

        {screens.map((s) => {
          const fb = frameBox(s.position)
          const p = project.toMap(fb.x, fb.y)
          const focused = s.id === focusedId
          return (
            <rect
              key={s.id}
              x={p.x}
              y={p.y}
              width={Math.max(1.5, fb.w * project.scale)}
              height={Math.max(2, fb.h * project.scale)}
              rx={0.8}
              fill={focused ? '#F7306F' : 'rgba(255,255,255,0.34)'}
            />
          )
        })}

        {/* Where you're looking. */}
        {viewport && (
          <rect
            className="minimap__frame"
            x={project.toMap(viewport.x, viewport.y).x}
            y={project.toMap(viewport.x, viewport.y).y}
            width={Math.max(4, viewport.w * project.scale)}
            height={Math.max(4, viewport.h * project.scale)}
            fill="rgba(247,48,111,0.08)"
            stroke="rgba(247,48,111,0.7)"
            strokeWidth={1}
          />
        )}
      </svg>
    </div>
  )
})
