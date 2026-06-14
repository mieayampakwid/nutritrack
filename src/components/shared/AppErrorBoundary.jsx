import { Component } from 'react'

export class AppErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            padding: '1.5rem',
            fontFamily: 'system-ui, sans-serif',
            background: '#fef2f2',
            color: '#7f1d1d',
          }}
        >
          <h1 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem' }}>Aplikasi gagal dimuat</h1>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem' }}>
            Buka konsol pengembang (F12 → Console) untuk detail. Muat ulang setelah memperbaiki kode atau
            lingkungan.
          </p>
          <pre
            style={{
              fontSize: '0.75rem',
              overflow: 'auto',
              padding: '0.75rem',
              background: '#fff',
              border: '1px solid #fecaca',
              borderRadius: '6px',
            }}
          >
            {this.state.error?.message ?? String(this.state.error)}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
