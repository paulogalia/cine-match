import { useEffect, useState } from 'react';
import { Calendar, Film, Heart, Sparkles } from 'lucide-react';
import type { MovieSummary, SessionHistoryEntry } from '@cine-match/shared';
import { MoviePoster } from '../../components/movie/MoviePoster';
import { Modal } from '../../components/ui/Modal';
import { fetchHistory } from '../../services/api';

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  onOpenMovieDetails: (movie: MovieSummary) => void;
}

export function HistoryModal({ open, onClose, onOpenMovieDetails }: HistoryModalProps) {
  const [entries, setEntries] = useState<SessionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);

    void fetchHistory().then((list) => {
      if (!cancelled) {
        setEntries(list);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Modal open={open} title="Histórico de sessões" onClose={onClose}>
      {loading ? (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: 20 }}>
          Carregando histórico...
        </p>
      ) : entries.length === 0 ? (
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
      )}
    </Modal>
  );
}
