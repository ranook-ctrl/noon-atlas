type PillProps = {
  label: string
  selected?: boolean
}

/**
 * Figma: Pills (node 25:22917) — variants Selected / Default.
 * Row, padding 8×12, gap 10, radius 8. Geist Pixel 14 / -0.01em.
 * Selected uses noon pink (#F7306F) at 20% fill / 40% border.
 */
export function Pill({ label, selected = false }: PillProps) {
  const background = selected ? 'rgba(247, 48, 111, 0.2)' : 'rgba(255, 255, 255, 0.04)'
  const borderColor = selected ? 'rgba(247, 48, 111, 0.4)' : 'rgba(255, 255, 255, 0.16)'
  const color = selected ? '#F7306F' : 'rgba(255, 255, 255, 0.5)'

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '8px 12px',
        background,
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        flex: '0 0 auto',
      }}
    >
      <span
        className="pixel"
        style={{
          fontSize: 14,
          lineHeight: 1,
          letterSpacing: '-0.01em',
          color,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </div>
  )
}
