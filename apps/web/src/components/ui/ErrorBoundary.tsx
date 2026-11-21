import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Cine Match] Erro inesperado na interface:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main
        role="alert"
        style={{
          minHeight: '100dvh',
          background: 'var(--bg-canvas)',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <section
          style={{
            width: '100%',
            maxWidth: 360,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-xl)',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <h1 style={{ fontSize: 22 }}>Ops, algo saiu do roteiro</h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-secondary)' }}>
            Sua sessão continua salva no servidor local. Recarregue a página para reconectar de onde parou.
          </p>
          <Button
            size="lg"
            fullWidth
            icon={<RefreshCw size={17} />}
            onClick={this.handleReload}
          >
            Recarregar aplicativo
          </Button>
        </section>
      </main>
    );
  }
}
