import { MaskIcon } from './MaskIcon'

type DeviceSizeProps = {
  device?: string
  dimensions?: string
  /** Figma designed width is 299; horizontal sizing is contextual */
  width?: number | string
}

/**
 * Figma: Device Size (node 25:25261).
 * Row, padding 12, space-between, radius 8. White/4% fill, white/8% border.
 * Device name · dimensions · 16×16 chevron-down. Geist Pixel 14 / -0.01em.
 */
export function DeviceSize({
  device = 'iphone 13 Pro',
  dimensions = '375 x 812',
  width = 299,
}: DeviceSizeProps) {
  return (
    <div
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
      }}
    >
      <span
        className="pixel"
        style={{ fontSize: 14, lineHeight: 1, letterSpacing: '-0.01em', color: '#FFFFFF' }}
      >
        {device}
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          className="pixel"
          style={{ fontSize: 14, lineHeight: 1, letterSpacing: '-0.01em', color: '#FFFFFF' }}
        >
          {dimensions}
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
          <MaskIcon src="/icons/chevron-down.svg" width={8} height={5} color="#FFFFFF" />
        </span>
      </span>
    </div>
  )
}
