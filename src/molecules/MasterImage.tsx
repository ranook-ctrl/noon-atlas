import type { Section } from '../domain/types'

export type HoveredSection = { sectionId: string; top: number; left: number }

type MasterImageProps = {
  width?: number
  /** Number (px) or a CSS length like '100%' so the preview can fill a flex column. */
  height?: number | string
  /** the screenshot to render inside the phone frame */
  src?: string
  alt?: string
  /**
   * Hover targets tiled over the image, in render order. Comes from the atlas
   * snapshot and is scoped to the screen being previewed.
   *
   * This used to be a module-level constant of *homepage* sections, applied to
   * whatever image the inspector happened to be showing — so hovering "Mega Deals"
   * over the Cart preview reported homepage numbers for a section the Cart doesn't
   * have. Sections are per-screen data now, and a screen with none simply gets no
   * hover targets.
   */
  sections?: Section[]
  /** hover a section block → its id + on-screen rect (null when leaving) */
  onHoverSection?: (info: HoveredSection | null) => void
}

/**
 * Figma: Master Image (node 25:27389) — a screen mockup in a 264×572 phone frame.
 * The image renders full-width / natural-height and the frame scrolls vertically.
 * Full-width section blocks are tiled over the image as hover targets; hovering one
 * surfaces that section so the dashboard can show a StatsBar for it.
 */
export function MasterImage({
  width = 264,
  height = 572,
  src = '/images/homepage.jpg',
  alt = 'Screen preview',
  sections,
  onHoverSection,
}: MasterImageProps) {
  const blocks = sections ?? []

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
        <img src={src} alt={alt} style={{ display: 'block', width: '100%', height: 'auto' }} />

        {/* Section blocks — transparent, full width, heights proportional to each
            section's weight; each reports itself to the dashboard on hover. */}
        {blocks.length > 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
            {blocks.map((s) => (
              <div
                key={s.id}
                className="master-image__section"
                style={{ flex: s.weight, width: '100%' }}
                onMouseEnter={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  // Reports the section *id*, not its array index. The index-based
                  // version coupled this component's ordering to the dashboard's
                  // lookup, which breaks the moment sections are reorderable.
                  onHoverSection?.({ sectionId: s.id, top: r.top, left: r.left })
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
