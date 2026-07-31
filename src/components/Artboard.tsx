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

/**
 * A phone "artboard" that sits on the atlas canvas as a card: a labelled
 * screenshot in a rounded black frame. Built 1:1 from the Figma component set.
 */
export function Artboard({ src, label, focused = false, width = 200 }: ArtboardProps) {
  return (
    <div style={{ width, display: 'flex', flexDirection: 'column', gap: width * GAP }}>
      <span
        className="pixel"
        style={{
          fontSize: width * LABEL,
          lineHeight: 1.2,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          color: focused ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)',
        }}
      >
        {label}
      </span>
      <div
        style={{
          height: width * ASPECT,
          borderRadius: width * RADIUS,
          background: '#000000',
          overflow: 'hidden',
          boxShadow: focused ? `0 0 0 ${width * RING}px ${FOCUS_PINK}` : 'none',
        }}
      >
        <img
          src={src}
          alt={label}
          draggable={false}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: focused ? 1 : 0.2,
          }}
        />
      </div>
    </div>
  )
}
