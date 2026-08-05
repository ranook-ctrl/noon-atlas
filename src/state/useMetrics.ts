import { useEffect, useMemo, useRef, useState } from 'react'

import type { MetricScope, MetricSet, TimeRange } from '../domain'
import { DEFAULT_TIME_RANGE, scopeKey } from '../domain'
import { metricsRepo } from '../data/repositories'

/**
 * Metrics, cached by (scope, range).
 *
 * Deliberately NOT part of `AtlasProvider`: metrics are read-only, they come from a
 * different backend, and one day they'll be slow. If a slow analytics query shared
 * the document's lifecycle it would block the canvas from painting at all.
 */
const cache = new Map<string, MetricSet>()
const cacheKey = (scope: MetricScope, range: TimeRange) => `${range}|${scopeKey(scope)}`

function cached(scopes: MetricScope[], range: TimeRange): MetricSet[] | null {
  const hits: MetricSet[] = []
  for (const scope of scopes) {
    const hit = cache.get(cacheKey(scope, range))
    if (!hit) return null
    hits.push(hit)
  }
  return hits
}

/**
 * Fetch metric sets for a stable list of scopes.
 *
 * Returns synchronously from cache when every scope is already known, so moving
 * back to a previously-viewed screen doesn't flash a loading state.
 */
export function useMetrics(
  scopes: MetricScope[],
  range: TimeRange = DEFAULT_TIME_RANGE,
): { data: MetricSet[] | null; loading: boolean } {
  // Identity of the request, so an inline array literal doesn't refetch forever.
  const requestKey = useMemo(
    () => scopes.map((s) => cacheKey(s, range)).join(','),
    [scopes, range],
  )

  const [data, setData] = useState<MetricSet[] | null>(() => cached(scopes, range))
  const [loading, setLoading] = useState(false)
  const scopesRef = useRef(scopes)
  scopesRef.current = scopes

  useEffect(() => {
    const current = scopesRef.current
    if (!current.length) {
      setData([])
      setLoading(false)
      return
    }

    const hit = cached(current, range)
    if (hit) {
      setData(hit)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    metricsRepo
      .getMetrics({ scopes: current, range, signal: controller.signal })
      .then((sets) => {
        if (controller.signal.aborted) return
        sets.forEach((set) => cache.set(cacheKey(set.scope, range), set))
        setData(sets)
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        // Metrics are supplementary: a failure must degrade to "no numbers", never
        // take the canvas down with it.
        setData([])
        setLoading(false)
      })

    return () => controller.abort()
    // requestKey encodes both the scopes and the range.
  }, [requestKey, range])

  return { data, loading }
}

/** Single-scope convenience wrapper. */
export function useMetricSet(
  scope: MetricScope | null,
  range: TimeRange = DEFAULT_TIME_RANGE,
): { data: MetricSet | null; loading: boolean } {
  const scopes = useMemo(() => (scope ? [scope] : []), [scope ? scopeKey(scope) : ''])
  const { data, loading } = useMetrics(scopes, range)
  return { data: data?.[0] ?? null, loading }
}
