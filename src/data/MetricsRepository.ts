import type { MetricScope, MetricSet, TimeRange } from '../domain/metrics'

export interface MetricsQuery {
  scopes: MetricScope[]
  range: TimeRange
  signal?: AbortSignal
}

/**
 * Read-only, and deliberately separate from `AtlasRepository`.
 *
 * Metrics will come from an analytics warehouse rather than the document store —
 * a different owner, a different latency profile, and a different failure mode.
 * Coupling them to the atlas document's lifecycle would mean a slow analytics
 * query blocking the canvas from painting at all.
 */
export interface MetricsRepository {
  /** Batched by design: the inspector wants a screen plus 12 sections at once. */
  getMetrics(query: MetricsQuery): Promise<MetricSet[]>
}
