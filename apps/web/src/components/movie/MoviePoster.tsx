import { useEffect, useState } from 'react';
import { Film } from 'lucide-react';
import { getPosterUrl } from '../../utils/tmdbImages';
import styles from './MoviePoster.module.css';

interface MoviePosterProps {
  posterPath: string | null;
  title: string;
  releaseYear?: number | null;
  size?: 'w342' | 'w500' | 'w780';
  priority?: boolean;
  compactPlaceholder?: boolean;
}

export function MoviePoster({
  posterPath,
  title,
  releaseYear,
  size = 'w500',
  priority = false,
  compactPlaceholder = false,
}: MoviePosterProps) {
  const url = getPosterUrl(posterPath, size);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [url]);

  const showFallback = !url || failed;

  return (
    <div className={styles.frame}>
      {!showFallback && !loaded && <div className={styles.shimmer} aria-hidden="true" />}

      {!showFallback ? (
        <img
          src={url}
          alt={`Pôster de ${title}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`${styles.image} ${loaded ? styles.loaded : ''}`}
        />
      ) : (
        <div
          className={styles.placeholder}
          style={compactPlaceholder ? { padding: 10 } : undefined}
        >
          <Film size={compactPlaceholder ? 22 : 40} strokeWidth={1.6} />
          {!compactPlaceholder && (
            <>
              <span className={styles.placeholderTitle}>{title}</span>
              {releaseYear && <span className={styles.placeholderYear}>{releaseYear}</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
