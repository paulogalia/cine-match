import { useState } from 'react';
import { RefreshCw, ShieldAlert, Wifi } from 'lucide-react';
import { checkServerHealth } from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function NetworkDiagnosticsModal() {
  const open = useSessionStore((s) => s.diagnosticsOpen);
  const setOpen = useSessionStore((s) => s.setDiagnosticsOpen);
  const connectionState = useSessionStore((s) => s.connectionState);
  const networkInfo = useSessionStore((s) => s.networkInfo);
  const [healthResult, setHealthResult] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    const ok = await checkServerHealth();
    setHealthResult(ok ? 'ok' : 'fail');
    setTesting(false);
  };

  return (
    <Modal open={open} title="Diagnóstico da Rede Local" onClose={() => setOpen(false)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 14, color: 'var(--text-secondary)' }}>
        <div
          style={{
            padding: 14,
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 600 }}>
            <Wifi size={16} />
            <span>Conexão atual: {connectionState}</span>
          </div>
          {networkInfo && (
            <span style={{ fontSize: 13 }}>
              Endereço principal: <code style={{ color: 'var(--text-primary)' }}>{networkInfo.primaryUrl}</code>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 600 }}>
            <ShieldAlert size={16} />
            <span>Se o outro celular não conseguir abrir:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li>Confirme que ambos os aparelhos estão no <strong>mesmo Wi-Fi</strong> (não em dados móveis nem rede Visitantes).</li>
            <li>Verifique se o <strong>firewall</strong> do computador permite conexões na porta local.</li>
            <li>Alguns roteadores ativam <strong>Isolamento de Clientes (AP Isolation)</strong>, impedindo celulares de falar com o computador.</li>
            <li>Confira se o computador não entrou em suspensão e se o servidor continua ativo.</li>
          </ul>
        </div>

        {healthResult !== 'idle' && (
          <p
            style={{
              fontSize: 13,
              color: healthResult === 'ok' ? 'var(--status-online)' : 'var(--status-danger)',
            }}
          >
            {healthResult === 'ok'
              ? 'Servidor respondeu normalmente ao teste HTTP (/api/health).'
              : 'Não foi possível alcançar o servidor local neste momento.'}
          </p>
        )}

        <Button
          variant="secondary"
          fullWidth
          loading={testing}
          icon={<RefreshCw size={16} />}
          onClick={() => void handleTest()}
        >
          Testar comunicação com o servidor
        </Button>
      </div>
    </Modal>
  );
}
