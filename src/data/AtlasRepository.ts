/**
 * The persistence contract.
 *
 * Async from day one, including the localStorage adapter that resolves instantly.
 * This is the point of the whole layer: the expensive part of adopting a real
 * backend later is not the transport, it's the *call sites* — loading states,
 * error states, StrictMode double-invoke dedupe, AbortSignal plumbing, and
 * stale-response races. Those get built and debugged now, against a configurable
 * fake latency (`VITE_ATLAS_LATENCY`), rather than discovered all at once on the
 * day an HTTP adapter lands.
 *
 * Shape notes:
 *  · ONE aggregate read (`getAtlas`) — the canvas cannot render a partial graph,
 *    so there is deliberately no listScreens()/listFlows(). Splitting the read
 *    would be premature normalisation.
 *  · Fine-grained writes, because those map onto `PATCH /screens/:id`. Merging
 *    them into "PUT the whole document" would make concurrent editing impossible.
 *  · `updateScreens` is batched so a multi-select drag or a layout reset is one
 *    call, not 17 sequential round-trips.
 *  · `rev` / `expectedRev` costs ~15 lines locally and is exactly the kind of
 *    thing that becomes a rewrite once a dozen call sites exist.
 */

import type {
  AtlasSnapshot,
  Flow,
  FlowId,
  Project,
  ProjectId,
  ProjectKind,
  Screen,
  ScreenId,
  Vec,
} from '../domain/types'

export type ScreenPatch = Partial<
  Pick<Screen, 'label' | 'position' | 'imageUrl' | 'previewUrl' | 'device'>
>

export type NewScreen = {
  label: string
  imageUrl: string
  position: Vec
  homePosition?: Vec
  previewUrl?: string
  device?: Screen['device']
}

export type NewFlow = { from: ScreenId; to: ScreenId; label?: string }

export interface ReadOpts {
  signal?: AbortSignal
}

export interface WriteOpts extends ReadOpts {
  /** Reject if the stored rev has moved on. Optimistic concurrency. */
  expectedRev?: number
}

/** Writes return the new rev plus what changed, so callers reconcile without a refetch. */
export interface WriteResult<T> {
  rev: number
  data: T
}

export interface AtlasRepository {
  // ── Projects ──────────────────────────────────────────────────────────────
  listProjects(opts?: ReadOpts & { kind?: ProjectKind }): Promise<Project[]>
  getProjectBySlug(slug: string, opts?: ReadOpts): Promise<Project | null>
  createProject(input: { name: string; kind: ProjectKind }, opts?: ReadOpts): Promise<Project>
  updateProject(
    id: ProjectId,
    patch: Partial<Pick<Project, 'name'>>,
    opts?: ReadOpts,
  ): Promise<Project>
  deleteProject(id: ProjectId, opts?: ReadOpts): Promise<void>

  // ── The aggregate read ────────────────────────────────────────────────────
  getAtlas(projectId: ProjectId, opts?: ReadOpts): Promise<AtlasSnapshot>

  // ── Screens ───────────────────────────────────────────────────────────────
  updateScreen(
    projectId: ProjectId,
    id: ScreenId,
    patch: ScreenPatch,
    opts?: WriteOpts,
  ): Promise<WriteResult<Screen>>
  updateScreens(
    projectId: ProjectId,
    patches: Array<{ id: ScreenId; patch: ScreenPatch }>,
    opts?: WriteOpts,
  ): Promise<WriteResult<Screen[]>>
  createScreen(
    projectId: ProjectId,
    input: NewScreen,
    opts?: WriteOpts,
  ): Promise<WriteResult<Screen>>
  deleteScreen(
    projectId: ProjectId,
    id: ScreenId,
    opts?: WriteOpts,
  ): Promise<WriteResult<{ removedFlowIds: FlowId[] }>>
  /**
   * Put a deleted screen and its incident flows back exactly as they were — the true
   * inverse of `deleteScreen`, and what undo needs.
   *
   * Deliberately NOT expressible as `createScreen`, for two reasons that both make undo
   * silently wrong:
   *
   *  1. `createScreen` mints an id from the label (`slugify`, then `-2`, `-3`… if taken),
   *     so an undone screen could come back under a different id and every restored flow
   *     would point at nothing.
   *  2. `deleteScreen` records the id in `removedSeedScreenIds` so `mergeSeed` doesn't
   *     resurrect it. Restoring without clearing that tombstone would look correct until
   *     the next reload, at which point the merge would delete it again — the exact class
   *     of bug where an undo silently un-applies itself.
   */
  restoreScreen(
    projectId: ProjectId,
    screen: Screen,
    flows: Flow[],
    opts?: WriteOpts,
  ): Promise<WriteResult<Screen>>

  // ── Flows ─────────────────────────────────────────────────────────────────
  createFlow(projectId: ProjectId, input: NewFlow, opts?: WriteOpts): Promise<WriteResult<Flow>>
  deleteFlow(projectId: ProjectId, id: FlowId, opts?: WriteOpts): Promise<WriteResult<void>>
  /** Inverse of `deleteFlow`: keeps the original id and clears the seed tombstone. */
  restoreFlow(projectId: ProjectId, flow: Flow, opts?: WriteOpts): Promise<WriteResult<Flow>>

  // ── Layout ────────────────────────────────────────────────────────────────
  /**
   * Restore every screen to its homePosition. Returns the whole snapshot because
   * it touches everything — cheaper than reconciling 17 individual patches.
   */
  resetLayout(projectId: ProjectId, opts?: WriteOpts): Promise<AtlasSnapshot>
}

// ── Typed failures ──────────────────────────────────────────────────────────
// The UI has to tell "retry this" apart from "reload the page", so the failure
// mode is part of the contract rather than a string match on a message.

export class RepoError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'RepoError'
  }
}

export class NotFoundError extends RepoError {
  constructor(what: string) {
    super(`Not found: ${what}`)
    this.name = 'NotFoundError'
  }
}

/** The stored document moved on since the caller last read it. */
export class RevConflictError extends RepoError {
  constructor(readonly currentRev: number) {
    super(`Revision conflict — the atlas has changed (now at rev ${currentRev})`)
    this.name = 'RevConflictError'
  }
}

/** Storage is full. Distinct from offline: retrying will not help. */
export class QuotaError extends RepoError {
  constructor(cause?: unknown) {
    super('Storage is full — changes could not be saved', cause)
    this.name = 'QuotaError'
  }
}

export class OfflineError extends RepoError {
  constructor(cause?: unknown) {
    super('Cannot reach the server', cause)
    this.name = 'OfflineError'
  }
}
