import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * ErrorBoundary — catches any unhandled React render/lifecycle error and
 * shows a friendly recovery screen instead of a blank white page.
 *
 * Wrap around <App /> (or individual sections) in main.jsx.
 * In development the raw error message is shown; in production only the
 * recovery actions are displayed.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to console so it shows in Vercel function logs / browser devtools
    console.error('[ErrorBoundary] Unhandled render error:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = import.meta.env.DEV;

    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        padding: '24px 16px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        gap: 24,
        textAlign: 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72,
          borderRadius: 20,
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={32} color="#f87171" />
        </div>

        {/* Message */}
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
            An unexpected error occurred. Your data is safe — this is only a display issue.
            Try refreshing the page, or go back to the home screen.
          </p>
          {/* Show raw error in development only */}
          {isDev && this.state.error && (
            <pre style={{
              marginTop: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5',
              fontSize: 12,
              textAlign: 'left',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={this.handleReload}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #7c3aed, #a21cce)',
              color: '#fff', fontSize: 14, fontWeight: 700,
            }}
          >
            <RefreshCw size={16} /> Reload Page
          </button>
          <button
            onClick={this.handleHome}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 20px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#d1d5db', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Home size={16} /> Go Home
          </button>
        </div>
      </div>
    );
  }
}
