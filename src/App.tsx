import Dashboard from './pages/Dashboard'
import Gallery from './pages/Gallery'
import { ErrorBoundary } from './components'
import { AtlasProvider } from './state/AtlasProvider'
import { SEEDED_PROJECT_ID } from './data/seed/noonAtlasSeed'

/**
 * App entry.
 *  - default            → the atlas Dashboard landing page (Figma 54:65001)
 *  - ?view=gallery      → the atoms / molecules / sidebar component gallery
 *
 * Routing is still a read-once query param: there is no `popstate` listener, so
 * browser back/forward does not work even for this one route. That's a known gap —
 * real routing with shareable deep links (`?project&mode&screen&range`) is the
 * next phase, and everything below is already keyed off a project id so it slots in.
 */
export default function App() {
  const params = new URLSearchParams(window.location.search)
  const view = params.get('view')
  const projectId = params.get('project') ?? SEEDED_PROJECT_ID

  if (view === 'gallery') {
    return (
      <ErrorBoundary>
        <Gallery />
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <AtlasProvider initialProjectId={projectId}>
        <Dashboard />
      </AtlasProvider>
    </ErrorBoundary>
  )
}
