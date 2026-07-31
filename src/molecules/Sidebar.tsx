import { useState } from 'react'
import { SidebarRow } from '../components/SidebarRow'
import { MaskIcon } from '../components/MaskIcon'
import { SegmentedControl } from './SegmentedControl'

type SidebarVariant = 'default' | 'hover' | 'pod'

type SidebarProps = {
  variant?: SidebarVariant
  /** fill the parent's height instead of the fixed 942 design height */
  fill?: boolean
  /** when set, the header sidenav icon becomes a collapse button */
  onToggle?: () => void
}

/** inner content width — the header frame is 295 in Figma */
const CONTENT_W = 295

const PROJECTS = [
  'Order 2.0',
  'Back to school',
  'Image first navigation',
  'Coupons Revamp V2',
  'Prism V2',
  'Unboxed',
]

const PODS = ['noon one', 'UGC', 'Storefront', 'Sales', 'AFS', 'Special projects']

/**
 * Figma: Sidebar (component set 41:54662) — variants Default / Hover-selected / Pod.
 * Glass panel: #0A0A0A fill, 1px white/8% border, backdrop blur(4px), radius 16,
 * padding 20 / gap 20, height 942. Header ("Explore" · sidenav icon) +
 * Projects/Pods SegmentedControl + a list of SidebarRow items.
 *  - default: Projects tab, project list, nothing highlighted
 *  - hover:   Projects tab, project list, "Image first navigation" highlighted
 *  - pod:     Pods tab, pod list
 */
export function Sidebar({ variant = 'default', fill = false, onToggle }: SidebarProps) {
  // The Projects/Pods tab is switchable: tapping a segment changes which list
  // shows. Seeded from `variant` so the "pod" variant still opens on Pods.
  const [tab, setTab] = useState<'projects' | 'pods'>(variant === 'pod' ? 'pods' : 'projects')
  const isPod = tab === 'pods'
  const rows = isPod ? PODS : PROJECTS
  const highlighted = variant === 'hover' && !isPod ? 'Image first navigation' : null

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
        padding: 20,
        height: fill ? '100%' : 942,
        maxHeight: fill ? '100%' : undefined,
        overflow: fill ? 'hidden' : undefined,
        boxSizing: 'border-box',
        background: '#0A0A0A',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          width: CONTENT_W,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          className="pixel-square"
          style={{ width: 255, fontSize: 20, lineHeight: '28px', color: '#FFFFFF' }}
        >
          Explore
        </span>
        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            <MaskIcon src="/icons/sidenav.svg" width={24} height={24} color="#454545" />
          </button>
        ) : (
          <MaskIcon src="/icons/sidenav.svg" width={24} height={24} color="#454545" />
        )}
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'stretch', gap: 16 }}>
        <SegmentedControl
          width="100%"
          segments={[
            { label: 'Projects', selected: !isPod },
            { label: 'Pods', selected: isPod },
          ]}
          onSelect={(i) => setTab(i === 0 ? 'projects' : 'pods')}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignSelf: 'stretch' }}>
          {rows.map((label) => (
            <SidebarRow key={label} label={label} selected={label === highlighted} />
          ))}
        </div>
      </div>
    </div>
  )
}
