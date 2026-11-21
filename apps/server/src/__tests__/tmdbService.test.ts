import { describe, expect, it, vi } from 'vitest';
import { ERROR_CODES } from '@cine-match/shared';
import { TmdbCatalogProvider } from '../services/tmdb/tmdbService';
import { DomainError } from '../utils/sanitize';

function mockJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Etapa 7 — Integração TMDB, Cache e Resiliência', () => {
  it('monta requisição /discover/movie em pt-BR com todos os filtros, deduplica e prioriza pôsteres', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({
        page: 1,
        total_pages: 5,
        results: [
          {
            id: 101,
            title: 'Filme Com Pôster',
            original_title: 'Movie With Poster',
            overview: 'Sinopse em pt-BR.',
            poster_path: '/poster1.jpg',
            backdrop_path: '/back1.jpg',
            vote_average: 8.24,
            vote_count: 1200,
            release_date: '2021-05-14',
            genre_ids: [18, 878],
            original_language: 'en',
          },
          // Duplicado -> deve ser removido
          {
            id: 101,
            title: 'Filme Com Pôster',
            original_title: 'Movie With Poster',
            poster_path: '/poster1.jpg',
          },
          // Sem tradução -> cai para original_title
          {
            id: 102,
            title: '',
            original_title: 'Original Title Only',
            overview: '',
            poster_path: '/poster2.jpg',
            vote_average: 7.5,
            vote_count: 500,
            release_date: '2020-02-01',
            genre_ids: [18],
            original_language: 'fr',
          },
          // Sem pôster -> filtrado quando existem filmes com pôster
          {
            id: 103,
            title: 'Sem Poster',
            original_title: 'No Poster',
            poster_path: null,
          },
        ],
      }),
    );

    const provider = new TmdbCatalogProvider({
      apiKey: 'fake_v3_key_123',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const page1 = await provider.fetchPage(
      {
        genreIds: [18, 878],
        yearFrom: 2015,
        yearTo: 2024,
        minRating: 7.5,
        sortBy: 'vote_average.desc',
        originalLanguage: 'en',
        minRuntime: 90,
        maxRuntime: 160,
      },
      1,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(calledUrl.pathname).toBe('/3/discover/movie');
    expect(calledUrl.searchParams.get('api_key')).toBe('fake_v3_key_123');
    expect(calledUrl.searchParams.get('language')).toBe('pt-BR');
    expect(calledUrl.searchParams.get('with_genres')).toBe('18|878');
    expect(calledUrl.searchParams.get('primary_release_date.gte')).toBe('2015-01-01');
    expect(calledUrl.searchParams.get('primary_release_date.lte')).toBe('2024-12-31');
    expect(calledUrl.searchParams.get('vote_average.gte')).toBe('7.5');
    expect(calledUrl.searchParams.get('with_original_language')).toBe('en');
    expect(calledUrl.searchParams.get('with_runtime.gte')).toBe('90');
    expect(calledUrl.searchParams.get('with_runtime.lte')).toBe('160');

    expect(page1.movies).toHaveLength(2);
    expect(page1.movies[0]?.title).toBe('Filme Com Pôster');
    expect(page1.movies[1]?.title).toBe('Original Title Only');
    expect(page1.hasMore).toBe(true);

    // Segunda chamada idêntica deve responder direto do cache (sem novo fetch)
    const cached = await provider.fetchPage(
      {
        genreIds: [18, 878],
        yearFrom: 2015,
        yearTo: 2024,
        minRating: 7.5,
        sortBy: 'vote_average.desc',
        originalLanguage: 'en',
        minRuntime: 90,
        maxRuntime: 160,
      },
      1,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(cached.movies).toHaveLength(2);
  });

  it('envia Authorization Bearer quando recebe token v4 JWT e mapeia watch/providers do Brasil', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({
        id: 598,
        title: 'Cidade de Deus',
        original_title: 'Cidade de Deus',
        overview: 'Clássico brasileiro.',
        poster_path: '/poster.jpg',
        backdrop_path: '/back.jpg',
        vote_average: 8.4,
        vote_count: 7300,
        release_date: '2002-08-30',
        runtime: 130,
        genres: [
          { id: 18, name: 'Drama' },
          { id: 80, name: 'Crime' },
        ],
        original_language: 'pt',
        'watch/providers': {
          results: {
            BR: {
              link: 'https://www.themoviedb.org/movie/598/watch?locale=BR',
              flatrate: [
                { provider_id: 8, provider_name: 'Netflix', logo_path: '/netflix.jpg' },
              ],
              rent: [
                { provider_id: 2, provider_name: 'Apple TV', logo_path: '/apple.jpg' },
              ],
            },
          },
        },
      }),
    );

    const provider = new TmdbCatalogProvider({
      apiKey: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const details = await provider.getMovieDetails(598);
    expect(details).not.toBeNull();
    expect(details?.runtime).toBe(130);
    expect(details?.watchProvidersBR.available).toBe(true);
    expect(details?.watchProvidersBR.providers).toHaveLength(2);
    expect(details?.watchProvidersBR.providers[0]?.name).toBe('Netflix');
    expect(details?.watchProvidersBR.providers[0]?.type).toBe('flatrate');

    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['Authorization']).toContain('Bearer eyJ');
  });

  it('lança DomainError TMDB_UNAVAILABLE de forma limpa quando o TMDB falha sem cache prévio', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network down'));

    const provider = new TmdbCatalogProvider({
      apiKey: 'fake_v3_key',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await expect(
      provider.fetchPage({ genreIds: [], sortBy: 'popularity.desc' }, 1),
    ).rejects.toMatchObject({
      code: ERROR_CODES.TMDB_UNAVAILABLE,
    });
  });

  it('retorna gêneros fallback em português quando /genre/movie/list falha', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Offline'));
    const provider = new TmdbCatalogProvider({
      apiKey: 'fake_v3_key',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const genres = await provider.getGenres();
    expect(genres.length).toBeGreaterThan(5);
    expect(genres.some((g) => g.name === 'Comédia')).toBe(true);
  });
});
