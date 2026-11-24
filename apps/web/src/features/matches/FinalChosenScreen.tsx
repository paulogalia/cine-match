import { Clapperboard, History, Info, RotateCcw, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import type { ClientRoomSnapshot, MovieSummary } from '@cine-match/shared';
import { SPRING_SNAPPY } from '../../animations/presets';
import { MoviePoster } from '../../components/movie/MoviePoster';
import { Button } from '../../components/ui/Button';
import styles from './FinalChosenScreen.module.css';

interface FinalChosenScreenProps {
  snapshot: ClientRoomSnapshot;
  onOpenDetails: (movie: MovieSummary) => void;
  onOpenHistory: () => void;
  onNewSession: () => void;
}

export function FinalChosenScreen({
  snapshot,
  onOpenDetails,
  onOpenHistory,
  onNewSession,
}: FinalChosenScreenProps) {
  const chosen = snapshot.chosenMovie;
  const activeMatchesCount = snapshot.matches.filter((m) => m.match.status !== 'DISMISSED').length;
  const isGroup = snapshot.participants.length >= 3;

  return (
    <motion.section
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="final-chosen-screen"
    >
      <div className={styles.ambientGlow} aria-hidden="true" />

      {chosen ? (
        <>
          <motion.span
            className={styles.eyebrow}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Sparkles size={13} />
            <span>Filme da noite escolhido</span>
          </motion.span>

          <motion.div
            className={styles.posterHero}
            initial={{ opacity: 0, scale: 0.84, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={SPRING_SNAPPY}
          >
            <MoviePoster
              posterPath={chosen.posterPath}
              title={chosen.title}
              releaseYear={chosen.releaseYear}
              priority
            />
          </motion.div>

          <div className={styles.info}>
            <h1 className={styles.movieTitle}>{chosen.title}</h1>
            <p className={styles.meta}>
              {chosen.releaseYear ?? '—'} • Nota {chosen.voteAverage.toFixed(1)} •{' '}
              {isGroup ? 'Boa sessão para a turma!' : 'Boa sessão para vocês!'}
            </p>
          </div>

          <div className={styles.actions}>
            <Button
              size="lg"
              fullWidth
              icon={<Info size={17} />}
              onClick={() => onOpenDetails(chosen)}
            >
              Ver detalhes e onde assistir
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              icon={<RotateCcw size={16} />}
              onClick={onNewSession}
            >
              Nova sessão
            </Button>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              icon={<History size={15} />}
              onClick={onOpenHistory}
            >
              Ver histórico de sessões
            </Button>
          </div>
        </>
      ) : (
        <>
          <Clapperboard size={46} color="var(--accent-primary)" />
          <div className={styles.info}>
            <h1 className={styles.movieTitle}>Sessão encerrada</h1>
            <p className={styles.meta}>
              {activeMatchesCount > 0
                ? `Foram registrados ${activeMatchesCount} ${
                    activeMatchesCount === 1 ? 'match' : 'matches'
                  } e tudo ficou salvo no histórico.`
                : 'A sessão foi encerrada. Quando quiserem, é só começar uma nova busca!'}
            </p>
          </div>
          <div className={styles.actions}>
            <Button size="lg" fullWidth icon={<RotateCcw size={16} />} onClick={onNewSession}>
              Voltar ao início
            </Button>
            <Button variant="secondary" fullWidth icon={<History size={16} />} onClick={onOpenHistory}>
              Consultar histórico
            </Button>
          </div>
        </>
      )}
    </motion.section>
  );
}