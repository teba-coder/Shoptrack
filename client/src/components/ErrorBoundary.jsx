import { Component } from 'react'

// If any screen crashes, show a message instead of a blank page
export default class ErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { console.error(error) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Reload the page to try again.</p>
          <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    )
  }
}
