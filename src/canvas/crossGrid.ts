import type { Viewport } from './useViewport'

/**
 * The "Pattern Primitive" from Figma: a tiny plus made of two 1px bars, 7px
 * across. It is drawn procedurally in *screen space* so the plus is always the
 * same pixel size no matter how far the canvas is zoomed — only the spacing
 * between plusses tracks the world (with level-of-detail so it never gets too
 * dense or too sparse).
 */
export const CROSS_ARM = 7 // total length of each bar, in screen px (constant)
export const CROSS_STROKE = 1 // bar thickness, in screen px (constant)
export const CROSS_GAP = 24
export const GRID_UNIT = CROSS_ARM + CROSS_GAP // 31px base pitch, in world px

const CROSS_COLOR = 'rgba(255, 255, 255, 0.07)'
const MIN_SCREEN_SPACING = 24 // keeps on-screen pitch within [24, 48)px at any zoom

/**
 * Choose the world-space pitch to draw at: a power-of-two multiple of GRID_UNIT
 * such that the on-screen pitch stays in a comfortable band. This is what makes
 * the pattern read consistently whether you're zoomed way in or way out.
 */
function resolvePitch(scale: number) {
  let worldStep = GRID_UNIT
  let spacing = worldStep * scale
  while (spacing < MIN_SCREEN_SPACING) {
    worldStep *= 2
    spacing = worldStep * scale
  }
  while (spacing >= MIN_SCREEN_SPACING * 2) {
    worldStep /= 2
    spacing = worldStep * scale
  }
  return spacing // on-screen distance between plusses, in px
}

/**
 * Clear and redraw the plus grid for the current viewport. `ctx` is expected to
 * already be scaled to CSS pixels (the caller handles devicePixelRatio).
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height)

  const spacing = resolvePitch(viewport.scale)

  // Screen position of the world origin, wrapped into the first cell so we only
  // ever loop over the visible plusses — this is what makes the grid infinite.
  const phaseX = ((viewport.x % spacing) + spacing) % spacing
  const phaseY = ((viewport.y % spacing) + spacing) % spacing

  const arm = CROSS_ARM / 2
  const half = CROSS_STROKE / 2
  ctx.fillStyle = CROSS_COLOR

  for (let sx = phaseX; sx <= width; sx += spacing) {
    const cx = Math.round(sx)
    for (let sy = phaseY; sy <= height; sy += spacing) {
      const cy = Math.round(sy)
      ctx.fillRect(cx - half, cy - arm, CROSS_STROKE, CROSS_ARM) // vertical bar
      ctx.fillRect(cx - arm, cy - half, CROSS_ARM, CROSS_STROKE) // horizontal bar
    }
  }
}
