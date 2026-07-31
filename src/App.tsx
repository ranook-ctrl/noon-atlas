import Dashboard from './pages/Dashboard'
import Gallery from './pages/Gallery'

/**
 * App entry.
 *  - default            → the atlas Dashboard landing page (Figma 54:65001)
 *  - ?view=gallery      → the atoms / molecules / sidebar component gallery
 */
export default function App() {
  const view = new URLSearchParams(window.location.search).get('view')
  return view === 'gallery' ? <Gallery /> : <Dashboard />
}
