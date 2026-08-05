import { Pill } from '../components/Pill'
import { TopPills } from '../components/TopPills'
import { MaskIcon } from '../components/MaskIcon'

type TopNavProps = {
  variant?: 'left' | 'right'
  /** Screens pill count — the total number of artboards on the canvas. */
  screenCount?: number
  /** Paths pill count — the number of flow arrows drawn between artboards. */
  pathCount?: number
  /** refresh icon click — resets the canvas to the start screen (Homepage). */
  onReset?: () => void
}

/**
 * Figma: Top Nav (node 27:30665) — variants Left / right.
 * Floating bar: black 60% fill, 1px white/8% border, backdrop blur(20px), radius 12.
 *  - Left:  Pills (Map selected · Screens)                 — padding 11×12, gap 12
 *  - right: Top Pills (Screens · Paths) + refresh          — padding 11×16, gap 16
 *           counts are live (artboards / arrows); refresh resets to Homepage.
 */
export function TopNav({ variant = 'left', screenCount = 48, pathCount = 121, onReset }: TopNavProps) {
  const shell = {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    background: 'rgba(0, 0, 0, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  }

  if (variant === 'left') {
    return (
      <div style={{ ...shell, gap: 12, padding: '11px 12px' }}>
        <Pill label="Map" selected />
        <Pill label="Screens" />
      </div>
    )
  }

  return (
    <div
      style={{
        ...shell,
        display: 'flex',
        height: 34,
        padding: '11px 16px',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        boxSizing: 'border-box',
      }}
    >
      <TopPills
        label="Screens"
        count={screenCount}
        labelClassName="pixel-grid"
        labelColor="rgba(255, 255, 255, 0.8)"
        spin
      />
      <TopPills
        label="Paths"
        count={pathCount}
        labelClassName="pixel-grid"
        labelColor="rgba(255, 255, 255, 0.8)"
        spin
      />
      <span
        onClick={onReset}
        role={onReset ? 'button' : undefined}
        aria-label={onReset ? 'Reset to Homepage' : undefined}
        style={{
          display: 'inline-flex',
          width: 16,
          height: 16,
          alignItems: 'center',
          justifyContent: 'center',
          cursor: onReset ? 'pointer' : undefined,
        }}
      >
        <MaskIcon src="/icons/refresh.svg" width={16} height={16} color="#FFFFFF" />
      </span>
    </div>
  )
}
