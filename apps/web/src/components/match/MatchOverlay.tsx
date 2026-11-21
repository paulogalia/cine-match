import { Info, Play, Sparkles } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { MovieSummary } from '@cine-match/shared';
import { SPRING_SNAPPY } from '../../animations/presets';
import { MoviePoster } from '../movie/MoviePoster';
import { Button } from '../ui/Button';
import styles from './MatchOverlay.module.css';

interface MatchOverlayProps {
  movie: MovieSummary | null;
  remainingInQueue: number;
  onViewDetails: (movie: MovieSummary) => void;
  onContinue: () => void;
}

const PARTICLES = [
  { id: 1, x: -135, y: -175, size: 7, color: '#FF4D6D', delay: 0.08 },
  { id: 2, x: 142, y: -160, size: 6, color: '#FDBA74', delay: 0.11 },
  { id: 3, x: -158, y: -45, size: 5, color: '#C084FC', delay: 0.14 },
  { id: 4, x: 155, y: -35, size: 8, color: '#FF4D6D', delay: 0.1 },
  { id: 5, x: -120, y: 125, size: 6, color: '#FDBA74', delay: 0.16 },
  { id: 6, x: 132, y: 140, size: 7, color: '#A855F7', delay: 0.13 },
  { id: 7, x: -65, y: -210, size: 5, color: '#FFFFFF', delay: 0.18 },
  { id: 8, x: 75, y: -205, size: 6, color: '#FF4D6D', delay: 0.15 },
  { id: 9, x: -165, y: 55, size: 6, color: '#FDBA74', delay: 0.12 },
  { id: 10, x: 162, y: 68, size: 5, color: '#FFFFFF', delay: 0.19 },
  { id: 11, x: -40, y: 195, size: 7, color: '#C084FC', delay: 0.17 },
  { id: 12, x: 52, y: 190, size: 5, color: '#FF4D6D', delay: 0.2 },
  { id: 13, x: -100, y: -125, size: 4, color: '#FFFFFF', delay: 0.09 },
  { id: 14, x: 108, y: -115, size: 4, color: '#C084FC', delay: 0.14 },
  { id: 15, x: -140, y: -115, size: 5, color: '#FDBA74', delay: 0.21 },
  { id: 16, x: 138, y: 12, size: 4, color: '#FDBA74', delay: 0.16 },
  { id: 17, x: -95, y: 170, size: 5, color: '#FF4D6D', delay: 0.22 },
  { id: 18, x: 98, y: -175, size: 4, color: '#FFFFFF', delay: 0.13 },
];

export function MatchOverlay({
  movie,
  remainingInQueue,
  onViewDetails,
  onContinue,
}: MatchOverlayProps) {
  const reducedMotion = Boolean(useReducedMotion());

  return (
    <AnimatePresence mode="wait">
      {movie && (
        <motion.div
          key={movie.tmdbId}
          className={styles.overlay}
          data-testid="match-celebration-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={`Match encontrado: ${movie.title}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <motion.div
            className={styles.glowOrb}
            initial={{ scale: 0.65, opacity: 0 }}
            animate={
              reducedMotion
                ? { scale: 1, opacity: 0.7 }
                : { scale: [0.7, 1.15, 1], opacity: [0, 0.9, 0.72] }
            }
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            aria-hidden="true"
          />

          {!reducedMotion && (
            <div className={styles.particlesLayer} aria-hidden="true">
              {PARTICLES.map((p) => (
                <motion.span
                  key={p.id}
                  className={styles.particle}
                  style={{ width: p.size, height: p.size, background: p.color }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{ x: p.x, y: p.y, scale: [0, 1.25, 0.7], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.05, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
            </div>
          )}

          <div className={styles.content}>
            <motion.div
              className={styles.badge}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.05 }}
            >
              <Sparkles size={13} />
              <span>Vocês dois curtiram</span>
            </motion.div>

            <motion.h1
              className={styles.headline}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.84, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...SPRING_SNAPPY, delay: 0.08 }}
            >
              É MATCH!
            </motion.h1>

            <motion.div
              className={styles.posterCard}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.78, y: 26 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...SPRING_SNAPPY, delay: 0.12 }}
            >
              <MoviePoster
                posterPath={movie.posterPath}
                title={movie.title}
                releaseYear={movie.releaseYear}
                priority
              />
              {!reducedMotion && (
                <motion.div
                  className={styles.lightSweep}
                  initial={{ x: '-140%', opacity: 0.85 }}
                  animate={{ x: '150%', opacity: 0 }}
                  transition={{ duration: 0.85, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  aria-hidden="true"
                />
              )}
            </motion.div>

            <motion.div
              className={styles.movieMeta}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <h2 className={styles.movieTitle}>{movie.title}</h2>
              <span className={styles.movieSub}>
                {movie.releaseYear ?? '—'} • Nota {movie.voteAverage.toFixed(1)}
              </span>
            </motion.div>

            <motion.div
              className={styles.actions}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.26 }}
            >
              <Button
                size="lg"
                fullWidth
                icon={<Play size={18} />}
                onClick={onContinue}
                data-testid="match-continue-btn"
              >
                Continuar procurando
              </Button>
              <Button
                variant="secondary"
                size="md"
                fullWidth
                icon={<Info size={17} />}
                onClick={() => onViewDetails(movie)}
                data-testid="match-details-btn"
              >
                Ver detalhes do filme
              </Button>
            </motion.div>

            {remainingInQueue > 0 && (
              <span className={styles.queueNote} data-testid="match-queue-remaining">
                +{remainingInQueue} {remainingInQueue === 1 ? 'novo match' : 'novos matches'} na fila
              </span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
