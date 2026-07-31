import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { CanvasSection } from './CanvasSection'
import { useCanvas } from './CanvasContext'
import { Artboard } from '../components'

/**
 * The noon Atlas — every screen and flow laid out on the infinite plane, 1:1
 * with the Figma "Dummy flows" section (node 71:104076). Positions are the
 * Figma world coordinates; connectors are the named "<origin> to <destination>"
 * flows the design defines.
 *
 * Boards are draggable and tappable:
 *  · drag  → move a board anywhere; its connectors re-shape to follow.
 *  · tap   → that board becomes the focused variant and the camera pans/zooms
 *            so it sits centred at 60% of the viewport height.
 *
 * Connectors are drawn as SVG inside the world layer, so they pan, zoom and
 * stretch with everything else. Each arrow leaves and arrives perpendicular to
 * the middle of a board edge (left/right/top/bottom), curving between, with a
 * circle on the source end and an arrowhead on the destination end.
 */

const CARD_W = 200
const IMG = (id: string) => `/images/screens/${id}.png`

// Card metrics (from Figma 14:9227), used to place arrow anchors on the frame.
const LABEL_H = CARD_W * (16 / 200) * 1.2 // label line box ≈ 19.2
const GAP = CARD_W * (16 / 200) // 16
const FRAME_H = CARD_W * (433.33 / 200) // 433.33

type Vec = { x: number; y: number }
type Board = { id: string; label: string; x: number; y: number }

// The 17 screens, at their exact Figma positions within the flows section.
const SCREENS: Board[] = [
  { id: 'home', label: 'Homepage', x: 1583, y: 877 },
  { id: 'supermall', label: 'Supermall', x: 1327, y: 100 },
  { id: 'noon-food', label: 'noon Food', x: 1583, y: 100 },
  { id: 'noon-minutes', label: 'noon Minutes', x: 1839, y: 100 },
  { id: 'account', label: 'Account', x: 100, y: 1252 },
  { id: 'cart', label: 'Cart', x: 356, y: 1252 },
  { id: 'one-sale', label: 'one Sale', x: 612, y: 1252 },
  { id: 'categories', label: 'Categories', x: 2183, y: 877 },
  { id: 'electronics', label: 'Electronics', x: 2783, y: 877 },
  { id: 'tvs', label: 'TVs & accessories', x: 3415, y: 877 },
  { id: 'premium-tvs', label: 'Premium TVs', x: 4015, y: 877 },
  { id: 'huawei', label: 'Huawei Pura 90s', x: 183, y: 2244 },
  { id: 'mobiles', label: 'Mobiles', x: 812, y: 2244 },
  { id: 'search-page', label: 'Search Page', x: 1253, y: 2244 },
  { id: 'search-powerbank', label: 'Search : Powerbank', x: 1891, y: 2244 },
  { id: 'gift-cards', label: 'Gift cards', x: 2243, y: 2237.67 },
  { id: 'noon-gift-cards', label: 'noon Gift cards', x: 2855, y: 2238 },
]

// The flows ("<origin> to <destination>"), resolved to screen ids.
const LINKS: { from: string; to: string }[] = [
  { from: 'home', to: 'supermall' },
  { from: 'home', to: 'noon-food' },
  { from: 'home', to: 'noon-minutes' },
  { from: 'home', to: 'account' },
  { from: 'home', to: 'cart' },
  { from: 'home', to: 'one-sale' },
  { from: 'home', to: 'categories' },
  { from: 'home', to: 'mobiles' },
  { from: 'home', to: 'search-page' },
  { from: 'home', to: 'gift-cards' },
  { from: 'categories', to: 'electronics' },
  { from: 'electronics', to: 'tvs' },
  { from: 'tvs', to: 'premium-tvs' },
  { from: 'mobiles', to: 'huawei' },
  { from: 'search-page', to: 'search-powerbank' },
  { from: 'gift-cards', to: 'noon-gift-cards' },
  { from: 'one-sale', to: 'gift-cards' },
  { from: 'one-sale', to: 'mobiles' },
]

const CONNECTOR_COLOR = 'rgba(255, 255, 255, 0.35)'

export type AtlasScreen = { id: string; label: string; src: string }

/** The screens as consumed by the chrome (RightNav inspector, breadcrumbs). */
export const ATLAS_SCREENS: AtlasScreen[] = SCREENS.map((s) => ({
  id: s.id,
  label: s.label,
  src: IMG(s.id),
}))

/** The directed flows between screens — the canvas draws one arrow per link. */
export const ATLAS_LINKS = LINKS

const SCREEN_BY_ID = new Map(ATLAS_SCREENS.map((s) => [s.id, s]))

/**
 * The flow path from the root (where every flow starts — Homepage) to `id`,
 * following the directed connectors. Returns [source, …intermediaries, current].
 * Shortest path, so multi-parent screens resolve to their most direct route.
 */
export function flowPathTo(id: string): AtlasScreen[] {
  const ROOT = 'home'
  if (id === ROOT) return [SCREEN_BY_ID.get(ROOT)!]

  const adjacency = new Map<string, string[]>()
  for (const { from, to } of LINKS) {
    const list = adjacency.get(from) ?? []
    list.push(to)
    adjacency.set(from, list)
  }

  // BFS from the root, tracking each node's parent to rebuild the path.
  const parent = new Map<string, string>()
  const queue = [ROOT]
  const seen = new Set([ROOT])
  while (queue.length) {
    const node = queue.shift()!
    if (node === id) break
    for (const next of adjacency.get(node) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      parent.set(next, node)
      queue.push(next)
    }
  }

  const path: string[] = []
  for (let node: string | undefined = id; node; node = parent.get(node)) {
    path.unshift(node)
    if (node === ROOT) break
  }
  return path.map((n) => SCREEN_BY_ID.get(n)!).filter(Boolean)
}

type Box = { x: number; y: number; w: number; h: number }

/** The screenshot-frame box of a board in world coordinates (arrow anchor). */
function frameBox(p: Vec): Box {
  return { x: p.x, y: p.y + LABEL_H + GAP, w: CARD_W, h: FRAME_H }
}

/**
 * A connector between two frame boxes that leaves S and enters T perpendicular
 * to the middle of the facing edge, curving between with a cubic bezier.
 */
function connectorPath(s: Box, t: Box) {
  const sc = { x: s.x + s.w / 2, y: s.y + s.h / 2 }
  const tc = { x: t.x + t.w / 2, y: t.y + t.h / 2 }
  const dx = tc.x - sc.x
  const dy = tc.y - sc.y

  let a: Vec // start anchor (edge midpoint of S)
  let an: Vec // outward normal at S
  let b: Vec // end anchor (edge midpoint of T)
  let bn: Vec // outward normal at T
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal: use left/right edges.
    const right = dx >= 0
    a = { x: right ? s.x + s.w : s.x, y: sc.y }
    an = { x: right ? 1 : -1, y: 0 }
    b = { x: right ? t.x : t.x + t.w, y: tc.y }
    bn = { x: right ? -1 : 1, y: 0 }
  } else {
    // Vertical: use top/bottom edges.
    const down = dy >= 0
    a = { x: sc.x, y: down ? s.y + s.h : s.y }
    an = { x: 0, y: down ? 1 : -1 }
    b = { x: tc.x, y: down ? t.y : t.y + t.h }
    bn = { x: 0, y: down ? -1 : 1 }
  }

  const dist = Math.hypot(b.x - a.x, b.y - a.y)
  const h = Math.max(48, dist * 0.4) // handle length → how much it bends
  const c1 = { x: a.x + an.x * h, y: a.y + an.y * h }
  const c2 = { x: b.x + bn.x * h, y: b.y + bn.y * h }
  // Arrowhead points into T along -bn (perpendicular to the edge).
  const deg = (Math.atan2(-bn.y, -bn.x) * 180) / Math.PI
  return {
    d: `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`,
    tail: a, // start (source) anchor — gets a circle
    tip: b, // end (target) anchor — gets the arrowhead
    deg,
  }
}

/** The initial (Figma) position of every screen — the reset target. */
const initialPos = (): Record<string, Vec> =>
  Object.fromEntries(SCREENS.map((b) => [b.id, { x: b.x, y: b.y }]))

type AtlasBoardsProps = {
  /** id of the currently focused screen (controlled by the page). */
  focusedId: string
  /** called when a board is tapped — the page updates the focused screen. */
  onFocus: (id: string) => void
  /** bump to restore every board to its original position (reset control). */
  resetNonce?: number
}

export function AtlasBoards({ focusedId, onFocus, resetNonce = 0 }: AtlasBoardsProps) {
  const { scale, focusRect } = useCanvas()
  const [pos, setPos] = useState<Record<string, Vec>>(initialPos)
  const posRef = useRef(pos)
  posRef.current = pos

  const move = (id: string, next: Vec) => setPos((p) => ({ ...p, [id]: next }))

  // Whenever the focused screen changes — from a board tap OR a breadcrumb
  // click — fly the camera to it. Skip the first run: the initial viewport
  // already frames the entry screen.
  const focusRectRef = useRef(focusRect)
  focusRectRef.current = focusRect
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    focusRectRef.current(frameBox(posRef.current[focusedId]))
  }, [focusedId])

  // Reset control — restore every board to its original position and re-frame
  // the Homepage hub. Skip the first run (nothing to reset on mount).
  const firstReset = useRef(true)
  useEffect(() => {
    if (firstReset.current) {
      firstReset.current = false
      return
    }
    const fresh = initialPos()
    setPos(fresh)
    focusRectRef.current(frameBox(fresh.home))
  }, [resetNonce])

  return (
    <>
      {/* Connector layer — behind the cards, drawn in world space. */}
      <svg
        className="atlas-connectors"
        width={1}
        height={1}
        style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
      >
        {LINKS.map(({ from, to }) => {
          const { d, tail, tip, deg } = connectorPath(frameBox(pos[from]), frameBox(pos[to]))
          return (
            <g key={`${from}->${to}`}>
              <path d={d} fill="none" stroke={CONNECTOR_COLOR} strokeWidth={1.75} />
              {/* Start: a circle on the source (hub) end. */}
              <circle cx={tail.x} cy={tail.y} r={3.5} fill={CONNECTOR_COLOR} />
              {/* End: an arrowhead on the target end. */}
              <polygon
                points="0,-5 10,0 0,5"
                transform={`translate(${tip.x},${tip.y}) rotate(${deg})`}
                fill={CONNECTOR_COLOR}
              />
            </g>
          )
        })}
      </svg>

      {/* Screen artboards. */}
      {SCREENS.map((b) => (
        <DraggableBoard
          key={b.id}
          id={b.id}
          label={b.label}
          src={IMG(b.id)}
          pos={pos[b.id]}
          focused={focusedId === b.id}
          scale={scale}
          onMove={move}
          onTap={onFocus}
        />
      ))}
    </>
  )
}

type DraggableBoardProps = {
  id: string
  label: string
  src: string
  pos: Vec
  focused: boolean
  scale: number
  onMove: (id: string, next: Vec) => void
  onTap: (id: string) => void
}

/** A board that can be dragged around the plane, or tapped to focus it. */
function DraggableBoard({ id, label, src, pos, focused, scale, onMove, onTap }: DraggableBoardProps) {
  const drag = useRef<{ startX: number; startY: number; base: Vec; moved: boolean } | null>(null)

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation() // don't let the canvas pan
    drag.current = { startX: e.clientX, startY: e.clientY, base: pos, moved: false }

    const onPointerMove = (ev: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dxs = ev.clientX - d.startX
      const dys = ev.clientY - d.startY
      if (!d.moved && Math.hypot(dxs, dys) > 4) d.moved = true
      if (d.moved) onMove(id, { x: d.base.x + dxs / scale, y: d.base.y + dys / scale })
    }
    const end = () => {
      const d = drag.current
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      if (d && !d.moved) onTap(id) // a tap (no drag) focuses the board
      drag.current = null
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  return (
    <CanvasSection x={pos.x} y={pos.y} width={CARD_W}>
      <div onPointerDown={onPointerDown} style={{ cursor: 'grab', touchAction: 'none' }}>
        <Artboard src={src} label={label} focused={focused} width={CARD_W} />
      </div>
    </CanvasSection>
  )
}

/**
 * Initial camera: frame the Homepage hub centred at 60% of the viewport height
 * (the same framing a tap produces), so the atlas opens on its entry screen.
 */
export function atlasInitialViewport(vw: number, vh: number): Vec & { scale: number } {
  const home = SCREENS[0]
  const fb = frameBox(home)
  const scale = Math.min(4, Math.max(0.1, (vh * 0.6) / fb.h))
  return {
    x: vw / 2 - (fb.x + fb.w / 2) * scale,
    y: vh / 2 - (fb.y + fb.h / 2) * scale,
    scale,
  }
}
