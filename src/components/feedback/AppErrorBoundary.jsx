import { Component } from 'react';

/**
 * Global React error boundary foundation.
 */
export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error('[AppErrorBoundary]', error, info);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-off-white px-4">
          <div className="max-w-md text-center" role="alert">
            <h1 className="mb-2 text-xl font-semibold text-charcoal">Something went wrong</h1>
            <p className="mb-6 text-sm text-muted">
              An unexpected error occurred. You can retry or return home.
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={this.handleRetry}
                className="rounded-md bg-charcoal px-4 py-2 text-sm text-white"
              >
                Retry
              </button>
              <a
                href="/"
                className="rounded-md border border-border bg-surface px-4 py-2 text-sm text-charcoal"
              >
                Go home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
