import { useEffect, useId, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

const COLS = 20
const ROWS = 13
/** Cascade spread. One phase, so this is the whole transition. */
const SPREAD = 340
const CELL_MS = 110

/**
 * Cascades `children` in *over* whatever is already on screen.
 *
 * This replaces a two-phase cover→swap→uncover wipe. That approach existed because of a
 * wrong assumption on my part: that you cannot give each cell its own slice of a live
 * DOM subtree, since `opacity` applies to whole elements. So the old version covered the
 * screen in blocks, swapped behind them, and uncovered — which meant passing through a
 * fully black frame and paying for two phases.
 *
 * You *can* mask a live subtree per-cell: an SVG `<mask>` of white rects, each fading in
 * on its own stagger, referenced by `mask: url(#id)`. Where a rect is white the content
 * shows; where it's black the content is cut out and whatever is beneath shows instead.
 * So the incoming view assembles block by block directly over the outgoing one — no
 * black frame, one phase, about half the duration.
 *
 * Masking an HTML subtree via an SVG reference isn't universally supported, so it's
 * feature-detected and falls back to a plain cross-fade rather than rendering a view
 * with no mask (which would be a hard cut).
 */
export function PixelCascade({
  children,
  cascadeKey,
  direction = 'in',
  onDone,
}: {
  children: ReactNode
  /** Change to replay. Falsy means render plainly. */
  cascadeKey: string | number
  /**
   * `in` assembles this view over whatever is beneath; `out` dissolves it away to
   * reveal what's beneath. Only ever applied to the grid, never to the fixed canvas —
   * masking a `position: fixed` subtree is unreliable, and this way one direction or
   * the other always covers the transition without needing to.
   */
  direction?: 'in' | 'out'
  onDone?: () => void
}) {
  const reduced = useReducedMotion()
  const rawId = useId()
  // useId embeds colons, which are invalid in a url(#…) fragment reference.
  const maskId = `cascade-${rawId.replace(/:/g, '')}`
  const [running, setRunning] = useState(false)

  const supportsMask = useMemo(
    () =>
      typeof CSS !== 'undefined' &&
      (CSS.supports('mask-image', 'url(#x)') || CSS.supports('-webkit-mask-image', 'url(#x)')),
    [],
  )

  useEffect(() => {
    if (!cascadeKey || reduced) return
    setRunning(true)
    const t = window.setTimeout(() => {
      setRunning(false)
      onDone?.()
    }, SPREAD + CELL_MS + 60)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cascadeKey, reduced])

  const cells = useMemo(() => {
    const oc = (COLS - 1) / 2
    const or = (ROWS - 1) / 2
    const maxD = Math.hypot(oc, or) || 1
    const out: { x: number; y: number; delay: number }[] = []
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        out.push({
          x: (c / COLS) * 100,
          y: (r / ROWS) * 100,
          delay: (Math.hypot(c - oc, r - or) / maxD) * SPREAD,
        })
      }
    }
    return out
  }, [])

  const active = running && !reduced

  return (
    <div
      className={`pixel-cascade${active && !supportsMask ? (direction === "out" ? " is-fading-out" : " is-fading") : ""}`}
      style={
        active && supportsMask
          ? ({
              maskImage: `url(#${maskId})`,
              WebkitMaskImage: `url(#${maskId})`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {active && supportsMask && (
        <svg className="pixel-cascade__defs" aria-hidden focusable="false">
          {/* objectBoundingBox so the mask scales to whatever it's applied to. */}
          <mask id={maskId} maskContentUnits="objectBoundingBox">
            {cells.map((c, i) => (
              <rect
                key={i}
                className={`pixel-cascade__cell${direction === "out" ? " is-out" : ""}`}
                // +0.001 overlap kills hairline seams between neighbouring rects.
                x={c.x / 100}
                y={c.y / 100}
                width={1 / COLS + 0.001}
                height={1 / ROWS + 0.001}
                fill="#fff"
                style={{ animationDelay: `${c.delay}ms`, animationDuration: `${CELL_MS}ms` }}
              />
            ))}
          </mask>
        </svg>
      )}
      {children}
    </div>
  )
}
