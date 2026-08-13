import { memo, useMemo } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import type { Flow, FlowId, Screen, ScreenId } from '../domain/types'
import { PORT_PAD, connectorPath, frameBox } from './boardGeometry'
import { useCanvasScale } from './CanvasContext'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * A train of pulses travelling the length of a connector, source → target.
 *
 * Replaces a marching `stroke-dasharray`. Dashes read as "this line is styled
 * differently", not as "traffic moves this way" — the motion was perpendicular to the
 * meaning. A discrete head with a decaying tail travels the actual path, so direction
 * and flow are the same signal.
 *
 * Built on SMIL `animateMotion` + `mpath` rather than CSS `offset-path`: it follows the
 * live path element by reference, so the pulse re-routes for free while a board is
 * being dragged, with no need to recompute an offset-path string every frame.
 *
 * The tail is separate circles on the same motion path with staggered negative
 * `begin` offsets, each smaller and fainter — cheaper and steadier than animating a
 * gradient, and it degrades to nothing if SMIL is unavailable.
 *
 * An earlier attempt drew all of this on the grid canvas instead, routed through the
 * mesh's vertices so the line bent with the deformed plane. It worked, and it looked
 * wrong: right-angle routes through a 24px lattice plus overlapping alpha turned the
 * graph into heavy white rope, and the smooth bezier that the pointer target still
 * followed no longer matched the ink. Reverted deliberately — the geometry here is
 * `connectorPath`'s bundled bezier, and it stays in SVG.
 */
const PULSE_DURATION = 1.9

/** Gradient ids for the two colours the flow ever takes. */
const FLOW_GRAD_WHITE = 'atlas-flow-white'
const FLOW_GRAD_PINK = 'atlas-flow-pink'

/**
 * The streak's half-length along the path and half-thickness across it, in screen px.
 *
 * Long and thin, and rotated to the path tangent, so it reads as a soft brightening of the
 * line itself rather than as an object travelling along it. That distinction is the whole
 * point of the change: hard-edged circles read as beads on a wire.
 */
const FLOW_LEN = 26
const FLOW_THICK = 3.2

/**
 * The soft gradients the streaks are filled with.
 *
 * Rendered once for the whole layer rather than per edge — 18 edges × 3 streaks sharing two
 * gradient definitions instead of defining 54. A radial gradient fading to fully
 * transparent is what removes the hard edge; an `<ellipse>` with a flat fill would just be
 * a bigger bead.
 */
function FlowGradients() {
  return (
    <defs>
      <radialGradient id={FLOW_GRAD_WHITE}>
        <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
        <stop offset="40%" stopColor="#ffffff" stopOpacity={0.4} />
        <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
      </radialGradient>
      <radialGradient id={FLOW_GRAD_PINK}>
        <stop offset="0%" stopColor={PINK} stopOpacity={1} />
        <stop offset="40%" stopColor={PINK} stopOpacity={0.5} />
        <stop offset="100%" stopColor={PINK} stopOpacity={0} />
      </radialGradient>
    </defs>
  )
}

/**
 * Roughly how far apart successive pulses should sit, in world units.
 *
 * The reference spaces its travelling energy at a fixed distance and lets the count fall
 * out of the path length, rather than putting a fixed number of pulses on every edge.
 * That matters: a fixed count makes a short edge look congested and a long one look
 * empty, so the spacing — not the count — is the thing to hold constant.
 */
const PULSE_SPACING = 620
const MAX_PULSES = 3

function ConnectorPulse({
  pathId,
  scale,
  pink,
  count,
  strength,
}: {
  pathId: string
  scale: number
  pink: boolean
  count: number
  /** Overall opacity — the selected edge glows fully, a merely-outbound one hints. */
  strength: number
}) {
  // Sized in screen pixels: a world-space streak would balloon when zoomed in and
  // vanish when zoomed out, which is the opposite of a constant "signal".
  const k = 1 / scale
  const grad = pink ? FLOW_GRAD_PINK : FLOW_GRAD_WHITE
  return (
    <g style={{ pointerEvents: 'none' }} opacity={strength}>
      {Array.from({ length: count }, (_, p) => (
        <ellipse key={p} rx={FLOW_LEN * k} ry={FLOW_THICK * k} fill={`url(#${grad})`}>
          {/* `rotate="auto"` turns the ellipse to the path tangent, so its long axis lies
              along the line — that's what makes it a streak of light on the wire instead of
              a blob crossing it. */}
          <animateMotion
            dur={`${PULSE_DURATION}s`}
            // Negative begin starts the animation already part-way through its cycle,
            // so streak p is p/count of the way along the path at t=0.
            begin={`${-(p * PULSE_DURATION) / count}s`}
            repeatCount="indefinite"
            rotate="auto"
            calcMode="spline"
            keyTimes="0;1"
            keySplines="0.42 0 0.58 1"
          >
            <mpath href={`#${pathId}`} />
          </animateMotion>
        </ellipse>
      ))}
    </g>
  )
}

/**
 * One socket: a hairline lead out of the frame edge terminating in a small square pad.
 *
 * `active` fills the pad solid rather than adding a glow. A crisp filled/hollow binary
 * survives at any zoom and never looks like a rendering artefact, which is exactly what
 * the soft halo it replaces did look like.
 */
function Socket({
  port,
  stroke,
  active,
}: {
  port: { edge: { x: number; y: number }; pad: { x: number; y: number }; n: { x: number; y: number } }
  stroke: string
  active: boolean
}) {
  // The pad is centred one pad-width beyond the lead end, so the lead meets its face.
  const cx = port.pad.x + port.n.x * PORT_PAD
  const cy = port.pad.y + port.n.y * PORT_PAD
  return (
    <g className="atlas-edge__socket">
      <line
        x1={port.edge.x}
        y1={port.edge.y}
        x2={port.pad.x}
        y2={port.pad.y}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <rect
        x={cx - PORT_PAD}
        y={cy - PORT_PAD}
        width={PORT_PAD * 2}
        height={PORT_PAD * 2}
        fill={active ? stroke : '#0A0A0C'}
        stroke={stroke}
        strokeWidth={1.4}
      />
    </g>
  )
}

/**
 * The flow layer.
 *
 * Split out of `AtlasBoards` because it needs to re-render on zoom (hit areas and
 * labels are sized in screen pixels, so they must be divided by scale) while the 17
 * memoised artboards must not. Keeping them in one component would have meant every
 * zoom tick re-rendering every board and every bezier.
 *
 * Three things are encoded on each connector, all of them previously absent — every
 * edge was an identical flat 1.75px line at 35% white regardless of traffic, focus
 * or health:
 *
 *  · Width   → volume. A thick pipe carries more users than a thin one.
 *  · Tint    → drop-off, but only past one threshold. Healthy edges stay neutral
 *              white; leaking ones take noon-pink. Pink is already this system's
 *              "look here" colour (the section-hover uses it for exactly that), so
 *              attention is signalled without inventing a traffic-light palette that
 *              would fight the monochrome design.
 *  · Opacity → relevance. Edges touching the focused screen come forward; the rest
 *              fall back to 9%, so a local neighbourhood reads out of a dense graph.
 */

/** Per-edge numbers the canvas needs. Keyed by flow id. */
export type FlowWeight = { users: number; dropOff: number }

const NEUTRAL = 'rgba(255, 255, 255, 0.32)'
const NEUTRAL_OUT = 'rgba(255, 255, 255, 0.62)'
const NEUTRAL_IN = 'rgba(255, 255, 255, 0.42)'
const DIMMED = 'rgba(255, 255, 255, 0.09)'
const PINK = '#F7306F'
/** Bad-but-not-selected. Held below full pink so selection stays the loudest thing. */
const PINK_BAD = 'rgba(247, 48, 111, 0.7)'
const PINK_BAD_DIM = 'rgba(247, 48, 111, 0.3)'

/**
 * Only genuinely bad drop-off earns the accent.
 *
 * An earlier version also tinted a "warn" band from 34%, which — given the spread of
 * the data — put more than half the edges in pink. Attention that's on the majority
 * of the graph isn't attention. One threshold, applied sparingly, and everything else
 * stays neutral white.
 */
const DROPOFF_BAD = 55

/**
 * Stroke width in **screen** px, from 1.1 for the quietest edge up to 3.4 for the busiest.
 *
 * Previously these were world units (1.75–5), which meant the stroke scaled with the zoom
 * and at fit-all rendered about a quarter of a pixel wide — the whole graph faded to
 * hairlines in exactly the view where you most need to read its structure. The repo strokes
 * a flat 2px regardless of zoom, and that's the trait being taken here. Volume is still
 * encoded on the same square-root ramp; only the unit changed. Divided by the live scale
 * at render, since the SVG itself is in world coordinates.
 */
const MIN_W = 1.1
const MAX_W = 3.4

type EdgeState = 'normal' | 'related-out' | 'related-in' | 'selected' | 'dimmed'

/**
 * Colour carries two independent things, so they must not collide:
 *  · pink at 0.7  → this edge leaks users
 *  · pink at 1.0  → this is the edge you selected
 * The selected edge additionally marches (see `is-marching`), which is unique to it,
 * so "bad" and "selected" are never confusable even at a glance.
 */
function edgeStroke(state: EdgeState, dropOff: number | undefined): string {
  if (state === 'selected') return PINK
  const bad = dropOff != null && dropOff >= DROPOFF_BAD
  switch (state) {
    case 'dimmed':
      // Still hint at a leak on a de-emphasised edge, faintly, so scanning the
      // whole graph for problems doesn't require focusing every screen in turn.
      return bad ? PINK_BAD_DIM : DIMMED
    case 'related-out':
      return bad ? PINK_BAD : NEUTRAL_OUT
    case 'related-in':
      return bad ? PINK_BAD : NEUTRAL_IN
    default:
      return bad ? PINK_BAD : NEUTRAL
  }
}

type AtlasConnectorsProps = {
  flows: Flow[]
  screenById: Map<ScreenId, Screen>
  focusedId: ScreenId
  selectedFlowId: FlowId | null
  hoveredFlowId: FlowId | null
  /** Per-flow metrics; absent while they load, in which case edges stay neutral. */
  weights?: Map<FlowId, FlowWeight>
  /** When set, edges with an endpoint outside this set fall back hard. */
  isolatedIds?: ReadonlySet<ScreenId> | null
  onSelectFlow: (id: FlowId | null) => void
  onHoverFlow: (id: FlowId | null, at?: { x: number; y: number }) => void
}

export const AtlasConnectors = memo(function AtlasConnectors({
  flows,
  screenById,
  focusedId,
  selectedFlowId,
  hoveredFlowId,
  weights,
  isolatedIds = null,
  onSelectFlow,
  onHoverFlow,
}: AtlasConnectorsProps) {
  const scale = useCanvasScale()
  const reducedMotion = useReducedMotion()

  // Busiest edge sets the top of the width ramp, so the encoding stays readable
  // whatever the absolute numbers happen to be.
  const maxUsers = useMemo(() => {
    let max = 0
    if (weights) for (const w of weights.values()) max = Math.max(max, w.users)
    return max
  }, [weights])

  /** The hit area is a constant size on screen, so it divides out the zoom. */
  const hitWidth = 14 / scale

  const edges = useMemo(
    () =>
      flows.flatMap((flow) => {
        const from = screenById.get(flow.from)
        const to = screenById.get(flow.to)
        // A dangling flow (its screen was deleted) is skipped, not fatal.
        if (!from || !to) return []

        // One socket per frame direction — no per-flow slot. Co-directional flows share
        // the same socket and trunk, which is what draws them as a bundle.
        const geo = connectorPath(frameBox(from.position), frameBox(to.position))
        const weight = weights?.get(flow.id)

        const isOut = flow.from === focusedId
        const isIn = flow.to === focusedId
        const anyFocus = !!focusedId
        if (isolatedIds && (!isolatedIds.has(flow.from) || !isolatedIds.has(flow.to))) {
          return []
        }
        const state: EdgeState = selectedFlowId === flow.id
            ? 'selected'
            : isOut
              ? 'related-out'
              : isIn
                ? 'related-in'
                : anyFocus
                ? 'dimmed'
                : 'normal'

        // Kept as a ratio rather than a width: the width depends on the live zoom, and
        // folding that in here would recompute all 18 edges on every wheel tick.
        const ramp = maxUsers > 0 && weight ? Math.sqrt(weight.users / maxUsers) : 0

        // Chord between the two sockets, as a stand-in for arc length. Measuring the real
        // length would mean a ref per path and a `getTotalLength()` call after layout;
        // the chord is within ~15% on these curves, and it only decides how many pulses
        // to draw, so the extra precision would buy nothing visible.
        const span = Math.hypot(
          geo.portTo.pad.x - geo.portFrom.pad.x,
          geo.portTo.pad.y - geo.portFrom.pad.y,
        )
        const pulses = Math.max(1, Math.min(MAX_PULSES, Math.round(span / PULSE_SPACING)))

        return [{ flow, from, to, geo, weight, state, ramp, pulses }]
      }),
    [flows, screenById, focusedId, selectedFlowId, weights, maxUsers, isolatedIds],
  )

  return (
    <svg
      className="atlas-connectors"
      width={1}
      height={1}
      // The layer itself must not swallow pointer events — boards sit under it and
      // dragging the empty plane has to keep panning. Only the fat hit-paths below
      // opt back in.
      style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}
    >
      <FlowGradients />

      {/* Painted first, so every edge sits behind every label. */}
      {edges.map(({ flow, geo, weight, state, ramp, pulses }) => {
        // Constant on screen, so an edge is as readable at 15% as at 100%.
        const width = (MIN_W + (MAX_W - MIN_W) * ramp) / scale
        const stroke = edgeStroke(state, weight?.dropOff)
        const active = state === 'selected' || hoveredFlowId === flow.id
        const selected = state === 'selected'
        // Energy runs on every edge *leaving* the focused screen, not only the selected
        // one: the picture stops being a diagram of lines and starts showing which way
        // traffic is going for the whole neighbourhood at once. Inbound edges stay still,
        // so "out of here" and "into here" are distinguishable without reading labels.
        const flowing = selected || state === 'related-out' || hoveredFlowId === flow.id
        const pathId = `edge-path-${flow.id}`
        return (
          <g key={flow.id} className="atlas-edge" data-state={state}>
            {/* Visible curve. Carries an id so the pulse can follow it by reference. */}
            <path
              id={pathId}
              d={geo.d}
              fill="none"
              stroke={stroke}
              strokeWidth={active ? width + 1 : width}
              className="atlas-edge__line"
            />
            {/* The travelling glow. Soft streaks lying along the tangent, so the line
                itself appears to brighten in waves rather than carrying beads. The selected
                edge glows in pink at full strength so it stays unmistakable even when a
                leaking edge is also pink; merely-outbound edges get a quiet white hint —
                enough to read as direction, faint enough that ten at once don't turn the
                canvas into a light show.
                Omitted entirely under reduced motion, because SMIL can't be switched off
                from CSS. */}
            {flowing && !reducedMotion && (
              <ConnectorPulse
                pathId={pathId}
                scale={scale}
                count={pulses}
                pink={selected}
                strength={selected ? 1 : 0.4}
              />
            )}
            {/* Socket: a lead off the frame edge into a square pad. Rectilinear to match
                the plus-grid and pixel type; entirely outside the frame so it never
                overlaps the board's own focus ring. */}
            <Socket port={geo.portFrom} stroke={stroke} active={active || state === 'related-out'} />
            <Socket port={geo.portTo} stroke={stroke} active={active || state === 'related-in'} />

            {/* Transparent fat stroke — the actual click/hover target. A 1.75px line
                is essentially unhittable, which is why edges were inert before. */}
            <path
              d={geo.d}
              fill="none"
              stroke="transparent"
              strokeWidth={hitWidth}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onPointerDown={(e: ReactPointerEvent) => {
                e.stopPropagation() // don't pan the canvas
                onSelectFlow(selectedFlowId === flow.id ? null : flow.id)
              }}
              onPointerEnter={(e: ReactPointerEvent) =>
                onHoverFlow(flow.id, { x: e.clientX, y: e.clientY })
              }
              // Tracked on move too, so the card follows along a long curve rather
              // than pinning to wherever the pointer happened to cross the edge.
              onPointerMove={(e: ReactPointerEvent) =>
                onHoverFlow(flow.id, { x: e.clientX, y: e.clientY })
              }
              onPointerLeave={() => onHoverFlow(null)}
            />
          </g>
        )
      })}

      {/* No labels on the connectors.

          A previous pass drew the flow's action here ("Cart tab", "Search bar"). Even
          restricted to the focused screen's edges that was ten labels at once, and the
          canvas is a picture of structure — ten captions over it obscured the thing they
          were annotating. The affordance is still recorded on `Flow.action`; the edge
          inspector is the place to surface it, where it costs no canvas. */}
    </svg>
  )
})

