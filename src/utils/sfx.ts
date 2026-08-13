/**
 * The interaction sound layer.
 *
 * Ported from robot-components' `SoundEffects` / `PanelSoundEffects`, including the
 * two source samples (`hover3.mp3`, `hoverfx2.mp3`). Everything is one-shot
 * `AudioBufferSourceNode`s pitch-shifted via `playbackRate` and clipped to a few tens
 * of milliseconds by a gain envelope — which is the whole trick behind the sound of
 * that reference. Two samples plus pitch gives a family of related ticks rather than
 * one sample repeated, at no asset cost.
 *
 * Three deliberate constraints:
 *
 *  · **Nothing is fetched until the first real interaction.** Autoplay policy suspends
 *    a context created before a gesture, and a suspended context silently swallows
 *    every `start()` — which reads as "the sounds don't work" rather than "the browser
 *    blocked them". Init is bound to the first mousedown/keydown/pointerover.
 *
 *  · **`prefers-reduced-motion` mutes.** The OS-level "reduce" preference is the only
 *    standardised signal we get for "this person doesn't want incidental feedback", and
 *    someone who has asked for less motion has not asked for more noise.
 *
 *  · **Every failure is swallowed.** A missing file or a decode error must never take
 *    an interaction down with it; sound is garnish on a documentation tool.
 */

const HOVER = '/hover3.mp3'
const FX = '/hoverfx2.mp3'

type Sample = 'hover' | 'fx'

class Sfx {
  private ctx: AudioContext | null = null
  private buffers: Partial<Record<Sample, AudioBuffer>> = {}
  private started = false
  private muted = false

  constructor() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    // Mirror the OS reduce-motion preference, and keep tracking it — someone can flip
    // it mid-session and the app should go quiet without a reload.
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.muted = mq.matches
    mq.addEventListener('change', (e) => {
      this.muted = e.matches
    })

    const init = () => {
      if (this.started) return
      this.started = true
      try {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        this.ctx = new Ctor()
        void this.load('hover', HOVER)
        void this.load('fx', FX)
      } catch {
        /* no audio available; every play() below no-ops */
      }
    }

    document.addEventListener('pointerdown', init, { once: true })
    document.addEventListener('keydown', init, { once: true })
    document.addEventListener('pointerover', init, { once: true })
  }

  private async load(name: Sample, url: string) {
    try {
      const res = await fetch(url)
      const bytes = await res.arrayBuffer()
      if (this.ctx) this.buffers[name] = await this.ctx.decodeAudioData(bytes)
    } catch {
      /* leave the buffer undefined; plays become no-ops */
    }
  }

  /** Explicit mute, independent of the OS preference. */
  setMuted(muted: boolean) {
    this.muted = muted
  }

  get enabled() {
    return !this.muted
  }

  /**
   * One shot. `duration` is enforced with a gain envelope *and* a hard stop, because
   * these samples are longer than the tick we want out of them: cutting the gain alone
   * leaves the node running, and stopping alone produces an audible click at the cut.
   */
  private fire(sample: Sample, pitch: number, volume: number, duration: number) {
    const ctx = this.ctx
    const buffer = this.buffers[sample]
    if (this.muted || !ctx || !buffer) return

    // Safari and Chrome both park the context when the tab is backgrounded. Resuming
    // is only permitted from a user gesture, which is exactly where we're called from.
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})

    try {
      const now = ctx.currentTime
      const source = ctx.createBufferSource()
      const gain = ctx.createGain()

      source.buffer = buffer
      source.playbackRate.value = pitch
      gain.gain.setValueAtTime(volume, now)
      gain.gain.setValueAtTime(volume, now + Math.max(0, duration - 0.01))
      gain.gain.linearRampToValueAtTime(0, now + duration)

      source.connect(gain)
      gain.connect(ctx.destination)
      source.start(now)
      source.stop(now + duration)
    } catch {
      /* ignore */
    }
  }

  /** The low, soft tick. The workhorse: grid crossings, bounces, cuts. */
  play(volume = 0.035, pitch = 0.8, duration = 0.06) {
    this.fire('fx', pitch, volume, duration)
  }

  /** Same tick with a little jitter, so a run of them doesn't sound mechanical. */
  playRandomized(volume = 0.035, pitch = 0.8, spread = 0.15) {
    this.play(volume * (0.9 + Math.random() * 0.2), pitch + (Math.random() - 0.5) * 2 * spread)
  }

  /**
   * Hover. Pitch is derived from the element's id so each control has its own
   * consistent note — sweeping a toolbar plays a little sequence instead of one
   * repeated blip, and returning to a control sounds like that control again.
   */
  playHover(id: string) {
    this.fire('hover', 1.3 + hash(id) * 0.3, 0.08, 0.06)
  }

  /** Click. Higher and shorter than hover, so the pair reads as press-and-release. */
  playClick() {
    this.fire('hover', 1.4, 0.1, 0.08)
  }

  /** The softer, lower click used for committing something (an edge, a selection). */
  playCommit(volume = 0.06) {
    this.fire('fx', 0.8, volume, 0.06)
  }
}

/** Stable 0–1 from a string, so a given id always gets the same pitch. */
function hash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h) / 2147483647
}

export const sfx = new Sfx()
