/**
 * The noon Atlas domain model.
 *
 * This module is the contract both the data adapters and the UI depend on, so it
 * deliberately imports nothing: no React, no I/O, no DOM. Keep it that way — the
 * moment this file needs a dependency, the dependency belongs somewhere else.
 *
 * Ids are plain string aliases rather than branded types. Branding would catch
 * argument-order bugs in the repository methods, but ids arrive from the URL, the
 * DOM and localStorage, so every entry point would need a cast. At this size the
 * casts would cost more than the bugs they prevent.
 */

export type ProjectId = string
export type ScreenId = string
export type FlowId = string
export type SectionId = string
export type JourneyId = string

export type Vec = { x: number; y: number }
export type Box = { x: number; y: number; w: number; h: number }

/**
 * 'pod' vs 'project' is a discriminator on one entity, not two entities — the
 * Sidebar's segmented control is a filter over this field.
 */
export type ProjectKind = 'project' | 'pod'

export interface Project {
  id: ProjectId
  /** URL-safe; drives `?project=<slug>`. */
  slug: string
  name: string
  kind: ProjectKind
  /** false → selectable but has no screens; renders the empty state. */
  seeded: boolean
  createdAt: string
  updatedAt: string
}

export interface Device {
  name: string
  width: number
  height: number
}

/** A screen artboard on the canvas. */
export interface Screen {
  id: ScreenId
  projectId: ProjectId
  label: string
  /** Artboard image. Relative path today; an absolute URL once a CMS serves it. */
  imageUrl: string
  /** Taller preview for the inspector — only `home` has one today. */
  previewUrl?: string
  /** World-space top-left of the card. The only field a drag mutates. */
  position: Vec
  /** The seed position — the reset target. Never mutated by drag. */
  homePosition: Vec
  device: Device
  /** Stable render/list order. Not every project's first screen is its root. */
  order: number
}

/** A directed connector between two screens. */
export interface Flow {
  id: FlowId
  projectId: ProjectId
  from: ScreenId
  to: ScreenId
  label?: string
  /**
   * What the user taps to make this transition — "Cart tab", "Search bar", "Gift Cards
   * tile". This is what gets drawn on the connector.
   *
   * Deliberately not `label`, which is seeded as "<From> to <To>". That string is pure
   * redundancy on a canvas: it restates an arrow drawn between two boards that both
   * already carry their name. The action is the only part of a transition the picture
   * can't show, which is what makes it worth the ink.
   *
   * Optional, and edges without one simply draw unlabelled rather than falling back to
   * `label` — a graph half-labelled with real affordances and half with "Homepage to
   * Cart" would be worse than one labelled sparsely.
   */
  action?: string
  /** Reserved; unused today. */
  kind?: 'navigate' | 'deeplink' | 'back'
}

/**
 * A block within a screen. Modelled per-screen even though only the homepage has
 * sections today — otherwise "homepage sections" stays a special case forever,
 * which is exactly the bug that leaks homepage numbers onto every other preview.
 */
export interface Section {
  id: SectionId
  screenId: ScreenId
  name: string
  /** Vertical share of the screen image (~sums to 100). Sizes the hover target. */
  weight: number
  order: number
}

/**
 * A named, ordered walk through several screens — "Buying a gift card", 14 screens.
 *
 * Deliberately a separate entity from `Flow`, not an extension of it. A `Flow` is a
 * single directed edge and answers "can you get from here to there?"; a `Journey`
 * answers "what does this task look like end to end?", which is the question the
 * Screens browser is built around and which no set of edges can answer on its own.
 * The same edge belongs to many journeys, and a journey's *order* is information the
 * graph simply does not carry — `home` has ten outbound edges and nothing about them
 * says which one the checkout story goes through.
 *
 * `categoryPath` rather than a `Category` entity with parent pointers. The tree is
 * pure presentation — it has no metrics, no identity worth referencing, and nothing
 * hangs off a category but the journeys filed under it. A second entity would buy
 * referential integrity over strings that are only ever read as a group, and cost a
 * join on every render of the rail.
 */
export interface Journey {
  id: JourneyId
  projectId: ProjectId
  /** Leaf label in the rail. Unique within its category, not globally. */
  name: string
  /** Ancestors, outermost first: `['Shop', 'Mobiles']`. May be empty (top level). */
  categoryPath: string[]
  /**
   * The walk, in order. Every consecutive pair should also exist as a `Flow` —
   * `validateJourneys` checks this rather than trusting it, because a journey that
   * silently skips a step would show a filmstrip the graph disagrees with.
   */
  screenIds: ScreenId[]
  /**
   * true → the sequence was derived from the graph and the name is a placeholder,
   * not a designer's account of the journey. Surfaced in the UI, because the whole
   * risk with a taxonomy is that structure reads as editorial intent once it's drawn
   * in a tree.
   */
  provisional: boolean
}

/**
 * Everything needed to draw one project, in a single value. Maps 1:1 onto a
 * future `GET /api/projects/:id/atlas`; deliberately not normalised into four
 * separate reads, because the canvas cannot render a partial graph.
 */
export interface AtlasSnapshot {
  project: Project
  screens: Screen[]
  flows: Flow[]
  sections: Section[]
  journeys: Journey[]
  /** Entry screen — breadcrumb root and initial camera target. */
  rootScreenId: ScreenId
  /** Bumped on every write. Enables optimistic concurrency (`expectedRev`). */
  rev: number
}
