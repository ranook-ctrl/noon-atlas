import { ScreenPlate } from '../components/ScreenPlate'
import type { FlowGraph, Journey, MetricSet, ScreenId } from '../domain'
import { formatMetric, journeyGaps } from '../domain'

/**
 * All of a screen's metrics at one level, matching the grid.
 *
 * Big integers are grouped here for the same reason the grid does it: the inspector's
 * rolling reel wants an unbroken run of digits, a plate does not.
 */
function statsFor(set: MetricSet | undefined) {
  if (!set) return []
  return [...set.primary, ...set.secondary].map((m) => ({
    label: m.label,
    value: m.format === 'int' ? Math.round(m.value).toLocaleString('en-US') : formatMetric(m),
  }))
}

/**
 * One journey as a horizontal ordered filmstrip — Mobbin's flow view.
 *
 * Scrolls on the x-axis with the plates at a fixed height, so a 14-screen journey and
 * a 2-screen journey render at the same scale and can be compared. Wrapping into a
 * grid instead would lose the single most useful property of the strip: that reading
 * order is journey order.
 *
 * Gaps are drawn, not hidden. `journeyGaps` re-derives whether each consecutive pair
 * is actually an edge in the graph, and a pair that isn't gets a marked break rather
 * than the usual arrow — a strip that asserts a transition the atlas says doesn't
 * exist is worse than one that admits the taxonomy has drifted.
 */
export function JourneyStrip({
  journey,
  graph,
  metricFor,
  focusedId,
  onOpenScreen,
}: {
  journey: Journey
  graph: FlowGraph
  metricFor: (id: ScreenId) => MetricSet | undefined
  focusedId: ScreenId | null
  onOpenScreen: (id: ScreenId) => void
}) {
  const gaps = new Set(journeyGaps(journey, graph).map((g) => g.index))

  return (
    <section className="strip">
      <div className="strip__scroller">
        {journey.screenIds.map((id, i) => {
          const screen = graph.byId.get(id)
          if (!screen) return null
          const set = metricFor(id)
          return (
            <div key={`${id}-${i}`} className="strip__cell">
              <ScreenPlate
                label={screen.label}
                imageUrl={screen.imageUrl}
                step={i + 1}
                selected={id === focusedId}
                delayMs={Math.min(i * 40, 320)}
                stats={statsFor(set)}
                onClick={() => onOpenScreen(id)}
              />

              {i < journey.screenIds.length - 1 && (
                <span
                  className={`strip__link${gaps.has(i) ? ' is-gap' : ''}`}
                  aria-hidden
                  title={
                    gaps.has(i)
                      ? 'No flow recorded between these screens — the journey and the graph disagree'
                      : undefined
                  }
                />
              )}
            </div>
          )
        })}
      </div>

      <header className="strip__caption">
        <div className="strip__caption-main">
          <h2 className="pixel-square strip__title">{journey.name}</h2>
          {journey.provisional && (
            <span className="pixel strip__provisional">
              Provisional — sequence from the graph, name not confirmed
            </span>
          )}
        </div>
        <span className="pixel strip__count">
          {journey.screenIds.length} screen{journey.screenIds.length === 1 ? '' : 's'}
        </span>
      </header>
    </section>
  )
}
