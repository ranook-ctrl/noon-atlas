import { useEffect, useRef, useState } from 'react'
import type { BootStep } from '../state/useBootProgress'
import { useReducedMotion } from '../hooks/useReducedMotion'

/** Per-character reveal speed for the status lines, matching the reference's 24ms. */
const TYPE_MS = 24
/**
 * Exit fade/slide.
 *
 * The reference's 700ms on `cubic-bezier(.2,.8,.2,1)` front-loads almost all of the
 * movement, so against a full-screen slide it read as a snap. Longer, and on a curve
 * that stays slow at the end, so the overlay glides off rather than snatching away.
 */
const EXIT_MS = 1150
const EXIT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/** Types out `text` one character at a time; instant under reduced motion. */
function Typewriter({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState(reduced ? text.length : 0)

  useEffect(() => {
    if (reduced) {
      setShown(text.length)
      return
    }
    setShown(0)
    let i = 0
    let interval = 0
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        i += 1
        setShown(i)
        if (i >= text.length) window.clearInterval(interval)
      }, TYPE_MS)
    }, delay)
    return () => {
      window.clearTimeout(start)
      window.clearInterval(interval)
    }
  }, [text, delay, reduced])

  return <>{text.slice(0, shown)}</>
}

/**
 * The whole-page loader.
 *
 * Structure follows the LoadingOverlay reference — a three-area row of status lines,
 * a centred `( XX% )` counter, and a right-hand message, exiting by sliding up and
 * fading on `cubic-bezier(.2,.8,.2,1)` over 700ms.
 *
 * Everything else is this product's own language rather than the reference's: black
 * over the atlas cross-grid instead of flat purple, noon pink instead of lime, Geist
 * Pixel with tabular numerals so the counter doesn't jitter as it climbs.
 *
 * The percentage is driven by real startup milestones (see `useBootProgress`), not by
 * elapsed time against a fixed duration. So on a warm load it finishes immediately —
 * which is the honest outcome, and why there's a small minimum visible time to stop it
 * strobing rather than to pad it out.
 */
export function LoadingOverlay({
  progress,
  steps,
  activeLabel,
  finished,
}: {
  progress: number
  steps: BootStep[]
  activeLabel: string
  finished: boolean
}) {
  const reduced = useReducedMotion()
  const [dismissed, setDismissed] = useState(false)
  const [gone, setGone] = useState(false)
  const shownAt = useRef(performance.now())

  // Begin the exit shortly after the last milestone lands, mirroring the reference's
  // 120ms settle so the counter is legible at 100% before it leaves.
  useEffect(() => {
    if (!finished) return
    const t = window.setTimeout(() => setDismissed(true), 120)
    return () => window.clearTimeout(t)
  }, [finished])

  // Unmount only after the exit transition has actually run, so the overlay isn't
  // ripped out mid-animation.
  useEffect(() => {
    if (!dismissed) return
    const t = window.setTimeout(() => setGone(true), reduced ? 0 : EXIT_MS)
    return () => window.clearTimeout(t)
  }, [dismissed, reduced])

  if (gone) return null
  void shownAt

  return (
    <div
      className={`boot${dismissed ? ' is-dismissed' : ''}`}
      role="status"
      aria-busy={!finished}
      aria-hidden={dismissed}
      style={{
        transition: reduced
          ? 'none'
          : `opacity ${EXIT_MS}ms ${EXIT_EASE}, transform ${EXIT_MS}ms ${EXIT_EASE}`,
      }}
    >
      <div className="boot__grid">
        {/* Left: the startup log. */}
        <ul className="boot__steps">
          {steps.map((s, i) => (
            <li key={s.label} className="boot__step" data-done={s.done}>
              <span className="boot__tick" aria-hidden>
                {s.done ? '■' : '□'}
              </span>
              <span className="pixel-line boot__step-label">
                <Typewriter text={s.label} delay={i * 90} />
              </span>
            </li>
          ))}
        </ul>

        {/* Centre: the counter. */}
        <div className="boot__counter">
          <span className="pixel boot__percent">( {String(progress).padStart(2, '0')}% )</span>
        </div>

        {/* Right: what it's doing right now. */}
        <div className="boot__status">
          <span className="pixel-line boot__status-label">{activeLabel}</span>
        </div>
      </div>

      {/* A single hairline that tracks the counter — the only chrome that moves. */}
      <div className="boot__rule" aria-hidden>
        <span className="boot__rule-fill" style={{ transform: `scaleX(${progress / 100})` }} />
      </div>

      <span className="pixel-square boot__wordmark" aria-hidden>
        noon atlas
      </span>
    </div>
  )
}
