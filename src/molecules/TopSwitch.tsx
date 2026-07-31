type TopSwitchProps = {
  /** which segment is active */
  active?: 'map' | 'screens'
}

const PINK_FILL = 'rgba(247, 48, 111, 0.2)'
const PINK_BORDER = 'rgba(247, 48, 111, 0.4)'

/**
 * Figma: Top Switch New (node 57:85620).
 * A 160×34 two-segment switch — a 1px white/12% outline, radius 8. The active
 * segment is filled noon-pink (20% fill / 40% border, left corners rounded); the
 * inactive segment is transparent and rendered in "Line" (ELSH 80). Both labels
 * are Geist Pixel 13 / line-height 20.
 *
 * The active segment's pink border overlaps the container outline (negative
 * margins) so the two edges coincide rather than doubling up.
 */
export function TopSwitch({ active = 'map' }: TopSwitchProps) {
  const mapActive = active === 'map'
  const screensActive = active === 'screens'

  const segment = {
    display: 'flex',
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 10,
    boxSizing: 'border-box',
  } as const

  const label = { fontSize: 13, lineHeight: '20px', whiteSpace: 'nowrap' } as const

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        width: 160,
        height: 34,
        boxSizing: 'border-box',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 8,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      {/* Map */}
      <div
        style={{
          ...segment,
          background: mapActive ? PINK_FILL : undefined,
          borderTop: mapActive ? `1px solid ${PINK_BORDER}` : undefined,
          borderBottom: mapActive ? `1px solid ${PINK_BORDER}` : undefined,
          borderLeft: mapActive ? `1px solid ${PINK_BORDER}` : undefined,
          borderRadius: '8px 0 0 8px',
          marginTop: mapActive ? -1 : 0,
          marginBottom: mapActive ? -1 : 0,
          marginLeft: mapActive ? -1 : 0,
        }}
      >
        <span
          className={mapActive ? 'pixel' : 'pixel-line'}
          style={{ ...label, color: mapActive ? '#F7306F' : 'rgba(255, 255, 255, 0.8)' }}
        >
          Map
        </span>
      </div>

      {/* Screens */}
      <div
        style={{
          ...segment,
          background: screensActive ? PINK_FILL : undefined,
          borderTop: screensActive ? `1px solid ${PINK_BORDER}` : undefined,
          borderBottom: screensActive ? `1px solid ${PINK_BORDER}` : undefined,
          borderRight: screensActive ? `1px solid ${PINK_BORDER}` : undefined,
          borderRadius: '0 8px 8px 0',
          marginTop: screensActive ? -1 : 0,
          marginBottom: screensActive ? -1 : 0,
          marginRight: screensActive ? -1 : 0,
        }}
      >
        <span
          className={screensActive ? 'pixel' : 'pixel-line'}
          style={{ ...label, color: screensActive ? '#F7306F' : 'rgba(255, 255, 255, 0.8)' }}
        >
          Screens
        </span>
      </div>
    </div>
  )
}
