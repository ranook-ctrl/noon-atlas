/**
 * Journey taxonomy — turning a flat list of journeys into the nested rail, and
 * answering "which categories does this screen belong to?".
 *
 * Pure, like the rest of `domain/`: no React, no I/O. The rail renders whatever this
 * returns, so the ordering rules live here rather than being re-derived per view.
 */

import type { FlowGraph } from './flowGraph'
import type { Journey, JourneyId, ScreenId } from './types'

/**
 * One node of the rail. Categories and journeys are separate fields rather than a
 * single `children` array of a union, because every consumer treats them
 * differently — categories collapse, journeys select — and a union would push a
 * discriminant check into the render of every row.
 */
export interface CategoryNode {
  /** Full path joined by `/`. Stable across renders; used as the collapse key. */
  path: string
  /** This level's label only. */
  name: string
  depth: number
  children: CategoryNode[]
  journeys: Journey[]
  /** Journeys here *and* in every descendant — the count shown on the row. */
  totalJourneys: number
}

const pathKey = (segments: string[]) => segments.join('/')

/**
 * Group journeys into a nested tree, preserving first-seen order at every level.
 *
 * Insertion order, not alphabetical: the seed lists journeys in a deliberate
 * narrative order (entry points before deep browsing), and sorting would throw that
 * away for no gain — the rail is short enough to scan and long enough that
 * alphabetising scatters related journeys apart.
 */
export function buildCategoryTree(journeys: Journey[]): CategoryNode[] {
  const roots: CategoryNode[] = []
  const byPath = new Map<string, CategoryNode>()

  for (const journey of journeys) {
    // Walk the path, creating each missing level as we go.
    let siblings = roots
    let node: CategoryNode | undefined
    for (let i = 0; i < journey.categoryPath.length; i += 1) {
      const key = pathKey(journey.categoryPath.slice(0, i + 1))
      let next = byPath.get(key)
      if (!next) {
        next = {
          path: key,
          name: journey.categoryPath[i],
          depth: i,
          children: [],
          journeys: [],
          totalJourneys: 0,
        }
        byPath.set(key, next)
        siblings.push(next)
      }
      node = next
      siblings = next.children
    }

    if (node) node.journeys.push(journey)
    else {
      // Uncategorised: a synthetic root so the rail never has two kinds of row at
      // the top level. Named for what it is rather than left blank.
      const key = 'Uncategorised'
      let bucket = byPath.get(key)
      if (!bucket) {
        bucket = {
          path: key,
          name: key,
          depth: 0,
          children: [],
          journeys: [],
          totalJourneys: 0,
        }
        byPath.set(key, bucket)
        roots.push(bucket)
      }
      bucket.journeys.push(journey)
    }
  }

  // Roll the counts up. Done as a second pass because a parent's total isn't known
  // until every descendant has been placed.
  const total = (n: CategoryNode): number => {
    n.totalJourneys = n.journeys.length + n.children.reduce((sum, c) => sum + total(c), 0)
    return n.totalJourneys
  }
  roots.forEach(total)

  return roots
}

/** Every category path (at any depth) that a screen appears in, via its journeys. */
export function categoriesForScreen(journeys: Journey[], screenId: ScreenId): string[] {
  const out = new Set<string>()
  for (const j of journeys) {
    if (!j.screenIds.includes(screenId)) continue
    for (let i = 0; i < j.categoryPath.length; i += 1) {
      out.add(pathKey(j.categoryPath.slice(0, i + 1)))
    }
  }
  return [...out]
}

/**
 * Screens reachable from a category path — the set the Screens tab shows when a rail
 * row is selected. Matches on prefix, so picking `Shop` includes `Shop/Mobiles`.
 */
export function screensInCategory(journeys: Journey[], path: string): Set<ScreenId> {
  const out = new Set<ScreenId>()
  for (const j of journeys) {
    const key = pathKey(j.categoryPath)
    if (key !== path && !key.startsWith(`${path}/`)) continue
    for (const id of j.screenIds) out.add(id)
  }
  return out
}

export function findJourney(journeys: Journey[], id: JourneyId): Journey | undefined {
  return journeys.find((j) => j.id === id)
}

/**
 * Consecutive pairs of a journey that are NOT edges in the graph.
 *
 * A journey is authored data and the graph is authored data, and nothing stops the
 * two drifting apart — delete the `one-sale → mobiles` flow and a journey routing
 * through it becomes a filmstrip asserting a transition the atlas says is
 * impossible. Callers surface these rather than silently drawing the gap, on the
 * same principle as the disabled tools: show that something is wrong, don't paper
 * over it.
 */
export function journeyGaps(
  journey: Journey,
  graph: FlowGraph,
): { from: ScreenId; to: ScreenId; index: number }[] {
  const gaps: { from: ScreenId; to: ScreenId; index: number }[] = []
  for (let i = 0; i < journey.screenIds.length - 1; i += 1) {
    const from = journey.screenIds[i]
    const to = journey.screenIds[i + 1]
    if (!(graph.adjacency.get(from) ?? []).includes(to)) gaps.push({ from, to, index: i })
  }
  return gaps
}
