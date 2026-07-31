import type { CSSProperties, ReactNode } from 'react'

interface CanvasSectionProps {
  /** World-space x position (px). */
  x: number
  /** World-space y position (px). */
  y: number
  width?: number
  height?: number
  className?: string
  children?: ReactNode
}

/**
 * Positions its children at a fixed point in world space. Anything mounted on
 * the atlas — future "sections" — wraps in this so it pans and zooms with the
 * canvas.
 *
 * The section deliberately does NOT swallow pointer events: you can grab and
 * pan the canvas by dragging anywhere, including over a section. Individual
 * interactive controls inside a section can call `stopPropagation` themselves
 * if they need to opt out of panning.
 */
export function CanvasSection({
  x,
  y,
  width,
  height,
  className,
  children,
}: CanvasSectionProps) {
  const style: CSSProperties = { left: x, top: y, width, height }
  return (
    <div className={`atlas-section${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  )
}
