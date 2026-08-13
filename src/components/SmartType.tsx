import { useEffect, useState } from 'react'

/**
 * Smart Type text reveal.
 *
 * Characters appear one at a time, left-to-right, with a clean fade-in per
 * character (no scrambling). Spaces resolve instantly. The result is a minimal
 * typewriter that reads as "computed" rather than "decoded".
 *
 * Adapted from Framer ScrollText "Smart Type — effect 03".
 */
export function SmartType({
  text,
  delay = 0,
  speed = 35,
  className,
}: {
  text: string
  delay?: number
  speed?: number
  className?: string
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    let pos = 0
    const chars = text.split('')

    const tick = () => {
      if (cancelled || pos >= chars.length) return
      pos++
      while (pos < chars.length && chars[pos] === ' ') pos++
      setCount(pos)
      if (pos < chars.length) {
        timer = window.setTimeout(tick, speed)
      }
    }

    let timer = window.setTimeout(tick, delay)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [text, delay, speed])

  const visible = text.slice(0, count)

  return (
    <span className={className}>
      <span>{visible}</span>
      <span style={{ opacity: 0 }}>{text.slice(count)}</span>
    </span>
  )
}
