import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { CanvasSection } from './CanvasSection'
import { useCanvas } from './CanvasContext'
import { Artboard } from '../components'
import { CARD_W, frameBox } from './boardGeometry'
import { GRID_UNIT } from './crossGrid'
import { AtlasConnectors } from './AtlasConnectors'
import type { FlowWeight } from './AtlasConnectors'
import type { Flow, FlowId, Screen, ScreenId, Vec } from '../domain/types'

/**
 * The noon Atlas — screens and flows laid out on the infinite plane.
 *
 * A pure view: the graph arrives as props from the data layer instead of being
 * hardcoded here, and board positions live in the atlas snapshot rather than local
 * state. What's left is rendering and gestures.
 *
 * Boards are draggable and tappable:
 *  · drag  → move a board anywhere; its connectors re-shape to follow.
 *  · tap   → that board becomes the focused variant and the camera pans/zooms
 *            so it sits centred at 60% of the viewport height.
 *
 * Connectors live in `AtlasConnectors`, which is split out because it re-renders on
 * zoom (screen-constant hit areas) while these memoised boards must not.
 */

type AtlasBoardsProps = {
  screens: Screen[]
  flows: Flow[]
  /** id of the currently focused screen (controlled by the page). */
  focusedId: ScreenId
  /** The entry screen — the camera target after a layout reset. */
  rootScreenId: ScreenId
  /**
   * A board was tapped. `additive` = Shift was held.
   *
   * Reports intent only — the page owns the selection rule and decides what happens to
   * `focusedId` and the camera. Replaced a pair of callbacks (`onFocus` on a plain tap,
   * plus a locally-merged selection change) that could disagree about what was selected.
   */
  onSelect: (id: ScreenId, additive: boolean) => void
  /** Double-click a board — selects it and asks the page to open its name for editing. */
  onRenameRequest?: (id: ScreenId) => void
  /**
   * Drag lifecycle, split deliberately. `onScreenDrag` fires on every pointermove
   * (~60/s) and must stay local; only `onScreenDragEnd` is allowed to persist.
   * The names are the guardrail: wiring a repository write to `onScreenDrag`
   * should read as obviously wrong to the next person.
   */
  onScreenDragStart?: (id: ScreenId) => void
  onScreenDrag: (id: ScreenId, position: Vec) => void
  onScreenDragEnd: (id: ScreenId, position: Vec) => void
  /** Bumped when positions changed externally (a reset) → re-frame the root. */
  layoutRev?: number
  /**
   * Bumped on every focus request, even one that re-selects the current screen.
   *
   * Without this, clicking the breadcrumb for the screen you're already on did
   * nothing at all: the camera effect keys on `focusedId`, and re-selecting the
   * same id doesn't change it, so the effect never re-ran. You could pan away and
   * then find the crumb for the current screen was the one crumb that couldn't
   * bring you back.
   */
  focusNonce?: number
  /**
   * Snap dragged boards to the grid the canvas already draws.
   *
   * `GRID_UNIT` has been exported from `crossGrid` and unused all along, so boards
   * could land a pixel off a line the user can literally see behind them.
   */
  snapToGrid?: boolean
  /** Screens to de-emphasise (focus isolation). Empty means show everything. */
  isolatedIds?: ReadonlySet<ScreenId> | null
  /**
   * When false, boards ignore pointer-down entirely so the drag falls through to the
   * canvas and pans it. This is what makes the Pan tool mean something — it was a lit
   * button with no effect, since dragging a board always moved it regardless.
   */
  boardsDraggable?: boolean
  /** Currently selected boards. Multi-select is additive with shift. */
  selectedIds?: ReadonlySet<ScreenId>
  onSelectionChange?: (ids: Set<ScreenId>) => void
  /** Move every selected board by one delta — a group drag. */
  onGroupDrag?: (delta: Vec) => void
  onGroupDragEnd?: () => void
  /** Per-flow metrics, for connector width and drop-off tint. */
  flowWeights?: Map<FlowId, FlowWeight>
  selectedFlowId?: FlowId | null
  onSelectFlow?: (id: FlowId | null) => void
  onHoverFlow?: (id: FlowId | null, at?: { x: number; y: number }) => void
}

export function AtlasBoards({
  screens,
  flows,
  focusedId,
  rootScreenId,
  onSelect,
  onRenameRequest,
  onScreenDragStart,
  onScreenDrag,
  onScreenDragEnd,
  layoutRev = 0,
  focusNonce = 0,
  snapToGrid = false,
  isolatedIds = null,
  boardsDraggable = true,
  selectedIds,
  onSelectionChange,
  onGroupDrag,
  onGroupDragEnd,
  flowWeights,
  selectedFlowId = null,
  onSelectFlow,
  onHoverFlow,
}: AtlasBoardsProps) {
  const { focusRect, screenToWorld } = useCanvas()
  const [hoveredFlowId, setHoveredFlowId] = useState<FlowId | null>(null)
  /** Live rubber-band rect in world coords while dragging on empty canvas. */
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // O(1) position lookup for the connector layer. A linear `.find` per flow would
  // be O(flows × screens) on every drag frame.
  const byId = useMemo(() => new Map(screens.map((s) => [s.id, s])), [screens])

  const focusRectRef = useRef(focusRect)
  focusRectRef.current = focusRect
  const byIdRef = useRef(byId)
  byIdRef.current = byId

  // Whenever the focused screen changes — from a board tap OR a breadcrumb click
  // — fly the camera to it. Skip the first run: the initial viewport already
  // frames the entry screen.
  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const screen = byIdRef.current.get(focusedId)
    // Guard: a focused id can outlive its screen once screens are deletable, and
    // `frameBox(undefined)` throws — which, with no error boundary above, used to
    // mean a white page.
    if (screen) focusRectRef.current(frameBox(screen.position))
  }, [focusedId, focusNonce])

  // Layout reset — re-frame the entry screen. Skip the first run (the initial
  // viewport already did this, and re-framing on mount double-animates).
  const firstLayout = useRef(true)
  useEffect(() => {
    if (firstLayout.current) {
      firstLayout.current = false
      return
    }
    const root = byIdRef.current.get(rootScreenId)
    if (root) focusRectRef.current(frameBox(root.position))
  }, [layoutRev, rootScreenId])

  /**
   * Rubber-band selection.
   *
   * Bound on the world layer rather than the canvas root so it only starts on empty
   * plane — a drag that begins on a board is that board's drag, and a marquee that
   * hijacked it would make boards unmovable.
   */
  const onMarqueeDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || !onSelectionChange) return
    // Only the world layer itself, never a descendant (i.e. never a board).
    if (e.target !== e.currentTarget) return
    const host = (e.currentTarget as HTMLElement).closest('.atlas-canvas') as HTMLElement | null
    if (!host) return
    const rect = host.getBoundingClientRect()
    const start = screenToWorld(e.clientX - rect.left, e.clientY - rect.top)
    const additive = e.shiftKey
    const base = additive && selectedIds ? new Set(selectedIds) : new Set<ScreenId>()
    let moved = false

    const move = (ev: PointerEvent) => {
      const p = screenToWorld(ev.clientX - rect.left, ev.clientY - rect.top)
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) * 1 > 3) moved = true
      if (!moved) return
      const box = {
        x: Math.min(start.x, p.x),
        y: Math.min(start.y, p.y),
        w: Math.abs(p.x - start.x),
        h: Math.abs(p.y - start.y),
      }
      setMarquee(box)
      const hit = new Set(base)
      for (const sc of screens) {
        const fb = frameBox(sc.position)
        // Intersection, not containment — grazing a board should catch it, which is
        // what people expect from a marquee.
        if (
          fb.x < box.x + box.w &&
          fb.x + fb.w > box.x &&
          fb.y < box.y + box.h &&
          fb.y + fb.h > box.y
        ) {
          hit.add(sc.id)
        }
      }
      onSelectionChange(hit)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      setMarquee(null)
      // A click on empty plane with no drag clears the selection.
      if (!moved && !additive) onSelectionChange(new Set())
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <>
      {/* Full-plane hit layer for the marquee. Sits behind everything and only reacts
          to pointer-downs that land on it directly. */}
      {onSelectionChange && (
        <div className="atlas-marquee-host" onPointerDown={onMarqueeDown} aria-hidden />
      )}

      {marquee && (
        <div
          className="atlas-marquee"
          aria-hidden
          style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
        />
      )}

      <AtlasConnectors
        flows={flows}
        screenById={byId}
        focusedId={focusedId}
        isolatedIds={isolatedIds}
        selectedFlowId={selectedFlowId}
        hoveredFlowId={hoveredFlowId}
        weights={flowWeights}
        onSelectFlow={onSelectFlow ?? (() => {})}
        onHoverFlow={(id, at) => {
          setHoveredFlowId(id)
          onHoverFlow?.(id, at)
        }}
      />

      {screens.map((screen) => (
        <DraggableBoard
          key={screen.id}
          id={screen.id}
          label={screen.label}
          src={screen.imageUrl}
          pos={screen.position}
          focused={focusedId === screen.id}
          dimmed={!!isolatedIds && !isolatedIds.has(screen.id)}
          snapToGrid={snapToGrid}
          draggable={boardsDraggable}
          selected={!!selectedIds?.has(screen.id)}
          groupSize={selectedIds?.size ?? 0}
          /*
           * Reports the *intent* — which board, and whether Shift was held — and lets the
           * parent apply the selection rule.
           *
           * It used to merge the next set here, from the `selectedIds` prop. That's a
           * stale read: two shift-clicks inside one frame both see the same pre-render
           * value, so the second overwrites the first and one board silently fails to be
           * added. Owning the rule in one place also lets `focusedId` follow the
           * selection, which is what makes the inspector describe something you've
           * actually got selected.
           */
          onSelect={onSelect}
          onRenameRequest={onRenameRequest}
          onGroupDrag={onGroupDrag}
          onGroupDragEnd={onGroupDragEnd}
          onDragStart={onScreenDragStart}
          onDrag={onScreenDrag}
          onDragEnd={onScreenDragEnd}
        />
      ))}
    </>
  )
}

type DraggableBoardProps = {
  id: ScreenId
  label: string
  src: string
  pos: Vec
  focused: boolean
  dimmed?: boolean
  snapToGrid?: boolean
  draggable?: boolean
  selected?: boolean
  /** How many boards are selected — a drag on a selected board moves them all. */
  groupSize?: number
  onSelect?: (id: ScreenId, additive: boolean) => void
  onRenameRequest?: (id: ScreenId) => void
  onGroupDrag?: (delta: Vec) => void
  onGroupDragEnd?: () => void
  onDragStart?: (id: ScreenId) => void
  onDrag: (id: ScreenId, next: Vec) => void
  onDragEnd: (id: ScreenId, position: Vec) => void
}

/**
 * A board that can be dragged around the plane, or tapped to focus it.
 *
 * Memoised, and reads the live zoom via `getScale()` rather than taking it as a
 * prop, so panning and zooming the canvas do not re-render 17 artboards.
 */
const DraggableBoard = memo(function DraggableBoard({
  id,
  label,
  src,
  pos,
  focused,
  dimmed = false,
  snapToGrid = false,
  draggable = true,
  selected = false,
  groupSize = 0,
  onSelect,
  onRenameRequest,
  onGroupDrag,
  onGroupDragEnd,
  onDragStart,
  onDrag,
  onDragEnd,
}: DraggableBoardProps) {
  const { getScale } = useCanvas()
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{
    startX: number
    startY: number
    base: Vec
    moved: boolean
    /** Where the board actually ended up. The gesture is the authority on this. */
    last: Vec
    /** Previous frame's position, so a group drag can send a delta. */
    prev: Vec
  } | null>(null)

  const isGroup = selected && groupSize > 1

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    // Pan tool: don't consume the event, so the canvas handles it as a pan. Deliberately
    // gives up tap-to-focus while panning, which is how every canvas tool behaves.
    if (!draggable) return
    e.stopPropagation() // don't let the canvas pan
    drag.current = { startX: e.clientX, startY: e.clientY, base: pos, moved: false, last: pos, prev: pos }

    const onPointerMove = (ev: PointerEvent) => {
      const d = drag.current
      if (!d) return
      const dxs = ev.clientX - d.startX
      const dys = ev.clientY - d.startY
      if (!d.moved && Math.hypot(dxs, dys) > 4) {
        d.moved = true
        setDragging(true)
        // Capture the pre-drag position exactly once, for rollback on write failure.
        onDragStart?.(id)
      }
      if (d.moved) {
        const scale = getScale()
        const raw = { x: d.base.x + dxs / scale, y: d.base.y + dys / scale }
        d.last = snapToGrid
          ? {
              x: Math.round(raw.x / GRID_UNIT) * GRID_UNIT,
              y: Math.round(raw.y / GRID_UNIT) * GRID_UNIT,
            }
          : raw
        // Dragging one of several selected boards moves the whole set by the same
        // delta, so relative arrangement is preserved.
        if (isGroup && onGroupDrag) {
          const delta = { x: d.last.x - d.prev.x, y: d.last.y - d.prev.y }
          d.prev = d.last
          onGroupDrag(delta)
        } else {
          onDrag(id, d.last)
        }
      }
    }
    const end = () => {
      const d = drag.current
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      setDragging(false)
      // Persist once, at the end of the gesture, with the position the gesture
      // computed — NOT one read back out of React state, which may not have
      // committed yet if pointerup shares a task with the last pointermove.
      if (d?.moved) {
        if (isGroup && onGroupDragEnd) onGroupDragEnd()
        else onDragEnd(id, d.last)
      } else if (d) {
        // One callback for both: Shift-click extends the selection, a plain tap
        // replaces it. The page decides what that means for focus and the camera.
        onSelect?.(id, e.shiftKey)
      }
      drag.current = null
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
  }

  return (
    <CanvasSection x={pos.x} y={pos.y} width={CARD_W}>
      <div
        className={`atlas-board${dragging ? ' is-dragging' : ''}${dimmed ? ' is-dimmed' : ''}${draggable ? '' : ' is-pan-mode'}${selected ? ' is-selected' : ''}`}
        onPointerDown={onPointerDown}
        /* Double-click renames. The editor itself lives in the 1:1 chrome panel, not on
           the board — see `ScreenTitle`. */
        onDoubleClick={
          onRenameRequest
            ? (e) => {
                e.stopPropagation()
                onRenameRequest(id)
              }
            : undefined
        }
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <Artboard src={src} label={label} focused={focused} hovered={hovered} width={CARD_W} />
      </div>
    </CanvasSection>
  )
})
