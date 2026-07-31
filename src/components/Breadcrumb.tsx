import { MaskIcon } from './MaskIcon'

type BreadcrumbProps = {
  label: string
  /** "current" = active (full white); "past" = dimmed ancestor */
  state?: 'current' | 'past'
  /** show the leading chevron (Figma "Arrow" prop); false for the first crumb */
  arrow?: boolean
  /** when set, the crumb becomes tappable (navigates to that screen) */
  onClick?: () => void
}

/**
 * Figma: Breadcrumbs (node 14:9297) — variants Current / Past.
 * Row, gap 4, chevron in a 20×20 box + label. Geist Pixel 14 / -0.01em.
 */
export function Breadcrumb({ label, state = 'current', arrow = true, onClick }: BreadcrumbProps) {
  const isCurrent = state === 'current'
  const textColor = isCurrent ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'
  const chevronColor = isCurrent ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)'

  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      {arrow && (
        <span
          style={{
            display: 'inline-flex',
            width: 20,
            height: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaskIcon src="/icons/chevron-breadcrumb.svg" width={5} height={8} color={chevronColor} />
        </span>
      )}
      <span
        className="pixel"
        style={{ fontSize: 14, lineHeight: 1, letterSpacing: '-0.01em', color: textColor }}
      >
        {label}
      </span>
    </div>
  )
}
