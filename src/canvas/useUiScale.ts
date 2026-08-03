import { useEffect, useState } from 'react'

/**
 * The responsive UI scale used across the atlas chrome.
 *
 * Everything is authored 1:1 against a 1600×1000 reference viewport and then
 * uniformly scaled to whatever device it's viewed on — by the smaller of the
 * width/height ratios, clamped to a sane range — so widgets, text and insets
 * stay proportional. This is the single source of truth for that factor; the
 * `.dashboard__chrome` transform, the Flow Stats tooltip and the connector
 * stroke widths all derive from it.
 */
export const UI_REF_W = 1600
export const UI_REF_H = 1000
export const UI_SCALE_MIN = 0.6
export const UI_SCALE_MAX = 1.4

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Compute the UI scale for a given viewport size. */
export function uiScaleFor(vw: number, vh: number): number {
  return clamp(Math.min(vw / UI_REF_W, vh / UI_REF_H), UI_SCALE_MIN, UI_SCALE_MAX)
}

/** Live UI scale for the current window, updated on resize. */
export function useUiScale(): number {
  const [scale, setScale] = useState(() => uiScaleFor(window.innerWidth, window.innerHeight))
  useEffect(() => {
    const onResize = () => setScale(uiScaleFor(window.innerWidth, window.innerHeight))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}
