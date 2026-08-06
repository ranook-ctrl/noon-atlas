/**
 * The atlas document's lifecycle, as a reducer.
 *
 * Ephemeral UI state (which panel is open, what's hovered, the UI scale) stays in
 * component `useState` where it already lived — hoisting it here would be pure
 * ceremony. What belongs here is the *data* lifecycle: loading, error, optimistic,
 * rolled-back. That is shared by the canvas, the inspector, the breadcrumbs, the
 * top-nav counts and the sidebar, and threading it through five prop levels is
 * worse than one context.
 */

import type { AtlasSnapshot, Flow, FlowId, ProjectId, Screen, ScreenId, Vec } from '../domain/types'
import type { RepoError } from '../data/AtlasRepository'

export type AtlasStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface AtlasState {
  /** The project this state describes. Guards against stale responses. */
  projectId: ProjectId | null
  status: AtlasStatus
  snapshot: AtlasSnapshot | null
  error: RepoError | null
  /** Screens with an in-flight write — lets the UI show a subtle unsaved dot. */
  pending: ReadonlySet<ScreenId>
  /**
   * Bumped when positions change from something other than a drag (a reset, a
   * project switch). The canvas watches it to re-frame the camera; a plain
   * snapshot compare can't distinguish "reset" from "someone nudged one board".
   */
  layoutRev: number
}

export const initialAtlasState: AtlasState = {
  projectId: null,
  status: 'idle',
  snapshot: null,
  error: null,
  pending: new Set(),
  layoutRev: 0,
}

export type AtlasAction =
  | { type: 'load/start'; projectId: ProjectId }
  | { type: 'load/ok'; projectId: ProjectId; snapshot: AtlasSnapshot }
  | { type: 'load/fail'; projectId: ProjectId; error: RepoError }
  /** Live drag. Local only — never triggers I/O. */
  | { type: 'screen/moved'; id: ScreenId; position: Vec }
  | { type: 'write/start'; id: ScreenId }
  | { type: 'write/ok'; id: ScreenId; rev: number }
  | { type: 'write/rollback'; id: ScreenId; position: Vec; error: RepoError }
  /*
   * Fine-grained graph edits.
   *
   * Deliberately NOT expressed as `snapshot/replace`. That action bumps `layoutRev`, which
   * the canvas watches in order to re-frame the camera — so renaming a board or drawing a
   * single edge would fly the camera back to the root screen. These touch only what
   * changed and leave `layoutRev` alone.
   */
  /**
   * Adopt a new revision after a graph write, without touching `pending`.
   *
   * Graph edits aren't scoped to one screen, so they can't reuse `write/ok` — doing so
   * meant passing an empty screen id purely to reach the rev assignment, which reads as a
   * bug to anyone who finds it.
   */
  | { type: 'rev/bump'; rev: number }
  | { type: 'screen/renamed'; id: ScreenId; label: string }
  | { type: 'screen/removed'; id: ScreenId }
  | { type: 'screen/restored'; screen: Screen; flows: Flow[] }
  | { type: 'flow/added'; flow: Flow }
  | { type: 'flow/removed'; id: FlowId }
  | { type: 'flow/actionSet'; id: FlowId; action?: string }
  | { type: 'flow/reconnected'; id: FlowId; from: ScreenId; to: ScreenId }
  | { type: 'snapshot/replace'; snapshot: AtlasSnapshot; reframe?: boolean }
  | { type: 'error/dismiss' }

function withoutPending(pending: ReadonlySet<ScreenId>, id: ScreenId): ReadonlySet<ScreenId> {
  if (!pending.has(id)) return pending
  const next = new Set(pending)
  next.delete(id)
  return next
}

function moveScreen(state: AtlasState, id: ScreenId, position: Vec): AtlasState {
  if (!state.snapshot) return state
  const screens = state.snapshot.screens.map((s) => (s.id === id ? { ...s, position } : s))
  return { ...state, snapshot: { ...state.snapshot, screens } }
}

export function atlasReducer(state: AtlasState, action: AtlasAction): AtlasState {
  switch (action.type) {
    case 'load/start':
      return {
        ...initialAtlasState,
        projectId: action.projectId,
        status: 'loading',
        // Keep the old snapshot on screen while a *different* project loads only
        // if it's the same project being refreshed; otherwise blank it, because
        // showing project A's boards under project B's name is worse than a gap.
        snapshot: state.projectId === action.projectId ? state.snapshot : null,
        layoutRev: state.layoutRev,
      }

    case 'load/ok':
      // Stale-response guard: a slow load for a project we've since navigated away
      // from must not overwrite the current one.
      if (action.projectId !== state.projectId) return state
      return {
        ...state,
        status: 'ready',
        snapshot: action.snapshot,
        error: null,
        pending: new Set(),
        layoutRev: state.layoutRev + 1,
      }

    case 'load/fail':
      if (action.projectId !== state.projectId) return state
      return { ...state, status: 'error', error: action.error }

    case 'screen/moved':
      return moveScreen(state, action.id, action.position)

    case 'rev/bump':
      if (!state.snapshot) return state
      return { ...state, snapshot: { ...state.snapshot, rev: action.rev } }

    case 'screen/renamed': {
      if (!state.snapshot) return state
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          screens: state.snapshot.screens.map((s) =>
            s.id === action.id ? { ...s, label: action.label } : s,
          ),
        },
      }
    }

    case 'screen/removed': {
      if (!state.snapshot) return state
      const { id } = action
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          screens: state.snapshot.screens.filter((s) => s.id !== id),
          // Mirror the repository's cascade exactly. If this only dropped the screen, the
          // canvas would keep drawing edges to a board that no longer exists and
          // `frameBox(undefined)` would throw inside the connector layer.
          flows: state.snapshot.flows.filter((f) => f.from !== id && f.to !== id),
          sections: state.snapshot.sections.filter((s) => s.screenId !== id),
        },
      }
    }

    case 'screen/restored': {
      if (!state.snapshot) return state
      const { screen, flows } = action
      const haveScreen = state.snapshot.screens.some((s) => s.id === screen.id)
      const haveFlow = new Set(state.snapshot.flows.map((f) => f.id))
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          // Re-sorted by `order` so an undone delete doesn't reshuffle the Screens grid.
          screens: haveScreen
            ? state.snapshot.screens
            : [...state.snapshot.screens, screen].sort((a, b) => a.order - b.order),
          flows: [...state.snapshot.flows, ...flows.filter((f) => !haveFlow.has(f.id))],
        },
      }
    }

    case 'flow/added': {
      if (!state.snapshot) return state
      if (state.snapshot.flows.some((f) => f.id === action.flow.id)) return state
      return {
        ...state,
        snapshot: { ...state.snapshot, flows: [...state.snapshot.flows, action.flow] },
      }
    }

    case 'flow/removed': {
      if (!state.snapshot) return state
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          flows: state.snapshot.flows.filter((f) => f.id !== action.id),
        },
      }
    }

    case 'flow/actionSet': {
      if (!state.snapshot) return state
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          flows: state.snapshot.flows.map((f) =>
            f.id === action.id ? { ...f, action: action.action } : f,
          ),
        },
      }
    }

    case 'flow/reconnected': {
      if (!state.snapshot) return state
      return {
        ...state,
        snapshot: {
          ...state.snapshot,
          flows: state.snapshot.flows.map((f) =>
            f.id === action.id ? { ...f, from: action.from, to: action.to } : f,
          ),
        },
      }
    }

    case 'write/start': {
      const pending = new Set(state.pending)
      pending.add(action.id)
      return { ...state, pending }
    }

    case 'write/ok':
      if (!state.snapshot) return state
      return {
        ...state,
        snapshot: { ...state.snapshot, rev: action.rev },
        pending: withoutPending(state.pending, action.id),
      }

    case 'write/rollback': {
      const reverted = moveScreen(state, action.id, action.position)
      return {
        ...reverted,
        pending: withoutPending(reverted.pending, action.id),
        error: action.error,
      }
    }

    case 'snapshot/replace':
      return {
        ...state,
        status: 'ready',
        snapshot: action.snapshot,
        error: null,
        pending: new Set(),
        layoutRev: action.reframe ? state.layoutRev + 1 : state.layoutRev,
      }

    case 'error/dismiss':
      return { ...state, error: null }
  }
}
