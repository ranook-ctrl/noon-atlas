import { MaskIcon } from './MaskIcon'

type SidebarRowProps = {
  label: string
  /** highlighted (hover/selected) — white/4% fill + Regular label */
  selected?: boolean
  /** leading page icon */
  icon?: string
}

/**
 * Figma: Sidebar "Row" (node 41:54662 → EL-e1b8cfe5).
 * Row, height 40, padding 8, space-between. Left: 20×20 page icon + 8 gap +
 * 160px label (Geist Pixel Line 14, Regular 14 when selected). Right: 18×18
 * chevron. Selected rows get a white/4% background.
 */
export function SidebarRow({ label, selected = false, icon = '/icons/page.svg' }: SidebarRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        boxSizing: 'border-box',
        height: 40,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'space-between',
        background: selected ? 'rgba(255, 255, 255, 0.04)' : undefined,
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
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
          }}
        >
          {label}
        </span>
      </div>
      <MaskIcon src="/icons/chevron-right.svg" width={18} height={18} color="#FFFFFF" />
    </div>
  )
}
