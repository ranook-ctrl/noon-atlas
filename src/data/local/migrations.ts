/**
 * Schema migrations for the stored atlas document.
 *
 * Empty today — v1 is the first shape. The runner exists now rather than later so
 * that the first person to change the stored shape is forced to think about the
 * people who already have data, instead of silently orphaning their layouts.
 */

import type { StoredAtlas } from './storedAtlas'
import { SCHEMA_VERSION } from './kv'

/** A step from version N to N+1. Register one per bump of SCHEMA_VERSION. */
type Migration = (doc: Record<string, unknown>) => Record<string, unknown>

const MIGRATIONS: Record<number, Migration> = {
  // 1: (doc) => ({ ...doc, newField: default }),
}

/**
 * Bring a raw stored value up to the current schema, or return null if it can't
 * be salvaged (in which case the caller falls back to the seed).
 */
export function migrate(raw: unknown): StoredAtlas | null {
  if (!raw || typeof raw !== 'object') return null
  let doc = raw as Record<string, unknown>
  let version = typeof doc.schema === 'number' ? doc.schema : 0

  if (version > SCHEMA_VERSION) {
    // Someone ran a newer build in this browser. Their data is ahead of us; don't
    // guess at it and don't destroy it — fall back to the seed for this session.
    console.warn(
      `[atlas] stored schema v${version} is newer than this build's v${SCHEMA_VERSION}; using seed`,
    )
    return null
  }

  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version]
    if (!step) {
      // A missing step is a programming error, not a data error. Shout in dev.
      const message = `[atlas] no migration registered from schema v${version} → v${version + 1}`
      if (import.meta.env.DEV) throw new Error(message)
      console.error(message)
      return null
    }
    doc = step(doc)
    version += 1
    doc.schema = version
  }

  return isPlausible(doc) ? (doc as unknown as StoredAtlas) : null
}

/**
 * A cheap structural sanity check. Not a full validator — just enough that a
 * truncated or hand-edited value falls back to the seed instead of crashing the
 * canvas on `screens.map`.
 */
function isPlausible(doc: Record<string, unknown>): boolean {
  return (
    Array.isArray(doc.screens) &&
    Array.isArray(doc.flows) &&
    typeof doc.rev === 'number'
  )
}
