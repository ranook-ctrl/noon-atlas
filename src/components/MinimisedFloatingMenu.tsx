import { MaskIcon } from './MaskIcon'

type MinimisedFloatingMenuProps = {
  label?: string
  /** click to expand — morphs into the Sidenav on the dashboard */
  onClick?: () => void
}

/**
 * Figma: Minimised Floating Menu (node 14:9220).
 * Row, padding 7×12, gap 8. Black 60% fill, 1px white/8% border,
 * backdrop-filter blur(20px), radius 6. Label + 16×16 panel icon.
 */
export function MinimisedFloatingMenu({
  label = 'noon Homepage',
  onClick,
}: MinimisedFloatingMenuProps) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 12px',
        background: 'rgba(0, 0, 0, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 6,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      <span
        className="pixel"
        style={{ fontSize: 14, lineHeight: 1, letterSpacing: '-0.01em', color: '#FFFFFF' }}
      >
        {label}
      </span>
      <span
        style={{
          display: 'inline-flex',
          width: 16,
          height: 16,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaskIcon src="/icons/menu-icon.svg" width={13} height={12} color="#F2F3F7" />
      </span>
    </div>
  )
}
