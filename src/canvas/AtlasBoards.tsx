import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { CanvasSection } from './CanvasSection'
import { useCanvas } from './CanvasContext'
import { cubicBezier } from './useViewport'
import { useUiScale } from './useUiScale'
import { Artboard } from '../components'
import { FlowStats } from '../molecules/FlowStats'
import { flowStats } from '../molecules/screenStats'

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
 * Connectors are drawn as SVG in a screen-space overlay (outside the composited
 * world layer, so they stay crisp at any zoom); the camera transform is
 * re-applied in SVG space so they pan, zoom and stretch with everything else.
 * Each arrow leaves and arrives perpendicular to
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
const CONNECTOR_HOVER_COLOR = '#F7306F'
const CONNECTOR_WIDTH = 1.75

// Opening sequence: the atlas loads framing the whole map (overview), then
// immediately flies into the entry screen (no hold).
export const INTRO_HOLD_MS = 0
export const INTRO_ZOOM_MS = 1000
// Ease-in-out biased toward a longer, gentler ease-out (Material-style standard
// curve) — accelerates in, then decelerates over a longer tail.
const INTRO_EASE = cubicBezier(0.4, 0, 0.15, 1)

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
    // Vertical: use top/bottom edges. The artboard's name label sits
    // LABEL_H+GAP above the frame, so a connector meeting the TOP of a board
    // anchors at the label top (not the frame top) — combined with the
    // GAP_FROM_BOARD push below it starts/ends 20px above the name text.
    const down = dy >= 0
    const LABEL_TOP_OFFSET = LABEL_H + GAP
    a = { x: sc.x, y: down ? s.y + s.h : s.y - LABEL_TOP_OFFSET }
    an = { x: 0, y: down ? 1 : -1 }
    b = { x: tc.x, y: down ? t.y - LABEL_TOP_OFFSET : t.y + t.h }
    bn = { x: 0, y: down ? -1 : 1 }
  }

  // Push both ends out along their normals so the connector begins/ends with a
  // 20px gap from the artboard rather than touching the frame edge.
  const GAP_FROM_BOARD = 20
  a = { x: a.x + an.x * GAP_FROM_BOARD, y: a.y + an.y * GAP_FROM_BOARD }
  b = { x: b.x + bn.x * GAP_FROM_BOARD, y: b.y + bn.y * GAP_FROM_BOARD }

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
  const { scale, viewport, linksLayer, focusRect } = useCanvas()
  // Responsive UI scale — connector stroke widths scale with the device the
  // same way the chrome does (see useUiScale).
  const uiScale = useUiScale()
  const [pos, setPos] = useState<Record<string, Vec>>(initialPos)
  const posRef = useRef(pos)
  posRef.current = pos

  // The connector currently under the cursor, plus the live cursor position (in
  // viewport px) — drives the Flow Stats tooltip that follows the pointer.
  const [hovered, setHovered] = useState<{ from: string; to: string; x: number; y: number } | null>(
    null,
  )

  const move = (id: string, next: Vec) => setPos((p) => ({ ...p, [id]: next }))

  // Whenever the focused screen changes — from a board tap OR a breadcrumb
  // click — fly the camera to it. On the very first run the canvas is framing
  // the whole-atlas overview, so instead of snapping we hold that shot for a
  // beat and then smoothly zoom into the entry screen.
  const focusRectRef = useRef(focusRect)
  focusRectRef.current = focusRect
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      const t = setTimeout(() => {
        focusRectRef.current(frameBox(posRef.current[focusedId]), {
          duration: INTRO_ZOOM_MS,
          easing: INTRO_EASE,
        })
      }, INTRO_HOLD_MS)
      return () => clearTimeout(t)
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
      {/* Connector layer — drawn into the screen-space overlay (outside the
          rasterised world) so the vectors stay crisp at any zoom. The world
          camera transform is re-applied here in SVG space, so paths built in
          world coordinates line up exactly with the boards. */}
      {linksLayer &&
        createPortal(
          <svg
            width="100%"
            height="100%"
            style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
          >
            <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
              {LINKS.map(({ from, to }) => (
                <Connector
                  key={`${from}->${to}`}
                  geom={connectorPath(frameBox(pos[from]), frameBox(pos[to]))}
                  uiScale={uiScale}
                  onClick={() => onFocus(to)}
                  onHover={(x, y) => setHovered({ from, to, x, y })}
                  onLeave={() => setHovered((h) => (h?.from === from && h?.to === to ? null : h))}
                />
              ))}
            </g>
          </svg>,
          linksLayer,
        )}

      {/* Flow Stats tooltip — pinned near the cursor while a connector is hovered,
          portalled to <body> so it floats above every chrome layer (side nav, top
          bar, breadcrumbs). */}
      {hovered && (
        <ConnectorTooltip from={hovered.from} to={hovered.to} x={hovered.x} y={hovered.y} />
      )}

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

type ConnectorProps = {
  geom: ReturnType<typeof connectorPath>
  /** responsive UI scale applied to the stroke width. */
  uiScale: number
  /** navigate to the screen this connector points at. */
  onClick: () => void
  /** report the cursor position (viewport px) while this connector is hovered. */
  onHover: (x: number, y: number) => void
  /** the cursor left this connector. */
  onLeave: () => void
}

/**
 * A single flow connector. Idle it's a faint white leader; on hover it lights up
 * noon-pink (#F7306F) at full opacity with a 3× stroke and turns into a clickable
 * link that flies the camera to the screen it connects to. A transparent wide
 * hit-path underneath makes the thin line easy to hover and click. While hovered
 * it also reports the cursor position so a Flow Stats tooltip can track it.
 */
function Connector({ geom, uiScale, onClick, onHover, onLeave }: ConnectorProps) {
  const { d, tail, tip, deg } = geom
  const [hover, setHover] = useState(false)
  const color = hover ? CONNECTOR_HOVER_COLOR : CONNECTOR_COLOR
  const width = (hover ? CONNECTOR_WIDTH * 2 : CONNECTOR_WIDTH) * uiScale

  return (
    <g
      onPointerEnter={(e) => {
        setHover(true)
        onHover(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => onHover(e.clientX, e.clientY)}
      onPointerLeave={() => {
        setHover(false)
        onLeave()
      }}
      onClick={onClick}
      style={{ pointerEvents: 'auto', cursor: 'pointer', opacity: hover ? 1 : undefined }}
    >
      {/* Wide, invisible hit area so the thin line is easy to hover/click. */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
      <path d={d} fill="none" stroke={color} strokeWidth={width} />
      {/* Start: a 6×6 circle on the source (hub) end. */}
      <circle cx={tail.x} cy={tail.y} r={3} fill={color} />
      {/* End: an arrowhead on the target end. */}
      <polygon
        points="0,-5 10,0 0,5"
        transform={`translate(${tip.x},${tip.y}) rotate(${deg})`}
        fill={color}
      />
    </g>
  )
}

const TOOLTIP_GAP = 10 // px gap kept between the cursor and the nearest card edge
const TOOLTIP_MARGIN = 8 // keep the card at least this far inside the safe area

/**
 * The chrome-free "safe area": the viewport minus the fixed chrome widgets (top
 * bar, side nav, right inspector, breadcrumbs) so the tooltip never overlaps
 * them. Each visible `.dashboard__widget` reserves space on whichever viewport
 * edge it hugs; hidden / slid-out widgets fall outside and reserve nothing.
 */
function safeAreaRect() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const m = TOOLTIP_MARGIN
  const safe = { left: m, top: m, right: vw - m, bottom: vh - m }

  const chrome = document.querySelector('.dashboard__chrome')
  if (!chrome) return safe

  chrome.querySelectorAll<HTMLElement>('.dashboard__widget').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return
    // Ignore anything already outside the viewport (e.g. a slid-out right nav).
    if (r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh) return
    // A tall widget is a vertical strip (side nav / right inspector) → reserve a
    // left/right inset; a wide widget is a horizontal strip (top bar / crumbs) →
    // reserve a top/bottom inset. Then pick the side it actually hugs.
    if (r.height >= r.width) {
      if (r.left <= vw - r.right) safe.left = Math.max(safe.left, r.right + m)
      else safe.right = Math.min(safe.right, r.left - m)
    } else {
      if (r.top <= vh - r.bottom) safe.top = Math.max(safe.top, r.bottom + m)
      else safe.bottom = Math.min(safe.bottom, r.top - m)
    }
  })

  return safe
}

type ConnectorTooltipProps = {
  from: string
  to: string
  /** cursor position in viewport px. */
  x: number
  y: number
}

/**
 * The Flow Stats card, pinned to the cursor with a {@link TOOLTIP_GAP}px gap
 * while a connector is hovered. Prefers the cursor's lower-right, flipping to the
 * opposite side when it would overflow, and clamped to stay on-screen. Rendered
 * into <body> at a very high z-index so no chrome layer (side nav, top bar,
 * breadcrumbs) can cover it.
 */
function ConnectorTooltip({ from, to, x, y }: ConnectorTooltipProps) {
  const ref = useRef<HTMLDivElement>(null)
  // The card is authored 1:1; scale it with the same responsive algorithm as
  // the rest of the chrome so it matches on any device.
  const uiScale = useUiScale()
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    if (ref.current) {
      // getBoundingClientRect already reflects the applied transform scale, so
      // the flip/clamp maths below work in real on-screen pixels.
      const r = ref.current.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
    }
  }, [from, to, uiScale])

  // Confine the card to the chrome-free safe area (no overlapping side bars,
  // top nav or breadcrumbs).
  const safe = safeAreaRect()
  // Prefer below-right of the cursor; flip to the other side if it won't fit.
  let left = x + TOOLTIP_GAP
  let top = y + TOOLTIP_GAP
  if (left + size.w > safe.right) left = x - TOOLTIP_GAP - size.w
  if (top + size.h > safe.bottom) top = y - TOOLTIP_GAP - size.h
  // Final clamp so it stays entirely within the safe area.
  left = Math.max(safe.left, Math.min(left, safe.right - size.w))
  top = Math.max(safe.top, Math.min(top, safe.bottom - size.h))

  const fromLabel = SCREEN_BY_ID.get(from)?.label ?? from
  const toLabel = SCREEN_BY_ID.get(to)?.label ?? to
  // Fixed component-library parameter labels; right-hand values randomised per
  // flow. The reels roll to fresh values as the hovered connector changes.
  const stats = flowStats(`${from}->${to}`)

  return createPortal(
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 9999,
        pointerEvents: 'none',
        transform: `scale(${uiScale})`,
        transformOrigin: 'top left',
      }}
    >
      <FlowStats
        eyebrow={`${fromLabel} to`}
        title={toLabel}
        primary={stats.primary}
        secondary={stats.secondary}
        animate
      />
    </div>,
    document.body,
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

/**
 * Overview camera: frame *every* board so the whole atlas is visible at once,
 * with a margin around it. This is the opening shot, before the intro flies
 * into the entry screen.
 */
export function atlasOverviewViewport(vw: number, vh: number): Vec & { scale: number } {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const b of SCREENS) {
    const fb = frameBox({ x: b.x, y: b.y })
    minX = Math.min(minX, b.x) // label starts at the board's x/y
    minY = Math.min(minY, b.y)
    maxX = Math.max(maxX, b.x + CARD_W)
    maxY = Math.max(maxY, fb.y + fb.h)
  }
  const w = maxX - minX
  const h = maxY - minY
  const FILL = 0.78 // fraction of the viewport the map fills — the rest is margin
  const scale = Math.min(4, Math.max(0.1, Math.min((vw * FILL) / w, (vh * FILL) / h)))
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return {
    x: vw / 2 - cx * scale,
    y: vh / 2 - cy * scale,
    scale,
  }
}
