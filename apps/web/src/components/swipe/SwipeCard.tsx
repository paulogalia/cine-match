import { useMemo, useState } from 'react';
import { Award, ChevronDown, ChevronUp, Clock, Star } from 'lucide-react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
  type MotionValue,
  type PanInfo,
  type Variants,
} from 'motion/react';
import type { MovieSummary, VoteDecision } from '@cine-match/shared';
import { SPRING_SNAPPY } from '../../animations/presets';
import { getGenreName } from '../../utils/genres';
import { formatLanguageLabel, formatRuntime } from '../../utils/tmdbImages';
import { MoviePoster } from '../movie/MoviePoster';
import styles from './SwipeCard.module.css';

interface SwipeCardProps {
  movie: MovieSummary;
  disabled?: boolean;
  deckProgress: MotionValue<number>;
  onSwipeVote: (tmdbId: number, decision: VoteDecision) => void;
}

const SWIPE_DISTANCE_THRESHOLD = 112;
const SWIPE_VELOCITY_THRESHOLD = 520;

export function SwipeCard({ movie, disabled = false, deckProgress, onSwipeVote }: SwipeCardProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const [expanded, setExpanded] = useState(false);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], reducedMotion ? [0, 0, 0] : [-12, 0, 12]);
  const likeOpacity = useTransform(x, [22, 108], [0, 1]);
  const likeScale = useTransform(x, [22, 108], [0.85, 1]);
  const nopeOpacity = useTransform(x, [-22, -108], [0, 1]);
  const nopeScale = useTransform(x, [-22, -108], [0.85, 1]);

  const cardVariants = useMemo<Variants>(
    () => ({
      initial: reducedMotion ? { opacity: 0 } : { opacity: 0.92, scale: 0.96, y: 10 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: (direction: VoteDecision | null) => {
        const sign = direction === 'DISLIKE' ? -1 : 1;
        if (reducedMotion) {
          return { opacity: 0, transition: { duration: 0.16 } };
        }
        return {
          x: sign * 480,
          rotate: sign * 18,
          opacity: 0,
          transition: { duration: 0.25, ease: [0.32, 0, 0.67, 0] },
        };
      },
    }),
    [reducedMotion],
  );

  useMotionValueEvent(x, 'change', (latest) => {
    const progress = Math.min(1, Math.abs(latest) / 170);
    deckProgress.set(progress);
  });

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) return;

    const absOffset = Math.abs(info.offset.x);
    const absVelocity = Math.abs(info.velocity.x);

    const passedDistance = absOffset >= SWIPE_DISTANCE_THRESHOLD;
    const passedVelocity = absVelocity >= SWIPE_VELOCITY_THRESHOLD && absOffset >= 36;

    if (passedDistance || passedVelocity) {
      const decision: VoteDecision = info.offset.x > 0 ? 'LIKE' : 'DISLIKE';
      onSwipeVote(movie.tmdbId, decision);
    } else {
      deckProgress.set(0);
    }
  };

  const runtimeLabel = formatRuntime(movie.runtime);
  const genres = movie.genreIds.slice(0, 3).map(getGenreName);

  return (
    <motion.article
      data-testid="active-movie-card"
      data-tmdb-id={movie.tmdbId}
      className={`${styles.card} ${disabled ? styles.cardDisabled : ''}`}
      style={{ x, rotate }}
      drag={disabled || expanded ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.88}
      onDragEnd={handleDragEnd}
      whileTap={disabled || expanded ? undefined : { scale: 1.012 }}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={SPRING_SNAPPY}
    >
      <div className={styles.posterLayer}>
        <MoviePoster
          posterPath={movie.posterPath}
          title={movie.title}
          releaseYear={movie.releaseYear}
          priority
        />
      </div>

      <div className={styles.scrim} />

      <div className={styles.topBar}>
        <span className={styles.ratingPill} aria-label={`Nota ${movie.voteAverage.toFixed(1)}`}>
          <Star size={13} fill="#FDE68A" color="#FDE68A" />
          <span>{movie.voteAverage.toFixed(1)}</span>
        </span>
        {movie.releaseYear && <span className={styles.yearPill}>{movie.releaseYear}</span>}
      </div>

      {movie.oscarBadge && (
        <span className={styles.oscarPill} data-testid="oscar-badge">
          <Award size={13} color="#FBBF24" />
          <span>{movie.oscarBadge}</span>
        </span>
      )}

      <motion.div
        className={`${styles.stamp} ${styles.stampLike}`}
        style={{ opacity: likeOpacity, scale: likeScale }}
        aria-hidden="true"
      >
        GOSTEI
      </motion.div>

      <motion.div
        className={`${styles.stamp} ${styles.stampNope}`}
        style={{ opacity: nopeOpacity, scale: nopeScale }}
        aria-hidden="true"
      >
        PASSAR
      </motion.div>

      <div className={styles.infoOverlay}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{movie.title}</h2>
          <button
            type="button"
            className={styles.expandBtn}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(true);
            }}
            aria-label="Ver sinopse completa"
            data-testid="expand-synopsis-btn"
          >
            <ChevronUp size={18} />
          </button>
        </div>

        <div className={styles.metaRow}>
          {genres.map((genre) => (
            <span key={genre} className={styles.genreTag}>
              {genre}
            </span>
          ))}
          {runtimeLabel && (
            <span className={styles.runtimeTag}>
              <Clock size={12} />
              <span>{runtimeLabel}</span>
            </span>
          )}
        </div>

        {movie.overview && <p className={styles.synopsis}>{movie.overview}</p>}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            data-testid="expanded-synopsis-panel"
            className={styles.expandedSheet}
            initial={{ y: '100%', opacity: 0.4 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.4 }}
            transition={SPRING_SNAPPY}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className={styles.expandedHeader}>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700 }}>{movie.title}</h3>
                {movie.originalTitle !== movie.title && (
                  <p className={styles.originalTitle}>{movie.originalTitle}</p>
                )}
              </div>
              <button
                type="button"
                className={styles.expandBtn}
                onClick={() => setExpanded(false)}
                aria-label="Fechar sinopse completa"
              >
                <ChevronDown size={18} />
              </button>
            </div>

            <div className={styles.metaRow}>
              {movie.releaseYear && <span className={styles.genreTag}>{movie.releaseYear}</span>}
              {runtimeLabel && <span className={styles.genreTag}>{runtimeLabel}</span>}
              <span className={styles.genreTag}>{formatLanguageLabel(movie.originalLanguage)}</span>
              {genres.map((genre) => (
                <span key={genre} className={styles.genreTag}>
                  {genre}
                </span>
              ))}
            </div>

            <p className={styles.fullOverview}>
              {movie.overview || 'Sinopse indisponível para este título.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
