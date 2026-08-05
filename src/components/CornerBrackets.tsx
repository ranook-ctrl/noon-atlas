/**
 * Four corner brackets that fly outward on hover.
 *
 * Adapted from the NeuroField reference, whose distinctive move is exactly this:
 * bracket marks at the four corners that push out from the box when you point at it,
 * on a snappy spring. It suits this product better than a generic fill-on-hover —
 * it's the same targeting-reticle language as the fit-to-frame glyph in the zoom HUD,
 * and it reads as "locking on" rather than "lighting up".
 *
 * Differences from the reference, deliberately:
 *  · noon pink instead of its greys, so hover uses the one accent this system has.
 *  · brackets start hidden *inside* the box and expand out, rather than sliding in
 *    from a large negative offset — at our control sizes an 18px travel would leave
 *    the marks detached from the button.
 *  · purely decorative, so `aria-hidden` and never a pointer target.
 *
 * The geometry is two borders per span; the motion lives in `.corner-brackets` in the
 * stylesheet so a single rule governs every control that opts in.
 */
export function CornerBrackets() {
  return (
    <span className="corner-brackets" aria-hidden>
      <span className="corner-brackets__mark" data-corner="tl" />
      <span className="corner-brackets__mark" data-corner="tr" />
      <span className="corner-brackets__mark" data-corner="br" />
      <span className="corner-brackets__mark" data-corner="bl" />
    </span>
  )
}
