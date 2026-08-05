import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { CornerBrackets } from './CornerBrackets'

export type ButtonVariant =
  /** Bordered, transparent fill. The default action shape. */
  | 'outline'
  /** Pink-tinted. For the one affirmative action in a view. */
  | 'accent'
  /** No border until hover. For dismissals and tertiary actions. */
  | 'ghost'
  /** Square, icon-sized. Corner brackets are suppressed — too small to read. */
  | 'icon'

export type ButtonSize = 'sm' | 'md'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  children?: ReactNode
  /** Force brackets off (they're on by default for every variant but `icon`). */
  brackets?: boolean
}

/**
 * The one button in the app.
 *
 * Before this, every action was a bespoke inline-styled `<button>` or — worse — a
 * `<div>` with an `onClick`, each inventing its own padding, radius and hover. This
 * consolidates the shape and the hover so that pointing at anything clickable feels
 * the same, which is the whole point of a system.
 *
 * Shape follows the NeuroField reference's technical register: a tight radius, a 1px
 * hairline, monospace label, and corner brackets that expand on hover.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'outline', size = 'md', brackets, children, className, ...rest },
  ref,
) {
  const showBrackets = brackets ?? variant !== 'icon'
  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      className={[
        'atlas-btn',
        `atlas-btn--${variant}`,
        `atlas-btn--${size}`,
        showBrackets ? 'has-brackets' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {showBrackets && <CornerBrackets />}
      <span className="atlas-btn__label">{children}</span>
    </button>
  )
})
