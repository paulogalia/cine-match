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
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  APP_LIMITS,
  NIGHT_VIBE_PRESETS,
  type ClientRoomSnapshot,
  type FilterCriteria,
  type GroupMatchMode,
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
  const isHost = me?.role === 'HOST';

  const onlineParticipants = snapshot.participants.filter((p) => p.connectionStatus === 'ONLINE');
  const readyToStart = snapshot.participants.length >= 2 && onlineParticipants.length >= 2;
  const canStart = isHost && snapshot.status === 'READY' && readyToStart;
  const isGroup = snapshot.participants.length >= 3;
  const groupMatchMode: GroupMatchMode = snapshot.filters.groupMatchMode ?? 'all';
  const showEmptyInviteSlot = snapshot.participants.length < APP_LIMITS.MAX_PARTICIPANTS_PER_ROOM;

  const activeFiltersSummary: string[] = [];
  if (snapshot.filters.oscar?.enabled) activeFiltersSummary.push('Oscar');
  if ((snapshot.filters.directors?.length ?? 0) > 0) {
    activeFiltersSummary.push(snapshot.filters.directors!.map((d) => d.name).join(', '));
  }
  if ((snapshot.filters.actors?.length ?? 0) > 0) {
    activeFiltersSummary.push(snapshot.filters.actors!.map((a) => a.name).join(', '));
  }
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
        letterboxdWatchedMode: snapshot.filters.letterboxdWatchedMode,
        groupMatchMode: snapshot.filters.groupMatchMode,
      });
      return;
    }

    void onUpdateFilters({
      ...presetFilters,
      watchProviderIds: snapshot.filters.watchProviderIds,
      excludeHistory: snapshot.filters.excludeHistory,
      letterboxdWatchedMode: snapshot.filters.letterboxdWatchedMode,
      groupMatchMode: snapshot.filters.groupMatchMode,
    });
  };

  const setGroupMatchMode = (mode: GroupMatchMode) => {
    if (!isHost || groupMatchMode === mode) return;
    void onUpdateFilters({
      ...snapshot.filters,
      groupMatchMode: mode,
    });
  };

  const requiredLikes =
    snapshot.requiredLikesForMatch ??
    (snapshot.participants.length <= 2
      ? 2
      : groupMatchMode === 'majority'
        ? Math.floor(Math.max(2, onlineParticipants.length) / 2) + 1
        : Math.max(2, onlineParticipants.length));

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
            {snapshot.status === 'WAITING_PARTICIPANT'
              ? 'Convide a turma'
              : isGroup
                ? `Sala com ${snapshot.participants.length} pessoas`
                : 'Tudo pronto!'}
          </h1>
          <p className={styles.subtitle}>
            {snapshot.status === 'WAITING_PARTICIPANT'
              ? `Aponte a câmera dos celulares para o QR Code (até ${APP_LIMITS.MAX_PARTICIPANTS_PER_ROOM} pessoas).`
              : `Vocês já podem começar ou convidar mais amigos pelo QR Code (até ${APP_LIMITS.MAX_PARTICIPANTS_PER_ROOM}).`}
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

      <div
        className={styles.slotsRow}
        style={{
          gridTemplateColumns:
            snapshot.participants.length + (showEmptyInviteSlot ? 1 : 0) > 2
              ? 'repeat(auto-fill, minmax(128px, 1fr))'
              : undefined,
        }}
      >
        {snapshot.participants.map((participant) => (
          <ParticipantSlot
            key={participant.id}
            participant={participant}
            isMe={participant.id === snapshot.myParticipantId}
          />
        ))}
        {showEmptyInviteSlot && (
          <ParticipantSlot
            waitingLabel={`Pessoa ${snapshot.participants.length + 1}`}
          />
        )}
      </div>

      {showEmptyInviteSlot && (
        <QrCodePanel roomCode={snapshot.code} networkInfo={networkInfo} />
      )}

      {snapshot.status === 'READY' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${styles.waitingBanner} ${readyToStart ? styles.readyBanner : ''}`}
          data-testid="lobby-ready-banner"
        >
          <CheckCircle2 size={18} />
          <span>
            {readyToStart
              ? `${onlineParticipants.length} de ${snapshot.participants.length} aparelhos prontos na sala.`
              : 'Aguardando pelo menos 2 participantes conectados...'}
          </span>
        </motion.div>
      )}

      {isGroup && (
        <div className={styles.sectionCard} data-testid="group-match-rule-card">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>
              <Users size={15} color="#38BDF8" />
              <span>Regra de match do grupo</span>
            </span>
            <span className={styles.sectionHint}>
              {requiredLikes} de {Math.max(2, onlineParticipants.length)} likes
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              disabled={!isHost}
              onClick={() => setGroupMatchMode('all')}
              className={`${styles.chip} ${groupMatchMode === 'all' ? styles.chipSelected : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              data-testid="group-rule-all"
            >
              Todos (unanimidade)
            </button>
            <button
              type="button"
              disabled={!isHost}
              onClick={() => setGroupMatchMode('majority')}
              className={`${styles.chip} ${groupMatchMode === 'majority' ? styles.chipSelected : ''}`}
              style={{ flex: 1, justifyContent: 'center' }}
              data-testid="group-rule-majority"
            >
              Maioria simples
            </button>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
            {groupMatchMode === 'majority'
              ? `Um filme dá match quando pelo menos ${requiredLikes} participantes online curtem.`
              : `Um filme dá match quando todos os ${requiredLikes} participantes online curtem (ajusta automaticamente se alguém cair).`}
          </p>
        </div>
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
            Oscar, Diretores, Atores e Streamings
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
            {readyToStart
              ? `Iniciar sessão (${onlineParticipants.length} pessoas)`
              : 'Aguardando 2º participante...'}
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