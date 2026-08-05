import { Button } from '../components/Button'
import { POINTER_HINTS, SHORTCUTS } from '../hooks/shortcuts'
import type { Shortcut } from '../hooks/shortcuts'

const GROUP_ORDER: Shortcut['group'][] = ['Navigate', 'View', 'Edit', 'Canvas']

/**
 * Rows per group, derived from the registered key map plus the pointer hints.
 *
 * This used to be a hand-written array parallel to `Dashboard`'s registration, and the two
 * had drifted: eight live keys were missing from it and it advertised "click — Select a
 * flow" when clicking a board selects the board. Deriving it means the reference card is
 * now a view of what's actually bound.
 */
function rowsFor(group: Shortcut['group']): { keys: string[]; description: string }[] {
  return [
    ...SHORTCUTS.filter((s) => s.group === group && s.keys).map((s) => ({
      keys: s.keys!,
      description: s.description,
    })),
    ...POINTER_HINTS.filter((h) => h.group === group),
  ]
}

/**
 * The shortcut reference.
 *
 * Doubles as onboarding for the one genuinely undiscoverable interaction in the app:
 * plain scroll *pans* and ⌘+scroll *zooms*, which is the opposite of what most people
 * try first and was previously documented nowhere.
 */
export function ShortcutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div
      className="palette__scrim"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="shortcuts" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
        <header className="shortcuts__header">
          <span className="pixel-square shortcuts__title">Shortcuts</span>
          <Button onClick={onClose}>Close</Button>
        </header>
        <div className="shortcuts__grid">
          {GROUP_ORDER.map((group) => (
            <section key={group} className="shortcuts__group">
              <h3 className="pixel-line shortcuts__group-title">{group}</h3>
              {rowsFor(group).map((row) => (
                <div key={row.description} className="shortcuts__row">
                  <span className="shortcuts__keys">
                    {row.keys.map((k, i) => (
                      <kbd key={`${k}-${i}`}>{k}</kbd>
                    ))}
                  </span>
                  <span className="pixel shortcuts__desc">{row.description}</span>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
