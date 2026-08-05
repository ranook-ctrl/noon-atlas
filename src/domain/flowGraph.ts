/**
 * Graph queries over an atlas snapshot.
 *
 * Pure functions over an immutable adjacency index. The pre-refactor `flowPathTo`
 * rebuilt its adjacency map on *every call* and closed over module-level data;
 * building the index once per snapshot is both cheaper and testable, and the
 * reverse index is what makes the inspector's "Reached from" tab possible at all.
 */

import type { AtlasSnapshot, Flow, Screen, ScreenId } from './types'

export interface FlowGraph {
  /** from → outbound screen ids, in flow-declaration order. */
  adjacency: ReadonlyMap<ScreenId, ScreenId[]>
  /** to → inbound screen ids, in flow-declaration order. */
  reverse: ReadonlyMap<ScreenId, ScreenId[]>
  byId: ReadonlyMap<ScreenId, Screen>
  /** Outbound flows keyed by source, for edge lookups without a scan. */
  flowsFrom: ReadonlyMap<ScreenId, Flow[]>
  flowsTo: ReadonlyMap<ScreenId, Flow[]>
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key)
  if (list) list.push(value)
  else map.set(key, [value])
}

export function buildFlowGraph(snapshot: AtlasSnapshot): FlowGraph {
  const adjacency = new Map<ScreenId, ScreenId[]>()
  const reverse = new Map<ScreenId, ScreenId[]>()
  const flowsFrom = new Map<ScreenId, Flow[]>()
  const flowsTo = new Map<ScreenId, Flow[]>()
  const byId = new Map<ScreenId, Screen>(snapshot.screens.map((s) => [s.id, s]))

  for (const flow of snapshot.flows) {
    push(adjacency, flow.from, flow.to)
    push(reverse, flow.to, flow.from)
    push(flowsFrom, flow.from, flow)
    push(flowsTo, flow.to, flow)
  }

  return { adjacency, reverse, byId, flowsFrom, flowsTo }
}

/**
 * The flow path from `root` to `id`, following directed connectors:
 * `[root, …intermediaries, id]`. Breadth-first, so a screen reachable by several
 * routes resolves to its most direct one.
 *
 * Caveat worth knowing: this returns ONE path and silently discards the others.
 * `mobiles` is reachable from both `home` and `one-sale`; a PM asking "how do
 * users get here?" is given a partial answer. Surfacing alternates is a Phase 2
 * item — see the plan's "alternate-route breadcrumbs".
 *
 * An unreachable id returns `[id]` alone rather than throwing, so a dangling
 * flow can never blank the breadcrumb bar.
 */
export function flowPathTo(graph: FlowGraph, root: ScreenId, id: ScreenId): Screen[] {
  const rootScreen = graph.byId.get(root)
  if (id === root) return rootScreen ? [rootScreen] : []

  const parent = new Map<ScreenId, ScreenId>()
  const queue: ScreenId[] = [root]
  const seen = new Set<ScreenId>([root])
  while (queue.length) {
    const node = queue.shift()!
    if (node === id) break
    for (const next of graph.adjacency.get(node) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      parent.set(next, node)
      queue.push(next)
    }
  }

  const path: ScreenId[] = []
  for (let node: ScreenId | undefined = id; node; node = parent.get(node)) {
    path.unshift(node)
    if (node === root) break
  }
  return path.map((n) => graph.byId.get(n)).filter((s): s is Screen => Boolean(s))
}

/** Screens this screen links out to — the inspector's "Navigate to". */
export function outgoing(graph: FlowGraph, id: ScreenId): Screen[] {
  return (graph.adjacency.get(id) ?? [])
    .map((n) => graph.byId.get(n))
    .filter((s): s is Screen => Boolean(s))
}

/** Screens that link into this screen — the inspector's "Reached from". */
export function incoming(graph: FlowGraph, id: ScreenId): Screen[] {
  return (graph.reverse.get(id) ?? [])
    .map((n) => graph.byId.get(n))
    .filter((s): s is Screen => Boolean(s))
}

/** Every distinct route from `root` to `id`, shortest first. Phase 2 uses this. */
export function allFlowPathsTo(
  graph: FlowGraph,
  root: ScreenId,
  id: ScreenId,
  limit = 8,
): Screen[][] {
  const routes: ScreenId[][] = []
  const walk = (node: ScreenId, trail: ScreenId[]) => {
    if (routes.length >= limit) return
    if (node === id) {
      routes.push([...trail, node])
      return
    }
    for (const next of graph.adjacency.get(node) ?? []) {
      if (trail.includes(next)) continue // no cycles
      walk(next, [...trail, node])
    }
  }
  walk(root, [])
  routes.sort((a, b) => a.length - b.length)
  return routes.map((r) =>
    r.map((n) => graph.byId.get(n)).filter((s): s is Screen => Boolean(s)),
  )
}
