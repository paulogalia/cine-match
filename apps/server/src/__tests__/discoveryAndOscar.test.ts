import fs from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FilterCriteria, MovieSummary, WatchProviderOption } from '@cine-match/shared';
import { createApp } from '../app';
import type { CatalogProvider } from '../services/catalog/catalogProvider';
import { filterOscarEntries } from '../services/catalog/oscarCatalog';
import { JsonStore } from '../services/persistence/jsonStore';
import { RoomManager } from '../services/rooms/roomManager';
import { TmdbCatalogProvider } from '../services/tmdb/tmdbService';

function mockJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Novos Filtros — Oscar, Streaming BR, Descoberta Aleatória e Histórico', () => {
  let tmpDir: string;
  let dataFile: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-match-adv-'));
    dataFile = path.join(tmpDir, 'sessions.json');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('filtra filmes do Oscar por categorias, anos da cerimônia e opção apenas vencedores', () => {
    const intl2025 = filterOscarEntries({
      genreIds: [],
      sortBy: 'popularity.desc',
      oscar: {
        enabled: true,
        winnersOnly: true,
        categories: ['international_feature'],
        ceremonyYearFrom: 2025,
        ceremonyYearTo: 2026,
      },
    });

    expect(intl2025.some((e) => e.tmdbId === 1000837)).toBe(true); // Ainda Estou Aqui (2025)
    expect(intl2025.some((e) => e.tmdbId === 1124566)).toBe(true); // Valor Sentimental (2026)
    // O Agente Secreto foi indicado (não vencedor) em 2026 -> não entra em winnersOnly
    expect(intl2025.some((e) => e.tmdbId === 1220564)).toBe(false);

    const withNominees = filterOscarEntries({
      genreIds: [],
      sortBy: 'popularity.desc',
      oscar: {
        enabled: true,
        winnersOnly: false,
        categories: ['international_feature'],
        ceremonyYearFrom: 2026,
        ceremonyYearTo: 2026,
      },
    });
    expect(withNominees.some((e) => e.tmdbId === 1220564)).toBe(true);
  });

  it('envia parâmetros de streaming BR (flatrate) e maxVoteCount (Joias Escondidas) ao TMDB', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJson({
        page: 1,
        total_pages: 3,
        results: [
          {
            id: 500,
            title: 'Joia no Streaming',
            original_title: 'Streaming Gem',
            poster_path: '/gem.jpg',
            vote_average: 7.9,
            vote_count: 900,
            release_date: '2022-04-10',
            genre_ids: [18],
            original_language: 'en',
          },
        ],
      }),
    );

    const provider = new TmdbCatalogProvider({
      apiKey: 'fake_v3_key',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });

    await provider.fetchPage(
      {
        genreIds: [],
        sortBy: 'vote_average.desc',
        watchProviderIds: [8, 11],
        maxVoteCount: 2500,
      },
      1,
    );

    const calledUrl = new URL(fetchMock.mock.calls[0]![0] as string);
    expect(calledUrl.searchParams.get('watch_region')).toBe('BR');
    expect(calledUrl.searchParams.get('with_watch_providers')).toBe('8|11');
    expect(calledUrl.searchParams.get('with_watch_monetization_types')).toBe('flatrate');
    expect(calledUrl.searchParams.get('vote_count.lte')).toBe('2500');
  });

  it('sorteia páginas no modo Descoberta Aleatória e faz fallback para página 1 se vier vazia', async () => {
    const requestedPages: number[] = [];

    const stubTmdbProvider: CatalogProvider = {
      source: 'tmdb',
      async fetchPage(_filters: FilterCriteria, page: number) {
        requestedPages.push(page);
        if (page > 1) {
          return { movies: [], page, hasMore: false };
        }
        const movie: MovieSummary = {
          tmdbId: 901,
          title: 'Fallback Página 1',
          originalTitle: 'Fallback Page 1',
          overview: 'Ok',
          posterPath: '/ok.jpg',
          backdropPath: null,
          voteAverage: 8.0,
          voteCount: 500,
          releaseYear: 2021,
          genreIds: [18],
          originalLanguage: 'en',
        };
        return { movies: [movie], page: 1, hasMore: false };
      },
      async getMovieDetails() {
        return null;
      },
      async getGenres() {
        return [];
      },
      async getWatchProvidersBR() {
        return [];
      },
      async searchPeople() {
        return [];
      },
      async getPersonMovies() {
        return [];
      },
      async searchMovies() {
        return { movies: [], page: 1, hasMore: false };
      },
    };

    const manager = new RoomManager({
      store: new JsonStore(dataFile),
      catalogProvider: stubTmdbProvider,
      rng: () => 0.4, // Escolhe uma página > 1 inicialmente
    });
    await manager.init();

    const { room, participant: host } = manager.createRoom('Paulo', 'dev_rand_a_1', 's1', {
      genreIds: [],
      sortBy: 'popularity.desc',
      randomDiscovery: true,
    });
    manager.joinRoom(room.code, 'Maria', 'dev_rand_b_2', 's2');
    await manager.startSession(room.code, host.id);

    expect(requestedPages[0]).toBeGreaterThan(1);
    expect(requestedPages).toContain(1);
    expect(room.queues[host.id]?.movieIds).toEqual([901]);
  });

  it('pula filmes já escolhidos/matches em sessões anteriores quando excludeHistory está ativo', async () => {
    const manager = new RoomManager({ store: new JsonStore(dataFile) });
    await manager.init();

    // Sessão 1: cria match e escolhe um filme
    const s1 = manager.createRoom('Paulo', 'dev_hist_a_1', 's1');
    const g1 = manager.joinRoom(s1.room.code, 'Maria', 'dev_hist_b_2', 's2');
    await manager.startSession(s1.room.code, s1.participant.id);

    const chosenId = s1.room.queues[s1.participant.id]!.movieIds[0]!;
    manager.submitVote(s1.room.code, s1.participant.id, 'op_h1_a', chosenId, 'LIKE');
    manager.submitVote(s1.room.code, g1.participant.id, 'op_h1_b', chosenId, 'LIKE');
    manager.enterDeciding(s1.room.code, s1.participant.id);
    manager.proposeFinalMovie(s1.room.code, s1.participant.id, chosenId);
    await manager.confirmFinalMovie(s1.room.code, g1.participant.id, chosenId);

    // Sessão 2 com excludeHistory: true -> chosenId não deve aparecer na fila
    const s2 = manager.createRoom('Paulo', 'dev_hist_a_1', 's3', {
      genreIds: [],
      sortBy: 'popularity.desc',
      excludeHistory: true,
    });
    manager.joinRoom(s2.room.code, 'Maria', 'dev_hist_b_2', 's4');
    await manager.startSession(s2.room.code, s2.participant.id);

    expect(s2.room.queues[s2.participant.id]?.movieIds).not.toContain(chosenId);
  });

  it('expõe GET /api/watch-providers com plataformas do Brasil', async () => {
    const appInstance = createApp({
      port: 0,
      nodeEnv: 'test',
      dataFilePath: dataFile,
      catalogMode: 'seed',
    });
    await appInstance.roomManager.init();
    await new Promise<void>((resolve) => {
      appInstance.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const { port } = appInstance.httpServer.address() as AddressInfo;

    const res = await fetch(`http://127.0.0.1:${port}/api/watch-providers`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { providers: WatchProviderOption[] };
    expect(body.providers.some((p) => p.name === 'Netflix')).toBe(true);
    expect(body.providers.some((p) => p.name === 'MUBI')).toBe(true);

    await new Promise<void>((resolve) => appInstance.io.close(() => resolve()));
  });
});
