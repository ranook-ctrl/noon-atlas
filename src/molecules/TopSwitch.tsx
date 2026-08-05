import { SegmentedControl } from './SegmentedControl'

export type AtlasMode = 'map' | 'screens'

const MODES: AtlasMode[] = ['map', 'screens']

type TopSwitchProps = {
  /** which segment is active */
  active?: AtlasMode
  /** tap a segment → switch mode. Omit for a static, display-only switch. */
  onChange?: (mode: AtlasMode) => void
}

/**
 * Figma: Top Switch New (node 57:85620) — the Map / Screens mode switch.
 *
 * Now a thin wrapper over `SegmentedControl` rather than its own implementation. It was
 * a hand-rolled copy: same two-segment track, same pink active chip, same everything —
 * built with a negative-margin border trick to make the chip's edges coincide with the
 * container's. Sharing the real control means the selection *slides* between Map and
 * Screens like every other selection in the app, and the border trick disappears
 * because the sliding indicator simply sits inside the track.
 */
export function TopSwitch({ active = 'map', onChange }: TopSwitchProps) {
  return (
    <SegmentedControl
      width={160}
      height={34}
      tone="accent"
      ariaLabel="Atlas view"
      borderColor="rgba(255, 255, 255, 0.12)"
      segments={MODES.map((m) => ({
        label: m === 'map' ? 'Map' : 'Screens',
        selected: active === m,
      }))}
      onSelect={onChange ? (i) => onChange(MODES[i]) : undefined}
    />
  )
}
