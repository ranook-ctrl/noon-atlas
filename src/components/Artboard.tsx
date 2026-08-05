import type { CSSProperties } from 'react'

type ArtboardProps = {
  /** Screenshot rendered inside the phone frame. */
  src: string
  /** Caption shown above the frame. */
  label: string
  /**
   * In-focus artboards get a pink highlight ring and a full-opacity image;
   * out-of-focus ones dim to 0.2 with a 50% label. (Figma 14:9227)
   */
  focused?: boolean
  /**
   * Pointer is over the card.
   *
   * Previously the primary object in the entire app had no hover feedback at all —
   * just `cursor: grab` — so nothing signalled a board was interactive until you'd
   * already grabbed it. Hover sits deliberately between the resting and focused
   * states: it lifts the image out of the 0.2 dim and adds a white hairline ring,
   * but leaves the pink ring exclusively to the focused board so "hovered" is never
   * mistaken for "selected".
   */
  hovered?: boolean
  /** Card width in world px — every other dimension scales from this. */
  width?: number
}

// Ratios captured 1:1 from Figma "Atlas Screen" (node 14:9227), base width 200.
const ASPECT = 433.33 / 200 // phone frame height ÷ width
const RADIUS = 13.333 / 200 // frame corner radius
const RING = 8.333 / 200 // in-focus highlight ring thickness
const GAP = 16 / 200 // label → frame gap
const LABEL = 16 / 200 // label font size
const FOCUS_PINK = 'rgba(247, 48, 111, 0.4)'
const HOVER_RING = 'rgba(255, 255, 255, 0.14)'

/**
 * A phone "artboard" that sits on the atlas canvas as a card: a labelled
 * screenshot in a rounded black frame. Built 1:1 from the Figma component set.
 */
export function Artboard({
  src,
  label,
  focused = false,
  hovered = false,
  width = 200,
}: ArtboardProps) {
  const ring = focused
    ? `0 0 0 ${width * RING}px ${FOCUS_PINK}`
    : hovered
      ? `0 0 0 ${Math.max(1, width * 0.005)}px ${HOVER_RING}`
      : 'none'

  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', gap: width * GAP }}>
      <span
        className="pixel atlas-board__label"
        style={
          {
            // Base (100%-zoom) size. The stylesheet grows this as you zoom out, via
            // the world layer's --canvas-scale, so labels stay readable instead of
            // shrinking into illegibility — which is what made a zoomed-out atlas a
            // field of anonymous grey rectangles.
            '--label-size': `${width * LABEL}px`,
            lineHeight: 1.2,
            textAlign: 'center',
            whiteSpace: 'nowrap',
            color: focused || hovered ? '#FFFFFF' : 'rgba(255, 255, 255, 0.62)',
          } as CSSProperties
        }
      >
        {label}
      </span>
      <div
        className="atlas-board__frame"
        style={{
          height: width * ASPECT,
          borderRadius: width * RADIUS,
          background: '#000000',
          overflow: 'hidden',
          boxShadow: ring,
        }}
      >
        <img
          src={src}
          alt={label}
          draggable={false}
          loading="lazy"
          decoding="async"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            // 0.3 at rest → 0.55 on hover → 1 when focused. Three legible steps.
            // Rest was 0.2, which made an unfocused board almost pure black and the
            // zoomed-out atlas an undifferentiated field of grey rectangles.
            opacity: focused ? 1 : hovered ? 0.55 : 0.3,
          }}
        />
      </div>
    </div>
  )
}
