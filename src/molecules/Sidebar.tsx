import { useMemo, useState } from 'react'
import { SidebarRow } from '../components/SidebarRow'
import { MaskIcon } from '../components/MaskIcon'
import { SegmentedControl } from './SegmentedControl'
import type { Project, ProjectId, ProjectKind } from '../domain/types'

type SidebarProps = {
  /** fill the parent's height instead of the fixed 942 design height */
  fill?: boolean
  /** when set, the header sidenav icon becomes a collapse button */
  onToggle?: () => void
  /** Every project and pod available to switch to. */
  projects?: Project[]
  /** The project currently open, so its row reads as selected. */
  activeProjectId?: ProjectId | null
  /** Tap a row → open that project. */
  onSelectProject?: (id: ProjectId) => void
}

/** inner content width — the header frame is 295 in Figma */
const CONTENT_W = 295

/**
 * Figma: Sidebar (component set 41:54662) — variants Default / Hover-selected / Pod.
 * Glass panel: #0A0A0A fill, 1px white/8% border, backdrop blur(4px), radius 16,
 * padding 20 / gap 20, height 942. Header ("Explore" · sidenav icon) +
 * Projects/Pods SegmentedControl + a list of SidebarRow items.
 *
 * The rows are real navigation now: the list comes from project data and tapping a
 * row opens that project. This replaces the old `variant` prop, whose 'hover' case
 * hardcoded "Image first navigation" as highlighted — a static mock of selection
 * that could never reflect what was actually open. Selection derives from
 * `activeProjectId` instead.
 *
 * Projects with no graph yet are marked "empty" rather than hidden or filled with
 * invented screens, so you know what you're getting before you click.
 */
export function Sidebar({
  fill = false,
  onToggle,
  projects = [],
  activeProjectId,
  onSelectProject,
}: SidebarProps) {
  // Open on whichever tab holds the active project, so expanding the sidenav
  // doesn't show a list the current selection isn't in.
  const activeKind = projects.find((p) => p.id === activeProjectId)?.kind ?? 'project'
  const [tab, setTab] = useState<ProjectKind>(activeKind)

  const rows = useMemo(() => projects.filter((p) => p.kind === tab), [projects, tab])

  return (
    <div
      className="tool-surface"
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        padding: 16,
        height: fill ? '100%' : 942,
        maxHeight: fill ? '100%' : undefined,
        overflow: fill ? 'hidden' : undefined,
        boxSizing: 'border-box',
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
            className="tool-control"
            style={{ width: 30, padding: 0 }}
          >
            <MaskIcon src="/icons/sidenav.svg" width={24} height={24} color="#454545" />
          </button>
        ) : (
          <MaskIcon src="/icons/sidenav.svg" width={24} height={24} color="#454545" />
        )}
      </div>

      {/* Body */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignSelf: 'stretch',
          gap: 16,
          minHeight: 0,
        }}
      >
        <SegmentedControl
          width="100%"
          segments={[
            { label: 'Projects', selected: tab === 'project' },
            { label: 'Pods', selected: tab === 'pod' },
          ]}
          onSelect={(i) => setTab(i === 0 ? 'project' : 'pod')}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'stretch',
            overflowY: 'auto',
            minHeight: 0,
          }}
        >
          {rows.length === 0 ? (
            <span
              className="pixel-line"
              style={{
                padding: '12px 8px',
                fontSize: 13,
                lineHeight: '20px',
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              Nothing here yet
            </span>
          ) : (
            rows.map((p) => (
              <SidebarRow
                key={p.id}
                label={p.name}
                selected={p.id === activeProjectId}
                meta={p.seeded ? undefined : 'empty'}
                onClick={onSelectProject ? () => onSelectProject(p.id) : undefined}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
