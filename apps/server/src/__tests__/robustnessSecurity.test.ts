import fs from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as createClient, type Socket } from 'socket.io-client';
import {
  ERROR_CODES,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@cine-match/shared';
import { createApp, type AppInstance } from '../app';

type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

function waitForConnect(socket: TestClient): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) return resolve();
    socket.once('connect', () => resolve());
    socket.once('connect_error', (err) => reject(err));
  });
}

describe('Etapa 8 — Robustez, Segurança e Recuperação de Falhas', () => {
  let tmpDir: string;
  let dataFile: string;
  let server: AppInstance;
  let baseUrl: string;
  let clients: TestClient[];

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-match-sec-'));
    dataFile = path.join(tmpDir, 'sessions.json');
    server = createApp({ port: 0, nodeEnv: 'test', dataFilePath: dataFile, catalogMode: 'seed' });
    await server.roomManager.init();
    await new Promise<void>((resolve) => {
      server.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    clients = [];
  });

  afterEach(async () => {
    for (const c of clients) c.disconnect();
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
    await server.roomManager.flushPersistence();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function connectClient(): Promise<TestClient> {
    const client: TestClient = createClient(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
    });
    clients.push(client);
    await waitForConnect(client);
    return client;
  }

  it('bloqueia tentativas excessivas de entrada (rate limit) e protege contra força bruta', async () => {
    const attacker = await connectClient();

    let rateLimitedHit = false;
    for (let i = 0; i < 18; i++) {
      const ack = await attacker.emitWithAck('room:join', {
        code: 'ZZZZZZ',
        participantName: 'Intruso',
        deviceId: `device_attacker_${String(i).padStart(3, '0')}`,
      });
      if (!ack.ok && ack.error.code === ERROR_CODES.RATE_LIMITED) {
        rateLimitedHit = true;
        break;
      }
    }

    expect(rateLimitedHit).toBe(true);
  });

  it('impede que um socket fora da sala vote ou altere estado de outra sala', async () => {
    const host = await connectClient();
    const guest = await connectClient();
    const outsider = await connectClient();

    const created = await host.emitWithAck('room:create', {
      hostName: 'Ana',
      deviceId: 'device_host_sec_1',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const roomCode = created.data.snapshot.code;

    await guest.emitWithAck('room:join', {
      code: roomCode,
      participantName: 'Bruno',
      deviceId: 'device_guest_sec_2',
    });
    const started = await host.emitWithAck('session:start', { roomCode });
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const firstMovieId = started.data.snapshot.queue[0]!.tmdbId;

    // Outsider tenta votar em nome da sala
    const spoofVote = await outsider.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_spoof_0001',
      tmdbId: firstMovieId,
      decision: 'LIKE',
    });

    expect(spoofVote.ok).toBe(false);
    if (!spoofVote.ok) {
      expect(spoofVote.error.code).toBe(ERROR_CODES.PARTICIPANT_NOT_IN_ROOM);
    }

    // Outsider tenta pausar a sala
    const spoofPause = await outsider.emitWithAck('session:pause', { roomCode });
    expect(spoofPause.ok).toBe(false);
    if (!spoofPause.ok) {
      expect(spoofPause.error.code).toBe(ERROR_CODES.PARTICIPANT_NOT_IN_ROOM);
    }
  });

  it('recupera de arquivo sessions.json corrompido criando backup sem travar o boot', async () => {
    const corruptFile = path.join(tmpDir, 'corrupt-sessions.json');
    await fs.writeFile(corruptFile, '{ "broken_json": [1, 2,', 'utf8');

    const freshApp = createApp({
      port: 0,
      nodeEnv: 'test',
      dataFilePath: corruptFile,
      catalogMode: 'seed',
    });

    await expect(freshApp.roomManager.init()).resolves.toBeUndefined();
    expect(freshApp.roomManager.getHistory()).toEqual([]);

    const files = await fs.readdir(tmpDir);
    expect(files.some((f) => f.includes('.corrupt.'))).toBe(true);
    await new Promise<void>((resolve) => freshApp.io.close(() => resolve()));
  });

  it('envia headers de segurança e bloqueia payloads HTTP excessivos', async () => {
    const health = await fetch(`${baseUrl}/api/health`);
    expect(health.headers.get('x-content-type-options')).toBe('nosniff');
    expect(health.headers.get('x-frame-options')).toBe('SAMEORIGIN');
    expect(health.headers.get('x-powered-by')).toBeNull();

    const hugePayload = JSON.stringify({ data: 'x'.repeat(120_000) });
    const tooBig = await fetch(`${baseUrl}/api/health`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: hugePayload,
    });
    expect(tooBig.status).toBe(413);
  });
});
