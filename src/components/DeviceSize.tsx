import { MaskIcon } from './MaskIcon'

type DeviceSizeProps = {
  device?: string
  dimensions?: string
  /** Figma designed width is 299; horizontal sizing is contextual */
  width?: number | string
  /**
   * Supply a handler to make this a real selector — the trailing chevron only
   * appears when there is actually a menu behind it.
   *
   * The design draws a chevron-down unconditionally, but every screen has exactly
   * one artboard size, so the menu would open with a single option. A control that
   * visibly promises a dropdown and then does nothing is worse than a plain label,
   * so the affordance is conditional on there being something to show.
   */
  onClick?: () => void
}

/**
 * Figma: Device Size (node 25:25261).
 * Row, padding 12, space-between, radius 8. White/4% fill, white/8% border.
 * Device name · dimensions · optional 16×16 chevron-down. Geist Pixel 14 / -0.01em.
 */
export function DeviceSize({
  device = 'Artboard',
  dimensions = '400 x 865',
  width = 299,
  onClick,
}: DeviceSizeProps) {
  const text = {
    fontSize: 14,
    lineHeight: 1,
    letterSpacing: '-0.01em',
    color: '#FFFFFF',
  } as const

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      style={{
        display: 'flex',
        width,
        boxSizing: 'border-box',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 8,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span className="pixel" style={text}>
        {device}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className="pixel" style={{ ...text, fontVariantNumeric: 'tabular-nums' }}>
          {dimensions}
        </span>
        {onClick && (
          <span
            style={{
              display: 'inline-flex',
              width: 16,
              height: 16,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaskIcon src="/icons/chevron-down.svg" width={8} height={5} color="#FFFFFF" />
          </span>
        )}
      </span>
    </div>
  )
}
