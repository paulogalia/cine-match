import type { MovieDetails, MovieSummary, WatchProvider } from '@cine-match/shared';

export interface TmdbRawMovieItem {
  id: number;
  title?: string | null;
  original_title?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  release_date?: string | null;
  genre_ids?: number[] | null;
  original_language?: string | null;
}

export interface TmdbRawProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

export interface TmdbRawRegionProviders {
  link?: string | null;
  flatrate?: TmdbRawProviderEntry[];
  rent?: TmdbRawProviderEntry[];
  buy?: TmdbRawProviderEntry[];
}

export interface TmdbRawMovieDetail extends TmdbRawMovieItem {
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
  'watch/providers'?: {
    results?: Record<string, TmdbRawRegionProviders | undefined>;
  };
}

function parseReleaseYear(releaseDate?: string | null): number | null {
  if (!releaseDate || releaseDate.length < 4) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isInteger(year) && year >= 1880 && year <= 2100 ? year : null;
}

export function mapTmdbMovieSummary(raw: TmdbRawMovieItem): MovieSummary {
  const originalTitle = (raw.original_title ?? raw.title ?? 'Sem título').trim() || 'Sem título';
  const localizedTitle = (raw.title ?? '').trim();

  return {
    tmdbId: raw.id,
    title: localizedTitle || originalTitle,
    originalTitle,
    overview: (raw.overview ?? '').trim(),
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    voteAverage: Number((raw.vote_average ?? 0).toFixed(1)),
    voteCount: Math.max(0, Math.round(raw.vote_count ?? 0)),
    releaseYear: parseReleaseYear(raw.release_date),
    genreIds: Array.isArray(raw.genre_ids) ? raw.genre_ids : [],
    originalLanguage: (raw.original_language ?? 'en').trim() || 'en',
  };
}

/**
 * Deduplica resultados por tmdbId e prioriza filmes que possuem pôster disponível.
 */
export function normalizeTmdbMovieList(items: TmdbRawMovieItem[]): MovieSummary[] {
  const seen = new Set<number>();
  const withPoster: MovieSummary[] = [];
  const withoutPoster: MovieSummary[] = [];

  for (const item of items) {
    if (!Number.isInteger(item.id) || item.id <= 0 || seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    const mapped = mapTmdbMovieSummary(item);
    if (mapped.posterPath) {
      withPoster.push(mapped);
    } else {
      withoutPoster.push(mapped);
    }
  }

  return withPoster.length > 0 ? withPoster : withoutPoster;
}

export function mapTmdbMovieDetails(raw: TmdbRawMovieDetail): MovieDetails {
  const summary = mapTmdbMovieSummary({
    ...raw,
    genre_ids: raw.genres?.map((g) => g.id) ?? raw.genre_ids ?? [],
  });

  const brProviders = raw['watch/providers']?.results?.['BR'];
  const providers: WatchProvider[] = [];
  const seenKeys = new Set<string>();

  const appendGroup = (
    list: TmdbRawProviderEntry[] | undefined,
    type: WatchProvider['type'],
  ) => {
    if (!Array.isArray(list)) return;
    for (const p of list) {
      const key = `${p.provider_id}:${type}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      providers.push({
        providerId: p.provider_id,
        name: p.provider_name,
        logoPath: p.logo_path ?? null,
        type,
      });
    }
  };

  appendGroup(brProviders?.flatrate, 'flatrate');
  appendGroup(brProviders?.rent, 'rent');
  appendGroup(brProviders?.buy, 'buy');

  return {
    ...summary,
    runtime: typeof raw.runtime === 'number' && raw.runtime > 0 ? raw.runtime : null,
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    watchProvidersBR: {
      link: brProviders?.link ?? null,
      available: providers.length > 0,
      providers,
    },
    fetchedAt: new Date().toISOString(),
  };
}
