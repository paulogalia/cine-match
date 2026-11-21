import { useState } from 'react';
import { ArrowLeft, Check, Film, Info, Popcorn, Sparkles, Star } from 'lucide-react';
import { motion } from 'motion/react';
import type { ClientRoomSnapshot, MovieSummary } from '@cine-match/shared';
import { screenVariants, SPRING_SNAPPY } from '../../animations/presets';
import { MoviePoster } from '../../components/movie/MoviePoster';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import styles from './DecisionScreen.module.css';

interface DecisionScreenProps {
  snapshot: ClientRoomSnapshot;
  onPropose: (tmdbId: number) => Promise<string | null>;
  onConfirm: (tmdbId: number) => Promise<string | null>;
  onReturnToVoting: () => Promise<string | null>;
  onEndSession: () => Promise<string | null>;
  onOpenDetails: (movie: MovieSummary) => void;
}

export function DecisionScreen({
  snapshot,
  onPropose,
  onConfirm,
  onReturnToVoting,
  onEndSession,
  onOpenDetails,
}: DecisionScreenProps) {
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const activeMatches = snapshot.matches.filter((m) => m.match.status === 'ACTIVE');
  const proposal = snapshot.finalProposal;
  const proposedItem = proposal
    ? activeMatches.find((m) => m.movie.tmdbId === proposal.tmdbId) ?? null
    : null;

  const proposer = proposal
    ? snapshot.participants.find((p) => p.id === proposal.proposedBy)
    : null;
  const iProposed = proposal?.proposedBy === snapshot.myParticipantId;
  const iConfirmed = proposal?.confirmedBy.includes(snapshot.myParticipantId) ?? false;

  const handleSelectMovie = async (tmdbId: number) => {
    setSubmittingId(tmdbId);
    if (proposal && proposal.tmdbId === tmdbId && !iConfirmed) {
      await onConfirm(tmdbId);
    } else {
      await onPropose(tmdbId);
    }
    setSubmittingId(null);
  };

  return (
    <motion.section
      className={styles.screen}
      variants={screenVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      data-testid="decision-screen"
    >
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => void onReturnToVoting()}
          data-testid="decision-back-btn"
        >
          <ArrowLeft size={16} />
          <span>Continuar votando</span>
        </button>

        <button
          type="button"
          className={styles.endTextBtn}
          onClick={() => setConfirmEndOpen(true)}
          data-testid="decision-end-btn"
        >
          Encerrar
        </button>
      </div>

      {activeMatches.length === 0 ? (
        <div className={styles.emptyFun} data-testid="decision-empty-state">
          <motion.div
            className={styles.emptyIcon}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Popcorn size={36} />
          </motion.div>
          <h1 style={{ fontSize: 24 }}>A pipoca ainda está esperando!</h1>
          <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', maxWidth: 300 }}>
            Vocês ainda não tiveram nenhum match nesta sessão. Voltem para o deck e dêem mais alguns swipes — o filme perfeito pode ser o próximo card!
          </p>
          <div style={{ width: '100%', maxWidth: 280, marginTop: 8 }}>
            <Button
              size="lg"
              fullWidth
              icon={<Film size={17} />}
              onClick={() => void onReturnToVoting()}
            >
              Continuar procurando
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.hero}>
            <h1 className={styles.title}>Escolher o filme da noite</h1>
            <p className={styles.subtitle}>
              Toque em um dos matches para sugerir. Quando os dois confirmarem, a noite está fechada!
            </p>
          </div>

          {proposal && proposedItem && (
            <motion.div
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={SPRING_SNAPPY}
              className={styles.proposalBanner}
              data-testid="decision-proposal-banner"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={17} color="#FDBA74" />
                <span className={styles.proposalTitle}>
                  {iProposed
                    ? `Você sugeriu "${proposedItem.movie.title}"`
                    : `${proposer?.name ?? 'Seu par'} sugeriu "${proposedItem.movie.title}"`}
                </span>
              </div>

              {iConfirmed ? (
                <span style={{ fontSize: 13, color: '#e2e8f0' }}>
                  Aguardando confirmação do outro aparelho... (você ainda pode sugerir outro filme abaixo)
                </span>
              ) : (
                <Button
                  size="md"
                  fullWidth
                  loading={submittingId === proposedItem.movie.tmdbId}
                  icon={<Check size={17} />}
                  onClick={() => void handleSelectMovie(proposedItem.movie.tmdbId)}
                  data-testid="confirm-proposal-btn"
                >
                  Confirmar para assistir hoje
                </Button>
              )}
            </motion.div>
          )}

          <div className={styles.grid}>
            {activeMatches.map(({ movie }, idx) => {
              const isProposed = proposal?.tmdbId === movie.tmdbId;
              const canConfirmThis = isProposed && !iConfirmed;

              return (
                <motion.article
                  key={movie.tmdbId}
                  layout
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING_SNAPPY, delay: Math.min(idx * 0.05, 0.25) }}
                  className={`${styles.matchTile} ${isProposed ? styles.matchTileProposed : ''}`}
                >
                  <button
                    type="button"
                    className={styles.tilePoster}
                    onClick={() => onOpenDetails(movie)}
                    aria-label={`Ver detalhes de ${movie.title}`}
                  >
                    {isProposed && (
                      <span className={styles.tileBadge}>
                        {iProposed ? 'Sua sugestão' : 'Sugerido'}
                      </span>
                    )}
                    <MoviePoster posterPath={movie.posterPath} title={movie.title} size="w342" />
                  </button>

                  <div className={styles.tileBody}>
                    <span className={styles.tileName}>{movie.title}</span>
                    <div className={styles.tileMeta}>
                      <span>{movie.releaseYear ?? '—'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#FDE68A' }}>
                        <Star size={11} fill="#FDE68A" /> {movie.voteAverage.toFixed(1)}
                      </span>
                    </div>

                    <div className={styles.tileActions}>
                      <Button
                        size="sm"
                        fullWidth
                        variant={isProposed ? 'primary' : 'secondary'}
                        loading={submittingId === movie.tmdbId}
                        onClick={() => void handleSelectMovie(movie.tmdbId)}
                        data-testid={`propose-movie-${movie.tmdbId}`}
                      >
                        {canConfirmThis
                          ? 'Confirmar'
                          : isProposed
                            ? 'Aguardando'
                            : 'Escolher'}
                      </Button>

                      <button
                        type="button"
                        className={styles.infoIconBtn}
                        onClick={() => onOpenDetails(movie)}
                        aria-label={`Detalhes de ${movie.title}`}
                      >
                        <Info size={15} />
                      </button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </>
      )}

      <Modal
        open={confirmEndOpen}
        title="Encerrar esta sessão?"
        onClose={() => setConfirmEndOpen(false)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 14.5, color: 'var(--text-secondary)' }}>
            A sessão será encerrada para os dois participantes e salva no histórico com os matches encontrados até agora.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" fullWidth onClick={() => setConfirmEndOpen(false)}>
              Cancelar
            </Button>
            <Button
              fullWidth
              onClick={() => {
                setConfirmEndOpen(false);
                void onEndSession();
              }}
              data-testid="confirm-end-session-btn"
            >
              Sim, encerrar
            </Button>
          </div>
        </div>
      </Modal>
    </motion.section>
  );
}
