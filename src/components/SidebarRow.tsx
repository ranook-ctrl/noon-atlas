import { MaskIcon } from './MaskIcon'
import { CornerBrackets } from './CornerBrackets'

type SidebarRowProps = {
  label: string
  /** highlighted (hover/selected) — white/4% fill + Regular label */
  selected?: boolean
  /** leading page icon */
  icon?: string
  /**
   * Tap the row. The design has always drawn a trailing chevron here, which
   * promises navigation — so without a handler this row is a control that lies.
   */
  onClick?: () => void
  /** Secondary label on the right, e.g. a screen count. */
  meta?: string
}

/**
 * Figma: Sidebar "Row" (node 41:54662 → EL-e1b8cfe5).
 * Row, height 40, padding 8, space-between. Left: 20×20 page icon + 8 gap +
 * 160px label (Geist Pixel Line 14, Regular 14 when selected). Right: 18×18
 * chevron. Selected rows get a white/4% background.
 */
export function SidebarRow({
  label,
  selected = false,
  icon = '/icons/page.svg',
  onClick,
  meta,
}: SidebarRowProps) {
  const interactive = !!onClick
  return (
    <div
      className={`sidebar-row${interactive ? ' is-interactive has-brackets' : ''}`}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-current={selected || undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick!()
              }
            }
          : undefined
      }
      style={{
        display: 'flex',
        width: '100%',
        boxSizing: 'border-box',
        height: 40,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'space-between',
        background: selected ? 'rgba(255, 255, 255, 0.04)' : undefined,
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      {interactive && <CornerBrackets />}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <MaskIcon src={icon} width={20} height={20} color="#FFFFFF" />
        <span
          className={selected ? 'pixel' : 'pixel-line'}
          style={{
            width: 160,
            fontSize: 14,
            lineHeight: 1,
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
        {meta && (
          <span
            className="pixel"
            style={{
              fontSize: 11,
              lineHeight: 1,
              color: 'rgba(255, 255, 255, 0.4)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {meta}
          </span>
        )}
        <MaskIcon src="/icons/chevron-right.svg" width={18} height={18} color="#FFFFFF" />
      </span>
    </div>
  )
}
