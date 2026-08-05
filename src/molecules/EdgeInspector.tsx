import { MaskIcon } from '../components/MaskIcon'
import { RollingNumber } from '../components/RollingNumber'
import type { Metric, MetricSet } from '../domain/metrics'
import { deltaSentiment, formatDelta, formatMetric } from '../domain/metrics'
import type { ScreenId } from '../domain/types'

/** inner content column width, matching the screen inspector */
const CONTENT_W = 299

type EdgeInspectorProps = {
  fromLabel: string
  toLabel: string
  fromId: ScreenId
  toId: ScreenId
  /** What the user taps to make this transition, when it's recorded. */
  action?: string
  metrics: MetricSet | null
  /** tap either end → focus that screen on the canvas */
  onSelectScreen?: (id: ScreenId) => void
  onClose?: () => void
}

/**
 * The inspector for a *connector* rather than a screen.
 *
 * This is the surface that answers the analyst's actual question — "how many users
 * go Homepage → Categories, and what share drop off?" — which the product could not
 * express at all before, because a flow was only `{from, to}` and the SVG layer was
 * `pointer-events: none` so an edge couldn't even be clicked.
 *
 * It takes over the right-hand panel slot rather than opening a second floating
 * card: two inspectors fighting for the same corner would be worse than one that
 * swaps its contents.
 */
export function EdgeInspector({
  fromLabel,
  toLabel,
  fromId,
  toId,
  action,
  metrics,
  onSelectScreen,
  onClose,
}: EdgeInspectorProps) {
  const dropOff = find(metrics, 'flow_drop_off')
  const users = find(metrics, 'flow_users')
  const share = find(metrics, 'flow_share')
  const rest = (metrics?.secondary ?? []).filter((m) => m.key !== 'flow_drop_off')

  return (
    <div className="edge-inspector">
      <header className="edge-inspector__header">
        <span className="pixel-square edge-inspector__eyebrow">Flow</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="tool-control edge-inspector__close"
        >
          <MaskIcon src="/icons/close.svg" width={11} height={11} color="#FFFFFF" />
        </button>
      </header>

      {/* From → To, both ends navigable. */}
      <div className="edge-inspector__route">
        <button
          type="button"
          className="pixel edge-inspector__endpoint"
          onClick={onSelectScreen ? () => onSelectScreen(fromId) : undefined}
          disabled={!onSelectScreen}
        >
          {fromLabel}
        </button>
        <MaskIcon
          src="/icons/chevron-right.svg"
          width={14}
          height={14}
          color="rgba(255,255,255,0.4)"
        />
        <button
          type="button"
          className="pixel edge-inspector__endpoint is-target"
          onClick={onSelectScreen ? () => onSelectScreen(toId) : undefined}
          disabled={!onSelectScreen}
        >
          {toLabel}
        </button>
      </div>

      {/* The affordance that triggers this transition.
          Lives here rather than on the canvas: drawn on the connectors it was ten
          captions over the picture at once, but once you've clicked a single edge it's
          the first thing you want to know and it costs nothing. */}
      {action && (
        <div className="edge-inspector__trigger">
          <span className="pixel-line edge-inspector__trigger-label">Trigger</span>
          <span className="pixel edge-inspector__trigger-value">{action}</span>
        </div>
      )}

      {!metrics ? (
        <div className="edge-inspector__loading pixel-line">Loading flow metrics…</div>
      ) : (
        <>
          {/* Drop-off leads, because it's the reason you clicked. */}
          {dropOff && (
            <div className="edge-inspector__hero" data-severity={severity(dropOff.value)}>
              <span className="pixel edge-inspector__hero-value">
                {dropOff.value.toFixed(1)}%
              </span>
              <div className="edge-inspector__hero-meta">
                <span className="pixel-line edge-inspector__hero-label">
                  {dropOff.label}
                </span>
                {dropOff.delta != null && <Delta metric={dropOff} />}
              </div>
            </div>
          )}

          <div className="inspector__pair">
            {[users, share].filter(Boolean).map((m) => (
              <div key={m!.key} className="inspector__stat" title={m!.definition}>
                <span className="pixel inspector__stat-value">
                  <RollingNumber value={formatMetric(m!)} />
                </span>
                <span className="pixel-line inspector__stat-label">{m!.label}</span>
                {m!.delta != null && <Delta metric={m!} />}
              </div>
            ))}
          </div>

          <div className="inspector__rows">
            {rest.map((m) => (
              <div key={m.key} className="inspector__row" title={m.definition}>
                <span className="pixel-line inspector__row-label">{m.label}</span>
                <span className="pixel inspector__row-value">{formatMetric(m)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Delta({ metric }: { metric: Metric }) {
  const sentiment = deltaSentiment(metric)
  return (
    <span
      className="pixel edge-inspector__delta"
      data-sentiment={sentiment}
      title={`vs the preceding period${
        metric.polarity === 'lowerIsBetter' ? ' — lower is better' : ''
      }`}
    >
      {formatDelta(metric.delta!)}
    </span>
  )
}

function find(set: MetricSet | null, key: string): Metric | undefined {
  if (!set) return undefined
  return [...set.primary, ...set.secondary].find((m) => m.key === key)
}

/**
 * One threshold, identical to `DROPOFF_BAD` in the connector layer, so the panel and
 * the canvas can never disagree about whether an edge looks like a problem.
 */
function severity(dropOff: number): 'ok' | 'bad' {
  return dropOff >= 55 ? 'bad' : 'ok'
}

export { CONTENT_W as EDGE_INSPECTOR_WIDTH }
