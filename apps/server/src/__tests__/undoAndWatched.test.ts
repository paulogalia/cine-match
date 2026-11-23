import fs from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as createClient, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  WatchedMovieEntry,
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

describe('Bloco B — Desfazer último voto (Undo) e "Já assistimos" permanente', () => {
  let tmpDir: string;
  let dataFile: string;
  let server: AppInstance;
  let baseUrl: string;
  let clients: TestClient[];

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-match-blocob-'));
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

  async function setupSession() {
    const clientA = await connectClient();
    const clientB = await connectClient();

    const created = await clientA.emitWithAck('room:create', {
      hostName: 'Paulo',
      deviceId: 'dev_b_host_001',
    });
    if (!created.ok) throw new Error(created.error.message);
    const roomCode = created.data.snapshot.code;

    await clientB.emitWithAck('room:join', {
      code: roomCode,
      participantName: 'Maria',
      deviceId: 'dev_b_guest_002',
    });

    const started = await clientA.emitWithAck('session:start', { roomCode });
    if (!started.ok) throw new Error(started.error.message);

    return { clientA, clientB, roomCode, queueA: started.data.snapshot.queue };
  }

  it('desfaz último voto devolvendo filme ao topo da fila e reverte match se acabou de ser criado', async () => {
    const { clientA, clientB, roomCode, queueA } = await setupSession();
    const targetId = queueA[0]!.tmdbId;

    // A e B dão LIKE no mesmo filme -> gera match
    const matchCreatedOnA = new Promise<number>((resolve) => {
      clientA.once('matches:updated', ({ matches }) => resolve(matches.length));
    });
    await clientA.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_undo_a_001',
      tmdbId: targetId,
      decision: 'LIKE',
    });
    const voteB = await clientB.emitWithAck('vote:submit', {
      roomCode,
      operationId: 'op_undo_b_001',
      tmdbId: targetId,
      decision: 'LIKE',
    });
    expect(voteB.ok && voteB.data.isMatch).toBe(true);
    expect(await matchCreatedOnA).toBe(1);

    // A observa atualização da lista de matches quando B desfaz
    const matchesUpdatedOnA = new Promise<number>((resolve) => {
      clientA.once('matches:updated', ({ matches }) => resolve(matches.length));
    });

    const undoAck = await clientB.emitWithAck('vote:undo', { roomCode });
    expect(undoAck.ok).toBe(true);
    if (undoAck.ok) {
      expect(undoAck.data.undoneMovieId).toBe(targetId);
      expect(undoAck.data.matchReverted).toBe(true);
      expect(undoAck.data.myVotesCount).toBe(0);
      expect(undoAck.data.canUndo).toBe(false);
      expect(undoAck.data.queue[0]?.tmdbId).toBe(targetId);
      expect(undoAck.data.matches).toHaveLength(0);
    }

    expect(await matchesUpdatedOnA).toBe(0);

    // Tentar desfazer sem mais votos retorna erro limpo
    const secondUndo = await clientB.emitWithAck('vote:undo', { roomCode });
    expect(secondUndo.ok).toBe(false);
  });

  it('marca filme como "Já assistimos", remove da fila de ambos, persiste para próximas sessões e permite restaurar', async () => {
    const { clientA, clientB, roomCode, queueA } = await setupSession();
    const watchedId = queueA[0]!.tmdbId;

    const removedOnB = new Promise<number>((resolve) => {
      clientB.once('movie:watched_removed', ({ tmdbId }) => resolve(tmdbId));
    });

    const ack = await clientA.emitWithAck('movie:mark_watched', {
      roomCode,
      tmdbId: watchedId,
    });
    expect(ack.ok).toBe(true);
    if (ack.ok) {
      expect(ack.data.tmdbId).toBe(watchedId);
      expect(ack.data.queue.some((m) => m.tmdbId === watchedId)).toBe(false);
    }

    // Parceiro recebeu a remoção em tempo real
    expect(await removedOnB).toBe(watchedId);

    // Endpoint GET /api/watched lista o filme salvo
    const listRes = await fetch(`${baseUrl}/api/watched`);
    const listBody = (await listRes.json()) as { watchedMovies: WatchedMovieEntry[] };
    expect(listBody.watchedMovies.some((w) => w.tmdbId === watchedId)).toBe(true);

    // Nova sessão NÃO inclui mais o filme marcado como assistido
    const s2 = await clientA.emitWithAck('room:create', {
      hostName: 'Paulo',
      deviceId: 'dev_b_host_001',
    });
    if (!s2.ok) throw new Error(s2.error.message);
    const room2 = s2.data.snapshot.code;
    await clientB.emitWithAck('room:join', {
      code: room2,
      participantName: 'Maria',
      deviceId: 'dev_b_guest_002',
    });
    const started2 = await clientA.emitWithAck('session:start', { roomCode: room2 });
    expect(started2.ok).toBe(true);
    if (started2.ok) {
      expect(started2.data.snapshot.queue.some((m) => m.tmdbId === watchedId)).toBe(false);
    }

    // DELETE /api/watched/:tmdbId restaura o filme para o catálogo
    const delRes = await fetch(`${baseUrl}/api/watched/${watchedId}`, { method: 'DELETE' });
    expect(delRes.status).toBe(200);
    const delBody = (await delRes.json()) as { removed: boolean; watchedMovies: WatchedMovieEntry[] };
    expect(delBody.removed).toBe(true);
    expect(delBody.watchedMovies).toHaveLength(0);
  });
});
