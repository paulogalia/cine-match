import fs from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { MovieDetails } from '@cine-match/shared';
import { createApp, type AppInstance } from '../app';

describe('Etapa 6 — Endpoint GET /api/movies/:tmdbId', () => {
  let tmpDir: string;
  let server: AppInstance;
  let baseUrl: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-match-movies-'));
    server = createApp({
      port: 0,
      nodeEnv: 'test',
      dataFilePath: path.join(tmpDir, 'sessions.json'),
    });
    await server.roomManager.init();
    await new Promise<void>((resolve) => {
      server.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('retorna detalhes enriquecidos sem inventar disponibilidade de streaming', async () => {
    const res = await fetch(`${baseUrl}/api/movies/496243`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as MovieDetails;
    expect(data.title).toBe('Parasita');
    expect(data.genres.length).toBeGreaterThan(0);
    expect(data.watchProvidersBR.available).toBe(false);
    expect(data.watchProvidersBR.providers).toEqual([]);
  });

  it('retorna 400 para ID inválido e 404 para filme inexistente', async () => {
    const badRes = await fetch(`${baseUrl}/api/movies/abc`);
    expect(badRes.status).toBe(400);

    const missingRes = await fetch(`${baseUrl}/api/movies/99999999`);
    expect(missingRes.status).toBe(404);
  });
});
