import type { Metric, MetricSet } from '../domain/metrics'
import { deltaSentiment, formatDelta, formatMetric } from '../domain/metrics'

/** Order the rows read in, regardless of how the repository returns them. */
const ORDER = [
  'flow_users',
  'flow_share',
  'flow_drop_off',
  'flow_conversion',
  'atc_gmv_per_user',
  'atc_gmv_per_day',
]

/**
 * The full stat set for a connector, shown on hover.
 *
 * Hovering an edge used to surface a single inline string — `192,430 · 26% drop` — which
 * answered one question and hid the other five the repository already had. Every flow
 * metric now appears, in a fixed order so the card reads the same for every edge and you
 * learn where to look rather than re-reading it each time.
 *
 * Positioned near the cursor and pointer-transparent: it must never become a hit target,
 * or moving toward it would make the edge underneath lose hover and the card vanish.
 */
export function EdgeCard({
  x,
  y,
  fromLabel,
  toLabel,
  action,
  metrics,
}: {
  /** Viewport coordinates of the cursor. */
  x: number
  y: number
  fromLabel: string
  toLabel: string
  /** The affordance that triggers this flow, if recorded. Shown under the route. */
  action?: string
  metrics: MetricSet | null
}) {
  const all = metrics ? [...metrics.primary, ...metrics.secondary] : []
  const rows = ORDER.map((key) => all.find((m) => m.key === key)).filter(
    (m): m is Metric => Boolean(m),
  )

  // Keep the card on screen: flip left / above when close to an edge.
  const W = 220
  const H = 40 + (action ? 18 : 0) + rows.length * 21
  const left = Math.min(x + 16, window.innerWidth - W - 12)
  const top = Math.min(Math.max(12, y + 14), window.innerHeight - H - 12)

  return (
    <div className="edge-card" style={{ left, top, width: W }} role="tooltip">
      <div className="edge-card__route pixel">
        <span>{fromLabel}</span>
        <span className="edge-card__arrow" aria-hidden>
          →
        </span>
        <span>{toLabel}</span>
      </div>

      {action && <div className="edge-card__trigger pixel-line">{action}</div>}

      {rows.length === 0 ? (
        <div className="edge-card__label pixel-line">Loading flow metrics…</div>
      ) : (
        rows.map((m) => {
          const bad = m.key === 'flow_drop_off' && m.value >= 55
          const lead = m.key === 'flow_users'
          return (
            <div className="edge-card__row" key={m.key} data-bad={bad} data-lead={lead}>
              <span className="edge-card__label pixel-line">{m.label}</span>
              <span className="edge-card__value pixel">
                {formatMetric(m)}
                {m.delta != null && (
                  <span
                    className="edge-inspector__delta"
                    data-sentiment={deltaSentiment(m)}
                    style={{ marginLeft: 6 }}
                  >
                    {formatDelta(m.delta)}
                  </span>
                )}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}
