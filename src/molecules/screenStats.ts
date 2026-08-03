export type Stat = { label: string; value: string }
export type ScreenStats = { primary: Stat[]; secondary: Stat[] }

/** A small deterministic RNG seeded from a screen id (FNV-1a → mulberry32). */
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
 * Page-level stats for a screen — randomised, but stable per screen id, so each
 * artboard has its own numbers and the Right Nav reels roll to fresh values as
 * you move between artboards.
 */
export function screenStats(id: string): ScreenStats {
  const rnd = seeded(id)
  const rand = (min: number, max: number) => rnd() * (max - min) + min
  const grouped = (min: number, max: number) => Math.round(rand(min, max)).toLocaleString('en-US')
  return {
    primary: [
      { label: 'Users per day', value: String(Math.round(rand(50_000, 800_000))) },
      { label: 'Impressions', value: `${rand(80, 100).toFixed(1)}%` },
    ],
    secondary: [
      { label: 'GP of page', value: rand(0.2, 0.95).toFixed(2) },
      { label: 'Overall ATC', value: `${rand(0.3, 3).toFixed(2)}%` },
      { label: 'atc_gmv_per_user', value: rand(100, 600).toFixed(2) },
      { label: 'atc_gmv_per_day', value: grouped(500_000, 3_000_000) },
      { label: 'Monetisation_per_day', value: grouped(100_000, 900_000) },
    ],
  }
}

/**
 * Flow-level stats for a connector — the parameter labels are fixed to the Flow
 * Stats component library (green funnel metrics, then orange monetary metrics),
 * while the right-hand values are randomised but stable per flow id, so each
 * flow shows its own numbers and the reels roll to fresh values as you move
 * between connectors.
 */
export function flowStats(flowId: string): ScreenStats {
  const rnd = seeded(`flow:${flowId}`)
  const rand = (min: number, max: number) => rnd() * (max - min) + min
  const grouped = (min: number, max: number) => Math.round(rand(min, max)).toLocaleString('en-US')
  return {
    primary: [
      { label: 'Entry-point CTR', value: `${rand(5, 20).toFixed(1)}%` },
      { label: 'Downstream conversion', value: `${rand(10, 40).toFixed(1)}%` },
      { label: 'Drop off rate', value: `${Math.round(rand(40, 80))}%` },
    ],
    secondary: [
      { label: 'atc_gmv_per_user', value: rand(100, 600).toFixed(2) },
      { label: 'atc_gmv_per_day', value: grouped(500_000, 3_000_000) },
      { label: 'Monetisation_per_day', value: grouped(100_000, 900_000) },
      { label: 'GP contribution', value: `${rand(2, 12).toFixed(1)}%` },
    ],
  }
}
