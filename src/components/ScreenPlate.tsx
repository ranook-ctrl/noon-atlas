import { memo } from 'react'
import { CornerBrackets } from './CornerBrackets'

export type PlateStat = { label: string; value: string }

/**
 * A screen shown whole, for the Mobbin-shaped Screens browser.
 *
 * The inverse of `ScreenCard`, which it replaces on this surface: there, the numbers
 * led and the thumbnail was a 190px-tall crop supporting them. Here the artboard is
 * the entire object and every number is deferred to hover, because the browser's job
 * is "let me scan the app", and a grid where each tile is half chrome can't do that —
 * you end up reading captions instead of looking at screens.
 *
 * Consequences of that, both deliberate:
 *
 *   The image is `contain` at the artboard's own 400×865, at full opacity. Not
 *   `cover` — cropping is what made the old card unable to show a screen, and a
 *   design review can't happen against a cropped top third.
 *
 *   Nothing is labelled at rest. A resting grid of unlabelled screens is harder to
 *   search by name (use the rail or the search box for that) and much easier to scan
 *   by appearance, which is the trade Mobbin makes and the one asked for here.
 */
export const ScreenPlate = memo(function ScreenPlate({
  label,
  imageUrl,
  stats = [],
  selected = false,
  /** Position in the journey, when shown inside a filmstrip. */
  step,
  delayMs = 0,
  onClick,
}: {
  label: string
  imageUrl: string
  /**
   * Every metric, rendered at one level.
   *
   * There was a `headline` slot promoting Users-per-day to 19px with the rest as small
   * supporting figures. That was a claim about importance the data doesn't make — the
   * repository returns `primary` and `secondary` groups, but within a screen all seven
   * are things someone came here to read, and typography that big says "this is the
   * answer" about a number that is only the first one.
   */
  stats?: PlateStat[]
  selected?: boolean
  step?: number
  delayMs?: number
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      className={`screen-plate has-brackets${selected ? ' is-selected' : ''}`}
      style={{ ['--card-delay' as string]: `${delayMs}ms` }}
      onClick={onClick}
      // The accessible name has to carry what the visual defers to hover, or the grid
      // is 17 buttons all announced as "screen".
      aria-label={
        stats.length ? `${label} — ${stats.map((s) => `${s.label} ${s.value}`).join(', ')}` : label
      }
    >
      <CornerBrackets />

      <span className="screen-plate__frame">
        <img src={imageUrl} alt="" loading="lazy" decoding="async" draggable={false} />

        {step != null && (
          <span className="pixel screen-plate__step" aria-hidden>
            {String(step).padStart(2, '0')}
          </span>
        )}

        {/* Rendered always, revealed by CSS on hover/focus. Mounting it on hover
            instead would mean the first frame of the transition has no element to
            animate, so the panel would pop rather than fade. */}
        <span className="screen-plate__info">
          <span className="pixel screen-plate__name">{label}</span>
          {stats.length > 0 && (
            <span className="screen-plate__stats">
              {stats.map((s) => (
                <span key={s.label} className="screen-plate__stat">
                  <span className="pixel-line screen-plate__stat-label">{s.label}</span>
                  <span className="pixel screen-plate__stat-value">{s.value}</span>
                </span>
              ))}
            </span>
          )}
        </span>
      </span>
    </button>
  )
})
