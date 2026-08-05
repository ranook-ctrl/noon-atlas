import { useCallback, useEffect, useState } from 'react'

import { keys, readJson, writeJson } from '../data/local/kv'

export type ViewPrefs = {
  snap: boolean
  minimap: boolean
  isolate: boolean
}

const DEFAULTS: ViewPrefs = { snap: false, minimap: false, isolate: false }

/**
 * View toggles that survive a reload.
 *
 * Deliberately separate from the atlas document: these are *this browser's* preferences,
 * not part of the graph, and persisting them alongside the layout would mean they
 * travelled with a project rather than with the person. Having to re-enable snap every
 * session is the kind of small friction that makes a tool feel unfinished.
 */
export function useViewPrefs() {
  const [prefs, setPrefs] = useState<ViewPrefs>(() => ({
    ...DEFAULTS,
    ...readJson<Partial<ViewPrefs>>(`${keys.projects()}:view-prefs`, {}),
  }))

  useEffect(() => {
    try {
      writeJson(`${keys.projects()}:view-prefs`, prefs)
    } catch {
      // A full quota must not break the UI over a preference.
    }
  }, [prefs])

  const toggle = useCallback((key: keyof ViewPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }))
  }, [])

  return { prefs, toggle }
}
