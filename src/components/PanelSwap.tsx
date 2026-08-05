import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

const OUT_MS = 190

/**
 * Swaps one panel for another by sliding the outgoing one out to the right and the
 * incoming one in from the right.
 *
 * Without this, clicking a connector while a screen was inspected made the screen panel
 * vanish and the flow panel appear in the same frame — a hard cut in the busiest corner
 * of the UI, which read as a glitch rather than a change of subject.
 *
 * The trick is that the *outgoing* content is retained while it animates away: React would
 * otherwise unmount it the instant `swapKey` changed, leaving nothing to animate. It reuses
 * the same rightward motion the panel already uses to appear, so the two read as a stack of
 * cards rather than two unrelated things.
 *
 * IMPORTANT — this used to hold the *current* panel in state too, refreshed by an effect
 * that deliberately excluded `children` from its deps (so typing wouldn't restart the
 * animation). The consequence was that any prop change which didn't also change `swapKey`
 * never reached the DOM: the panel was frozen at whatever it was rendered with when the key
 * last changed. That silently broke opening the rename editor, and would equally have
 * shown stale metrics for a screen whose numbers arrived after focus.
 *
 * Now only the outgoing snapshot lives in state, and it's used *only* during the out phase.
 * The live `children` render normally the rest of the time, so same-key updates are
 * immediate and the animation still has something to slide away.
 */
export function PanelSwap({
  swapKey,
  children,
}: {
  /** Identity of the current panel. A change triggers the swap. */
  swapKey: string
  children: ReactNode
}) {
  const reduced = useReducedMotion()
  /** The previous panel, held only while it slides out. */
  const [outgoing, setOutgoing] = useState<ReactNode | null>(null)
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle')

  /** Last rendered children/key, so a swap knows what to retain. */
  const prev = useRef<{ key: string; node: ReactNode }>({ key: swapKey, node: children })

  useEffect(() => {
    const previous = prev.current
    prev.current = { key: swapKey, node: children }
    if (previous.key === swapKey) return
    if (reduced) {
      setOutgoing(null)
      setPhase('idle')
      return
    }
    setOutgoing(previous.node)
    setPhase('out')
    const toIn = window.setTimeout(() => {
      setOutgoing(null)
      setPhase('in')
    }, OUT_MS)
    const toIdle = window.setTimeout(() => setPhase('idle'), OUT_MS + 260)
    return () => {
      window.clearTimeout(toIn)
      window.clearTimeout(toIdle)
    }
    // `children` is read but intentionally not a dependency: a re-render of the *same*
    // panel must not restart the animation. It no longer gates rendering, so excluding it
    // can't stale the output.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapKey, reduced])

  return (
    <div
      className={`panel-swap${phase === 'out' ? ' is-out' : phase === 'in' ? ' is-in' : ''}`}
      style={{ height: '100%' }}
    >
      {phase === 'out' && outgoing ? outgoing : children}
    </div>
  )
}
