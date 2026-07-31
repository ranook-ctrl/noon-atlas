type SectionStat = { label: string; value: string }
export type SectionStats = { title: string; primary: SectionStat[]; secondary: SectionStat[] }
export type HomepageSection = { name: string; weight: number; stats: SectionStats }

/**
 * The homepage image is one tall JPG, so its sections are identified here as
 * full-width blocks weighted by their rough vertical share of the page (≈100
 * total). Each block is a hover target that reveals a StatsBar for that section.
 */
const SECTION_DEFS: { name: string; weight: number }[] = [
  { name: 'Top Nav & Search', weight: 6 },
  { name: 'Welcome Banner', weight: 5 },
  { name: 'Cashback Strip', weight: 3 },
  { name: 'Shop by Category', weight: 9 },
  { name: 'Recommended for you', weight: 12 },
  { name: 'Offers for you', weight: 6 },
  { name: 'Mega Deals', weight: 16 },
  { name: 'Bestsellers', weight: 10 },
  { name: 'Keep shopping for', weight: 6 },
  { name: 'Summer Essentials', weight: 8 },
  { name: 'Selling out fast', weight: 9 },
  { name: 'New Launches', weight: 10 },
]

const rand = (min: number, max: number) => Math.random() * (max - min) + min
const grouped = (min: number, max: number) => Math.round(rand(min, max)).toLocaleString('en-US')

/** Random — but stable for the page's lifetime — stats for one section block. */
function makeStats(title: string): SectionStats {
  return {
    title,
    primary: [
      { label: 'Users per day', value: grouped(50_000, 800_000) },
      { label: 'Impressions', value: `${rand(80, 100).toFixed(1)}%` },
    ],
    secondary: [
      { label: 'GP of Widget', value: rand(0.2, 0.95).toFixed(2) },
      { label: 'Conversion Rate', value: `${rand(0.3, 3).toFixed(2)}%` },
      { label: 'atc_gmv_per_user', value: rand(100, 600).toFixed(2) },
      { label: 'atc_gmv_per_day', value: grouped(500_000, 3_000_000) },
      { label: 'Monetisation_per_day', value: grouped(100_000, 900_000) },
    ],
  }
}

export const HOMEPAGE_SECTIONS: HomepageSection[] = SECTION_DEFS.map((s) => ({
  ...s,
  stats: makeStats(s.name),
}))

type MasterImageProps = {
  width?: number
  height?: number
  /** the homepage screenshot to render inside the phone frame */
  src?: string
  /** hover a section block → its index + on-screen rect (null when leaving) */
  onHoverSection?: (info: { index: number; top: number; left: number } | null) => void
}

/**
 * Figma: Master Image (node 25:27389) — the noon homepage mockup in a 264×572
 * phone frame. The image renders full-width / natural-height and the frame
 * scrolls vertically. Full-width section blocks are tiled over the image as
 * hover targets; hovering one surfaces that section so the dashboard can show a
 * StatsBar for it.
 */
export function MasterImage({
  width = 264,
  height = 572,
  src = '/images/homepage.jpg',
  onHoverSection,
}: MasterImageProps) {
  return (
    <div
      onMouseLeave={() => onHoverSection?.(null)}
      style={{
        width,
        height,
        flex: '0 0 auto',
        borderRadius: 16,
        overflowY: 'auto',
        overflowX: 'hidden',
        background: 'rgba(255, 255, 255, 0.04)',
      }}
    >
      <div style={{ position: 'relative', width: '100%' }}>
        <img src={src} alt="noon Homepage" style={{ display: 'block', width: '100%', height: 'auto' }} />

        {/* Section blocks — transparent, full width, heights proportional to
            each section's weight; each reports itself to the dashboard on hover. */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
          {HOMEPAGE_SECTIONS.map((s, i) => (
            <div
              key={s.name}
              className="master-image__section"
              style={{ flex: s.weight, width: '100%' }}
              onMouseEnter={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                onHoverSection?.({ index: i, top: r.top, left: r.left })
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
