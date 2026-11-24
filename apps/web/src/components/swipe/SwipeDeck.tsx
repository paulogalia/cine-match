import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EyeOff, Heart, RotateCcw, X } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import type { MovieSummary, VoteDecision } from '@cine-match/shared';
import { MoviePoster } from '../movie/MoviePoster';
import { SwipeCard } from './SwipeCard';
import styles from './SwipeDeck.module.css';

interface SwipeDeckProps {
  movies: MovieSummary[];
  disabled?: boolean;
  canUndo?: boolean;
  watchedByByMovieId?: Record<string, string[]>;
  watchlistedByByMovieId?: Record<string, string[]>;
  likeCountsByMovieId?: Record<string, number>;
  requiredLikesForMatch?: number;
  onVote: (tmdbId: number, decision: VoteDecision) => void;
  onUndo?: () => void;
  onMarkWatched?: (tmdbId: number) => void;
}

export function SwipeDeck({
  movies,
  disabled = false,
  canUndo = false,
  watchedByByMovieId,
  watchlistedByByMovieId,
  likeCountsByMovieId,
  requiredLikesForMatch,
  onVote,
  onUndo,
  onMarkWatched,
}: SwipeDeckProps) {
  const reducedMotion = useReducedMotion();
  const [exitDirection, setExitDirection] = useState<VoteDecision>('LIKE');
  const lastSubmittedIdRef = useRef<number | null>(null);
  const deckProgress = useMotionValue(0);

  const topMovie = movies[0];
  const nextMovie = movies[1];

  const backScale = useTransform(deckProgress, [0, 1], reducedMotion ? [1, 1] : [0.94, 0.995]);
  const backY = useTransform(deckProgress, [0, 1], reducedMotion ? [0, 0] : [14, 2]);
  const backOpacity = useTransform(deckProgress, [0, 1], [0.62, 0.95]);

  useLayoutEffect(() => {
    deckProgress.jump(0);
    if (topMovie && lastSubmittedIdRef.current !== topMovie.tmdbId) {
      lastSubmittedIdRef.current = null;
    }
  }, [topMovie?.tmdbId, deckProgress]);

  const commitVote = (tmdbId: number, decision: VoteDecision) => {
    if (disabled || lastSubmittedIdRef.current === tmdbId) return;
    lastSubmittedIdRef.current = tmdbId;
    setExitDirection(decision);
    onVote(tmdbId, decision);
  };

  const commitWatched = (tmdbId: number) => {
    if (disabled || !onMarkWatched || lastSubmittedIdRef.current === tmdbId) return;
    lastSubmittedIdRef.current = tmdbId;
    setExitDirection('DISLIKE');
    onMarkWatched(tmdbId);
  };

  const handleUndo = () => {
    if (disabled || !canUndo || !onUndo) return;
    lastSubmittedIdRef.current = null;
    onUndo();
  };

  useEffect(() => {
    if (disabled || !topMovie) return;
    const handleKey = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.querySelector('[role="dialog"]')
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        commitVote(topMovie.tmdbId, 'LIKE');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        commitVote(topMovie.tmdbId, 'DISLIKE');
      } else if ((e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') && canUndo && onUndo) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [disabled, topMovie, canUndo, onUndo]);

  if (!topMovie) {
    return null;
  }

  const topWatchedBy = watchedByByMovieId?.[String(topMovie.tmdbId)];
  const topWatchlistedBy = watchlistedByByMovieId?.[String(topMovie.tmdbId)];
  const topLikesCount = likeCountsByMovieId?.[String(topMovie.tmdbId)];

  return (
    <>
      <div className="sr-only" aria-live="polite" data-testid="deck-aria-live">
        Filme atual: {topMovie.title}, {topMovie.releaseYear ?? 'ano indisponível'}, nota{' '}
        {topMovie.voteAverage.toFixed(1)}
      </div>

      <div className={styles.deckContainer}>
        {nextMovie && (
          <motion.div
            key={`back-${nextMovie.tmdbId}`}
            className={styles.backCard}
            style={{ scale: backScale, y: backY, opacity: backOpacity }}
            aria-hidden="true"
          >
            <MoviePoster
              posterPath={nextMovie.posterPath}
              title={nextMovie.title}
              releaseYear={nextMovie.releaseYear}
              priority
            />
            <div className={styles.backCardDim} />
          </motion.div>
        )}

        <AnimatePresence custom={exitDirection}>
          <SwipeCard
            key={topMovie.tmdbId}
            movie={topMovie}
            disabled={disabled}
            deckProgress={deckProgress}
            watchedBy={topWatchedBy}
            watchlistedBy={topWatchlistedBy}
            groupLikesCount={topLikesCount}
            requiredLikesForMatch={requiredLikesForMatch}
            onSwipeVote={commitVote}
          />
        </AnimatePresence>
      </div>

      <div className={styles.actionsRow}>
        <motion.button
          type="button"
          className={`${styles.secondaryBtn} ${styles.undoBtn}`}
          disabled={disabled || !canUndo || !onUndo}
          whileTap={disabled || !canUndo ? undefined : { scale: 0.9 }}
          onClick={handleUndo}
          aria-label="Desfazer último voto"
          title="Desfazer último voto"
          data-testid="vote-undo-btn"
        >
          <RotateCcw size={19} />
        </motion.button>

        <motion.button
          type="button"
          className={`${styles.voteBtn} ${styles.nopeBtn}`}
          disabled={disabled}
          whileTap={disabled ? undefined : { scale: 0.9 }}
          onClick={() => commitVote(topMovie.tmdbId, 'DISLIKE')}
          aria-label={`Passar ${topMovie.title}`}
          data-testid="vote-dislike-btn"
        >
          <X size={28} strokeWidth={2.5} />
        </motion.button>

        <motion.button
          type="button"
          className={`${styles.voteBtn} ${styles.likeBtn}`}
          disabled={disabled}
          whileTap={disabled ? undefined : { scale: 0.9 }}
          onClick={() => commitVote(topMovie.tmdbId, 'LIKE')}
          aria-label={`Gostei de ${topMovie.title}`}
          data-testid="vote-like-btn"
        >
          <Heart size={27} fill="#FFFFFF" strokeWidth={2.2} />
        </motion.button>

        <motion.button
          type="button"
          className={`${styles.secondaryBtn} ${styles.watchedBtn}`}
          disabled={disabled || !onMarkWatched}
          whileTap={disabled ? undefined : { scale: 0.9 }}
          onClick={() => commitWatched(topMovie.tmdbId)}
          aria-label={`Marcar ${topMovie.title} como já assistido`}
          title="Já assistimos (não mostrar mais)"
          data-testid="vote-watched-btn"
        >
          <EyeOff size={19} />
        </motion.button>
      </div>

      <p className={styles.hintText}>
        Desfazer • Passar • Gostei • Já assistimos
      </p>
    </>
  );
}