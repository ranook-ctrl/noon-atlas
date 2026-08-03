import { FlowRow } from '../components/FlowRow'

type FlowStat = { label: string; value: string }

type FlowStatsProps = {
  /** dim line above the title, e.g. "Homepage Banner to" */
  eyebrow?: string
  /** the flow destination title, e.g. "Search Page" */
  title?: string
  /** first group — green markers (funnel / conversion metrics) */
  primary?: FlowStat[]
  /** second group — orange markers (monetary metrics) */
  secondary?: FlowStat[]
  /** roll the right-hand values (slot-machine) when they change */
  animate?: boolean
}

const GREEN = '#26B57C'
const ORANGE = '#FFA852'

const DEFAULT_PRIMARY: FlowStat[] = [
  { label: 'Entry-point CTR', value: '11.2%' },
  { label: 'Downstream conversion', value: '22.8%' },
  { label: 'Drop off rate', value: '61%' },
]

const DEFAULT_SECONDARY: FlowStat[] = [
  { label: 'atc_gmv_per_user', value: '375.53' },
  { label: 'atc_gmv_per_day', value: '1,948,837' },
  { label: 'Monetisation_per_day', value: '380,000' },
  { label: 'GP contribution', value: '6.7%' },
]

/**
 * Figma: Flow Stat's bar (node 129:104237).
 * Card: white/4% fill, 1px white/8% border, backdrop blur(60px), radius 16,
 * padding 16/20/20, column gap 20, hug both axes. A 1×24 pink (#F7306F) accent
 * tick sits on the card's left edge beside the title (absolute, top 39).
 * Header (gap 4): dim eyebrow (Regular / ELSH 0, 14, white 50%) + title
 * (Square / ELSH 1, 20, white). Then two groups of Flow - Row atoms —
 * green markers, then orange.
 */
export function FlowStats({
  eyebrow = 'Homepage Banner to',
  title = 'Search Page',
  primary = DEFAULT_PRIMARY,
  secondary = DEFAULT_SECONDARY,
  animate = false,
}: FlowStatsProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        boxSizing: 'border-box',
        gap: 20,
        padding: '16px 20px 20px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        backdropFilter: 'blur(60px)',
        WebkitBackdropFilter: 'blur(60px)',
      }}
    >
      {/* header — eyebrow + title */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span
          className="pixel"
          style={{ fontSize: 14, lineHeight: 'normal', color: 'rgba(255, 255, 255, 0.5)' }}
        >
          {eyebrow}
        </span>
        <div style={{ position: 'relative', alignSelf: 'flex-start' }}>
          {/* pink accent tick on the card's left edge, centred on the title */}
          <span
            style={{
              position: 'absolute',
              left: -20,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 1,
              height: 24,
              background: '#F7306F',
            }}
          />
          <span
            className="pixel-square"
            style={{ fontSize: 20, lineHeight: 1, color: '#FFFFFF', whiteSpace: 'nowrap' }}
          >
            {title}
          </span>
        </div>
      </div>

      {/* group 1 — green markers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {primary.map((s, i) => (
          <FlowRow
            key={`p-${i}`}
            label={s.label}
            value={s.value}
            markerColor={GREEN}
            fill
            animateValue={animate}
          />
        ))}
      </div>

      {/* group 2 — orange markers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {secondary.map((s, i) => (
          <FlowRow
            key={`s-${i}`}
            label={s.label}
            value={s.value}
            markerColor={ORANGE}
            fill
            animateValue={animate}
          />
        ))}
      </div>
    </div>
  )
}
