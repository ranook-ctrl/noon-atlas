import { Fragment } from 'react'

export type Segment = { label: string; selected?: boolean }

type SegmentedControlProps = {
  segments: Segment[]
  width?: number | string
  height?: number
  borderColor?: string
  /** fill behind the selected segment */
  selectedBg?: string
  selectedColor?: string
  unselectedColor?: string
  fontSize?: number
  /** draw a 1px divider after these segment indices */
  dividerAfter?: number[]
  dividerColor?: string
  /** tap a segment → its index (makes the segments interactive) */
  onSelect?: (index: number) => void
}

/**
 * Segmented control — a bordered, rounded row of equal-width segments.
 * The selected segment gets a fill + Geist Pixel "Regular"; the others render
 * in "Line". Used by both the Sidebar tabs (Projects/Pods) and the Right Nav
 * page-stats tabs (Figma nodes 41:54662 header + 53:64966).
 */
export function SegmentedControl({
  segments,
  width = '100%',
  height = 36,
  borderColor = 'rgba(255, 255, 255, 0.04)',
  selectedBg = 'rgba(255, 255, 255, 0.04)',
  selectedColor = '#FFFFFF',
  unselectedColor = '#FFFFFF',
  fontSize = 13,
  dividerAfter = [],
  dividerColor = 'rgba(255, 255, 255, 0.08)',
  onSelect,
}: SegmentedControlProps) {
  return (
    <div
      style={{
        display: 'flex',
        width,
        height,
        flexShrink: 0,
        alignItems: 'stretch',
        border: `1px solid ${borderColor}`,
        borderRadius: 8,
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {segments.map((s, i) => (
        <Fragment key={i}>
          <div
            onClick={onSelect ? () => onSelect(i) : undefined}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              cursor: onSelect ? 'pointer' : undefined,
              background: s.selected ? selectedBg : undefined,
            }}
          >
            <span
              className={s.selected ? 'pixel' : 'pixel-line'}
              style={{
                fontSize,
                lineHeight: '20px',
                color: s.selected ? selectedColor : unselectedColor,
                whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </span>
          </div>
          {dividerAfter.includes(i) && i < segments.length - 1 && (
            <span
              style={{ alignSelf: 'center', width: 1, height: 20, background: dividerColor, flex: '0 0 auto' }}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}
