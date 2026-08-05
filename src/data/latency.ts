/**
 * Artificial latency for the local adapters.
 *
 * Deliberate: a localStorage adapter that resolves synchronously hides every race
 * the app will hit the moment a network sits behind the same interface — flashes
 * of unframed canvas, StrictMode double-fetches, drags that land mid-load. Set
 * `VITE_ATLAS_LATENCY` (ms) in `.env.local` while developing to make those
 * failures reproducible now instead of surprising later. Defaults to 0.
 */

const configured = Number(import.meta.env.VITE_ATLAS_LATENCY ?? 0)
export const FAKE_LATENCY_MS = Number.isFinite(configured) && configured > 0 ? configured : 0

export class AbortError extends Error {
  constructor() {
    super('Aborted')
    this.name = 'AbortError'
  }
}

/**
 * Resolve after the configured fake latency, rejecting if the signal aborts.
 * Returns immediately (a resolved promise, so still a microtask) when latency is
 * 0, which keeps production paths free of a spurious timer.
 */
export function delay(signal?: AbortSignal, ms = FAKE_LATENCY_MS): Promise<void> {
  if (signal?.aborted) return Promise.reject(new AbortError())
  if (ms <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new AbortError())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
