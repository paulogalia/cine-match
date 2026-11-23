import { useEffect, useState } from 'react';
import { Calendar, EyeOff, Film, Heart, RotateCcw, Sparkles } from 'lucide-react';
import type { MovieSummary, SessionHistoryEntry, WatchedMovieEntry } from '@cine-match/shared';
import { MoviePoster } from '../../components/movie/MoviePoster';
import { Modal } from '../../components/ui/Modal';
import { fetchHistory, fetchWatchedMovies, unmarkWatchedMovie } from '../../services/api';

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  onOpenMovieDetails: (movie: MovieSummary) => void;
}

export function HistoryModal({ open, onClose, onOpenMovieDetails }: HistoryModalProps) {
  const [tab, setTab] = useState<'sessions' | 'watched'>('sessions');
  const [entries, setEntries] = useState<SessionHistoryEntry[]>([]);
  const [watched, setWatched] = useState<WatchedMovieEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    void Promise.all([fetchHistory(), fetchWatchedMovies()]).then(([hist, watchedList]) => {
      if (!cancelled) {
        setEntries(hist);
        setWatched(watchedList);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleRestoreWatched = async (tmdbId: number) => {
    const updated = await unmarkWatchedMovie(tmdbId);
    if (updated) {
      setWatched(updated);
    }
  };

  return (
    <Modal open={open} title="Histórico e já assistidos" onClose={onClose}>
      <div
        role="tablist"
        aria-label="Abas do histórico"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          padding: 4,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 14,
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'sessions'}
          onClick={() => setTab('sessions')}
          data-testid="history-tab-sessions"
          style={{
            padding: '8px 10px',
            borderRadius: 7,
            border: 'none',
            background: tab === 'sessions' ? 'var(--bg-elevated)' : 'transparent',
            color: tab === 'sessions' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Sessões ({entries.length})
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === 'watched'}
          onClick={() => setTab('watched')}
          data-testid="history-tab-watched"
          style={{
            padding: '8px 10px',
            borderRadius: 7,
            border: 'none',
            background: tab === 'watched' ? 'var(--bg-elevated)' : 'transparent',
            color: tab === 'watched' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Já assistimos ({watched.length})
        </button>
      </div>

      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
          Carregando...
        </p>
      ) : tab === 'sessions' ? (
        entries.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              color: 'var(--text-secondary)',
            }}
          >
            <Film size={32} color="var(--text-muted)" />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              Nenhuma sessão encerrada ainda
            </p>
            <p style={{ fontSize: 13.5 }}>
              Quando vocês finalizarem uma escolha de filme, ela ficará registrada aqui.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {entries.map((entry) => (
              <div
                key={entry.roomId}
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <strong style={{ fontFamily: 'var(--font-display)', fontSize: 15 }}>
                    {entry.participantNames.join(' & ')}
                  </strong>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                    <Calendar size={12} />
                    {new Date(entry.finishedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {entry.chosenMovie && (
                  <button
                    type="button"
                    onClick={() => onOpenMovieDetails(entry.chosenMovie!)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 8,
                      borderRadius: 12,
                      border: '1px solid rgba(255, 77, 109, 0.35)',
                      background: 'rgba(255, 77, 109, 0.08)',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ width: 40, height: 58, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                      <MoviePoster
                        posterPath={entry.chosenMovie.posterPath}
                        title={entry.chosenMovie.title}
                        size="w342"
                        compactPlaceholder
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#fda4af' }}>
                        <Sparkles size={11} /> Escolhido da noite
                      </span>
                      <strong style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                        {entry.chosenMovie.title}
                      </strong>
                    </div>
                  </button>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Heart size={12} color="var(--accent-primary)" /> {entry.matches.length} matches
                  </span>
                  <span>{entry.totalVotes} votos totais</span>
                </div>
              </div>
            ))}
          </div>
        )
      ) : watched.length === 0 ? (
        <div
          style={{
            padding: '24px 12px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            color: 'var(--text-secondary)',
          }}
        >
          <EyeOff size={32} color="var(--text-muted)" />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            Nenhum filme bloqueado ainda
          </p>
          <p style={{ fontSize: 13.5 }}>
            Durante a votação, toque no ícone de olho para marcar filmes que vocês já assistiram e ocultá-los das próximas sessões.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {watched.map((movie) => (
            <div
              key={movie.tmdbId}
              data-testid={`watched-item-${movie.tmdbId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 10,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ width: 42, height: 62, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                <MoviePoster
                  posterPath={movie.posterPath}
                  title={movie.title}
                  size="w342"
                  compactPlaceholder
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <strong
                  style={{
                    display: 'block',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {movie.title}
                </strong>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {movie.releaseYear ?? '—'} • marcado por {movie.markedBy}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void handleRestoreWatched(movie.tmdbId)}
                aria-label={`Restaurar ${movie.title} para o catálogo`}
                title="Voltar para o catálogo"
                data-testid={`restore-watched-${movie.tmdbId}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 10px',
                  borderRadius: 8,
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={13} />
                <span>Restaurar</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
