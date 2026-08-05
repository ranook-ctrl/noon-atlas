/**
 * A deliberately small, failure-tolerant wrapper over localStorage.
 *
 * Two rules, both learned the hard way:
 *  1. A read must NEVER throw. One corrupt key — a half-written value, a manual
 *     edit in devtools, a schema change — must not brick the whole app. Reads fall
 *     back to the seed instead.
 *  2. A write CAN fail (quota, private browsing, disabled storage) and the caller
 *     needs to know, so writes surface a typed error rather than failing silently.
 */

import { QuotaError, RepoError } from '../AtlasRepository'

const NAMESPACE = 'noon-atlas'

/**
 * Bump ONLY alongside a matching entry in `migrations.ts`. The migration runner
 * throws loudly in dev if a version has no path, so a bump can't silently orphan
 * everyone's stored layout.
 */
export const SCHEMA_VERSION = 1

const prefix = () => `${NAMESPACE}:v${SCHEMA_VERSION}`

export const keys = {
  projects: () => `${prefix()}:projects`,
  atlas: (projectId: string) => `${prefix()}:atlas:${projectId}`,
  /** Matches any key this app owns, at any schema version. */
  isOurs: (key: string) => key.startsWith(`${NAMESPACE}:`),
}

function storage(): Storage | null {
  try {
    // Accessing localStorage throws outright in some privacy modes.
    return window.localStorage
  } catch {
    return null
  }
}

/** Read and parse a key. Returns `fallback` on absence, corruption, or no storage. */
export function readJson<T>(key: string, fallback: T): T {
  const store = storage()
  if (!store) return fallback
  let raw: string | null
  try {
    raw = store.getItem(key)
  } catch {
    return fallback
  }
  if (raw == null) return fallback
  try {
    const parsed = JSON.parse(raw) as T
    // `null` round-trips through JSON but is almost never a valid document here.
    return parsed == null ? fallback : parsed
  } catch {
    // Corrupt value. Leave it in place rather than deleting — if a human wants to
    // recover it they can, and we've already fallen back to something usable.
    console.warn(`[atlas] ignoring corrupt storage key "${key}"; falling back to seed`)
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  const store = storage()
  if (!store) return // Nothing persists; the app still works in-memory.
  try {
    store.setItem(key, JSON.stringify(value))
  } catch (err) {
    if (isQuotaExceeded(err)) throw new QuotaError(err)
    throw new RepoError('Could not write to local storage', err)
  }
}

export function removeKey(key: string): void {
  try {
    storage()?.removeItem(key)
  } catch {
    /* nothing useful to do */
  }
}

function isQuotaExceeded(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  // Safari reports a different name/code than Chrome and Firefox.
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    (err as { code?: number }).code === 22
  )
}
