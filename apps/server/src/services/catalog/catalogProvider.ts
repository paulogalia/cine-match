import type {
  FilterCriteria,
  Genre,
  MovieDetails,
  MovieSummary,
  WatchProviderOption,
} from '@cine-match/shared';

export interface CatalogPageResult {
  movies: MovieSummary[];
  page: number;
  hasMore: boolean;
}

export interface CatalogProvider {
  readonly source: 'tmdb' | 'seed';
  fetchPage(filters: FilterCriteria, page: number): Promise<CatalogPageResult>;
  getMovieDetails(tmdbId: number): Promise<MovieDetails | null>;
  getGenres(): Promise<Genre[]>;
  getWatchProvidersBR(): Promise<WatchProviderOption[]>;
  searchMovies(query: string, page?: number): Promise<CatalogPageResult>;
}
