import { useEffect, useRef, useState } from 'react'
import type { BootStep } from '../state/useBootProgress'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { ScrambleText } from '../components/ScrambleText'
import { SmartType } from '../components/SmartType'

const EXIT_MS = 1150
const EXIT_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

/**
 * The whole-page loader.
 *
 * Three-area row: startup log on the left, massive counter in the centre,
 * active status on the right. The counter uses ScrambleText for the status
 * label (cipher-decode) and SmartType for the step labels (clean typewriter).
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

  useEffect(() => {
    if (!finished) return
    const t = window.setTimeout(() => setDismissed(true), 120)
    return () => window.clearTimeout(t)
  }, [finished])

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
                {reduced ? s.label : (
                  <SmartType text={s.label} delay={i * 90} speed={28} />
                )}
              </span>
            </li>
          ))}
        </ul>

        {/* Centre: the counter. */}
        <div className="boot__counter">
          <span className="pixel boot__percent">( {String(progress).padStart(2, '0')}% )</span>
        </div>

        {/* Right: what it's doing right now — scramble-in effect. */}
        <div className="boot__status">
          <ScrambleText
            key={activeLabel}
            text={activeLabel}
            className="pixel-line boot__status-label"
            scrambleSpeed={25}
            maxIterations={6}
          />
        </div>
      </div>

      <div className="boot__rule" aria-hidden>
        <span className="boot__rule-fill" style={{ transform: `scaleX(${progress / 100})` }} />
      </div>

      <span className="pixel-square boot__wordmark" aria-hidden>
        noon atlas
      </span>
    </div>
  )
}
