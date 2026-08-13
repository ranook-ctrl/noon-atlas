/**
 * Corner-bracket "fit to frame" glyph.
 *
 * Drawn inline because the icon set has no fit/expand mark, and the nearest
 * candidate (`refresh.svg`) means *reset* — a different command that's already on
 * the percentage button. 1px square strokes to sit with the pixel typeface.
 */
function FitGlyph() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden focusable="false">
      <path
        d="M1.5 4.5V1.5H4.5M8.5 1.5H11.5V4.5M11.5 8.5V11.5H8.5M4.5 11.5H1.5V8.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  )
}

interface ZoomHudProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  /** Frame everything on the plane. Omitted when there's nothing to fit. */
  onFit?: () => void
  onReset: () => void
}

/**
 * Zoom controls, pinned bottom-centre.
 *
 * This existed but was switched off on the dashboard (`showControls={false}`), which
 * left the product with no zoom affordance at all — and the reason it was hidden is
 * that it was off-design: generic grey chrome in the browser's default font, next to
 * a pixel-typeface glass UI. So it's rebuilt in the house language first — black/60%
 * over blur, 1px white/8% hairline, Geist Pixel, tabular numerals so the percentage
 * doesn't jitter as it changes — and only then turned on.
 *
 * Bottom-centre deliberately mirrors the Map/Screens switch at top-centre, and keeps
 * clear of the breadcrumbs (bottom-left) and the inspector (right).
 */
export function ZoomHud({ scale, onZoomIn, onZoomOut, onFit, onReset }: ZoomHudProps) {
  return (
    <div
      className="atlas-hud"
      // Don't let a click on the controls start a canvas pan underneath them.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="atlas-hud__btn"
        onClick={onZoomOut}
        aria-label="Zoom out"
        title="Zoom out  −"
      >
        <span className="atlas-hud__glyph">−</span>
      </button>

      <button
        type="button"
        className="atlas-hud__value"
        onClick={onReset}
        aria-label="Reset zoom to 100%"
        title="Reset zoom  0"
      >
        {Math.round(scale * 100)}%
      </button>

      <button
        type="button"
        className="atlas-hud__btn"
        onClick={onZoomIn}
        aria-label="Zoom in"
        title="Zoom in  +"
      >
        <span className="atlas-hud__glyph">+</span>
      </button>

      {onFit && (
        <>
          <span className="atlas-hud__divider" aria-hidden />
          <button
            type="button"
            className="atlas-hud__btn"
            onClick={onFit}
            aria-label="Fit all screens"
            title="Fit all screens  1"
          >
            <FitGlyph />
          </button>
        </>
      )}
    </div>
  )
}
