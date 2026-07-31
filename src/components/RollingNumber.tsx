import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
const SPIN_CYCLES = 5 // full 0–9 rotations before the reel lands on a mount spin

type RollingNumberProps = {
  value: string
  className?: string
  style?: CSSProperties
  /** slot-machine spin on mount (spins through several cycles, then lands) */
  spin?: boolean
  /** spin duration in ms (default 2200 ≈ 2–3s with the per-digit stagger) */
  duration?: number
}

/**
 * Renders a numeric string as a row of slot-machine reels. Non-digit characters
 * (commas, %, .) render statically.
 *  · default   — each digit reel rolls to the new digit when `value` changes.
 *  · spin=true — on mount, every reel spins through several 0–9 cycles before
 *                landing on its digit (a proper slot-machine load animation).
 */
export function RollingNumber({ value, className, style, spin = false, duration = 2200 }: RollingNumberProps) {
  let digitIndex = -1
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'flex-start', lineHeight: 1, ...style }}
    >
      {value.split('').map((ch, i) => {
        if (!/[0-9]/.test(ch)) {
          return (
            <span key={i} style={{ display: 'inline-block', height: '1em', lineHeight: '1em' }}>
              {ch}
            </span>
          )
        }
        digitIndex += 1
        return spin ? (
          <SpinDigit key={i} digit={Number(ch)} duration={duration} delay={digitIndex * 120} />
        ) : (
          <RollDigit key={i} digit={Number(ch)} />
        )
      })}
    </span>
  )
}

/** A 0–9 reel that eases to `digit` whenever it changes (roll-on-change). */
function RollDigit({ digit }: { digit: number }) {
  return (
    <span style={{ display: 'inline-block', height: '1em', overflow: 'hidden' }}>
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          transform: `translateY(-${digit}em)`,
          transition: 'transform 920ms cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform',
        }}
      >
        {DIGITS.map((d) => (
          <span key={d} style={{ height: '1em', lineHeight: '1em' }}>
            {d}
          </span>
        ))}
      </span>
    </span>
  )
}

/**
 * A reel that spins through SPIN_CYCLES rotations on mount, then rolls down and
 * lands on `digit`. The reel is [digit, …SPIN_CYCLES × 0–9]: it starts scrolled
 * to the bottom and animates back to the top, so the strip travels downward and
 * comes to rest exactly on the target digit at index 0.
 */
function SpinDigit({ digit, duration, delay }: { digit: number; duration: number; delay: number }) {
  const [go, setGo] = useState(false)
  useEffect(() => {
    // Let the initial (bottom) state paint, then flip to trigger the roll down.
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setGo(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [])

  const rows: number[] = [digit] // target sits at index 0 — the resting row
  for (let c = 0; c < SPIN_CYCLES; c++) rows.push(...DIGITS)
  const start = SPIN_CYCLES * 10 // start scrolled to the bottom filler row

  return (
    <span style={{ display: 'inline-block', height: '1em', overflow: 'hidden' }}>
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          transform: go ? 'translateY(0)' : `translateY(-${start}em)`,
          transition: go ? `transform ${duration}ms cubic-bezier(0.12, 0.72, 0.2, 1)` : 'none',
          transitionDelay: go ? `${delay}ms` : '0ms',
          willChange: 'transform',
        }}
      >
        {rows.map((d, idx) => (
          <span key={idx} style={{ height: '1em', lineHeight: '1em' }}>
            {d}
          </span>
        ))}
      </span>
    </span>
  )
}
