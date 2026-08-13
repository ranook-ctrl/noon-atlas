import { useEffect, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Braille cycle, straight from the ArcSpinner reference. It turned out not to be a
 * graphic at all — it's Unicode braille frames swapped in a monospace span, which is a
 * far better fit for a product typeset in a pixel monospace than any drawn arc would be.
 */
const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const INTERVAL = 80

/**
 * An inline loading indicator.
 *
 * Used sparingly and only where there is a genuine wait the user would otherwise
 * misread as emptiness — a metric that hasn't resolved, a project mid-switch. It is
 * deliberately not used for the initial load (that has the boot overlay) or for
 * anything that resolves in under a frame, because a spinner that flashes is worse
 * than no spinner.
 *
 * Under reduced motion it holds a single static frame rather than cycling.
 */
export function Spinner({
  label,
  size = 13,
}: {
  /** Screen-reader text. Also the visible caption when provided. */
  label?: string
  size?: number
}) {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)

  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => setI((n) => (n + 1) % FRAMES.length), INTERVAL)
    return () => window.clearInterval(id)
  }, [reduced])

  return (
    <span className="atlas-spinner" role="status">
      <span
        className="atlas-spinner__glyph"
        aria-hidden
        style={{ fontSize: size, lineHeight: `${Math.round(size * 1.3)}px` }}
      >
        {reduced ? FRAMES[0] : FRAMES[i]}
      </span>
      {label && <span className="pixel-line atlas-spinner__label">{label}</span>}
      <span className="atlas-visually-hidden">{label ?? 'Loading'}</span>
    </span>
  )
}
