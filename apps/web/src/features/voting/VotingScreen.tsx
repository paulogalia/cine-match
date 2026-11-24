import { useMemo, useState } from 'react';
import {
  Heart,
  Pause,
  Play,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  VolumeX,
  WifiOff,
} from 'lucide-react';
import type { ClientRoomSnapshot, FilterCriteria, MovieSummary, VoteDecision } from '@cine-match/shared';
import { SwipeDeck } from '../../components/swipe/SwipeDeck';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { FiltersModal } from '../filters/FiltersModal';
import { MatchesSheet } from '../matches/MatchesSheet';
import { useSessionStore } from '../../stores/sessionStore';
import { getInitials } from '../../utils/genres';
import { WaitingQueueView } from './WaitingQueueView';
import styles from './VotingScreen.module.css';

interface VotingScreenProps {
  snapshot: ClientRoomSnapshot;
  onVote: (tmdbId: number, decision: VoteDecision) => Promise<boolean>;
  onUndo?: () => Promise<boolean>;
  onMarkWatched?: (tmdbId: number) => Promise<boolean>;
  onRequestMore: () => Promise<void>;
  onUpdateFilters: (filters: FilterCriteria) => Promise<string | null>;
  onDismissMatch: (tmdbId: number) => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onEnterDeciding: () => Promise<string | null>;
  onOpenDetails: (movie: MovieSummary) => void;
}

export function VotingScreen({
  snapshot,
  onVote,
  onUndo,
  onMarkWatched,
  onRequestMore,
  onUpdateFilters,
  onDismissMatch,
  onPause,
  onResume,
  onEnterDeciding,
  onOpenDetails,
}: VotingScreenProps) {
  const connectionState = useSessionStore((s) => s.connectionState);
  const pendingVoteMovieIds = useSessionStore((s) => s.pendingVoteMovieIds);
  const loadingMoreMovies = useSessionStore((s) => s.loadingMoreMovies);
  const soundEnabled = useSessionStore((s) => s.soundEnabled);
  const toggleSound = useSessionStore((s) => s.toggleSound);
  const setDiagnosticsOpen = useSessionStore((s) => s.setDiagnosticsOpen);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [matchesOpen, setMatchesOpen] = useState(false);
  const [confirmDecideOpen, setConfirmDecideOpen] = useState(false);

  const visibleQueue = useMemo(
    () => snapshot.queue.filter((movie) => !pendingVoteMovieIds.includes(movie.tmdbId)),
    [snapshot.queue, pendingVoteMovieIds],
  );

  const activeMatchesCount = useMemo(
    () => snapshot.matches.filter((m) => m.match.status !== 'DISMISSED').length,
    [snapshot.matches],
  );

  const hasActiveFilters =
    snapshot.filters.genreIds.length > 0 ||
    snapshot.filters.minRating !== undefined ||
    Boolean(snapshot.filters.originalLanguage) ||
    Boolean(snapshot.filters.oscar?.enabled) ||
    (snapshot.filters.directors?.length ?? 0) > 0 ||
    (snapshot.filters.actors?.length ?? 0) > 0 ||
    (snapshot.filters.watchProviderIds?.length ?? 0) > 0 ||
    Boolean(snapshot.filters.randomDiscovery) ||
    Boolean(snapshot.filters.excludeHistory) ||
    (snapshot.filters.letterboxdWatchedMode !== undefined &&
      snapshot.filters.letterboxdWatchedMode !== 'warn') ||
    snapshot.filters.groupMatchMode === 'majority' ||
    snapshot.filters.sortBy !== 'popularity.desc';

  const canUndo = Boolean(snapshot.canUndo ?? snapshot.myVotesCount > 0);
  const others = snapshot.participants.filter((p) => p.id !== snapshot.myParticipantId);
  const partner = others[0];
  const progressList = snapshot.partnerProgressList ?? [];
  const isConnected = connectionState === 'connected';

  const connDotClass =
    connectionState === 'connected'
      ? styles.connOnline
      : connectionState === 'reconnecting' || connectionState === 'connecting'
        ? styles.connWarn
        : styles.connError;

  const groupVotesSummary = useMemo(() => {
    if (others.length <= 1) return null;
    const totalOthersVotes = progressList.reduce((acc, item) => acc + item.votedCount, 0);
    const onlineOthersCount = others.filter((p) => p.connectionStatus === 'ONLINE').length;
    return `${onlineOthersCount}/${others.length} amigos online • ${totalOthersVotes} votos`;
  }, [others, progressList]);

  return (
    <section className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.sessionMeta}>
          <button
            type="button"
            className={styles.codeChip}
            onClick={() => setDiagnosticsOpen(true)}
            title="Diagnóstico da rede local"
          >
            <span className={`${styles.connDot} ${connDotClass}`} />
            <span>{snapshot.code}</span>
          </button>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={toggleSound}
            aria-label={soundEnabled ? 'Silenciar efeitos sonoros' : 'Ativar efeitos sonoros'}
            title={soundEnabled ? 'Som ativo' : 'Som silenciado'}
            data-testid="sound-toggle-btn"
            style={{ padding: '0 9px' }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} color="var(--text-muted)" />}
          </button>

          <button
            type="button"
            className={`${styles.iconBtn} ${hasActiveFilters ? styles.iconBtnActive : ''}`}
            onClick={() => setFiltersOpen(true)}
            aria-label="Abrir filtros"
            data-testid="voting-filters-btn"
          >
            <SlidersHorizontal size={15} />
            <span className={styles.compactLabel}>Filtros</span>
          </button>

          <button
            type="button"
            className={`${styles.iconBtn} ${activeMatchesCount > 0 ? styles.iconBtnActive : ''}`}
            onClick={() => setMatchesOpen(true)}
            aria-label="Abrir lista de matches"
            data-testid="voting-matches-btn"
          >
            <Heart
              size={15}
              fill={activeMatchesCount > 0 ? 'var(--accent-primary)' : 'none'}
              color="var(--accent-primary)"
            />
            <span className={styles.matchCountBadge} data-testid="matches-count-badge">
              {activeMatchesCount}
            </span>
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setConfirmDecideOpen(true)}
            aria-label="Decidir agora"
            data-testid="decide-now-btn"
            style={{
              borderColor: activeMatchesCount > 0 ? 'rgba(253, 186, 116, 0.45)' : undefined,
            }}
          >
            <Sparkles size={14} color="#FDBA74" />
            <span>Decidir</span>
          </button>

          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => void (snapshot.status === 'PAUSED' ? onResume() : onPause())}
            aria-label={snapshot.status === 'PAUSED' ? 'Retomar sessão' : 'Pausar sessão'}
            style={{ padding: '0 9px' }}
          >
            {snapshot.status === 'PAUSED' ? <Play size={15} /> : <Pause size={15} />}
          </button>
        </div>
      </header>

      <div className={styles.statusBar}>
        <div className={styles.partnerPill}>
          {others.length === 1 && partner ? (
            <>
              <span
                className={styles.miniAvatar}
                style={{ background: partner.avatarColor, overflow: 'hidden' }}
              >
                {partner.avatarDataUrl ? (
                  <img
                    src={partner.avatarDataUrl}
                    alt={partner.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  getInitials(partner.name)
                )}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {partner.name}:{' '}
                {partner.connectionStatus === 'ONLINE'
                  ? `${snapshot.partnerProgress?.votedCount ?? 0} votos`
                  : 'reconectando...'}
              </span>
            </>
          ) : (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {groupVotesSummary}
            </span>
          )}
        </div>
        <span data-testid="my-votes-counter">
          Seus votos: <strong style={{ color: 'var(--text-primary)' }}>{snapshot.myVotesCount}</strong>
        </span>
      </div>

      {!isConnected && (
        <div className={styles.offlineBanner} role="alert" data-testid="voting-offline-banner">
          <WifiOff size={15} />
          <span>Desconectado do servidor — votação pausada até reconectar.</span>
        </div>
      )}

      <div className={styles.deckArea}>
        {snapshot.status === 'PAUSED' ? (
          <div className={styles.pausedCard}>
            <h2 style={{ fontSize: 22 }}>Sessão pausada</h2>
            <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', maxWidth: 280 }}>
              Vocês podem retomar a votação a qualquer momento sem perder nenhum voto ou match.
            </p>
            <Button icon={<Play size={16} />} onClick={() => void onResume()}>
              Retomar votação
            </Button>
          </div>
        ) : visibleQueue.length > 0 ? (
          <SwipeDeck
            movies={visibleQueue}
            disabled={!isConnected}
            canUndo={canUndo}
            watchedByByMovieId={snapshot.watchedByByMovieId}
            watchlistedByByMovieId={snapshot.watchlistedByByMovieId}
            likeCountsByMovieId={snapshot.likeCountsByMovieId}
            requiredLikesForMatch={snapshot.requiredLikesForMatch}
            onVote={(tmdbId, decision) => void onVote(tmdbId, decision)}
            onUndo={onUndo ? () => void onUndo() : undefined}
            onMarkWatched={onMarkWatched ? (tmdbId) => void onMarkWatched(tmdbId) : undefined}
          />
        ) : (
          <WaitingQueueView
            snapshot={snapshot}
            loadingMore={loadingMoreMovies}
            activeMatchesCount={activeMatchesCount}
            canUndo={canUndo}
            onUndo={onUndo}
            onRequestMore={onRequestMore}
            onOpenMatches={() => setMatchesOpen(true)}
            onOpenFilters={() => setFiltersOpen(true)}
          />
        )}
      </div>

      <FiltersModal
        open={filtersOpen}
        currentFilters={snapshot.filters}
        onClose={() => setFiltersOpen(false)}
        onApply={onUpdateFilters}
      />

      <MatchesSheet
        open={matchesOpen}
        matches={snapshot.matches}
        onClose={() => setMatchesOpen(false)}
        onOpenDetails={onOpenDetails}
        onDismiss={onDismissMatch}
        onDecideNow={() => setConfirmDecideOpen(true)}
      />

      <Modal
        open={confirmDecideOpen}
        title="Decidir o filme agora?"
        onClose={() => setConfirmDecideOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14.5, color: 'var(--text-secondary)' }}>
            {activeMatchesCount > 0
              ? `Vocês têm ${activeMatchesCount} ${
                  activeMatchesCount === 1 ? 'match' : 'matches'
                }. Vamos abrir a tela de escolha final nos aparelhos — e vocês ainda podem voltar para votar depois.`
              : 'Vocês ainda não têm matches. Deseja abrir a tela de decisão mesmo assim?'}
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" fullWidth onClick={() => setConfirmDecideOpen(false)}>
              Continuar votando
            </Button>
            <Button
              fullWidth
              icon={<Sparkles size={16} />}
              onClick={() => {
                setConfirmDecideOpen(false);
                void onEnterDeciding();
              }}
              data-testid="confirm-enter-deciding-btn"
            >
              Decidir agora
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}