import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export type Segment = { label: string; selected?: boolean }

export type SegmentedTone = 'neutral' | 'accent'

type SegmentedControlProps = {
  segments: Segment[]
  width?: number | string
  height?: number
  /** `accent` gives a pink indicator; `neutral` a white/4% one. */
  tone?: SegmentedTone
  borderColor?: string
  fontSize?: number
  /** draw a 1px divider after these segment indices */
  dividerAfter?: number[]
  dividerColor?: string
  /** accessible label for the tablist */
  ariaLabel?: string
  /** tap a segment → its index (makes the segments interactive) */
  onSelect?: (index: number) => void
}

/**
 * The one selection control in the app.
 *
 * Selection is a single indicator element that *slides* between segments rather than a
 * background that switches on and off. Previously every segmented thing — the Map /
 * Screens switch, the inspector tabs, the sort control, Projects / Pods — repainted a
 * fill on a different child, so the selection teleported. Sliding one element gives the
 * change continuity and makes it obvious that these are positions on one track.
 *
 * The indicator is positioned from measured layout rather than `width / n`, because
 * segments are not always equal width (dividers, fixed-width first tabs), and a
 * computed fraction would drift out of alignment.
 */
export function SegmentedControl({
  segments,
  width = '100%',
  height = 36,
  tone = 'neutral',
  borderColor,
  fontSize = 13,
  dividerAfter = [],
  dividerColor = 'rgba(255, 255, 255, 0.08)',
  ariaLabel,
  onSelect,
}: SegmentedControlProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)
  /** First placement must not animate, or the indicator flies in from x=0 on mount. */
  const placed = useRef(false)

  const selectedIndex = Math.max(
    0,
    segments.findIndex((s) => s.selected),
  )

  /**
   * Measured with `offsetLeft` / `offsetWidth`, NOT `getBoundingClientRect`.
   *
   * This matters and it is not a matter of taste. The whole app chrome sits inside a
   * `transform: scale(--ui-scale)` wrapper, and `getBoundingClientRect` returns
   * *post-transform* pixels — whereas the `width` and `translateX` we set here are
   * interpreted in the element's own pre-transform space. Using the rect made the
   * indicator wrong by exactly the ui-scale factor at every scale but 1:1 (measured
   * 47.4px on a track where 79px was correct — a ratio of 0.6, the scale in play).
   * `offsetLeft` / `offsetWidth` are layout pixels and are unaffected by ancestor
   * transforms, which is precisely what's needed.
   *
   * `offsetLeft` is relative to the nearest positioned ancestor; the track is
   * `position: relative`, so that's the track.
   */
  const measure = useCallback(() => {
    const item = itemRefs.current[selectedIndex]
    if (!item) return
    setIndicator({ left: item.offsetLeft, width: item.offsetWidth })
  }, [selectedIndex])

  // Layout effect so the indicator is correct on the first painted frame.
  useLayoutEffect(() => {
    measure()
    // Two frames of grace before enabling the transition: one for this placement to
    // commit, one to be sure it painted.
    if (!placed.current) {
      const id = requestAnimationFrame(() => requestAnimationFrame(() => (placed.current = true)))
      return () => cancelAnimationFrame(id)
    }
  }, [measure, segments.length])

  // Re-measure when the control resizes — the chrome is uniformly scaled, and label
  // widths change with the font once it loads.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    for (const el of itemRefs.current) if (el) ro.observe(el)
    return () => ro.disconnect()
  }, [measure])

  return (
    <div
      ref={trackRef}
      className={`segmented segmented--${tone}`}
      role={onSelect ? 'tablist' : undefined}
      aria-label={ariaLabel}
      style={{
        width,
        height,
        ...(borderColor ? { borderColor } : null),
      }}
    >
      {/* The sliding selection. Rendered first so labels paint over it. */}
      {indicator && (
        <span
          className={`segmented__indicator${placed.current ? ' is-animated' : ''}`}
          aria-hidden
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
        />
      )}

      {segments.map((s, i) => (
        <Fragment key={s.label}>
          <button
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            type="button"
            role={onSelect ? 'tab' : undefined}
            aria-selected={onSelect ? !!s.selected : undefined}
            onClick={onSelect ? () => onSelect(i) : undefined}
            className="segmented__item"
            data-selected={!!s.selected}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
          >
            <span
              className={s.selected ? 'pixel' : 'pixel-line'}
              style={{ fontSize, lineHeight: '20px', whiteSpace: 'nowrap' }}
            >
              {s.label}
            </span>
          </button>
          {dividerAfter.includes(i) && i < segments.length - 1 && (
            <span
              className="segmented__divider"
              style={{ background: dividerColor }}
              aria-hidden
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}
