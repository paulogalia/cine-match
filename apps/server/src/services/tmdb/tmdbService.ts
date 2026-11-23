import {
  ERROR_CODES,
  type FilterCriteria,
  type Genre,
  type MovieDetails,
  type MovieSummary,
  type PersonRole,
  type PersonSearchResult,
  type WatchProviderOption,
} from '@cine-match/shared';
import type { CatalogPageResult, CatalogProvider } from '../catalog/catalogProvider';
import { getSuggestedPeople } from '../catalog/peopleFallback';
import { FALLBACK_GENRES_PT } from '../catalog/seedCatalogProvider';
import { FALLBACK_WATCH_PROVIDERS_BR } from '../catalog/watchProvidersFallback';
import { DomainError } from '../../utils/sanitize';
import { TtlCache } from './tmdbCache';
import {
  mapTmdbMovieDetails,
  mapTmdbPersonCredits,
  mapTmdbPersonSearchList,
  normalizeTmdbMovieList,
  type TmdbRawMovieDetail,
  type TmdbRawMovieItem,
  type TmdbRawPersonCreditsResponse,
  type TmdbRawPersonItem,
} from './tmdbMapper';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const CATALOG_TTL_MS = 10 * 60 * 1000;
const SEARCH_TTL_MS = 5 * 60 * 1000;
const DETAILS_TTL_MS = 6 * 60 * 60 * 1000;
const PERSON_CREDITS_TTL_MS = 6 * 60 * 60 * 1000;
const GENRES_TTL_MS = 24 * 60 * 60 * 1000;
const PROVIDERS_TTL_MS = 24 * 60 * 60 * 1000;

export interface TmdbCatalogProviderOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

interface TmdbPagedResponse {
  page: number;
  total_pages: number;
  results: TmdbRawMovieItem[];
}

interface TmdbPersonSearchResponse {
  results: TmdbRawPersonItem[];
}

interface TmdbGenresResponse {
  genres: Genre[];
}

interface TmdbWatchProviderListResponse {
  results: Array<{
    provider_id: number;
    provider_name: string;
    logo_path?: string | null;
    display_priority?: number;
    display_priorities?: Record<string, number>;
  }>;
}

export class TmdbCatalogProvider implements CatalogProvider {
  readonly source = 'tmdb' as const;

  private readonly apiKey: string;
  private readonly isBearerToken: boolean;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  private readonly catalogCache = new TtlCache<CatalogPageResult>(200);
  private readonly detailsCache = new TtlCache<MovieDetails>(500);
  private readonly peopleSearchCache = new TtlCache<PersonSearchResult[]>(200);
  private readonly personCreditsCache = new TtlCache<MovieSummary[]>(200);
  private readonly genresCache = new TtlCache<Genre[]>(4);
  private readonly providersCache = new TtlCache<WatchProviderOption[]>(4);

  constructor(options: TmdbCatalogProviderOptions) {
    this.apiKey = options.apiKey.trim();
    this.isBearerToken = this.apiKey.startsWith('eyJ') && this.apiKey.split('.').length === 3;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 8000;
  }

  async fetchPage(filters: FilterCriteria, page: number): Promise<CatalogPageResult> {
    const params = this.buildDiscoverParams(filters, page);
    const cacheKey = `discover:${params.toString()}`;
    const cached = this.catalogCache.get(cacheKey);
    if (cached) return cached;

    try {
      const payload = await this.request<TmdbPagedResponse>('/discover/movie', params);
      const result: CatalogPageResult = {
        movies: normalizeTmdbMovieList(payload.results ?? []),
        page: payload.page ?? page,
        hasMore: (payload.page ?? page) < Math.min(payload.total_pages ?? 1, 500),
      };
      this.catalogCache.set(cacheKey, result, CATALOG_TTL_MS);
      return result;
    } catch (err) {
      const stale = this.catalogCache.getStale(cacheKey);
      if (stale) return stale;
      throw err;
    }
  }

  async searchMovies(query: string, page = 1): Promise<CatalogPageResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { movies: [], page: 1, hasMore: false };
    }

    const params = new URLSearchParams({
      language: 'pt-BR',
      include_adult: 'false',
      query: trimmed,
      page: String(page),
    });

    const cacheKey = `search:${params.toString()}`;
    const cached = this.catalogCache.get(cacheKey);
    if (cached) return cached;

    try {
      const payload = await this.request<TmdbPagedResponse>('/search/movie', params);
      const result: CatalogPageResult = {
        movies: normalizeTmdbMovieList(payload.results ?? []),
        page: payload.page ?? page,
        hasMore: (payload.page ?? page) < Math.min(payload.total_pages ?? 1, 500),
      };
      this.catalogCache.set(cacheKey, result, SEARCH_TTL_MS);
      return result;
    } catch (err) {
      const stale = this.catalogCache.getStale(cacheKey);
      if (stale) return stale;
      throw err;
    }
  }

  async searchPeople(query: string, role?: PersonRole): Promise<PersonSearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return getSuggestedPeople(role);
    }

    const params = new URLSearchParams({
      language: 'pt-BR',
      include_adult: 'false',
      query: trimmed,
      page: '1',
    });

    const cacheKey = `people:${role ?? 'all'}:${trimmed.toLowerCase()}`;
    const cached = this.peopleSearchCache.get(cacheKey);
    if (cached) return cached;

    try {
      const payload = await this.request<TmdbPersonSearchResponse>('/search/person', params);
      const mapped = mapTmdbPersonSearchList(payload.results ?? [], role);
      this.peopleSearchCache.set(cacheKey, mapped, CATALOG_TTL_MS);
      return mapped;
    } catch (err) {
      const stale = this.peopleSearchCache.getStale(cacheKey);
      if (stale) return stale;
      throw err;
    }
  }

  async getPersonMovies(personId: number, role: PersonRole): Promise<MovieSummary[]> {
    const cacheKey = `person-credits:${role}:${personId}`;
    const cached = this.personCreditsCache.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      language: 'pt-BR',
    });

    try {
      const payload = await this.request<TmdbRawPersonCreditsResponse>(
        `/person/${personId}/movie_credits`,
        params,
        true,
      );
      if (!payload) return [];

      const movies = mapTmdbPersonCredits(payload, role);
      this.personCreditsCache.set(cacheKey, movies, PERSON_CREDITS_TTL_MS);
      return movies;
    } catch (err) {
      const stale = this.personCreditsCache.getStale(cacheKey);
      if (stale) return stale;
      throw err;
    }
  }

  async getMovieDetails(tmdbId: number): Promise<MovieDetails | null> {
    const cacheKey = `movie:${tmdbId}`;
    const cached = this.detailsCache.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      language: 'pt-BR',
      append_to_response: 'watch/providers,credits,videos',
      include_video_language: 'pt,en,null',
    });

    try {
      const payload = await this.request<TmdbRawMovieDetail>(`/movie/${tmdbId}`, params, true);
      if (!payload) return null;

      const mapped = mapTmdbMovieDetails(payload);
      this.detailsCache.set(cacheKey, mapped, DETAILS_TTL_MS);
      return mapped;
    } catch (err) {
      const stale = this.detailsCache.getStale(cacheKey);
      if (stale) return stale;
      throw err;
    }
  }

  async getGenres(): Promise<Genre[]> {
    const cacheKey = 'genres:pt-BR';
    const cached = this.genresCache.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({ language: 'pt-BR' });

    try {
      const payload = await this.request<TmdbGenresResponse>('/genre/movie/list', params);
      const genres =
        Array.isArray(payload.genres) && payload.genres.length > 0
          ? payload.genres
          : FALLBACK_GENRES_PT;
      this.genresCache.set(cacheKey, genres, GENRES_TTL_MS);
      return genres;
    } catch {
      return this.genresCache.getStale(cacheKey) ?? FALLBACK_GENRES_PT;
    }
  }

  async getWatchProvidersBR(): Promise<WatchProviderOption[]> {
    const cacheKey = 'providers:BR';
    const cached = this.providersCache.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      language: 'pt-BR',
      watch_region: 'BR',
    });

    try {
      const payload = await this.request<TmdbWatchProviderListResponse>(
        '/watch/providers/movie',
        params,
      );
      const items = Array.isArray(payload.results) ? payload.results : [];
      if (items.length === 0) return FALLBACK_WATCH_PROVIDERS_BR;

      const sorted = [...items].sort((a, b) => {
        const prioA = a.display_priorities?.['BR'] ?? a.display_priority ?? 999;
        const prioB = b.display_priorities?.['BR'] ?? b.display_priority ?? 999;
        return prioA - prioB;
      });

      const topProviders: WatchProviderOption[] = sorted.slice(0, 14).map((p) => ({
        providerId: p.provider_id,
        name: p.provider_name,
        logoPath: p.logo_path ?? null,
      }));

      this.providersCache.set(cacheKey, topProviders, PROVIDERS_TTL_MS);
      return topProviders;
    } catch {
      return this.providersCache.getStale(cacheKey) ?? FALLBACK_WATCH_PROVIDERS_BR;
    }
  }

  private buildDiscoverParams(filters: FilterCriteria, page: number): URLSearchParams {
    const params = new URLSearchParams({
      language: 'pt-BR',
      region: 'BR',
      include_adult: 'false',
      include_video: 'false',
      sort_by: filters.sortBy,
      page: String(page),
    });

    if (filters.genreIds.length > 0) {
      params.set('with_genres', filters.genreIds.join('|'));
    }

    if (filters.yearFrom !== undefined) {
      params.set('primary_release_date.gte', `${filters.yearFrom}-01-01`);
    }

    if (filters.yearTo !== undefined) {
      params.set('primary_release_date.lte', `${filters.yearTo}-12-31`);
    }

    if (filters.minRating !== undefined) {
      params.set('vote_average.gte', String(filters.minRating));
    }

    if (filters.maxVoteCount !== undefined) {
      params.set('vote_count.lte', String(filters.maxVoteCount));
      params.set('vote_count.gte', '60');
    } else if (filters.sortBy === 'vote_average.desc' || (filters.minRating ?? 0) >= 6) {
      params.set('vote_count.gte', '150');
    } else {
      params.set('vote_count.gte', '30');
    }

    if (filters.originalLanguage) {
      params.set('with_original_language', filters.originalLanguage);
    }

    if (filters.minRuntime !== undefined) {
      params.set('with_runtime.gte', String(filters.minRuntime));
    }

    if (filters.maxRuntime !== undefined) {
      params.set('with_runtime.lte', String(filters.maxRuntime));
    }

    if (filters.watchProviderIds && filters.watchProviderIds.length > 0) {
      params.set('watch_region', 'BR');
      params.set('with_watch_providers', filters.watchProviderIds.join('|'));
      params.set('with_watch_monetization_types', 'flatrate');
    }

    return params;
  }

  private async request<T>(
    endpoint: string,
    params: URLSearchParams,
    allowNotFound = false,
  ): Promise<T> {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.isBearerToken) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else {
      url.searchParams.set('api_key', this.apiKey);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      if (allowNotFound && response.status === 404) {
        return null as T;
      }

      if (response.status === 401) {
        throw new DomainError(
          ERROR_CODES.TMDB_UNAVAILABLE,
          'Chave da API do TMDB inválida ou expirada. Verifique a variável TMDB_API_KEY no arquivo .env.',
        );
      }

      if (response.status === 429) {
        throw new DomainError(
          ERROR_CODES.TMDB_UNAVAILABLE,
          'Limite temporário de requisições do TMDB atingido. Tente novamente em alguns segundos.',
        );
      }

      if (!response.ok) {
        throw new DomainError(
          ERROR_CODES.TMDB_UNAVAILABLE,
          `O catálogo do TMDB está temporariamente indisponível (HTTP ${response.status}).`,
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof DomainError) throw err;
      throw new DomainError(
        ERROR_CODES.TMDB_UNAVAILABLE,
        'Não foi possível conectar ao TMDB. Verifique a conexão com a internet do computador servidor.',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
