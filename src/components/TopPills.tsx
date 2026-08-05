import { RollingNumber } from './RollingNumber'

type TopPillsProps = {
  label?: string
  count?: string | number
  /** label font-axis class (default Line/ELSH 80; Top Nav uses Grid) */
  labelClassName?: string
  /** label color (default white/64%; Top Nav uses white/80%) */
  labelColor?: string
  /** slot-machine spin the count on mount (page-load animation) */
  spin?: boolean
  /** spin duration in ms */
  spinDuration?: number
}

/**
 * Figma: Top Pills (node 14:9105).
 * Row, gap 6. Label in Geist Pixel "Line" (ELSH 80) white/64%,
 * count in Regular white. 13px.
 */
export function TopPills({
  label = 'Screens',
  count = 48,
  labelClassName = 'pixel-line',
  labelColor = 'rgba(255, 255, 255, 0.64)',
  spin = false,
  spinDuration = 2200,
}: TopPillsProps) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span className={labelClassName} style={{ fontSize: 13, lineHeight: 'normal', color: labelColor }}>
        {label}
      </span>
      {spin ? (
        <RollingNumber
          value={String(count)}
          spin
          duration={spinDuration}
          className="pixel"
          style={{ fontSize: 13, color: '#FFFFFF' }}
        />
      ) : (
        <span className="pixel" style={{ fontSize: 13, lineHeight: 1, color: '#FFFFFF' }}>
          {count}
        </span>
      )}
    </div>
  )
}
