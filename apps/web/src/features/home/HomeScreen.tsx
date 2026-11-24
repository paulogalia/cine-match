import { Clapperboard, History, QrCode, Sparkles, UserRound, Wifi } from 'lucide-react';
import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '../../animations/presets';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { Button } from '../../components/ui/Button';
import { TmdbAttribution } from '../../components/ui/TmdbAttribution';
import { InstallPwaButton } from './InstallPwaButton';
import { useSessionStore } from '../../stores/sessionStore';
import { getInitials } from '../../utils/genres';
import styles from './HomeScreen.module.css';

export function HomeScreen() {
  const setView = useSessionStore((s) => s.setView);
  const connectionState = useSessionStore((s) => s.connectionState);
  const catalogStatus = useSessionStore((s) => s.catalogStatus);
  const profile = useSessionStore((s) => s.profile);
  const savedName = useSessionStore((s) => s.savedName);
  const setProfileOpen = useSessionStore((s) => s.setProfileOpen);
  const setDiagnosticsOpen = useSessionStore((s) => s.setDiagnosticsOpen);
  const setHistoryOpen = useSessionStore((s) => s.setHistoryOpen);

  const labelName = profile?.name?.trim() || savedName.trim() || 'Meu perfil';
  const avatarBg = profile?.avatarColor ?? 'var(--bg-elevated)';
  const avatarText = profile?.name?.trim() || savedName.trim() || '';

  const renderProfileIcon = () => {
    if (profile?.avatarDataUrl) {
      return (
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'inline-flex',
            flexShrink: 0,
          }}
        >
          <img
            src={profile.avatarDataUrl}
            alt={labelName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </span>
      );
    }
    if (avatarText) {
      return (
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: avatarBg,
            color: '#fff',
            fontSize: 9.5,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {getInitials(avatarText)}
        </span>
      );
    }
    return <UserRound size={15} />;
  };

  return (
    <motion.section
      className={styles.screen}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <div className={styles.hero}>
        <motion.div variants={staggerItem}>
          <BrandLogo size={76} />
        </motion.div>

        <motion.div variants={staggerItem} className={styles.eyebrow}>
          <Sparkles size={13} />
          <span>Escolha a dois</span>
        </motion.div>

        <motion.h1 variants={staggerItem} className={styles.title}>
          Cine Match
        </motion.h1>

        <motion.p variants={staggerItem} className={styles.subtitle}>
          Cada um desliza no seu celular. Quando os dois gostam do mesmo filme, o filme da noite acontece.
        </motion.p>

        <motion.div variants={staggerItem} className={styles.highlights}>
          <span className={styles.highlightItem}>
            <Clapperboard size={14} />{' '}
            {catalogStatus.tmdbConfigured ? 'Catálogo TMDB ativo' : 'Filas independentes'}
          </span>
          <span className={styles.highlightItem}>
            <QrCode size={14} /> Entrada por QR Code
          </span>
        </motion.div>
      </div>

      <motion.div variants={staggerItem} className={styles.actions}>
        <Button
          size="lg"
          fullWidth
          onClick={() => setView('create')}
          disabled={connectionState === 'unavailable'}
          data-testid="home-create-btn"
        >
          Criar sessão
        </Button>

        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={() => setView('join')}
          disabled={connectionState === 'unavailable'}
          data-testid="home-join-btn"
        >
          Entrar em uma sessão
        </Button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            icon={renderProfileIcon()}
            onClick={() => setProfileOpen(true)}
            data-testid="home-profile-btn"
          >
            {labelName}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            fullWidth
            icon={<History size={15} />}
            onClick={() => setHistoryOpen(true)}
            data-testid="home-history-btn"
          >
            Histórico
          </Button>
        </div>

        <InstallPwaButton />

        <button
          type="button"
          onClick={() => setDiagnosticsOpen(true)}
          className={styles.footerNote}
          style={{ background: 'none', border: 'none', padding: '4px 0' }}
        >
          <Wifi size={13} />
          <span>Funciona na sua rede Wi-Fi local — sem login</span>
        </button>

        <div style={{ marginTop: 4 }}>
          <TmdbAttribution />
        </div>
      </motion.div>
    </motion.section>
  );
}