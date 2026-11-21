import { useEffect, useState } from 'react';
import { Calendar, Clock, ExternalLink, Globe, Star, Tv } from 'lucide-react';
import type { MovieDetails, MovieSummary, WatchProvider } from '@cine-match/shared';
import { fetchMovieDetails } from '../../services/api';
import { getGenreName } from '../../utils/genres';
import {
  formatLanguageLabel,
  formatRuntime,
  getBackdropUrl,
  getProviderLogoUrl,
} from '../../utils/tmdbImages';
import { Modal } from '../ui/Modal';
import { TmdbAttribution } from '../ui/TmdbAttribution';
import { MoviePoster } from './MoviePoster';
import styles from './MovieDetailsModal.module.css';

interface MovieDetailsModalProps {
  movie: MovieSummary | null;
  onClose: () => void;
}

const PROVIDER_TYPE_LABELS: Record<WatchProvider['type'], string> = {
  flatrate: 'Streaming',
  rent: 'Aluguel',
  buy: 'Compra',
};

export function MovieDetailsModal({ movie, onClose }: MovieDetailsModalProps) {
  const [details, setDetails] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!movie) {
      setDetails(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setDetails(null);

    void fetchMovieDetails(movie.tmdbId).then((fetched) => {
      if (!cancelled) {
        setDetails(fetched);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [movie]);

  const active = details ?? movie;
  const backdropUrl = active ? getBackdropUrl(active.backdropPath, 'w780') : null;
  const runtimeLabel = active ? formatRuntime(active.runtime) : null;
  const genres = details
    ? details.genres.map((g) => g.name)
    : (movie?.genreIds.map(getGenreName) ?? []);

  return (
    <Modal open={Boolean(movie)} title="Detalhes do filme" onClose={onClose}>
      {active && (
        <div data-testid="movie-details-content">
          <div className={styles.backdropWrap}>
            {backdropUrl && (
              <img
                src={backdropUrl}
                alt=""
                className={styles.backdropImg}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className={styles.backdropGradient} />
          </div>

          <div className={styles.heroRow}>
            <div className={styles.posterThumb}>
              <MoviePoster
                posterPath={active.posterPath}
                title={active.title}
                size="w342"
                compactPlaceholder
              />
            </div>

            <div className={styles.heroText}>
              <h3 className={styles.title}>{active.title}</h3>
              {active.originalTitle !== active.title && (
                <span className={styles.original}>{active.originalTitle}</span>
              )}
            </div>
          </div>

          <div className={styles.statsRow}>
            <span className={styles.statPill} style={{ color: '#FDE68A' }}>
              <Star size={13} fill="#FDE68A" color="#FDE68A" />
              <strong>{active.voteAverage.toFixed(1)}</strong>
              {active.voteCount > 0 && (
                <span style={{ color: 'var(--text-muted)' }}>
                  ({active.voteCount.toLocaleString('pt-BR')})
                </span>
              )}
            </span>

            {active.releaseYear && (
              <span className={styles.statPill}>
                <Calendar size={13} />
                <span>{active.releaseYear}</span>
              </span>
            )}

            {runtimeLabel && (
              <span className={styles.statPill}>
                <Clock size={13} />
                <span>{runtimeLabel}</span>
              </span>
            )}

            <span className={styles.statPill}>
              <Globe size={13} />
              <span>{formatLanguageLabel(active.originalLanguage)}</span>
            </span>
          </div>

          {genres.length > 0 && (
            <div className={styles.section}>
              <span className={styles.sectionTitle}>Gêneros</span>
              <div className={styles.genresRow}>
                {genres.map((g) => (
                  <span key={g} className={styles.genreChip}>
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Sinopse</span>
            <p className={styles.overview}>
              {active.overview || 'Sinopse indisponível em português para este título.'}
            </p>
          </div>

          <div className={styles.section}>
            <span className={styles.sectionTitle}>Onde assistir (Brasil)</span>
            <div className={styles.providersBox}>
              {loading ? (
                <span>Consultando disponibilidade regional...</span>
              ) : details?.watchProvidersBR.available &&
                details.watchProvidersBR.providers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className={styles.providersList}>
                    {details.watchProvidersBR.providers.slice(0, 8).map((p) => {
                      const logo = getProviderLogoUrl(p.logoPath);
                      return (
                        <span key={`${p.providerId}-${p.type}`} className={styles.providerItem}>
                          {logo ? (
                            <img
                              src={logo}
                              alt=""
                              width={18}
                              height={18}
                              style={{ borderRadius: 4 }}
                            />
                          ) : (
                            <Tv size={13} />
                          )}
                          <span>{p.name}</span>
                          <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                            ({PROVIDER_TYPE_LABELS[p.type]})
                          </span>
                        </span>
                      );
                    })}
                  </div>

                  {details.watchProvidersBR.link && (
                    <a
                      href={details.watchProvidersBR.link}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 12,
                        color: '#93c5fd',
                        textDecoration: 'none',
                      }}
                    >
                      <span>Ver opções completas no TMDB (JustWatch)</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ) : (
                <span>
                  Disponibilidade de streaming no Brasil não encontrada para este título no momento.
                </span>
              )}
            </div>
          </div>

          <div style={{ marginTop: 18, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
            <TmdbAttribution compact />
          </div>
        </div>
      )}
    </Modal>
  );
}
