import { useState, type FormEvent } from 'react';
import { ArrowLeft, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { APP_LIMITS } from '@cine-match/shared';
import { screenVariants } from '../../animations/presets';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useSessionStore } from '../../stores/sessionStore';
import styles from './Lobby.module.css';

interface JoinRoomScreenProps {
  onJoin: (code: string, participantName: string) => Promise<string | null>;
}

export function JoinRoomScreen({ onJoin }: JoinRoomScreenProps) {
  const savedName = useSessionStore((s) => s.savedName);
  const prefilledCode = useSessionStore((s) => s.prefilledJoinCode);
  const busy = useSessionStore((s) => s.busyAction);
  const setView = useSessionStore((s) => s.setView);
  const setPrefilledJoinCode = useSessionStore((s) => s.setPrefilledJoinCode);

  const [code, setCode] = useState(prefilledCode);
  const [name, setName] = useState(savedName);
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = (raw: string) => {
    const cleaned = raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, APP_LIMITS.ROOM_CODE_LENGTH);
    setCode(cleaned);
  };

  const handleBack = () => {
    setPrefilledJoinCode('');
    if (window.location.search.includes('join=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    setView('home');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (cleanCode.length !== APP_LIMITS.ROOM_CODE_LENGTH) {
      setError('O código da sala deve ter exatamente 6 caracteres.');
      return;
    }

    if (cleanName.length < APP_LIMITS.MIN_NAME_LENGTH) {
      setError('Digite pelo menos 2 letras para seu nome.');
      return;
    }

    setError(null);
    const serverError = await onJoin(cleanCode, cleanName);
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
        <button type="button" className={styles.backBtn} onClick={handleBack}>
          <ArrowLeft size={18} />
          <span>Voltar</span>
        </button>
      </div>

      <div className={styles.heading}>
        <h1 className={styles.title}>Entrar na sessão</h1>
        <p className={styles.subtitle}>
          {prefilledCode
            ? 'Código preenchido pelo QR Code. Agora informe seu nome para entrar.'
            : 'Digite o código de 6 caracteres exibido no outro aparelho.'}
        </p>
      </div>

      <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <Input
          id="room-code"
          label="Código da sala"
          value={code}
          onChange={handleCodeChange}
          placeholder="A1B2C3"
          maxLength={APP_LIMITS.ROOM_CODE_LENGTH}
          codeStyle
          autoFocus={!prefilledCode}
          data-testid="join-code-input"
        />

        <Input
          id="guest-name"
          label="Seu nome"
          value={name}
          onChange={setName}
          placeholder="Ex: Maria"
          maxLength={APP_LIMITS.MAX_NAME_LENGTH}
          autoComplete="given-name"
          autoFocus={Boolean(prefilledCode)}
          error={error}
          data-testid="join-name-input"
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          loading={busy}
          icon={<LogIn size={18} />}
          data-testid="join-submit-btn"
        >
          Entrar na sala
        </Button>
      </form>
    </motion.section>
  );
}
