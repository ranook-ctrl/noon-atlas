import { CornerBrackets } from '../components/CornerBrackets'

/**
 * The bottom command bar — one strip that carries the tools and the zoom controls.
 *
 * Deliberately a single combined strip rather than a separate toolbar: the zoom HUD
 * already occupied bottom-centre, and two adjacent floating bars would compete. The
 * layout mirrors the mode switch at top-centre, so the app reads as chrome pinned to
 * the middle of both edges.
 *
 * Tools that aren't wired yet are rendered `disabled` with an explanatory tooltip
 * rather than omitted or — worse — present and inert. A visible, honestly-disabled
 * control tells you the capability is planned; a control that silently does nothing is
 * the exact failure this whole project started out fixing.
 */

export type ToolId =
  | 'select'
  | 'pan'
  | 'addScreen'
  | 'drawFlow'
  | 'delete'
  | 'isolate'
  | 'filter'
  | 'minimap'
  | 'snap'
  | 'undo'
  | 'redo'

export type Tool = {
  id: ToolId
  label: string
  /** Keyboard hint shown in the tooltip. */
  hint?: string
  glyph: React.ReactNode
  /** Not yet implemented — rendered disabled, with `why` in the tooltip. */
  why?: string
}

const S = { stroke: 'currentColor', strokeWidth: 1.2, fill: 'none' } as const

/** 1px-stroke glyphs, matching the fit-to-frame and search marks. */
const Glyphs = {
  select: (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M3 1.5L11 7L7.2 7.8L9 11.6L7.6 12.3L5.8 8.5L3 11z" {...S} strokeLinejoin="round" />
    </svg>
  ),
  pan: (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M7 1.5v11M1.5 7h11M7 1.5L5 3.5M7 1.5l2 2M7 12.5l-2-2M7 12.5l2-2M1.5 7l2-2M1.5 7l2 2M12.5 7l-2-2M12.5 7l-2 2" {...S} />
    </svg>
  ),
  addScreen: (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <rect x="1.5" y="1.5" width="7" height="11" rx="1" {...S} />
      <path d="M11 6v5M8.5 8.5h5" {...S} strokeLinecap="square" />
    </svg>
  ),
  drawFlow: (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <circle cx="3" cy="11" r="1.6" {...S} />
      <circle cx="11" cy="3" r="1.6" {...S} />
      <path d="M4.2 9.8C6 8 6 8 9.8 4.2" {...S} />
    </svg>
  ),
  delete: (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M2.5 4h9M5 4V2.5h4V4M3.5 4l.6 8h5.8l.6-8" {...S} strokeLinejoin="round" />
    </svg>
  ),
  isolate: (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <circle cx="7" cy="7" r="2.2" {...S} />
      <circle cx="7" cy="7" r="5.5" {...S} strokeDasharray="2 2" />
    </svg>
  ),
  filter: (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M1.8 3h10.4L8 7.6v4.2L6 10.6V7.6z" {...S} strokeLinejoin="round" />
    </svg>
  ),
  minimap: (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <rect x="1.5" y="1.5" width="11" height="11" rx="1" {...S} />
      <rect x="7.5" y="7.5" width="4" height="4" {...S} />
    </svg>
  ),
  snap: (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M1.5 5h11M1.5 9h11M5 1.5v11M9 1.5v11" {...S} strokeOpacity="0.5" />
      <rect x="5" y="5" width="4" height="4" {...S} />
    </svg>
  ),
  undo: (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M5 3L2 6l3 3" {...S} strokeLinejoin="round" />
      <path d="M2 6h6a4 4 0 010 8H6" {...S} />
    </svg>
  ),
  redo: (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <path d="M9 3l3 3-3 3" {...S} strokeLinejoin="round" />
      <path d="M12 6H6a4 4 0 000 8h2" {...S} />
    </svg>
  ),
}

export const TOOLS: Tool[] = [
  { id: 'select', label: 'Select', hint: 'V', glyph: Glyphs.select },
  { id: 'pan', label: 'Pan', hint: 'Space / drag', glyph: Glyphs.pan },
  { id: 'isolate', label: 'Isolate neighbourhood', hint: 'I', glyph: Glyphs.isolate },
  { id: 'minimap', label: 'Minimap', hint: 'O', glyph: Glyphs.minimap },
  { id: 'snap', label: 'Snap to grid', hint: 'G', glyph: Glyphs.snap },
  {
    id: 'filter',
    label: 'Filter by metric',
    glyph: Glyphs.filter,
    why: 'Metric filtering isn’t built yet',
  },
  {
    id: 'addScreen',
    label: 'Add screen',
    glyph: Glyphs.addScreen,
    why: 'Needs artboard upload, which needs a backend',
  },
  {
    id: 'drawFlow',
    label: 'Draw flow',
    glyph: Glyphs.drawFlow,
    why: 'Edge authoring isn’t wired to the canvas yet',
  },
  // Live. `deleteScreen` (with its flow cascade) has been implemented in the repository
  // since Phase 0 — the blocker was never a backend, it was that undo covered only position
  // moves, so a delete would have been unrecoverable. See `AtlasEdit` in AtlasProvider.
  { id: 'delete', label: 'Delete selection', hint: '⌫', glyph: Glyphs.delete },
]

export function CommandBar({
  activeTool,
  onSelectTool,
  toggles,
  history,
  onUndo,
  onRedo,
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFit,
}: {
  activeTool: ToolId
  onSelectTool: (id: ToolId) => void
  /**
   * Which non-exclusive tools are on. `select`/`pan` are modes and live in
   * `activeTool`; isolate/minimap/snap are independent switches, so conflating them
   * into one "active tool" would make turning the minimap on silently drop you out of
   * whatever mode you were in.
   */
  toggles: Partial<Record<ToolId, boolean>>
  history: { canUndo: boolean; canRedo: boolean }
  onUndo: () => void
  onRedo: () => void
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onResetZoom: () => void
  onFit?: () => void
}) {
  return (
    <div className="commandbar" onPointerDown={(e) => e.stopPropagation()}>
      <div className="commandbar__group" role="toolbar" aria-label="Canvas tools">
        {TOOLS.map((t) => {
          const disabled = !!t.why
          return (
            <button
              key={t.id}
              type="button"
              className={`commandbar__tool${!disabled ? ' has-brackets' : ''}`}
              data-active={t.id === 'select' || t.id === 'pan' ? activeTool === t.id : !!toggles[t.id]}
              disabled={disabled}
              aria-label={t.label}
              aria-pressed={activeTool === t.id}
              title={
                disabled
                  ? `${t.label} — ${t.why}`
                  : t.hint
                    ? `${t.label}  ${t.hint}`
                    : t.label
              }
              onClick={() => onSelectTool(t.id)}
            >
              {!disabled && <CornerBrackets />}
              {t.glyph}
            </button>
          )
        })}
      </div>

      <span className="commandbar__divider" aria-hidden />

      <div className="commandbar__group">
        <button
          type="button"
          className="commandbar__tool has-brackets"
          onClick={onUndo}
          disabled={!history.canUndo}
          aria-label="Undo"
          title="Undo  ⌘Z"
        >
          <CornerBrackets />
          {Glyphs.undo}
        </button>
        <button
          type="button"
          className="commandbar__tool has-brackets"
          onClick={onRedo}
          disabled={!history.canRedo}
          aria-label="Redo"
          title="Redo  ⇧⌘Z"
        >
          <CornerBrackets />
          {Glyphs.redo}
        </button>
      </div>

      <span className="commandbar__divider" aria-hidden />

      <div className="commandbar__group">
        <button
          type="button"
          className="commandbar__tool has-brackets"
          onClick={onZoomOut}
          aria-label="Zoom out"
          title="Zoom out  −"
        >
          <CornerBrackets />
          <span className="commandbar__glyph">−</span>
        </button>
        <button
          type="button"
          className="commandbar__zoom"
          onClick={onResetZoom}
          aria-label="Reset zoom to 100%"
          title="Reset zoom  0"
        >
          {Math.round(scale * 100)}%
        </button>
        <button
          type="button"
          className="commandbar__tool has-brackets"
          onClick={onZoomIn}
          aria-label="Zoom in"
          title="Zoom in  +"
        >
          <CornerBrackets />
          <span className="commandbar__glyph">+</span>
        </button>
        {onFit && (
          <button
            type="button"
            className="commandbar__tool has-brackets"
            onClick={onFit}
            aria-label="Fit all screens"
            title="Fit all screens  1"
          >
            <CornerBrackets />
            <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden>
              <path
                d="M1.5 4.5V1.5H4.5M8.5 1.5H11.5V4.5M11.5 8.5V11.5H8.5M4.5 11.5H1.5V8.5"
                {...S}
                strokeLinecap="square"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
