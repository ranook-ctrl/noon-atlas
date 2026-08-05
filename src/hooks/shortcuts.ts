/**
 * The key map — one table, two consumers.
 *
 * `Dashboard` registers handlers from this list and `ShortcutSheet` renders its reference
 * card from the same list, so the two cannot disagree. They previously were two
 * hand-maintained arrays and had already drifted badly: eight registered keys were
 * undocumented (`⌘A`, `⌘Z`, `⇧⌘Z`, `V`, `H`, `I`, `O`, `G`) and the sheet advertised
 * "click — Select a flow" when clicking a board selects the board.
 *
 * Drift is now a type error rather than a discrepancy nobody notices: the handler map in
 * `Dashboard` is keyed by `ShortcutId`, so omitting one or inventing one fails to compile.
 */

import type { HotkeyHandlers } from './useHotkeys'

export type ShortcutId =
  | 'palette'
  | 'shortcuts'
  | 'dismiss'
  | 'selectAll'
  | 'undo'
  | 'redo'
  | 'toolSelect'
  | 'toolPan'
  | 'toggleIsolate'
  | 'toggleMinimap'
  | 'toggleSnap'
  | 'deleteSelection'
  | 'modeMap'
  | 'modeScreens'
  | 'fitAll'
  | 'focusCurrent'
  | 'zoomIn'
  | 'zoomOut'
  | 'zoomReset'
  | 'walkOut'
  | 'walkIn'
  | 'walkNext'
  | 'walkPrev'

export interface Shortcut {
  id: ShortcutId
  /**
   * Combos that trigger it, in `useHotkeys` form. More than one where a key has genuine
   * synonyms — `+` and `=` are the same physical key with and without Shift.
   */
  combos: string[]
  /** How the sheet draws it. Omit to register without advertising. */
  keys?: string[]
  group: 'Navigate' | 'View' | 'Edit' | 'Canvas'
  description: string
  /**
   * true → keeps working while a dialog owns the keyboard.
   *
   * Everything else is suspended, because single-letter bindings used to fire *behind* an
   * open shortcut sheet: pressing `M` while reading the sheet silently switched mode.
   */
  whileModal?: boolean
}

export const SHORTCUTS: Shortcut[] = [
  // ── Navigate ──────────────────────────────────────────────────────────────
  { id: 'palette', combos: ['mod+k'], keys: ['⌘', 'K'], group: 'Navigate', description: 'Search screens, flows, projects', whileModal: true },
  { id: 'walkOut', combos: ['arrowright'], keys: ['→'], group: 'Navigate', description: 'Follow the first outbound flow' },
  { id: 'walkIn', combos: ['arrowleft'], keys: ['←'], group: 'Navigate', description: 'Step back along an inbound flow' },
  { id: 'walkPrev', combos: ['arrowup'], keys: ['↑'], group: 'Navigate', description: 'Previous sibling screen' },
  { id: 'walkNext', combos: ['arrowdown'], keys: ['↓'], group: 'Navigate', description: 'Next sibling screen' },

  // ── View ──────────────────────────────────────────────────────────────────
  { id: 'modeMap', combos: ['m'], keys: ['M'], group: 'View', description: 'Map' },
  { id: 'modeScreens', combos: ['s'], keys: ['S'], group: 'View', description: 'Screens' },
  { id: 'fitAll', combos: ['1'], keys: ['1'], group: 'View', description: 'Fit all screens' },
  { id: 'focusCurrent', combos: ['2'], keys: ['2'], group: 'View', description: 'Focus the current screen' },
  { id: 'zoomIn', combos: ['+', '='], keys: ['+'], group: 'View', description: 'Zoom in' },
  { id: 'zoomOut', combos: ['-'], keys: ['−'], group: 'View', description: 'Zoom out' },
  { id: 'zoomReset', combos: ['0'], keys: ['0'], group: 'View', description: 'Reset zoom' },
  { id: 'toggleMinimap', combos: ['o'], keys: ['O'], group: 'View', description: 'Minimap' },
  { id: 'toggleIsolate', combos: ['i'], keys: ['I'], group: 'View', description: 'Isolate neighbourhood' },

  // ── Edit ──────────────────────────────────────────────────────────────────
  { id: 'undo', combos: ['mod+z'], keys: ['⌘', 'Z'], group: 'Edit', description: 'Undo' },
  { id: 'redo', combos: ['mod+shift+z'], keys: ['⇧', '⌘', 'Z'], group: 'Edit', description: 'Redo' },
  { id: 'selectAll', combos: ['mod+a'], keys: ['⌘', 'A'], group: 'Edit', description: 'Select all screens' },
  { id: 'toggleSnap', combos: ['g'], keys: ['G'], group: 'Edit', description: 'Snap to grid' },
  // Both, because macOS keyboards label the key ⌫ while full keyboards send 'delete'.
  { id: 'deleteSelection', combos: ['backspace', 'delete'], keys: ['⌫'], group: 'Edit', description: 'Delete the selection' },

  // ── Canvas ────────────────────────────────────────────────────────────────
  { id: 'toolSelect', combos: ['v'], keys: ['V'], group: 'Canvas', description: 'Select tool' },
  { id: 'toolPan', combos: ['h'], keys: ['H'], group: 'Canvas', description: 'Pan tool — or hold Space' },
  { id: 'dismiss', combos: ['escape'], keys: ['esc'], group: 'Canvas', description: 'Dismiss / clear selection', whileModal: true },
  { id: 'shortcuts', combos: ['?'], keys: ['?'], group: 'Canvas', description: 'This sheet', whileModal: true },
]

/**
 * Reference rows the sheet shows that aren't keystrokes at all.
 *
 * The pan/zoom pair is the one genuinely undiscoverable interaction in the app — plain
 * scroll pans and ⌘+scroll zooms, which is the opposite of what most people try first.
 */
export const POINTER_HINTS: { keys: string[]; group: Shortcut['group']; description: string }[] = [
  { keys: ['scroll'], group: 'Canvas', description: 'Pan' },
  { keys: ['⌘', 'scroll'], group: 'Canvas', description: 'Zoom' },
  { keys: ['drag'], group: 'Canvas', description: 'Move a screen' },
  { keys: ['click'], group: 'Canvas', description: 'Select a screen — or a flow line' },
  { keys: ['⇧', 'click'], group: 'Canvas', description: 'Add to the selection' },
]

/** Expand the table into the `combo → handler` map `useHotkeys` wants. */
export function bindShortcuts(
  shortcuts: Shortcut[],
  handlers: Record<ShortcutId, (e: KeyboardEvent) => void>,
): HotkeyHandlers {
  const out: HotkeyHandlers = {}
  for (const s of shortcuts) {
    for (const combo of s.combos) out[combo] = handlers[s.id]
  }
  return out
}
