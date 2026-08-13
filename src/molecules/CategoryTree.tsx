import { memo } from 'react'

import type { CategoryNode, Journey, JourneyId } from '../domain'

/**
 * The nested taxonomy rail, after Mobbin's left-hand tree.
 *
 * Two kinds of row: categories, which disclose, and journeys, which select. Both are
 * real `<button>`s — the tree is the primary navigation of this whole surface, and a
 * `<div>` with an onClick would make it unreachable by keyboard.
 *
 * Indentation is applied as padding on the button rather than a margin on a wrapper,
 * so the hover and selected washes run the full width of the rail. Indenting the
 * wrapper leaves a dead gutter down the left that the highlight doesn't reach, which
 * reads as a rendering fault at depth 2.
 */

export type TreeSelection =
  | { kind: 'all' }
  | { kind: 'category'; path: string }
  | { kind: 'journey'; id: JourneyId }

const Chevron = ({ open }: { open: boolean }) => (
  <svg
    className={`cat-tree__chevron${open ? ' is-open' : ''}`}
    width="10"
    height="10"
    viewBox="0 0 10 10"
    aria-hidden
  >
    <path d="M3 1.5L6.5 5L3 8.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </svg>
)

function JourneyRow({
  journey,
  depth,
  selected,
  onSelect,
}: {
  journey: Journey
  depth: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`cat-tree__row cat-tree__row--journey${selected ? ' is-selected' : ''}`}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
      title={
        journey.provisional
          ? `${journey.name} — provisional: sequence derived from the graph, name not yet confirmed`
          : journey.name
      }
    >
      <span className="pixel cat-tree__label">{journey.name}</span>
      {/* A dot, not the word "provisional": eleven of eleven rows carrying a badge
          would be noise, and the tooltip and the strip header both spell it out. */}
      {journey.provisional && <span className="cat-tree__provisional" aria-hidden />}
      <span className="pixel cat-tree__count">{journey.screenIds.length}</span>
    </button>
  )
}

function CategoryRows({
  nodes,
  expanded,
  selection,
  onToggle,
  onSelect,
}: {
  nodes: CategoryNode[]
  expanded: ReadonlySet<string>
  selection: TreeSelection
  onToggle: (path: string) => void
  onSelect: (next: TreeSelection) => void
}) {
  return (
    <>
      {nodes.map((node) => {
        const open = expanded.has(node.path)
        const selected = selection.kind === 'category' && selection.path === node.path
        return (
          <div key={node.path} className="cat-tree__group">
            <button
              type="button"
              className={`cat-tree__row cat-tree__row--cat${selected ? ' is-selected' : ''}`}
              style={{ paddingLeft: `${8 + node.depth * 16}px` }}
              aria-expanded={open}
              onClick={() => {
                // One click does both: disclose, and scope the Screens grid to this
                // branch. Separating them would mean two hit targets per row for what
                // a user reads as one action.
                //
                // But it can't be an unconditional toggle. Selecting an already-open
                // category then collapsed it, hiding the journeys the click was asking
                // to see — so a first click opens and selects, and only a second click
                // on an already-selected row closes it.
                if (selected) onToggle(node.path)
                else if (!open) onToggle(node.path)
                onSelect({ kind: 'category', path: node.path })
              }}
            >
              <Chevron open={open} />
              <span className="pixel-square cat-tree__label">{node.name}</span>
              <span className="pixel cat-tree__count">{node.totalJourneys}</span>
            </button>

            {open && (
              <div className="cat-tree__children">
                <CategoryRows
                  nodes={node.children}
                  expanded={expanded}
                  selection={selection}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
                {node.journeys.map((j) => (
                  <JourneyRow
                    key={j.id}
                    journey={j}
                    depth={node.depth + 1}
                    selected={selection.kind === 'journey' && selection.id === j.id}
                    onSelect={() => onSelect({ kind: 'journey', id: j.id })}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}

export const CategoryTree = memo(function CategoryTree({
  tree,
  allCount,
  expanded,
  selection,
  onToggle,
  onSelect,
}: {
  tree: CategoryNode[]
  /**
   * The count for the "All screens" row. Supplied by the parent rather than derived
   * from `tree`, because it counts whatever the active tab is showing — screens on
   * the Screens tab, flows on the Flows tab. Deriving it here gave every row a
   * journey count including this one, so the top row read "All screens 11" next to a
   * header saying "17 of 17 screens".
   */
  allCount: number
  expanded: ReadonlySet<string>
  selection: TreeSelection
  onToggle: (path: string) => void
  onSelect: (next: TreeSelection) => void
}) {
  return (
    <nav className="cat-tree" aria-label="Flow categories">
      <button
        type="button"
        className={`cat-tree__row cat-tree__row--all${selection.kind === 'all' ? ' is-selected' : ''}`}
        onClick={() => onSelect({ kind: 'all' })}
      >
        <span className="pixel-square cat-tree__label">All screens</span>
        <span className="pixel cat-tree__count">{allCount}</span>
      </button>

      {tree.length === 0 ? (
        <p className="pixel cat-tree__empty">No flows documented yet</p>
      ) : (
        <CategoryRows
          nodes={tree}
          expanded={expanded}
          selection={selection}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      )}
    </nav>
  )
})
