import { MaskIcon } from '../components/MaskIcon'
import { boardsBounds } from '../canvas/boardGeometry'
import type { Metric, MetricSet, Screen, ScreenId } from '../domain'


/** Inner content column width, matching both other inspectors. */
const CONTENT_W = 299

/**
 * What the right-hand panel shows when more than one board is selected.
 *
 * Before this, ⌘A gave you a seventeen-board selection and a panel still describing a
 * single screen — a selection with no affordances and an inspector that disagreed with it.
 * The panel now follows the same rule as everything else: `selectedIds` is the edit target,
 * so when there's more than one of them, the panel describes the set.
 *
 * Deliberately shows *sums*, not averages. "17 screens · 4.6M users/day" answers "how much
 * of the app have I got hold of?", which is the question you have when you've just
 * marquee'd a region. An average of a traffic metric across an arbitrary hand-picked set
 * isn't a quantity that means anything.
 */
export function MultiSelectPanel({
  screens,
  metricsById,
  onClose,
  onFocusScreen,
  onDelete,
  canDelete,
}: {
  /** The selected screens, in selection order. */
  screens: Screen[]
  metricsById: Map<ScreenId, MetricSet>
  onClose?: () => void
  onFocusScreen?: (id: ScreenId) => void
  onDelete?: () => void
  /** false → deletion would remove the atlas's entry point; explain rather than allow. */
  canDelete: boolean
}) {
  const bounds = boardsBounds(screens.map((s) => s.position))

  // Sum every metric the screens share, keyed by metric id so labels/units survive.
  const totals = new Map<string, { metric: Metric; total: number }>()
  for (const s of screens) {
    const set = metricsById.get(s.id)
    if (!set) continue
    for (const m of [...set.primary, ...set.secondary]) {
      // Only additive quantities sum. A percentage or an index summed across screens is a
      // meaningless number that would still render convincingly, which is worse than
      // omitting it.
      if (m.format !== 'int' && m.format !== 'intGrouped') continue
      const entry = totals.get(m.key)
      if (entry) entry.total += m.value
      else totals.set(m.key, { metric: m, total: m.value })
    }
  }

  return (
    <div className="edge-inspector" style={{ width: CONTENT_W }}>
      <header className="edge-inspector__header">
        <span className="pixel-square edge-inspector__eyebrow">Selection</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Clear selection"
            className="tool-control edge-inspector__close"
          >
            <MaskIcon src="/icons/close.svg" width={11} height={11} color="#FFFFFF" />
          </button>
        )}
      </header>

      <div className="multisel__hero">
        <span className="pixel multisel__count">{screens.length}</span>
        <span className="pixel-line multisel__count-label">screens selected</span>
      </div>

      {totals.size > 0 && (
        <div className="inspector__rows">
          {[...totals.values()].map(({ metric, total }) => (
            <div key={metric.key} className="inspector__row" title={metric.definition}>
              <span className="pixel-line inspector__row-label">{metric.label}</span>
              <span className="pixel inspector__row-value">
                {Math.round(total).toLocaleString('en-US')}
              </span>
            </div>
          ))}
        </div>
      )}

      {bounds && (
        <div className="inspector__rows">
          <div className="inspector__row">
            <span className="pixel-line inspector__row-label">Bounding box</span>
            <span className="pixel inspector__row-value">
              {Math.round(bounds.w)} × {Math.round(bounds.h)}
            </span>
          </div>
        </div>
      )}

      {/* The set itself, so you can confirm what you grabbed and jump to any of it. */}
      <div className="multisel__list">
        {screens.map((s) => (
          <button
            key={s.id}
            type="button"
            className="multisel__row"
            onClick={onFocusScreen ? () => onFocusScreen(s.id) : undefined}
            disabled={!onFocusScreen}
          >
            <img src={s.imageUrl} alt="" width={16} height={35} loading="lazy" decoding="async" />
            <span className="pixel multisel__row-label">{s.label}</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="tool-control multisel__delete"
        onClick={onDelete}
        disabled={!canDelete || !onDelete}
        title={
          canDelete
            ? 'Delete the selection  ⌫'
            : 'The selection includes the atlas’s entry screen, which can’t be deleted'
        }
      >
        <span className="pixel">Delete {screens.length} screens</span>
      </button>
    </div>
  )
}
