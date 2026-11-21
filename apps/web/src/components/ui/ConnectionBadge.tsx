import type { SocketConnectionState } from '../../stores/sessionStore';
import styles from './ConnectionBadge.module.css';

interface ConnectionBadgeProps {
  state: SocketConnectionState;
  onClick?: () => void;
}

const LABELS: Record<SocketConnectionState, string> = {
  connected: 'Rede local ativa',
  connecting: 'Conectando...',
  reconnecting: 'Reconectando...',
  disconnected: 'Desconectado',
  unavailable: 'Servidor indisponível',
};

export function ConnectionBadge({ state, onClick }: ConnectionBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={styles.pill}
      data-testid="connection-badge"
      aria-label={`Status de conexão: ${LABELS[state]}. Clique para ver diagnóstico da rede local.`}
    >
      <span className={`${styles.dot} ${styles[state]}`} aria-hidden="true" />
      <span>{LABELS[state]}</span>
    </button>
  );
}
