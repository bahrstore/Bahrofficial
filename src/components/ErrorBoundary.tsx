import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Keeps a render error on one page from blanking the whole site; header, footer and cart keep working. */
export class ErrorBoundary extends Component<{ children: ReactNode; title: string; text: string; action: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(error, info.componentStack) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <section className="pdp">
        <div className="wrap pdp-wrap">
          <div role="alert" className="plp-state error">
            <span className="state-diamond" />
            <h1>{this.props.title}</h1>
            <p>{this.props.text}</p>
            <div className="state-actions">
              <button type="button" className="btn btn-solid" onClick={() => window.location.reload()}>{this.props.action}</button>
            </div>
          </div>
        </div>
      </section>
    )
  }
}
