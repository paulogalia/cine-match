import { useState, type FormEvent } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { APP_LIMITS } from '@cine-match/shared';
import { screenVariants } from '../../animations/presets';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useSessionStore } from '../../stores/sessionStore';
import styles from './Lobby.module.css';

interface CreateRoomScreenProps {
  onCreate: (hostName: string) => Promise<string | null>;
}

export function CreateRoomScreen({ onCreate }: CreateRoomScreenProps) {
  const savedName = useSessionStore((s) => s.savedName);
  const busy = useSessionStore((s) => s.busyAction);
  const setView = useSessionStore((s) => s.setView);

  const [name, setName] = useState(savedName);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < APP_LIMITS.MIN_NAME_LENGTH) {
      setError('Digite pelo menos 2 letras para seu nome.');
      return;
    }

    setError(null);
    const serverError = await onCreate(trimmed);
    if (serverError) {
      setError(serverError);
    }
  };

  return (
    <motion.section
      className={styles.screen}
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.topRow}>
        <button type="button" className={styles.backBtn} onClick={() => setView('home')}>
          <ArrowLeft size={18} />
          <span>Voltar</span>
        </button>
      </div>

      <div className={styles.heading}>
        <h1 className={styles.title}>Criar nova sessão</h1>
        <p className={styles.subtitle}>
          Vamos gerar um QR Code e um código curto para a outra pessoa entrar pelo celular.
        </p>
      </div>

      <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <Input
          id="host-name"
          label="Como você quer aparecer na sala?"
          value={name}
          onChange={setName}
          placeholder="Ex: Paulo"
          maxLength={APP_LIMITS.MAX_NAME_LENGTH}
          autoComplete="given-name"
          autoFocus
          error={error}
          hint="Fica salvo neste aparelho para as próximas sessões."
          data-testid="create-name-input"
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={busy}
          icon={<Sparkles size={18} />}
          data-testid="create-submit-btn"
        >
          Gerar sala e QR Code
        </Button>
      </form>
    </motion.section>
  );
}
