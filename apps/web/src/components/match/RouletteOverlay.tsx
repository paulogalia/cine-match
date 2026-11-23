import { useEffect, useMemo, useState } from 'react';
import { Check, Dices, Info, Sparkles } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ClientMatchItem, MovieSummary, RouletteSpin } from '@cine-match/shared';
import { SPRING_SNAPPY } from '../../animations/presets';
import { useSessionStore } from '../../stores/sessionStore';
import { haptics } from '../../utils/haptics';
import { sounds } from '../../utils/sounds';
import { MoviePoster } from '../movie/MoviePoster';
import { Button } from '../ui/Button';
import styles from './RouletteOverlay.module.css';

interface RouletteOverlayProps {
  spin: RouletteSpin | null;
  matches: ClientMatchItem[];
  myParticipantId: string;
  triggerName?: string;
  onConfirmWinner: (tmdbId: number) => Promise<string | null>;
  onSpinAgain: () => Promise<string | null>;
  onViewDetails: (movie: MovieSummary) => void;
  onClose: () => void;
}

const ITEM_WIDTH = 128;
const ITEM_GAP = 12;
const ITEM_STRIDE = ITEM_WIDTH + ITEM_GAP;

export function RouletteOverlay({
  spin,
  matches,
  myParticipantId,
  triggerName,
  onConfirmWinner,
  onSpinAgain,
  onViewDetails,
  onClose,
}: RouletteOverlayProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const soundEnabled = useSessionStore((s) => s.soundEnabled);
  const [landed, setLanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [spinningAgain, setSpinningAgain] = useState(false);

  const movieMap = useMemo(() => {
    const map = new Map<number, MovieSummary>();
    for (const item of matches) {
      map.set(item.movie.tmdbId, item.movie);
    }
    return map;
  }, [matches]);

  const { reelMovies, targetIndex, winnerMovie } = useMemo(() => {
    if (!spin) {
      return { reelMovies: [] as MovieSummary[], targetIndex: 0, winnerMovie: null as MovieSummary | null };
    }

    const candidates = spin.candidateIds
      .map((id) => movieMap.get(id))
      .filter((m): m is MovieSummary => Boolean(m));

    if (candidates.length === 0) {
      return { reelMovies: [] as MovieSummary[], targetIndex: 0, winnerMovie: null as MovieSummary | null };
    }

    const winner = movieMap.get(spin.winnerMovieId) ?? candidates[0]!;
    const winnerPosInCandidates = Math.max(
      0,
      candidates.findIndex((c) => c.tmdbId === winner.tmdbId),
    );

    // Repete ciclos suficientes para um giro dramático de ~3,6s e sempre para exatamente no vencedor
    const minItemsBeforeWinner = Math.max(18, candidates.length * 4);
    const fullCycles = Math.ceil(minItemsBeforeWinner / candidates.length);
    const list: MovieSummary[] = [];

    for (let c = 0; c < fullCycles + 2; c++) {
      for (const m of candidates) {
        list.push(m);
      }
    }

    const target = fullCycles * candidates.length + winnerPosInCandidates;
    return { reelMovies: list, targetIndex: target, winnerMovie: winner };
  }, [spin, movieMap]);

  useEffect(() => {
    if (!spin || !winnerMovie) {
      setLanded(false);
      return;
    }

    setLanded(false);

    if (reducedMotion) {
      setLanded(true);
      haptics.match();
      sounds.fanfare(soundEnabled);
      return;
    }

    // Cliques sonoros desacelerando em sincronia com a curva da roleta
    const tickTimers: Array<ReturnType<typeof setTimeout>> = [];
    const totalTicks = 18;
    for (let i = 1; i <= totalTicks; i++) {
      const progress = i / totalTicks;
      const delayMs = Math.round(Math.pow(progress, 2.25) * (spin.durationMs - 220));
      tickTimers.push(
        setTimeout(() => {
          sounds.tick(useSessionStore.getState().soundEnabled);
        }, delayMs),
      );
    }

    const finishTimer = setTimeout(() => {
      setLanded(true);
      haptics.match();
      sounds.fanfare(useSessionStore.getState().soundEnabled);
    }, spin.durationMs);

    return () => {
      for (const t of tickTimers) clearTimeout(t);
      clearTimeout(finishTimer);
    };
  }, [spin?.spinId, winnerMovie, reducedMotion, soundEnabled]);

  const iTriggered = spin?.triggeredBy === myParticipantId;
  const startX = -(1 * ITEM_STRIDE + ITEM_WIDTH / 2);
  const targetX = -(targetIndex * ITEM_STRIDE + ITEM_WIDTH / 2);

  const handleConfirm = async () => {
    if (!winnerMovie) return;
    setConfirming(true);
    await onConfirmWinner(winnerMovie.tmdbId);
    setConfirming(false);
    onClose();
  };

  const handleSpinAgain = async () => {
    setSpinningAgain(true);
    await onSpinAgain();
    setSpinningAgain(false);
  };

  return (
    <AnimatePresence>
      {spin && winnerMovie && (
        <motion.div
          key={spin.spinId}
          className={styles.overlay}
          data-testid="roulette-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Roleta de desempate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className={styles.card}>
            <span className={styles.eyebrow}>
              <Dices size={14} />
              <span>
                {landed
                  ? 'Sorteio concluído'
                  : iTriggered
                    ? 'Girando a roleta...'
                    : `${triggerName ?? 'Seu par'} girou a roleta!`}
              </span>
            </span>

            <h2 className={styles.headline}>
              {landed ? 'A roleta escolheu!' : 'Qual vai ser o filme de hoje?'}
            </h2>

            <div className={styles.reelViewport}>
              <span className={styles.pointerTop} aria-hidden="true" />
              <span className={styles.centerHighlight} aria-hidden="true" />
              <span className={styles.pointerBottom} aria-hidden="true" />

              <div className={styles.trackAnchor}>
                <motion.div
                  key={spin.spinId}
                  className={styles.track}
                  initial={{ x: reducedMotion ? targetX : startX }}
                  animate={{ x: targetX }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : {
                          duration: spin.durationMs / 1000,
                          ease: [0.12, 0.88, 0.16, 1],
                        }
                  }
                >
                  {reelMovies.map((movie, idx) => (
                    <div
                      key={`${movie.tmdbId}-${idx}`}
                      className={`${styles.reelItem} ${
                        landed && idx === targetIndex ? styles.reelItemWinner : ''
                      }`}
                    >
                      <MoviePoster
                        posterPath={movie.posterPath}
                        title={movie.title}
                        size="w342"
                        priority={idx <= targetIndex + 2}
                        compactPlaceholder
                      />
                      <span className={styles.reelCaption}>{movie.title}</span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>

            <div className={styles.winnerInfo}>
              {landed ? (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={SPRING_SNAPPY}
                  data-testid="roulette-winner-info"
                >
                  <div className={styles.winnerTitle}>{winnerMovie.title}</div>
                  <div className={styles.winnerSub}>
                    {winnerMovie.releaseYear ?? '—'} • Nota {winnerMovie.voteAverage.toFixed(1)}
                  </div>
                </motion.div>
              ) : (
                <span className={styles.winnerSub}>
                  Sincronizado nos dois aparelhos...
                </span>
              )}
            </div>

            {landed && (
              <motion.div
                className={styles.actions}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                {!iTriggered ? (
                  <Button
                    size="lg"
                    fullWidth
                    loading={confirming}
                    icon={<Check size={18} />}
                    onClick={() => void handleConfirm()}
                    data-testid="roulette-confirm-btn"
                  >
                    Confirmar filme da noite
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    fullWidth
                    icon={<Sparkles size={17} />}
                    onClick={onClose}
                    data-testid="roulette-accept-btn"
                  >
                    Aguardar confirmação do par
                  </Button>
                )}

                <div className={styles.secondaryRow}>
                  <Button
                    variant="secondary"
                    size="md"
                    loading={spinningAgain}
                    icon={<Dices size={16} />}
                    onClick={() => void handleSpinAgain()}
                    data-testid="roulette-spin-again-btn"
                  >
                    Girar de novo
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    icon={<Info size={16} />}
                    onClick={() => onViewDetails(winnerMovie)}
                    data-testid="roulette-details-btn"
                  >
                    Ver detalhes
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
