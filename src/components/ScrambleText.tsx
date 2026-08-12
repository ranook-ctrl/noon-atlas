import { useEffect, useRef, useState } from 'react'

const CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Scramble-in text reveal.
 *
 * Each character starts as a random glyph and resolves to the real letter after
 * `maxIterations` scramble cycles. Characters resolve left-to-right with a stagger,
 * so the text assembles like a cipher decoding itself.
 *
 * Adapted from Framer ScrollText "Scramble In — effect 02".
 */
export function ScrambleText({
  text,
  delay = 0,
  scrambleSpeed = 30,
  maxIterations = 8,
  className,
}: {
  text: string
  delay?: number
  scrambleSpeed?: number
  maxIterations?: number
  className?: string
}) {
  const [displayed, setDisplayed] = useState('')
  const rafRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    const chars = text.split('')
    const resolved = new Array(chars.length).fill(false)
    const output = new Array(chars.length).fill('')
    let currentIndex = 0
    let iteration = 0

    const tick = () => {
      if (cancelled) return

      for (let i = 0; i < chars.length; i++) {
        if (resolved[i]) {
          output[i] = chars[i]
        } else if (i <= currentIndex) {
          output[i] = chars[i] === ' ' ? ' ' : CHARS[Math.floor(Math.random() * CHARS.length)]
        } else {
          output[i] = ''
        }
      }

      setDisplayed(output.join(''))

      iteration++
      if (iteration % maxIterations === 0 && currentIndex < chars.length) {
        resolved[currentIndex] = true
        currentIndex++
      }

      if (currentIndex < chars.length) {
        rafRef.current = window.setTimeout(tick, scrambleSpeed)
      } else {
        setDisplayed(text)
      }
    }

    const timeout = window.setTimeout(tick, delay)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      window.clearTimeout(rafRef.current)
    }
  }, [text, delay, scrambleSpeed, maxIterations])

  return <span className={className}>{displayed || ' '}</span>
}
