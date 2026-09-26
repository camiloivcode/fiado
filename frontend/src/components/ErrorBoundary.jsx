import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: 'var(--fondo, #f8fafc)',
          color: 'var(--texto, #0f172a)',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '32px 24px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <AlertTriangle size={30} strokeWidth={2.2} />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}>
              Algo inesperado ocurrió
            </h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px', lineHeight: 1.5 }}>
              La pantalla no pudo cargarse correctamente. Tus datos están a salvo en el sistema. Puedes reintentar o volver al inicio.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={16} strokeWidth={2.5} /> Reintentar
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                style={{
                  flex: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <Home size={16} strokeWidth={2.2} /> Inicio
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
