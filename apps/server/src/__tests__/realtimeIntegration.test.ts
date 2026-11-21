import fs from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as createClient, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@cine-match/shared';
import { createApp, type AppInstance } from '../app';

type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

function waitForConnect(socket: TestClient): Promise<void> {
  return new Promise((resolve, reject) => {
    if (socket.connected) return resolve();
    socket.once('connect', () => resolve());
    socket.once('connect_error', (err) => reject(err));
  });
}

async function startServer(dataFilePath: string): Promise<{ server: AppInstance; baseUrl: string }> {
  const server = createApp({ port: 0, nodeEnv: 'test', dataFilePath });
  await server.roomManager.init();

  await new Promise<void>((resolve) => {
    server.httpServer.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.httpServer.address() as AddressInfo;
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function closeServer(server: AppInstance): Promise<void> {
  await new Promise<void>((resolve) => {
    server.io.close(() => resolve());
  });
  await server.roomManager.flushPersistence();
}

describe('Etapa 3 — Testes de Integração em Tempo Real com 2 Clientes (14.2)', () => {
  let tmpDir: string;
  let dataFile: string;
  let server: AppInstance;
  let baseUrl: string;
  let clients: TestClient[];

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-match-int-'));
    dataFile = path.join(tmpDir, 'sessions.json');
    const started = await startServer(dataFile);
    server = started.server;
    baseUrl = started.baseUrl;
    clients = [];
  });

  afterEach(async () => {
    for (const client of clients) {
      client.disconnect();
    }
    await closeServer(server);
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  async function createConnectedClient(): Promise<TestClient> {
    const client: TestClient = createClient(baseUrl, {
      transports: ['websocket'],
      reconnection: false,
    });
    clients.push(client);
    await waitForConnect(client);
    return client;
  }

  async function setupActiveSession() {
    const clientA = await createConnectedClient();
    const clientB = await createConnectedClient();

    const created = await clientA.emitWithAck('room:create', {
      hostName: 'Ana',
      deviceId: 'device_phone_a_001',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) throw new Error(created.error.message);

    const roomCode = created.data.snapshot.code;

    const joined = await clientB.emitWithAck('room:join', {
      code: roomCode,
      participantName: 'Bruno',
      deviceId: 'device_phone_b_002',
    });
    expect(joined.ok).toBe(true);

    const startedOnB = new Promise<number[]>((resolve) => {
      clientB.once('session:started', ({ snapshot }) => {
        resolve(snapshot.queue.map((m) => m.tmdbId));
      });
    });

    const started = await clientA.emitWithAck('session:start', { roomCode });
    expect(started.ok).toBe(true);
    if (!started.ok) throw new Error(started.error.message);

    const queueB = await startedOnB;
    const queueA = started.data.snapshot.queue.map((m) => m.tmdbId);

    return { clientA, clientB, roomCode, queueA, queueB };
  }

  it('Cenários 1, 2, 3 e 4: ambos LIKE (match), apenas 1 LIKE, LIKE+DISLIKE e ambos DISLIKE', async () => {
    const { clientA, clientB, roomCode, queueA } = await setupActiveSession();
    const [m1, m2, m3, m4] = queueA;

    const matchesOnA: number[] = [];
    const matchesOnB: number[] = [];
    clientA.on('match:created', ({ match }) => matchesOnA.push(match.tmdbId));
    clientB.on('match:created', ({ match }) => matchesOnB.push(match.tmdbId));

    // Cenário 2: apenas A aprova m2 -> sem match
    const resOnlyA = await clientA.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_c2_a_0001',
      tmdbId: m2!,
      decision: 'LIKE',
    });
    expect(resOnlyA.ok && !resOnlyA.data.isMatch).toBe(true);

    // Cenário 3: A aprova e B rejeita m3 -> sem match
    await clientA.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_c3_a_0001',
      tmdbId: m3!,
      decision: 'LIKE',
    });
    const resSplit = await clientB.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_c3_b_0001',
      tmdbId: m3!,
      decision: 'DISLIKE',
    });
    expect(resSplit.ok && !resSplit.data.isMatch).toBe(true);

    // Cenário 4: ambos rejeitam m4 -> sem match
    await clientA.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_c4_a_0001',
      tmdbId: m4!,
      decision: 'DISLIKE',
    });
    const resBothNo = await clientB.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_c4_b_0001',
      tmdbId: m4!,
      decision: 'DISLIKE',
    });
    expect(resBothNo.ok && !resBothNo.data.isMatch).toBe(true);

    // Cenário 1: ambos aprovam m1 -> ambos recebem match:created exatamente uma vez
    const matchPromiseA = new Promise<number>((resolve) =>
      clientA.once('match:created', ({ match }) => resolve(match.tmdbId)),
    );
    const matchPromiseB = new Promise<number>((resolve) =>
      clientB.once('match:created', ({ match }) => resolve(match.tmdbId)),
    );

    await clientA.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_c1_a_0001',
      tmdbId: m1!,
      decision: 'LIKE',
    });
    const resMatch = await clientB.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_c1_b_0001',
      tmdbId: m1!,
      decision: 'LIKE',
    });

    expect(resMatch.ok && resMatch.data.isMatch).toBe(true);
    expect(await matchPromiseA).toBe(m1!);
    expect(await matchPromiseB).toBe(m1!);
    expect(matchesOnA).toEqual([m1!]);
    expect(matchesOnB).toEqual([m1!]);
  });

  it('Cenários 5 e 6: desconexão durante votação preserva sala e reconexão restaura estado', async () => {
    const { clientA, clientB, roomCode, queueA } = await setupActiveSession();
    const targetMovie = queueA[0]!;

    // A vota LIKE antes de B desconectar
    await clientA.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_disc_a_001',
      tmdbId: targetMovie,
      decision: 'LIKE',
    });

    const offlineNoticeOnA = new Promise<string>((resolve) => {
      clientA.once('participant:status_changed', (p) => resolve(p.connectionStatus));
    });

    // Cenário 5: B desconecta
    clientB.disconnect();
    expect(await offlineNoticeOnA).toBe('OFFLINE');

    // A continua conseguindo votar normalmente
    const voteWhilePartnerOffline = await clientA.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_disc_a_002',
      tmdbId: queueA[1]!,
      decision: 'DISLIKE',
    });
    expect(voteWhilePartnerOffline.ok).toBe(true);

    // Cenário 6: B reconecta em um novo socket usando o mesmo deviceId
    const onlineNoticeOnA = new Promise<string>((resolve) => {
      clientA.once('participant:status_changed', (p) => resolve(p.connectionStatus));
    });

    const clientBReconnected = await createConnectedClient();
    const syncAck = await clientBReconnected.emitWithAck('session:sync', {
      roomCode,
      deviceId: 'device_phone_b_002',
    });

    expect(syncAck.ok).toBe(true);
    if (syncAck.ok) {
      expect(syncAck.data.snapshot.status).toBe('IN_PROGRESS');
      expect(syncAck.data.snapshot.partnerProgress?.votedCount).toBe(2);
      expect(syncAck.data.snapshot.myVotesCount).toBe(0);
    }
    expect(await onlineNoticeOnA).toBe('ONLINE');

    // Após reconectar, B aprova o mesmo filme de A e dispara match normalmente
    const voteAfterReconnect = await clientBReconnected.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_reconn_b_1',
      tmdbId: targetMovie,
      decision: 'LIKE',
    });
    expect(voteAfterReconnect.ok && voteAfterReconnect.data.isMatch).toBe(true);
  });

  it('Cenário 7: evento enviado duas vezes com mesmo operationId não duplica voto nem match', async () => {
    const { clientA, clientB, roomCode, queueA } = await setupActiveSession();
    const movieId = queueA[0]!;

    let matchEventsOnA = 0;
    clientA.on('match:created', () => {
      matchEventsOnA += 1;
    });

    await clientA.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_dup_a_0001',
      tmdbId: movieId,
      decision: 'LIKE',
    });

    const firstB = await clientB.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_dup_b_0001',
      tmdbId: movieId,
      decision: 'LIKE',
    });
    const secondB = await clientB.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_dup_b_0001',
      tmdbId: movieId,
      decision: 'LIKE',
    });

    expect(firstB.ok && firstB.data.isMatch && !firstB.data.duplicate).toBe(true);
    expect(secondB.ok && secondB.data.duplicate && !secondB.data.isMatch).toBe(true);
    expect(matchEventsOnA).toBe(1);
  });

  it('Cenário 8: votos LIKE enviados simultaneamente geram exatamente 1 match', async () => {
    const { clientA, clientB, roomCode, queueA } = await setupActiveSession();
    const movieId = queueA[0]!;

    let matchCountA = 0;
    let matchCountB = 0;
    clientA.on('match:created', () => {
      matchCountA += 1;
    });
    clientB.on('match:created', () => {
      matchCountB += 1;
    });

    const [ackA, ackB] = await Promise.all([
      clientA.emitWithAck('vote:submit', {
        roomCode,
        operationId: 'op_race_a_001',
        tmdbId: movieId,
        decision: 'LIKE',
      }),
      clientB.emitWithAck('vote:submit', {
        roomCode,
        operationId: 'op_race_b_001',
        tmdbId: movieId,
        decision: 'LIKE',
      }),
    ]);

    expect(ackA.ok && ackB.ok).toBe(true);
    const matchFlags = [
      ackA.ok ? ackA.data.isMatch : false,
      ackB.ok ? ackB.data.isMatch : false,
    ].filter(Boolean);

    // Exatamente uma das chamadas cria o match e ambos recebem 1 evento
    expect(matchFlags).toHaveLength(1);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(matchCountA).toBe(1);
    expect(matchCountB).toBe(1);
  });

  it('Cenário 9: sessão é restaurada após reiniciar o servidor e clientes finalizam escolha', async () => {
    const { clientA, clientB, roomCode, queueA } = await setupActiveSession();
    const movieId = queueA[0]!;

    await clientA.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_reboot_a_1',
      tmdbId: movieId,
      decision: 'LIKE',
    });
    await clientB.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_reboot_b_1',
      tmdbId: movieId,
      decision: 'LIKE',
    });

    // Derruba clientes e servidor completamente
    clientA.disconnect();
    clientB.disconnect();
    await closeServer(server);

    // Sobe uma nova instância do servidor apontando para o mesmo JSON
    const restarted = await startServer(dataFile);
    server = restarted.server;
    baseUrl = restarted.baseUrl;

    const newA = await createConnectedClient();
    const newB = await createConnectedClient();

    const syncA = await newA.emitWithAck('session:sync', {
      roomCode,
      deviceId: 'device_phone_a_001',
    });
    const syncB = await newB.emitWithAck('session:sync', {
      roomCode,
      deviceId: 'device_phone_b_002',
    });

    expect(syncA.ok && syncB.ok).toBe(true);
    if (syncA.ok) {
      expect(syncA.data.snapshot.matches).toHaveLength(1);
      expect(syncA.data.snapshot.matches[0]?.movie.tmdbId).toBe(movieId);
      expect(syncA.data.snapshot.myVotesCount).toBe(1);
    }

    // Finaliza a escolha do filme na instância reiniciada e valida /api/history
    await newA.emitWithAck('decision:enter', { roomCode });
    await newA.emitWithAck('decision:propose', { roomCode, tmdbId: movieId });
    const confirmed = await newB.emitWithAck('decision:confirm', { roomCode, tmdbId: movieId });

    expect(confirmed.ok && confirmed.data.status === 'FINISHED').toBe(true);

    const historyRes = await fetch(`${baseUrl}/api/history`);
    expect(historyRes.status).toBe(200);
    const historyBody = (await historyRes.json()) as {
      history: Array<{ roomCode: string; chosenMovie: { tmdbId: number } | null }>;
    };
    expect(historyBody.history).toHaveLength(1);
    expect(historyBody.history[0]?.roomCode).toBe(roomCode);
    expect(historyBody.history[0]?.chosenMovie?.tmdbId).toBe(movieId);
  });
});
