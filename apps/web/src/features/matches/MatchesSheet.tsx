import { Heart, Sparkles, Star, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ClientMatchItem, MovieSummary } from '@cine-match/shared';
import { SPRING_SNAPPY } from '../../animations/presets';
import { MoviePoster } from '../../components/movie/MoviePoster';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { getGenreName } from '../../utils/genres';
import styles from './MatchesSheet.module.css';

interface MatchesSheetProps {
  open: boolean;
  matches: ClientMatchItem[];
  onClose: () => void;
  onOpenDetails: (movie: MovieSummary) => void;
  onDismiss: (tmdbId: number) => Promise<void>;
  onDecideNow: () => void;
}

export function MatchesSheet({
  open,
  matches,
  onClose,
  onOpenDetails,
  onDismiss,
  onDecideNow,
}: MatchesSheetProps) {
  const activeMatches = matches.filter((m) => m.match.status !== 'DISMISSED');

  return (
    <Modal open={open} title={`Matches (${activeMatches.length})`} onClose={onClose}>
      {activeMatches.length === 0 ? (
        <div className={styles.empty}>
          <Heart size={34} color="var(--accent-primary)" />
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            Nenhum match ainda
          </p>
          <p style={{ fontSize: 13.5, maxWidth: 280 }}>
            Continuem deslizando os cards. Assim que vocês dois aprovarem o mesmo filme, ele entra nesta lista compartilhada.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            <AnimatePresence initial={false}>
              {activeMatches.map(({ match, movie }, index) => (
                <motion.div
                  key={movie.tmdbId}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                  transition={{ ...SPRING_SNAPPY, delay: Math.min(index * 0.04, 0.24) }}
                  className={`${styles.card} ${match.status === 'CHOSEN' ? styles.cardChosen : ''}`}
                >
                  <button
                    type="button"
                    className={styles.posterBtn}
                    onClick={() => onOpenDetails(movie)}
                    aria-label={`Abrir detalhes de ${movie.title}`}
                  >
                    <MoviePoster
                      posterPath={movie.posterPath}
                      title={movie.title}
                      size="w342"
                      compactPlaceholder
                    />
                  </button>

                  <button
                    type="button"
                    className={styles.infoBtn}
                    onClick={() => onOpenDetails(movie)}
                  >
                    <span className={styles.title}>{movie.title}</span>
                    <div className={styles.meta}>
                      <span>{movie.releaseYear ?? '—'}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#FDE68A' }}>
                        <Star size={11} fill="#FDE68A" /> {movie.voteAverage.toFixed(1)}
                      </span>
                      {match.status === 'CHOSEN' && (
                        <span className={styles.statusTag}>Escolhido</span>
                      )}
                    </div>
                    <span className={styles.genres}>
                      {movie.genreIds.slice(0, 2).map(getGenreName).join(' • ')}
                    </span>
                  </button>

                  {match.status !== 'CHOSEN' && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => void onDismiss(movie.tmdbId)}
                      aria-label={`Remover ${movie.title} da lista de interesse`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className={styles.footer}>
            <Button
              size="lg"
              fullWidth
              icon={<Sparkles size={17} />}
              onClick={() => {
                onClose();
                onDecideNow();
              }}
              data-testid="matches-sheet-decide-btn"
            >
              Decidir agora
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
