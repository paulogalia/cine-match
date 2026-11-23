import fs from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PersonSearchResult } from '@cine-match/shared';
import { createApp } from '../app';
import { fetchPeopleCatalogPage } from '../services/catalog/peopleCatalog';
import { SeedCatalogProvider } from '../services/catalog/seedCatalogProvider';
import { TmdbCatalogProvider } from '../services/tmdb/tmdbService';

function mockJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Bloco A — Diretores, Atores, Trailers e Elenco', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-match-people-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('filtra estritamente job === Director para diretores e remove aparições Self para atores', async () => {
    const fetchMock = vi.fn().mockImplementation(async () =>
      mockJson({
        crew: [
          {
            id: 27205,
            title: 'A Origem',
            original_title: 'Inception',
            poster_path: '/inception.jpg',
            vote_average: 8.4,
            vote_count: 35000,
            job: 'Director',
          },
          {
            id: 99999,
            title: 'Filme Apenas Produzido',
            original_title: 'Produced Only',
            poster_path: '/prod.jpg',
            vote_average: 6.5,
            vote_count: 5000,
            job: 'Producer',
          },
        ],
        cast: [
          {
            id: 1001,
            title: 'Filme Atuado',
            original_title: 'Acted Movie',
            poster_path: '/acted.jpg',
            vote_average: 8.0,
            vote_count: 10000,
            character: 'Protagonista',
          },
          {
            id: 1002,
            title: 'Bastidores TV',
            original_title: 'Behind the Scenes',
            poster_path: '/bts.jpg',
            vote_average: 7.0,
            vote_count: 200,
            character: 'Self',
          },
        ],
      }),
    );

    const provider = new TmdbCatalogProvider({
      apiKey: 'fake_v3_key',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const directed = await provider.getPersonMovies(525, 'director');
    expect(directed.map((m) => m.tmdbId)).toEqual([27205]);

    const acted = await provider.getPersonMovies(6193, 'actor');
    expect(acted.map((m) => m.tmdbId)).toEqual([1001]);
  });

  it('extrai trailer priorizando pt-BR no YouTube, além de diretores e elenco em getMovieDetails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJson({
        id: 27205,
        title: 'A Origem',
        original_title: 'Inception',
        overview: 'Sonhos dentro de sonhos.',
        poster_path: '/inception.jpg',
        backdrop_path: '/back.jpg',
        vote_average: 8.4,
        vote_count: 35000,
        release_date: '2010-07-16',
        runtime: 148,
        genres: [{ id: 878, name: 'Ficção Científica' }],
        original_language: 'en',
        credits: {
          crew: [
            { id: 525, name: 'Christopher Nolan', job: 'Director', profile_path: '/nolan.jpg' },
            { id: 999, name: 'Emma Thomas', job: 'Producer', profile_path: null },
          ],
          cast: [
            { id: 6193, name: 'Leonardo DiCaprio', character: 'Cobb', order: 0, profile_path: '/leo.jpg' },
            { id: 2037, name: 'Cillian Murphy', character: 'Fischer', order: 4, profile_path: '/cil.jpg' },
          ],
        },
        videos: {
          results: [
            { key: 'en_key', name: 'Official Trailer', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'en' },
            { key: 'pt_key', name: 'Trailer Dublado', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'pt' },
          ],
        },
      }),
    );

    const provider = new TmdbCatalogProvider({
      apiKey: 'fake_v3_key',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    const details = await provider.getMovieDetails(27205);
    expect(details?.directors).toEqual([
      { id: 525, name: 'Christopher Nolan', profilePath: '/nolan.jpg' },
    ]);
    expect(details?.cast).toHaveLength(2);
    expect(details?.cast[0]?.name).toBe('Leonardo DiCaprio');
    expect(details?.trailer?.key).toBe('pt_key');
  });

  it('cruza diretor + ator para encontrar colaborações (ex: Nolan + DiCaprio)', async () => {
    const seed = new SeedCatalogProvider();

    const nolanOnly = await fetchPeopleCatalogPage(
      {
        genreIds: [],
        sortBy: 'popularity.desc',
        directors: [{ id: 525, name: 'Christopher Nolan' }],
      },
      1,
      seed,
    );
    expect(nolanOnly.movies.map((m) => m.tmdbId)).toEqual(expect.arrayContaining([27205, 157336, 872585]));

    const nolanAndLeo = await fetchPeopleCatalogPage(
      {
        genreIds: [],
        sortBy: 'popularity.desc',
        directors: [{ id: 525, name: 'Christopher Nolan' }],
        actors: [{ id: 6193, name: 'Leonardo DiCaprio' }],
      },
      1,
      seed,
    );
    expect(nolanAndLeo.movies.map((m) => m.tmdbId)).toEqual([27205]);
  });

  it('expõe GET /api/people/search retornando sugestões e busca filtrada por papel', async () => {
    const appInstance = createApp({
      port: 0,
      nodeEnv: 'test',
      dataFilePath: path.join(tmpDir, 'sessions.json'),
      catalogMode: 'seed',
    });
    await appInstance.roomManager.init();
    await new Promise<void>((resolve) => {
      appInstance.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const { port } = appInstance.httpServer.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/people/search?role=director&q=nolan`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { people: PersonSearchResult[] };
    expect(body.people).toHaveLength(1);
    expect(body.people[0]?.name).toBe('Christopher Nolan');

    await new Promise<void>((resolve) => appInstance.io.close(() => resolve()));
  });
});
