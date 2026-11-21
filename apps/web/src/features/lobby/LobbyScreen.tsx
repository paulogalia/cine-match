import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  LogOut,
  Play,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Tv,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  NIGHT_VIBE_PRESETS,
  type ClientRoomSnapshot,
  type FilterCriteria,
} from '@cine-match/shared';
import { screenVariants } from '../../animations/presets';
import { ParticipantSlot } from '../../components/session/ParticipantSlot';
import { QrCodePanel } from '../../components/session/QrCodePanel';
import { Button } from '../../components/ui/Button';
import { FiltersModal } from '../filters/FiltersModal';
import { useSessionStore } from '../../stores/sessionStore';
import styles from './Lobby.module.css';

interface LobbyScreenProps {
  snapshot: ClientRoomSnapshot;
  onUpdateFilters: (filters: FilterCriteria) => Promise<string | null>;
  onStartSession: () => Promise<string | null>;
}

export function LobbyScreen({ snapshot, onUpdateFilters, onStartSession }: LobbyScreenProps) {
  const networkInfo = useSessionStore((s) => s.networkInfo);
  const busy = useSessionStore((s) => s.busyAction);
  const leaveSessionLocal = useSessionStore((s) => s.leaveSessionLocal);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const me = snapshot.participants.find((p) => p.id === snapshot.myParticipantId);
  const host = snapshot.participants.find((p) => p.role === 'HOST');
  const guest = snapshot.participants.find((p) => p.role === 'GUEST');
  const isHost = me?.role === 'HOST';

  const bothConnected =
    snapshot.participants.length === 2 &&
    snapshot.participants.every((p) => p.connectionStatus === 'ONLINE');

  const canStart = isHost && snapshot.status === 'READY' && bothConnected;

  const activeFiltersSummary: string[] = [];
  if (snapshot.filters.oscar?.enabled) activeFiltersSummary.push('Oscar');
  if ((snapshot.filters.watchProviderIds?.length ?? 0) > 0) {
    activeFiltersSummary.push(`${snapshot.filters.watchProviderIds!.length} streaming(s)`);
  }
  if (snapshot.filters.randomDiscovery) activeFiltersSummary.push('Aleatório');
  if (snapshot.filters.excludeHistory) activeFiltersSummary.push('Sem repetidos');
  if (snapshot.filters.genreIds.length > 0) {
    activeFiltersSummary.push(`${snapshot.filters.genreIds.length} gênero(s)`);
  }

  const applyVibe = (presetFilters: FilterCriteria) => {
    if (!isHost) return;
    const alreadyActive = snapshot.filters.presetId === presetFilters.presetId;
    if (alreadyActive) {
      void onUpdateFilters({
        genreIds: [],
        sortBy: 'popularity.desc',
        watchProviderIds: snapshot.filters.watchProviderIds,
        excludeHistory: snapshot.filters.excludeHistory,
      });
      return;
    }

    void onUpdateFilters({
      ...presetFilters,
      watchProviderIds: snapshot.filters.watchProviderIds,
      excludeHistory: snapshot.filters.excludeHistory,
    });
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
        <div className={styles.heading}>
          <h1 className={styles.title}>
            {snapshot.status === 'WAITING_PARTICIPANT' ? 'Convide seu par' : 'Tudo pronto!'}
          </h1>
          <p className={styles.subtitle}>
            {snapshot.status === 'WAITING_PARTICIPANT'
              ? 'Aponte a câmera do outro celular para o QR Code abaixo.'
              : 'Escolha uma vibe, filtre por Oscar ou streamings e comece.'}
          </p>
        </div>

        <button
          type="button"
          className={styles.backBtn}
          onClick={leaveSessionLocal}
          aria-label="Sair da sala"
          title="Sair da sala"
        >
          <LogOut size={18} />
        </button>
      </div>

      <div className={styles.slotsRow}>
        <ParticipantSlot participant={host} isMe={host?.id === snapshot.myParticipantId} />
        <ParticipantSlot
          participant={guest}
          isMe={guest?.id === snapshot.myParticipantId}
          waitingLabel="Pessoa 2"
        />
      </div>

      {snapshot.status === 'WAITING_PARTICIPANT' && (
        <QrCodePanel roomCode={snapshot.code} networkInfo={networkInfo} />
      )}

      {snapshot.status === 'READY' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${styles.waitingBanner} ${bothConnected ? styles.readyBanner : ''}`}
          data-testid="lobby-ready-banner"
        >
          <CheckCircle2 size={18} />
          <span>
            {bothConnected
              ? 'Os dois aparelhos estão sincronizados na sala.'
              : 'Aguardando a reconexão do outro participante...'}
          </span>
        </motion.div>
      )}

      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>
            <Sparkles size={15} color="#FDBA74" />
            <span>Vibes da noite</span>
          </span>
          <span className={styles.sectionHint}>
            {isHost ? 'Toque para escolher' : `Definido por ${host?.name ?? 'anfitrião'}`}
          </span>
        </div>

        <div className={styles.chipsWrap}>
          {NIGHT_VIBE_PRESETS.map((preset) => {
            const active = snapshot.filters.presetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={!isHost}
                onClick={() => applyVibe(preset.filters)}
                className={`${styles.chip} ${active ? styles.chipSelected : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                data-testid={`lobby-vibe-${preset.id}`}
              >
                {preset.id === 'oscar_night' && <Award size={12} color="#FBBF24" />}
                {preset.id === 'hidden_gems' && <Shuffle size={12} />}
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {activeFiltersSummary.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <Tv size={12} />
            <span>Ativos: {activeFiltersSummary.join(' • ')}</span>
          </div>
        )}

        {isHost && (
          <Button
            variant="secondary"
            size="sm"
            fullWidth
            icon={<SlidersHorizontal size={14} />}
            onClick={() => setFiltersOpen(true)}
            data-testid="lobby-open-filters-btn"
          >
            Personalizar Oscar, Streamings e Filtros
          </Button>
        )}
      </div>

      <div className={styles.bottomSpacer}>
        {isHost ? (
          <Button
            size="lg"
            fullWidth
            disabled={!canStart}
            loading={busy}
            icon={<Play size={18} />}
            onClick={() => void onStartSession()}
            data-testid="lobby-start-btn"
          >
            {bothConnected ? 'Iniciar sessão' : 'Aguardando 2º participante...'}
          </Button>
        ) : (
          <div className={styles.waitingBanner} data-testid="guest-waiting-host">
            <span>Aguardando {host?.name ?? 'o anfitrião'} iniciar a sessão...</span>
          </div>
        )}
      </div>

      <FiltersModal
        open={filtersOpen}
        currentFilters={snapshot.filters}
        onClose={() => setFiltersOpen(false)}
        onApply={onUpdateFilters}
      />
    </motion.section>
  );
}
