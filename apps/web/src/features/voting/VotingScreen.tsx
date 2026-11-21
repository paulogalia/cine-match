import { useMemo, useState } from 'react';
import { Heart, Pause, Play, SlidersHorizontal, Sparkles, WifiOff } from 'lucide-react';
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
    (snapshot.filters.watchProviderIds?.length ?? 0) > 0 ||
    Boolean(snapshot.filters.randomDiscovery) ||
    Boolean(snapshot.filters.excludeHistory) ||
    snapshot.filters.sortBy !== 'popularity.desc';

  const partner = snapshot.participants.find((p) => p.id !== snapshot.myParticipantId);
  const isConnected = connectionState === 'connected';

  const connDotClass =
    connectionState === 'connected'
      ? styles.connOnline
      : connectionState === 'reconnecting' || connectionState === 'connecting'
        ? styles.connWarn
        : styles.connError;

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
            style={{ padding: '0 10px' }}
          >
            {snapshot.status === 'PAUSED' ? <Play size={15} /> : <Pause size={15} />}
          </button>
        </div>
      </header>

      <div className={styles.statusBar}>
        <div className={styles.partnerPill}>
          {partner && (
            <>
              <span className={styles.miniAvatar} style={{ background: partner.avatarColor }}>
                {getInitials(partner.name)}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {partner.name}:{' '}
                {partner.connectionStatus === 'ONLINE'
                  ? `${snapshot.partnerProgress?.votedCount ?? 0} votos`
                  : 'reconectando...'}
              </span>
            </>
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
            onVote={(tmdbId, decision) => void onVote(tmdbId, decision)}
          />
        ) : (
          <WaitingQueueView
            snapshot={snapshot}
            loadingMore={loadingMoreMovies}
            activeMatchesCount={activeMatchesCount}
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
                }. Vamos abrir a tela de escolha final nos dois aparelhos — e vocês ainda podem voltar para votar depois.`
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
