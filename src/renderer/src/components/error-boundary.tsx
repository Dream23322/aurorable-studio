import { Component, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full place-items-center p-6">
          <div className="max-w-md rounded-lg border border-destructive/50 p-6 text-center">
            <p className="mb-2 text-sm font-bold text-destructive">something went wrong</p>
            <p className="mb-4 break-all text-xs text-muted-foreground">{this.state.error.message}</p>
            <button
              className="rounded-md border border-aurora-bright px-3 py-1.5 text-sm text-aurora-pink hover:bg-accent"
              onClick={() => this.setState({ error: null })}
            >
              try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}