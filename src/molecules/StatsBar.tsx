import { Row } from '../components/Row'

type Stat = { label: string; value: string }

type StatsBarProps = {
  title?: string
  /** first group — green markers */
  primary?: Stat[]
  /** second group — orange markers */
  secondary?: Stat[]
  /** roll the values (slot-machine) when they change */
  animate?: boolean
}

const GREEN = '#26B57C'
const ORANGE = '#FFA852'

const DEFAULT_PRIMARY: Stat[] = [
  { label: 'Users per day', value: '583097' },
  { label: 'Impressions', value: '100.0%' },
]

const DEFAULT_SECONDARY: Stat[] = [
  { label: 'GP of Widget', value: '0.67' },
  { label: 'Conversion Rate', value: '0.89%' },
  { label: 'atc_gmv_per_user', value: '375.53 ' },
  { label: 'atc_gmv_per_day', value: '1,948,837' },
  { label: 'Monetisation_per_day', value: '380,000' },
]

/**
 * Figma: Stat's bar (node 25:22918).
 * Card: white/4% fill, 1px white/8% border, backdrop blur(60px), radius 16, padding 20, gap 20.
 * Title (Geist Pixel "Square" 24) + two groups of Row atoms (green then orange markers).
 * Two 1×24 pink (#F7306F) accent ticks flank the title at the card's left/right edges.
 */
export function StatsBar({
  title = 'Homepage Banner',
  primary = DEFAULT_PRIMARY,
  secondary = DEFAULT_SECONDARY,
  animate = false,
}: StatsBarProps) {
  const tick = {
    position: 'absolute' as const,
    top: 20,
    width: 1,
    height: 24,
    background: '#F7306F',
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        width: 320,
        flexShrink: 0,
        boxSizing: 'border-box',
        gap: 20,
        padding: 20,
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        backdropFilter: 'blur(60px)',
        WebkitBackdropFilter: 'blur(60px)',
      }}
    >
      {/* pink accent ticks at the card edges, aligned with the title */}
      <span style={{ ...tick, left: 0 }} />
      <span style={{ ...tick, right: 0 }} />

      <div
        className="pixel-square"
        style={{ fontSize: 20, lineHeight: 1, color: '#FFFFFF', whiteSpace: 'nowrap' }}
      >
        {title}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {primary.map((s, i) => (
          <Row key={`p-${i}`} label={s.label} value={s.value} markerColor={GREEN} fill animateValue={animate} />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {secondary.map((s, i) => (
          <Row key={`s-${i}`} label={s.label} value={s.value} markerColor={ORANGE} fill animateValue={animate} />
        ))}
      </div>
    </div>
  )
}
