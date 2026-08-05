/**
 * The on-disk shape, and the seed-merge rule.
 *
 * The stored document is NOT the same thing as an `AtlasSnapshot`: it also records
 * which *seed* entities the user deleted, so a deletion sticks instead of being
 * resurrected by the next merge.
 */

import type { AtlasSnapshot, Flow, Screen, Section } from '../../domain/types'
import { SCHEMA_VERSION } from './kv'

export interface StoredAtlas {
  schema: number
  rev: number
  screens: Screen[]
  flows: Flow[]
  sections: Section[]
  rootScreenId: string
  /** Seed screens the user deleted. Without this, merging revives them. */
  removedSeedScreenIds?: string[]
  removedSeedFlowIds?: string[]
}

export function toStored(snapshot: AtlasSnapshot, removed?: Pick<StoredAtlas, 'removedSeedScreenIds' | 'removedSeedFlowIds'>): StoredAtlas {
  return {
    schema: SCHEMA_VERSION,
    rev: snapshot.rev,
    screens: snapshot.screens,
    flows: snapshot.flows,
    sections: snapshot.sections,
    rootScreenId: snapshot.rootScreenId,
    removedSeedScreenIds: removed?.removedSeedScreenIds,
    removedSeedFlowIds: removed?.removedSeedFlowIds,
  }
}

/**
 * Reconcile a stored document against the current seed.
 *
 * PRECEDENCE — get this backwards and the bug is invisible until it matters:
 *
 *   STORED wins → `position`, `label`
 *       These are the user's edits. That's the entire point of persisting.
 *
 *   SEED wins   → `imageUrl`, `previewUrl`, `homePosition`, `device`, `order`,
 *                 and the *existence* of screens and flows
 *       Because if stored existence won, then shipping a new screenshot or adding
 *       an 18th screen would silently never reach anyone who had already opened
 *       the app once. They'd be pinned to whatever the graph looked like on their
 *       first visit, with no error and no way to tell.
 *
 *   Deletions are explicit, via `removedSeed*Ids`, so "seed wins on existence"
 *   doesn't mean "the user can never delete anything".
 *
 *   User-created entities (ids absent from the seed) are preserved verbatim.
 */
export function mergeSeed(seed: AtlasSnapshot, stored: StoredAtlas | null): AtlasSnapshot {
  if (!stored) return seed

  const removedScreens = new Set(stored.removedSeedScreenIds ?? [])
  const removedFlows = new Set(stored.removedSeedFlowIds ?? [])
  const storedScreens = new Map(stored.screens.map((s) => [s.id, s]))
  const storedFlows = new Map(stored.flows.map((f) => [f.id, f]))
  const seedScreenIds = new Set(seed.screens.map((s) => s.id))
  const seedFlowIds = new Set(seed.flows.map((f) => f.id))

  const screens: Screen[] = []
  for (const seedScreen of seed.screens) {
    if (removedScreens.has(seedScreen.id)) continue
    const prior = storedScreens.get(seedScreen.id)
    screens.push(
      prior
        ? {
            ...seedScreen, // seed owns imageUrl / previewUrl / homePosition / device / order
            position: prior.position ?? seedScreen.position,
            label: prior.label ?? seedScreen.label,
          }
        : seedScreen,
    )
  }
  // Screens the user created — not in the seed, so keep them exactly as stored.
  for (const s of stored.screens) {
    if (!seedScreenIds.has(s.id)) screens.push(s)
  }

  const flows: Flow[] = []
  for (const seedFlow of seed.flows) {
    if (removedFlows.has(seedFlow.id)) continue
    flows.push(storedFlows.get(seedFlow.id) ? { ...seedFlow } : seedFlow)
  }
  for (const f of stored.flows) {
    if (!seedFlowIds.has(f.id)) flows.push(f)
  }

  // Sections and journeys aren't user-editable yet, so the seed is authoritative
  // outright — and must be, since the taxonomy is expected to change under returning
  // users as it gets confirmed. Neither is written to storage at all (see `toStored`),
  // so there is nothing to reconcile.
  const sections: Section[] = seed.sections
  const journeys = seed.journeys

  const rootStillPresent = screens.some((s) => s.id === seed.rootScreenId)

  return {
    project: seed.project,
    screens,
    flows,
    sections,
    journeys,
    rootScreenId: rootStillPresent ? seed.rootScreenId : (screens[0]?.id ?? ''),
    rev: stored.rev,
  }
}
