import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Whether the user has asked for reduced motion.
 *
 * Most of the atlas honours this from CSS, which is the right place for it. This hook
 * exists for the cases CSS can't reach: SVG SMIL animation (`<animateMotion>`) is not
 * affected by media queries at all, so the connector pulse has to be *not rendered*
 * rather than merely not animated.
 *
 * Subscribes to changes so toggling the OS setting takes effect without a reload.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
