interface ZoomHudProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

/** Minimal zoom controls anchored to the bottom-left of the canvas. */
export function ZoomHud({ scale, onZoomIn, onZoomOut, onReset }: ZoomHudProps) {
  return (
    <div className="atlas-hud" onPointerDown={(e) => e.stopPropagation()}>
      <button type="button" className="atlas-hud__btn" onClick={onZoomOut} aria-label="Zoom out">
        −
      </button>
      <button type="button" className="atlas-hud__value" onClick={onReset} title="Reset view">
        {Math.round(scale * 100)}%
      </button>
      <button type="button" className="atlas-hud__btn" onClick={onZoomIn} aria-label="Zoom in">
        +
      </button>
    </div>
  )
}
