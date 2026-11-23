import fs from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as createClient, type Socket } from 'socket.io-client';
import {
  ERROR_CODES,
  type ClientToServerEvents,
  type RouletteSpin,
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

describe('Bloco C — Roleta Sincronizada de Desempate', () => {
  let tmpDir: string;
  let dataFile: string;
  let server: AppInstance;
  let baseUrl: string;
  let clients: TestClient[];

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-match-roulette-'));
    dataFile = path.join(tmpDir, 'sessions.json');
    server = createApp({ port: 0, nodeEnv: 'test', dataFilePath: dataFile, catalogMode: 'seed' });
    await server.roomManager.init();
    await new Promise<void>((resolve) => {
      server.httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const { port } = server.httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
    clients = [];
  });

  afterEach(async () => {
    for (const c of clients) c.disconnect();
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
    await server.roomManager.flushPersistence();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function connectClient(): Promise<TestClient> {
    const c: TestClient = createClient(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
    });
    clients.push(c);
    await waitForConnect(c);
    return c;
  }

  it('recusa girar roleta com menos de 2 matches e sincroniza exatamente o mesmo vencedor entre 2 clientes', async () => {
    const clientA = await connectClient();
    const clientB = await connectClient();

    const created = await clientA.emitWithAck('room:create', {
      hostName: 'Paulo',
      deviceId: 'dev_roul_a_001',
    });
    if (!created.ok) throw new Error(created.error.message);
    const roomCode = created.data.snapshot.code;

    await clientB.emitWithAck('room:join', {
      code: roomCode,
      participantName: 'Maria',
      deviceId: 'dev_roul_b_002',
    });

    const started = await clientA.emitWithAck('session:start', { roomCode });
    if (!started.ok) throw new Error(started.error.message);
    const [m1, m2, m3] = started.data.snapshot.queue.map((m) => m.tmdbId);

    // 1 match apenas
    await clientA.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_r_a_1001',
      tmdbId: m1!,
      decision: 'LIKE',
    });
    await clientB.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_r_b_1001',
      tmdbId: m1!,
      decision: 'LIKE',
    });

    await clientA.emitWithAck('decision:enter', { roomCode });

    // Com 1 match, roleta deve recusar
    const spinTooFew = await clientA.emitWithAck('decision:spin_roulette', { roomCode });
    expect(spinTooFew.ok).toBe(false);
    if (!spinTooFew.ok) {
      expect(spinTooFew.error.code).toBe(ERROR_CODES.INVALID_STATE_TRANSITION);
    }

    // Volta para votação e cria mais 2 matches (total 3 matches ativos)
    await clientA.emitWithAck('decision:return', { roomCode });
    for (const [idx, mid] of [m2!, m3!].entries()) {
      await clientA.emitWithAck('vote:submit', {
        roomCode,
        operationId: `op_r_a_200${idx}`,
        tmdbId: mid,
        decision: 'LIKE',
      });
      await clientB.emitWithAck('vote:submit', {
        roomCode,
        operationId: `op_r_b_200${idx}`,
        tmdbId: mid,
        decision: 'LIKE',
      });
    }

    await clientA.emitWithAck('decision:enter', { roomCode });

    // Ouve o evento sincronizado em ambos os clientes
    const spinOnA = new Promise<RouletteSpin>((resolve) => {
      clientA.once('decision:roulette_spun', ({ spin }) => resolve(spin));
    });
    const spinOnB = new Promise<RouletteSpin>((resolve) => {
      clientB.once('decision:roulette_spun', ({ spin }) => resolve(spin));
    });

    const ack = await clientA.emitWithAck('decision:spin_roulette', { roomCode });
    expect(ack.ok).toBe(true);

    const [receivedA, receivedB] = await Promise.all([spinOnA, spinOnB]);
    expect(receivedA.spinId).toBe(receivedB.spinId);
    expect(receivedA.winnerMovieId).toBe(receivedB.winnerMovieId);
    expect([m1, m2, m3]).toContain(receivedA.winnerMovieId);

    // Parceiro confirma diretamente o vencedor sorteado -> finaliza sessão
    const confirmed = await clientB.emitWithAck('decision:confirm', {
      roomCode,
      tmdbId: receivedB.winnerMovieId,
    });
    expect(confirmed.ok && confirmed.data.status === 'FINISHED').toBe(true);
    if (confirmed.ok) {
      expect(confirmed.data.chosenMovie?.tmdbId).toBe(receivedA.winnerMovieId);
    }
  });
});
