import { RollingNumber } from './RollingNumber'

type FlowRowProps = {
  label: string
  value: string
  /** marker fill — Figma uses orange #FFA852 or green #26B57C */
  markerColor?: string
  /** stretch the row to fill its container width */
  fill?: boolean
  /** render the value as a slot-machine reel that rolls when it changes */
  animateValue?: boolean
}

/**
 * Figma: Flow - Row (node 129:104177).
 * Row, gap 24, centre-aligned. Left group (gap 12): an 8×8 sparkle marker and a
 * fixed 160px label in Geist Pixel "Line" (ELSH 80), white at 64%. The value
 * uses "Regular" (ELSH 0), full white. Both 14px. The fixed-width label keeps
 * every row's value aligned to the same x.
 */
export function FlowRow({
  label,
  value,
  markerColor = '#FFA852',
  fill = false,
  animateValue = false,
}: FlowRowProps) {
  return (
    <div
      style={{
        display: fill ? 'flex' : 'inline-flex',
        width: fill ? '100%' : undefined,
        alignItems: 'center',
        gap: 24,
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        <FlowMarker color={markerColor} />
        <span
          className="pixel-line"
          style={{ width: 160, fontSize: 14, lineHeight: 'normal', color: 'rgba(255, 255, 255, 0.64)' }}
        >
          {label}
        </span>
      </div>
      {animateValue ? (
        <RollingNumber value={value} className="pixel" style={{ fontSize: 14, color: '#FFFFFF' }} />
      ) : (
        <span className="pixel" style={{ fontSize: 14, lineHeight: 1, color: '#FFFFFF' }}>
          {value}
        </span>
      )}
    </div>
  )
}

/** The 8×8 four-point sparkle marker (Figma node 129:104171). */
function FlowMarker({ color }: { color: string }) {
  return (
    <svg width={8} height={8} viewBox="0 0 8 8" fill="none" style={{ flex: '0 0 auto' }} aria-hidden>
      <path d="M0 0L4 2L8 0L6 4L8 8L4 6L0 8L2 4L0 0Z" fill={color} />
    </svg>
  )
}
