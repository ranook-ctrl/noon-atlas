/**
 * Synthetic metrics, deterministic per scope and time range.
 *
 * This replaces two pre-refactor generators: `screenStats.ts` (seeded per screen
 * id — fine) and `MasterImage.tsx`'s module-level `Math.random()` (not fine: the
 * homepage's section numbers reshuffled on every page load, so no two people ever
 * saw the same figure). Everything is seeded now, so numbers are stable across
 * reloads and change only when the time range does.
 *
 * The screen-scope generator reproduces the pre-refactor RNG *exactly* — same
 * FNV-1a → mulberry32 chain, same call order, same ranges — so the refactor is
 * visually inert for the default range. Every `MetricSet` is flagged
 * `mocked: true` so the UI can badge it honestly rather than implying it's real.
 */

import type { Metric, MetricScope, MetricSet, TimeRange } from '../../domain/metrics'
import { scopeKey } from '../../domain/metrics'
import type { MetricsQuery, MetricsRepository } from '../MetricsRepository'
import { delay } from '../latency'

/** Deterministic RNG seeded from a string (FNV-1a → mulberry32). */
function seeded(id: string) {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * The default range reuses the bare screen id as the seed so the numbers match
 * what shipped before this refactor; other ranges salt the seed.
 */
const seedFor = (id: string, range: TimeRange) => (range === '28d' ? id : `${id}::${range}`)

const DEFINITIONS: Record<string, string> = {
  users_per_day: 'Distinct users who saw this surface at least once, averaged per day.',
  impressions: 'Share of sessions in which this surface was rendered.',
  gp_of_page: 'Gross profit attributed to the surface, indexed 0–1.',
  overall_atc: 'Add-to-cart events divided by impressions.',
  atc_gmv_per_user: 'GMV of added-to-cart items per distinct user, in AED.',
  atc_gmv_per_day: 'GMV of added-to-cart items per day, in AED.',
  monetisation_per_day: 'Ad and placement revenue attributed per day, in AED.',
  flow_users: 'Users who traversed this connector at least once per day.',
  flow_share: 'Share of the source screen’s users who took this path.',
  flow_drop_off: 'Users who left the journey at the source rather than continuing.',
}

function metric(
  key: string,
  label: string,
  value: number,
  format: Metric['format'],
  extra?: Pick<Metric, 'delta' | 'polarity'>,
): Metric {
  return { key, label, value, format, definition: DEFINITIONS[key], ...extra }
}

/**
 * Page-level stats for a screen. The RNG call order below is load-bearing:
 * changing it changes every number in the app.
 */
function screenMetrics(screenId: string, range: TimeRange): MetricSet {
  const rnd = seeded(seedFor(screenId, range))
  const rand = (min: number, max: number) => rnd() * (max - min) + min
  return {
    scope: { kind: 'screen', screenId },
    primary: [
      metric('users_per_day', 'Users per day', rand(50_000, 800_000), 'int'),
      metric('impressions', 'Impressions', rand(80, 100), 'pct1'),
    ],
    secondary: [
      metric('gp_of_page', 'GP of page', rand(0.2, 0.95), 'fixed2'),
      metric('overall_atc', 'Overall ATC', rand(0.3, 3), 'pct2'),
      metric('atc_gmv_per_user', 'ATC GMV / user', rand(100, 600), 'fixed2'),
      metric('atc_gmv_per_day', 'ATC GMV / day', rand(500_000, 3_000_000), 'intGrouped'),
      metric('monetisation_per_day', 'Monetisation / day', rand(100_000, 900_000), 'intGrouped'),
    ],
    asOf: ASOF[range],
    mocked: true,
  }
}

/** Widget-level stats for a section block within a screen. */
function sectionMetrics(sectionId: string, range: TimeRange): MetricSet {
  const rnd = seeded(seedFor(sectionId, range))
  const rand = (min: number, max: number) => rnd() * (max - min) + min
  return {
    scope: { kind: 'section', sectionId },
    primary: [
      metric('users_per_day', 'Users per day', rand(50_000, 800_000), 'intGrouped'),
      metric('impressions', 'Impressions', rand(80, 100), 'pct1'),
    ],
    secondary: [
      metric('gp_of_page', 'GP of Widget', rand(0.2, 0.95), 'fixed2'),
      metric('overall_atc', 'Conversion Rate', rand(0.3, 3), 'pct2'),
      metric('atc_gmv_per_user', 'ATC GMV / user', rand(100, 600), 'fixed2'),
      metric('atc_gmv_per_day', 'ATC GMV / day', rand(500_000, 3_000_000), 'intGrouped'),
      metric('monetisation_per_day', 'Monetisation / day', rand(100_000, 900_000), 'intGrouped'),
    ],
    asOf: ASOF[range],
    mocked: true,
  }
}

/**
 * Edge-level stats — the analyst's actual question ("how many users go
 * home→categories, and what share drop off?"), which the pre-refactor model could
 * not express at all because a flow was only `{from, to}`.
 */
function flowMetrics(flowId: string, range: TimeRange): MetricSet {
  const rnd = seeded(seedFor(flowId, range))
  const rand = (min: number, max: number) => rnd() * (max - min) + min
  const users = rand(2_000, 240_000)
  const share = rand(1.5, 48)
  const dropOff = rand(4, 71)
  return {
    scope: { kind: 'flow', flowId },
    primary: [
      metric('flow_users', 'Users per day', users, 'intGrouped', {
        delta: rand(-18, 22),
        polarity: 'higherIsBetter',
      }),
      metric('flow_share', 'Share of source', share, 'pct1', {
        delta: rand(-9, 9),
        polarity: 'higherIsBetter',
      }),
    ],
    secondary: [
      metric('flow_drop_off', 'Drop-off', dropOff, 'pct2', {
        delta: rand(-12, 12),
        // The one metric where a rise is bad — hence `polarity` existing at all.
        polarity: 'lowerIsBetter',
      }),
      metric('flow_conversion', 'Continued on', 100 - dropOff, 'pct2', {
        polarity: 'higherIsBetter',
      }),
      metric('atc_gmv_per_user', 'ATC GMV / user', rand(100, 600), 'fixed2'),
      metric('atc_gmv_per_day', 'ATC GMV / day', rand(500_000, 3_000_000), 'intGrouped'),
    ],
    asOf: ASOF[range],
    mocked: true,
  }
}
/*
 * There is deliberately no lightweight `flowWeight(flowId)` helper that
 * re-derives users/drop-off for the canvas. Re-running the same RNG sequence in a
 * second function means the two silently disagree the moment `flowMetrics` changes
 * the order of its `rand()` calls. The canvas asks for real MetricSets through the
 * one batched `getMetrics` path and reads the fields it needs.
 */

/**
 * Fixed per range so "as of" is stable across reloads. A real backend reports the
 * warehouse's own watermark here.
 */
const ASOF: Record<TimeRange, string> = {
  '7d': '2025-07-31T00:00:00.000Z',
  '28d': '2025-07-31T00:00:00.000Z',
  '90d': '2025-07-31T00:00:00.000Z',
}

export class MockMetricsRepository implements MetricsRepository {
  async getMetrics({ scopes, range, signal }: MetricsQuery): Promise<MetricSet[]> {
    await delay(signal)
    return scopes.map((scope) => this.one(scope, range))
  }

  private one(scope: MetricScope, range: TimeRange): MetricSet {
    switch (scope.kind) {
      case 'screen':
        return screenMetrics(scope.screenId, range)
      case 'section':
        // No title: the caller already holds the section's name from the snapshot,
        // so having the repository echo it back would be a second source of truth.
        return sectionMetrics(scope.sectionId, range)
      case 'flow':
        return flowMetrics(scope.flowId, range)
    }
  }
}

export { scopeKey }
