import type { ReactNode } from 'react'
import { GridCanvas } from './GridCanvas'

/**
 * The plane, without a graph on it — used for loading, error and empty-project
 * states.
 *
 * These states became reachable for the first time when the graph moved behind an
 * async data layer, and a bare black rectangle reads as "broken" rather than
 * "nothing here yet". This keeps the cross-grid so the surface still looks like the
 * atlas, and says plainly what's going on.
 *
 * It deliberately does NOT mount `InfiniteCanvas`: that component snapshots its
 * initial camera at mount, so mounting it before the graph is known would strand
 * the camera and put the entry screen off-screen with nothing thrown.
 */
export function AtlasShell({
  title,
  detail,
  action,
  showGrid = true,
}: {
  title: string
  detail?: string
  action?: ReactNode
  showGrid?: boolean
}) {
  return (
    <div className="atlas-shell">
      {showGrid && <GridCanvas viewport={{ x: 0, y: 0, scale: 1 }} />}
      <div className="atlas-shell__content">
        <span className="pixel-square atlas-shell__title">{title}</span>
        {detail && <span className="pixel-line atlas-shell__detail">{detail}</span>}
        {action}
      </div>
    </div>
  )
}
