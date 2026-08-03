import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  InfiniteCanvas,
  AtlasBoards,
  atlasOverviewViewport,
  ATLAS_SCREENS,
  ATLAS_LINKS,
  flowPathTo,
  INTRO_HOLD_MS,
  uiScaleFor,
} from '../canvas'
import {
  TopNav,
  TopSwitch,
  RightNav,
  BreadcrumbsTab,
  Sidebar,
  StatsBar,
  HOMEPAGE_SECTIONS,
  screenStats,
} from '../molecules'
import { MinimisedFloatingMenu } from '../components'

/**
 * noon Atlas — main landing page (Figma node 54:65001).
 *
 * Two layers, exactly as the design is authored:
 *  · z-index 0   — the infinite x-y plane (grid canvas, pannable / zoomable),
 *                  the same InfiniteCanvas built on node 5199.
 *  · z-index 100 — the fixed app chrome floating above the plane. Nothing here
 *                  pans; the widgets are pinned to the viewport.
 *
 * The chrome container is pointer-events:none so a drag that lands in the gaps
 * between widgets falls through to the canvas and pans it; each widget re-enables
 * pointer events for itself.
 *
 * Layout / spacing is 1:1 with Figma:
 *  · Top bar     — full width, padding 8×20, space-between (menu · pills · stats)
 *  · Right Nav   — top 72, right 20, fills the height to the bottom
 *  · Breadcrumbs — bottom-left, 20 from each edge (frame x:20, y:930)
 *  · Sidenav     — the "noon Homepage" pill expands (morphs) into the Sidebar,
 *                  pinned top-left with a 20px inset (Figma 59:85626).
 *
 * Responsiveness: the chrome is authored 1:1 at a reference viewport and then
 * uniformly scaled (`--ui-scale`) to whatever device it's viewed on, so every
 * widget, text size and edge inset stays proportional. The infinite plane below
 * fills the viewport at true scale (it has its own zoom).
 */

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Tracks the live viewport size (updates on resize). */
function useViewportSize() {
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return size
}

export default function Dashboard() {
  const { w: vw, h: vh } = useViewportSize()
  // Shared responsive scaling algorithm (authored against a 1600×1000 reference).
  const uiScale = uiScaleFor(vw, vh)
  const [navOpen, setNavOpen] = useState(false)
  const [section, setSection] = useState<{ index: number; top: number; left: number } | null>(null)
  // The artboard currently in focus on the canvas — drives the Right Nav preview
  // and the breadcrumb flow map. Homepage is the entry screen.
  const [focusedId, setFocusedId] = useState('home')
  // Right Nav visibility. Stays closed through the overview so the whole-atlas
  // frame reads cleanly (nothing covering the artboards), then slides in in
  // step with the intro zoom into the Homepage — both start together. The close
  // icon slides it out, and focusing any artboard slides it back in (800ms ease).
  const [rightNavOpen, setRightNavOpen] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setRightNavOpen(true), INTRO_HOLD_MS)
    return () => clearTimeout(t)
  }, [])

  // Focus a screen and (re)open the inspector — used by board taps and
  // breadcrumb crumbs.
  const focusScreen = (id: string) => {
    setFocusedId(id)
    setRightNavOpen(true)
  }

  // Reset control (top-nav refresh): focus Homepage and restore any dragged
  // boards to their original positions (via the bumped nonce).
  const [resetNonce, setResetNonce] = useState(0)
  const resetAtlas = () => {
    focusScreen('home')
    setResetNonce((n) => n + 1)
  }

  const focused = ATLAS_SCREENS.find((s) => s.id === focusedId) ?? ATLAS_SCREENS[0]
  // Breadcrumb = the flow path from the source (Homepage) to the focused screen:
  // first crumb is the source, last is current, the rest are intermediaries.
  const crumbs = useMemo(() => {
    const path = flowPathTo(focusedId)
    return path.map((s, i) => ({
      id: s.id,
      label: s.label,
      state: i === path.length - 1 ? ('current' as const) : ('past' as const),
      arrow: i !== 0,
    }))
  }, [focusedId])

  // Right Nav preview image. Homepage uses the full-length, scrollable homepage
  // mockup; every other screen shows its own artboard screenshot.
  const previewSrc = focusedId === 'home' ? '/images/homepage.jpg' : focused.src
  // Per-artboard stats — the Right Nav reels roll to these when the focus changes.
  const stats = useMemo(() => screenStats(focusedId), [focusedId])

  const sectionData = section ? HOMEPAGE_SECTIONS[section.index] : null
  // The hovered-section geometry comes back in true screen coords, but the stats
  // card + connector live inside the scaled chrome, so map them into its space
  // (÷ uiScale) and treat the viewport in that space too.
  const spaceW = vw / uiScale
  const spaceH = vh / uiScale
  // Anchor the stats card near the hovered section, clamped to the viewport.
  const statsTop = section ? clamp(section.top / uiScale, 72, spaceH - 360) : 0
  // Pink connector: runs from the card's right accent tick (at the title, 32px
  // below the card top) across the gap to the hovered section's left edge.
  const CARD_RIGHT_INSET = 375
  const cardRightX = spaceW - CARD_RIGHT_INSET
  const connectorY = statsTop + 32
  const connectorWidth = section ? Math.max(0, section.left / uiScale - cardRightX) : 0

  return (
    <div className="dashboard" style={{ '--ui-scale': uiScale } as CSSProperties}>
      {/* z-index 0 — the pannable infinite plane, with the screen artboards
          mounted on it. Opens framing the whole atlas (overview), then the
          intro flies into the focused Homepage hub. */}
      <InfiniteCanvas
        showControls={false}
        initial={atlasOverviewViewport(vw, vh)}
      >
        <AtlasBoards focusedId={focusedId} onFocus={focusScreen} resetNonce={resetNonce} />
      </InfiniteCanvas>

      {/* z-index 100 — fixed chrome floating above the plane */}
      <div className="dashboard__chrome">
        {/* Top bar: minimised menu · Map/Screens pills · Screens/Paths stats */}
        <header className="dashboard__topbar">
          <div className="dashboard__widget">
            {/* Hidden while expanded — the pill has morphed into the Sidenav. */}
            {!navOpen && (
              <MinimisedFloatingMenu label="noon Homepage" onClick={() => setNavOpen(true)} />
            )}
          </div>
          <div className="dashboard__widget">
            <TopNav
              variant="right"
              screenCount={ATLAS_SCREENS.length}
              pathCount={ATLAS_LINKS.length}
              onReset={resetAtlas}
            />
          </div>
        </header>

        {/* Map/Screens switch — absolutely centered on the viewport so it stays
            put regardless of the top bar's other widgets (e.g. when the Sidenav
            expands and the "noon Homepage" pill disappears). */}
        <div className="dashboard__widget dashboard__switch">
          <TopSwitch active="map" />
        </div>

        {/* Expanded Sidenav — morphs out of the "noon Homepage" pill, pinned
            top-left with a 20px inset; the header icon collapses it back. */}
        {navOpen && (
          <div className="dashboard__widget dashboard__sidenav">
            <Sidebar variant="default" fill onToggle={() => setNavOpen(false)} />
          </div>
        )}

        {/* Right inspector panel — slides in/out (800ms). The close icon slides
            it out; focusing any artboard slides it back in. */}
        <div className={`dashboard__widget dashboard__right-nav${rightNavOpen ? ' is-open' : ''}`}>
          <RightNav
            title={focused.label}
            src={previewSrc}
            primary={stats.primary}
            secondary={stats.secondary}
            onHoverSection={setSection}
            onClose={() => setRightNavOpen(false)}
          />
        </div>

        {/* Per-section stats — appears to the left of the Right Nav while a
            homepage section block is hovered, with data for that section. */}
        {sectionData && (
          <>
            {/* Pink connector linking the card to the hovered section (Figma 61:96582). */}
            <div
              className="dashboard__connector"
              style={{ top: connectorY, left: cardRightX, width: connectorWidth }}
            />
            <div className="dashboard__section-stats" style={{ top: statsTop }}>
              <StatsBar
                animate
                title={sectionData.stats.title}
                primary={sectionData.stats.primary}
                secondary={sectionData.stats.secondary}
              />
            </div>
          </>
        )}

        {/* Breadcrumb trail, bottom-left */}
        <div className="dashboard__widget dashboard__breadcrumbs">
          <BreadcrumbsTab items={crumbs} onSelect={focusScreen} />
        </div>
      </div>
    </div>
  )
}
