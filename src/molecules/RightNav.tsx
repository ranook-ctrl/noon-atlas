import { useEffect, useRef, useState } from 'react'
import { DeviceSize } from '../components/DeviceSize'
import { RollingNumber } from '../components/RollingNumber'
import { MaskIcon } from '../components/MaskIcon'
import { CornerBrackets } from '../components/CornerBrackets'
import { MasterImage } from './MasterImage'
import type { HoveredSection } from './MasterImage'
import { SegmentedControl } from './SegmentedControl'
import type { Device, ScreenId, Section } from '../domain/types'

/** inner content column width (Device Size + tabs are 299/300 in Figma) */
const CONTENT_W = 299
/** left preview column width — a tall portrait window onto the artboard */
const PREVIEW_W = 240
/** preview height: the 400×865 artboard rendered at 240 wide is ~519 tall. Viewport-
    relative (not a `%`, which has no definite parent to resolve against now the panel
    hugs its content) so it caps at 519 on a normal desktop but shrinks on a short
    viewport rather than overflowing the card. 122 = top 62 + bottom 20 + card padding 40. */
const PREVIEW_H = 'min(519px, calc(100vh - 122px))'

const PINK = '#F7306F'

type Stat = { label: string; value: string }

/** A neighbouring screen reachable across one flow, with that flow's numbers. */
export type NeighbourRow = {
  screenId: ScreenId
  label: string
  /** Artboard image, shown as a phone-aspect crop so the list reads as screens. */
  imageUrl?: string
  /** Headline flow metric, pre-formatted (e.g. users/day). */
  value?: string
  /** Secondary flow metric (e.g. share of source). */
  sub?: string
}

const GROUP_A: Stat[] = [
  { label: 'Users per day', value: '583097' },
  { label: 'Impressions', value: '100.0%' },
]

const GROUP_B: Stat[] = [
  { label: 'GP of page', value: '0.67' },
  { label: 'Overall ATC', value: '0.89%' },
  { label: 'atc_gmv_per_user', value: '375.53 ' },
  { label: 'atc_gmv_per_day', value: '1,948,837' },
  { label: 'Monetisation_per_day', value: '380,000' },
]

/**
 * The two headline numbers, as blocks.
 *
 * Previously every stat — headline and detail alike — was an identical `Row` with a
 * rolling reel, so seven values competed at one weight and none of them led. The
 * primaries now get size and their own surface; the details drop to quiet rows. This
 * is deliberately the same grammar as `EdgeInspector`, so the panel reads consistently
 * whether you have a screen or a flow selected.
 */
function PrimaryStats({ stats }: { stats: Stat[] }) {
  if (stats.length === 0) return null
  return (
    <div className="inspector__pair" style={{ width: CONTENT_W }}>
      {stats.map((s) => (
        <div key={s.label} className="inspector__stat">
          <span className="pixel inspector__stat-value">
            <RollingNumber value={s.value} />
          </span>
          <span className="pixel-line inspector__stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Detail rows. No reels: seven simultaneously-animating values is noise, and these
 * are read rather than watched.
 */
function SecondaryStats({ stats }: { stats: Stat[] }) {
  if (stats.length === 0) return null
  return (
    <div className="inspector__rows" style={{ width: CONTENT_W }}>
      {stats.map((s) => (
        <div key={s.label} className="inspector__row">
          <span className="pixel-line inspector__row-label">{s.label}</span>
          <span className="pixel inspector__row-value">{s.value}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * The list behind the "Navigate to" / "Reached from" tabs.
 *
 * These two tabs existed in the design and rendered as inert `<div>`s — the data
 * to fill them (the directed flow graph) was already in the file, just never
 * queried. Each row is the neighbouring screen plus that connector's own traffic,
 * and tapping one focuses it on the canvas.
 */
function NeighbourList({
  rows,
  emptyLabel,
  onSelect,
}: {
  rows: NeighbourRow[]
  emptyLabel: string
  onSelect?: (id: ScreenId) => void
}) {
  if (rows.length === 0) {
    return (
      <div style={{ width: CONTENT_W, padding: '4px 2px' }}>
        <span
          className="pixel-line"
          style={{ fontSize: 13, lineHeight: '20px', color: 'rgba(255, 255, 255, 0.4)' }}
        >
          {emptyLabel}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: CONTENT_W }}>
      {rows.map((r) => (
        <div
          key={r.screenId}
          className={`neighbour-row${onSelect ? ' is-interactive has-brackets' : ''}`}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onClick={onSelect ? () => onSelect(r.screenId) : undefined}
          onKeyDown={
            onSelect
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(r.screenId)
                  }
                }
              : undefined
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '8px 6px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            cursor: onSelect ? 'pointer' : 'default',
          }}
        >
          {onSelect && <CornerBrackets />}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {r.imageUrl && (
              <span className="neighbour-row__thumb">
                <img src={r.imageUrl} alt="" loading="lazy" decoding="async" draggable={false} />
              </span>
            )}
            <span
              className="pixel"
              style={{
                fontSize: 13,
                lineHeight: '20px',
                color: '#FFFFFF',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {r.label}
            </span>
          </span>
          <span
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}
          >
            {r.value && (
              <span
                className="pixel"
                style={{
                  fontSize: 13,
                  lineHeight: '20px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {r.value}
              </span>
            )}
            {r.sub && (
              <span
                className="pixel"
                style={{
                  fontSize: 11,
                  lineHeight: '20px',
                  color: PINK,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {r.sub}
              </span>
            )}
            <MaskIcon src="/icons/chevron-right.svg" width={14} height={14} color="rgba(255,255,255,0.4)" />
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * The screen's name, editable in place.
 *
 * Edited here in 1:1 chrome rather than on the board itself. A world-space `<input>` sits
 * under the canvas's `transform: scale()`, where the caret renders blurry at non-integer
 * scales and selection/IME behave badly — and the label is ~3px tall at fit-all zoom
 * anyway. Editing in the panel is both better-looking and free.
 *
 * `blur` commits and `Escape` reverts, which is what people expect from a rename: clicking
 * away is an accept, not a cancel.
 */
function ScreenTitle({
  title,
  onRename,
  editing,
  onEditingChange,
}: {
  title: string
  onRename?: (label: string) => void
  editing: boolean
  onEditingChange?: (editing: boolean) => void
}) {
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement | null>(null)

  // Re-seed when the editor opens or the focused screen changes under it, so the draft can
  // never show a stale name from a previously-edited screen.
  useEffect(() => {
    if (editing) setDraft(title)
  }, [editing, title])

  useEffect(() => {
    if (!editing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [editing])

  const commit = () => {
    const next = draft.trim()
    if (next && next !== title) onRename?.(next)
    onEditingChange?.(false)
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="rightnav__title"
        onClick={onRename ? () => onEditingChange?.(true) : undefined}
        disabled={!onRename}
        title={onRename ? 'Rename \u2014 or double-click the board' : undefined}
      >
        <span className="pixel-square">{title}</span>
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      className="pixel-square rightnav__title-input"
      value={draft}
      aria-label="Screen name"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        // Kept off the global hotkeys: Escape would otherwise also close the panel behind
        // the editor, and Enter belongs to the field.
        if (e.key === 'Enter') {
          e.preventDefault()
          e.stopPropagation()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          setDraft(title)
          onEditingChange?.(false)
        }
      }}
    />
  )
}

type InspectorTab = 'stats' | 'navigateTo' | 'reachedFrom'

/**
 * Figma: Right Nav (node 27:32356).
 * Glass inspector panel: white/4% fill, 1px white/8% border, backdrop blur(4px),
 * radius 16, column padding 20 / gap 20. Header (title + close) · Device Size ·
 * screen preview · tab strip · stat groups.
 *
 * Height is variable: the panel fills whatever height its parent gives it
 * (viewport minus the top bar, on the dashboard). The header is pinned; the body
 * below flexes to fill the space left and scrolls when the content overflows.
 * When the parent is unbounded (e.g. the gallery) the panel hugs its content.
 */
type RightNavProps = {
  /** forwarded to the preview — hover a section block (null on leave) */
  onHoverSection?: (info: HoveredSection | null) => void
  /** title + preview image of the artboard currently in focus on the canvas */
  title?: string
  /** Commit a new label. Absent → the title is read-only. */
  onRename?: (label: string) => void
  /** Controlled, so a double-click on the board can open the editor from outside. */
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
  src?: string
  /** hover targets for the previewed screen; empty for screens without sections */
  sections?: Section[]
  /**
   * The previewed screen's device. Comes from the snapshot rather than being
   * hardcoded — the previous literal read "iphone 13 Pro / 375 x 812" while the
   * assets are 400×865, so the panel was stating a wrong fact about every screen.
   */
  device?: Device
  /** per-artboard stat groups (roll to fresh values as the focus changes) */
  primary?: Stat[]
  secondary?: Stat[]
  /** outbound / inbound neighbours for the two flow tabs */
  navigateTo?: NeighbourRow[]
  reachedFrom?: NeighbourRow[]
  /** tap a neighbour → focus that screen */
  onSelectScreen?: (id: ScreenId) => void
  /** the screen being inspected — resets the tab when the focus changes */
  screenId?: ScreenId
  /** close icon → slide the panel out */
  onClose?: () => void
}

const FALLBACK_DEVICE: Device = { name: 'Artboard', width: 400, height: 865 }

export function RightNav({
  onHoverSection,
  title = 'Homepage',
  onRename,
  editing = false,
  onEditingChange,
  src,
  sections,
  device = FALLBACK_DEVICE,
  primary = GROUP_A,
  secondary = GROUP_B,
  navigateTo = [],
  reachedFrom = [],
  onSelectScreen,
  screenId,
  onClose,
}: RightNavProps) {
  const [tab, setTab] = useState<InspectorTab>('stats')

  // Moving to another screen should land on its stats, not leave you looking at a
  // neighbour list you opened for the previous one.
  useEffect(() => setTab('stats'), [screenId])

  const TABS: InspectorTab[] = ['stats', 'navigateTo', 'reachedFrom']

  return (
    <div className="tool-surface rightnav">
      {/* LEFT — the screen, big. A tall preview filling the panel height, so you read the
          artboard first and its numbers beside it rather than stacked below. It's also the
          only surface where a screen's sections are hoverable (drives the section card). */}
      <div className="rightnav__preview">
        <MasterImage
          width={PREVIEW_W}
          height={PREVIEW_H}
          src={src}
          alt={title}
          sections={sections}
          onHoverSection={onHoverSection}
        />
      </div>

      {/* RIGHT — title, device, tabs, and the stat groups. Scrolls on its own if the
          content is taller than the panel. */}
      <div className="rightnav__content">
        <div className="rightnav__header">
          <ScreenTitle
            title={title}
            onRename={onRename}
            editing={editing}
            onEditingChange={onEditingChange}
          />
          <button
            type="button"
            className="rightnav__close"
            onClick={onClose}
            aria-label={onClose ? 'Close panel' : undefined}
            disabled={!onClose}
          >
            <MaskIcon src="/icons/close.svg" width={11} height={11} color="#FFFFFF" />
          </button>
        </div>

        <DeviceSize
          device={device.name}
          dimensions={`${device.width} x ${device.height}`}
          width={CONTENT_W}
        />

        {/* Tab strip (Figma 54:80782) — one SegmentedControl, not a hand-rolled dupe. */}
        <SegmentedControl
          width={CONTENT_W}
          height={36}
          tone="accent"
          ariaLabel="Screen details"
          borderColor="rgba(255, 255, 255, 0.12)"
          dividerAfter={[1]}
          dividerColor="rgba(255, 255, 255, 0.12)"
          segments={[
            { label: 'Page Stats', selected: tab === 'stats' },
            { label: 'Navigate to', selected: tab === 'navigateTo' },
            { label: 'Reached from', selected: tab === 'reachedFrom' },
          ]}
          onSelect={(i) => setTab(TABS[i])}
        />

        {/* Keyed on the tab so the pane re-mounts and replays its entrance. */}
        <div className="inspector-pane rightnav__pane" key={tab} style={{ width: CONTENT_W }}>
          {tab === 'stats' && (
            <>
              <PrimaryStats stats={primary} />
              <SecondaryStats stats={secondary} />
            </>
          )}
          {tab === 'navigateTo' && (
            <NeighbourList
              rows={navigateTo}
              emptyLabel="This screen doesn’t link anywhere yet."
              onSelect={onSelectScreen}
            />
          )}
          {tab === 'reachedFrom' && (
            <NeighbourList
              rows={reachedFrom}
              emptyLabel="No screens link here — this is an entry point."
              onSelect={onSelectScreen}
            />
          )}
        </div>
      </div>
    </div>
  )
}
