import type { CSSProperties } from 'react'

type MaskIconProps = {
  /** Path to the SVG under /public */
  src: string
  width: number
  height: number
  /** Any CSS color; defaults to currentColor so it inherits `color` */
  color?: string
  style?: CSSProperties
}

/**
 * Renders a single-color SVG via CSS mask so it can be recolored to any exact
 * value (the source pixel-art SVGs from Figma ship with baked-in fills).
 * Rendered at its native size → 1:1 crisp, no scaling.
 */
export function MaskIcon({ src, width, height, color = 'currentColor', style }: MaskIconProps) {
  const url = `url(${src})`
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width,
        height,
        flex: '0 0 auto',
        backgroundColor: color,
        WebkitMaskImage: url,
        maskImage: url,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        ...style,
      }}
    />
  )
}
