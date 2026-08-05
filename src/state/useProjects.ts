import { useEffect, useState } from 'react'

import type { Project } from '../domain/types'
import { atlasRepo } from '../data/repositories'

/**
 * The project list, loaded once.
 *
 * Separate from `AtlasProvider` because it has a different lifetime: the list is
 * needed to *render the switcher*, whereas the provider holds whichever project is
 * currently open. Folding them together would mean the sidebar couldn't paint
 * until the active project's graph had finished loading.
 */
export function useProjects(): { projects: Project[]; loading: boolean } {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    atlasRepo
      .listProjects({ signal: controller.signal })
      .then((list) => {
        if (controller.signal.aborted) return
        setProjects(list)
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        // The switcher degrading to empty is survivable; taking the canvas down
        // with it is not.
        setProjects([])
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  return { projects, loading }
}
