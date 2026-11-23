import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { isRunningStandalone, type BeforeInstallPromptEvent } from '../../services/pwa';

export function InstallPwaButton() {
  const [standalone] = useState(() => isRunningStandalone());
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (standalone) {
    return null;
  }

  const handleClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }
    setGuideOpen(true);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        fullWidth
        icon={deferredPrompt ? <Download size={14} /> : <Smartphone size={14} />}
        onClick={() => void handleClick()}
        data-testid="home-install-pwa-btn"
      >
        Usar em tela cheia no celular
      </Button>

      <Modal
        open={guideOpen}
        title="Abrir em tela cheia (App)"
        onClose={() => setGuideOpen(false)}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          <p>
            Adicione o <strong>Cine Match</strong> à tela inicial do celular para abrir sem a barra de endereço do navegador:
          </p>

          <div
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>No Android (Chrome / Edge):</strong>
            <span>
              Toque no menu <strong>⋮</strong> no canto superior direito e escolha{' '}
              <strong>Adicionar à tela inicial</strong>.
            </span>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <strong style={{ color: 'var(--text-primary)' }}>No iPhone (Safari):</strong>
            <span>
              Toque no ícone de <strong>Compartilhar</strong> na barra inferior e escolha{' '}
              <strong>Adicionar à Tela de Início</strong>.
            </span>
          </div>

          <Button fullWidth onClick={() => setGuideOpen(false)}>
            Entendi
          </Button>
        </div>
      </Modal>
    </>
  );
}
