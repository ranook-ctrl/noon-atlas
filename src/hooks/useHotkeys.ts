import { useEffect, useRef } from 'react'

export type HotkeyHandlers = Record<string, (e: KeyboardEvent) => void>

/** Don't hijack keys while the user is typing into something. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

/**
 * Global keyboard shortcuts.
 *
 * Keys are normalised to a `mod+k` / `shift+?` / `arrowright` form. `mod` is ⌘ on
 * macOS and Ctrl elsewhere, so one binding covers both.
 *
 * Handlers are read through a ref, so a caller can pass fresh closures every render
 * without re-binding the listener on every keystroke-adjacent state change.
 */
export function useHotkeys(handlers: HotkeyHandlers, enabled = true) {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (e: KeyboardEvent) => {
      // A shortcut must never eat a character someone is typing. `mod+k` is the
      // exception: it should open search from anywhere, including a search box.
      const mod = e.metaKey || e.ctrlKey
      if (isEditable(e.target) && !(mod && e.key.toLowerCase() === 'k')) return

      const parts: string[] = []
      if (mod) parts.push('mod')
      if (e.shiftKey) parts.push('shift')
      if (e.altKey) parts.push('alt')

      const key = e.key.toLowerCase()
      parts.push(key)
      const combo = parts.join('+')

      /*
       * Exact combos only.
       *
       * This used to fall back to `ref.current[key]` when the full combo missed, which
       * meant *any* modifier combination of a registered plain key fired it: `⌘1` also
       * ran fit-all, `⇧←` also walked the graph, and an `⌥`+arrow binding could never be
       * added because the plain arrow handler would swallow it first.
       *
       * The one legitimate case that fallback was covering is punctuation you have to
       * hold Shift to type at all — `?` is `⇧/`, `+` is `⇧=`. There, Shift is *consumed
       * by the character* rather than acting as a modifier, so `?` should match a `?`
       * binding. That's true only for non-alphanumeric single characters; for letters
       * `shift+a` is genuinely distinct from `a`.
       */
      const candidates = [combo]
      if (e.shiftKey && key.length === 1 && !/[a-z0-9]/.test(key)) {
        candidates.push(parts.filter((p) => p !== 'shift').join('+'))
      }

      for (const candidate of candidates) {
        const handler = ref.current[candidate]
        if (handler) {
          handler(e)
          return
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
