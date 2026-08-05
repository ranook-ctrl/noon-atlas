import { RollingNumber } from './RollingNumber'

type RowProps = {
  label: string
  value: string
  /** the leading 8×8 marker */
  prefix?: boolean
  /** marker fill (Figma uses orange #FFA852, green #26B57C, …) */
  markerColor?: string
  /** stretch to fill the container width (Stat's bar rows are fill-width) */
  fill?: boolean
  /** push the value to the right edge (Right Nav rows are space-between) */
  spread?: boolean
  /** render the value as a slot-machine reel that rolls on change */
  animateValue?: boolean
}

/**
 * Figma: Row (node 8:8370).
 * Row, gap 24. Left group (gap 12): 8×8 marker + 160px label.
 * Label uses Geist Pixel "Line" (ELSH 80); value uses Regular. 14px.
 */
export function Row({
  label,
  value,
  prefix = true,
  markerColor = '#FFA852',
  fill = false,
  spread = false,
  animateValue = false,
}: RowProps) {
  const stretch = fill || spread
  return (
    <div
      style={{
        display: stretch ? 'flex' : 'inline-flex',
        width: stretch ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: spread ? 'space-between' : undefined,
        gap: 24,
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
        {prefix && (
          <span style={{ width: 8, height: 8, background: markerColor, flex: '0 0 auto' }} />
        )}
        <span
          className="pixel-line"
          style={{
            width: 160,
            fontSize: 14,
            lineHeight: 'normal',
            color: 'rgba(255, 255, 255, 0.64)',
            display: 'inline-flex',
            alignItems: 'center',
          }}
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
