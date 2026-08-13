import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

/**
 * The last line of defence.
 *
 * Before this existed, a single bad screen id anywhere in the canvas — a dangling
 * flow, a focused screen that had been deleted, a corrupt stored layout — threw
 * inside render and the user got a silent white page. With screens becoming
 * data-driven and editable, that stopped being a theoretical risk.
 *
 * Kept deliberately plain: it must not depend on anything that could itself be the
 * thing that broke.
 */

type Props = {
  children: ReactNode
  /** Shown instead of the default panel. */
  fallback?: (error: Error, reset: () => void) => ReactNode
  /** Hook for logging to a real reporter later. */
  onError?: (error: Error, info: ErrorInfo) => void
}

type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[atlas] render error', error, info.componentStack)
    this.props.onError?.(error, info)
  }

  private reset = () => this.setState({ error: null })

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    if (this.props.fallback) return this.props.fallback(error, this.reset)

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          background: '#000000',
          color: '#FFFFFF',
          textAlign: 'center',
        }}
      >
        <span className="pixel-square" style={{ fontSize: 20, lineHeight: '28px' }}>
          The atlas hit an error
        </span>
        <span
          className="pixel"
          style={{
            fontSize: 13,
            lineHeight: '20px',
            color: 'rgba(255, 255, 255, 0.5)',
            maxWidth: 460,
          }}
        >
          {error.message}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="atlas-error__action" onClick={this.reset}>
            Try again
          </button>
          <button
            type="button"
            className="atlas-error__action"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    )
  }
}
