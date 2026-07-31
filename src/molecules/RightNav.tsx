import { DeviceSize } from '../components/DeviceSize'
import { Row } from '../components/Row'
import { MaskIcon } from '../components/MaskIcon'
import { MasterImage } from './MasterImage'

/** inner content column width (Device Size + tabs are 299/300 in Figma) */
const CONTENT_W = 299

/**
 * Figma: node 54:80782 — the page-stats section tabs.
 * A 300×36 strip with a 1px white/12% hairline border, radius 8. The active
 * "Page Stats" tab is a noon-pink chip bonded to the left edge: 20% fill, a
 * 40% pink border on top/left/bottom only (no right), left corners rounded, and
 * Regular text (#F7306F). "Navigate to" (96px) and "Reached from" (fills) are
 * inactive — Line style, white/80% — with a single 1px/20 divider before the
 * last tab. The active chip's pink border replaces the container hairline on
 * its three edges (negative margins), so the edges coincide rather than double.
 */
function SectionTabs() {
  const tab = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    boxSizing: 'border-box',
    padding: 10,
    fontSize: 13,
    lineHeight: '20px',
    whiteSpace: 'nowrap',
  } as const

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: CONTENT_W,
        height: 36,
        boxSizing: 'border-box',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 8,
      }}
    >
      {/* Page Stats — active, pink chip bonded to the left edge */}
      <div
        className="pixel"
        style={{
          ...tab,
          width: 96,
          flex: '0 0 auto',
          color: '#F7306F',
          background: 'rgba(247, 48, 111, 0.2)',
          borderTop: '1px solid rgba(247, 48, 111, 0.4)',
          borderBottom: '1px solid rgba(247, 48, 111, 0.4)',
          borderLeft: '1px solid rgba(247, 48, 111, 0.4)',
          borderRadius: '8px 0 0 8px',
          marginTop: -1,
          marginBottom: -1,
          marginLeft: -1,
        }}
      >
        Page Stats
      </div>

      {/* Navigate to — inactive */}
      <div className="pixel-line" style={{ ...tab, width: 96, flex: '0 0 auto', color: 'rgba(255, 255, 255, 0.8)' }}>
        Navigate to
      </div>

      {/* divider before the last tab */}
      <span style={{ width: 1, height: 20, background: 'rgba(255, 255, 255, 0.12)', flex: '0 0 auto' }} />

      {/* Reached from — inactive, fills the remaining width */}
      <div className="pixel-line" style={{ ...tab, flex: '1 1 auto', color: 'rgba(255, 255, 255, 0.8)' }}>
        Reached from
      </div>
    </div>
  )
}

type Stat = { label: string; value: string }

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

function StatGroup({ stats }: { stats: Stat[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: CONTENT_W }}>
      {stats.map((s, i) => (
        <Row key={i} label={s.label} value={s.value} prefix={false} spread animateValue />
      ))}
    </div>
  )
}

/**
 * Figma: Right Nav (node 27:32356).
 * Glass inspector panel: white/4% fill, 1px white/8% border, backdrop blur(4px),
 * radius 16, column padding 20 / gap 20. Header (title + close) · Device Size ·
 * homepage preview · Pills row · two Row stat groups.
 *
 * Height is variable: the panel fills whatever height its parent gives it
 * (viewport minus the top bar, on the dashboard). The header is pinned; the body
 * below flexes to fill the space left and scrolls when the content overflows.
 * When the parent is unbounded (e.g. the gallery) the panel hugs its content.
 */
type RightNavProps = {
  /** forwarded to the homepage preview — hover a section block (null on leave) */
  onHoverSection?: (info: { index: number; top: number; left: number } | null) => void
  /** title + preview image of the artboard currently in focus on the canvas */
  title?: string
  src?: string
  /** per-artboard stat groups (roll to fresh values as the focus changes) */
  primary?: Stat[]
  secondary?: Stat[]
  /** close icon → slide the panel out */
  onClose?: () => void
}

export function RightNav({
  onHoverSection,
  title = 'Homepage',
  src,
  primary = GROUP_A,
  secondary = GROUP_B,
  onClose,
}: RightNavProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        padding: '20px 20px 0',
        height: '100%',
        maxHeight: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
      }}
    >
      {/* Header — title + close (pinned; the body below fills the rest) */}
      <div
        style={{
          display: 'flex',
          width: CONTENT_W,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '0 2px',
          flex: '0 0 auto',
        }}
      >
        <span className="pixel-square" style={{ fontSize: 24, lineHeight: '32px', color: '#FFFFFF' }}>
          {title}
        </span>
        <span
          onClick={onClose}
          role={onClose ? 'button' : undefined}
          aria-label={onClose ? 'Close panel' : undefined}
          style={{
            display: 'inline-flex',
            width: 32,
            height: 32,
            alignItems: 'center',
            justifyContent: 'center',
            cursor: onClose ? 'pointer' : undefined,
          }}
        >
          <MaskIcon src="/icons/close.svg" width={11} height={11} color="#FFFFFF" />
        </span>
      </div>

      {/* Body — flexes to fill the space left under the header (viewport-based),
          scrolls when the content is taller than the available height. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: CONTENT_W,
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Content keeps its natural height (flex-shrink:0) so the body scrolls
            instead of compressing the fixed-size children — the 36px section
            tabs and the phone preview stay their designed size. */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
          }}
        >
          {/* Device selector */}
          <DeviceSize device="iphone 13 Pro" dimensions="375 x 812" width={CONTENT_W} />

          {/* Phone preview of the focused artboard */}
          <MasterImage width={264} height={572} src={src} onHoverSection={onHoverSection} />

          {/* Section tabs (segmented control) */}
          <SectionTabs />

          {/* Stat groups — randomised per artboard, rolled on change */}
          <StatGroup stats={primary} />
          <StatGroup stats={secondary} />
        </div>
      </div>
    </div>
  )
}
