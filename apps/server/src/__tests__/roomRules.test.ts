import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ERROR_CODES } from '@cine-match/shared';
import { JsonStore } from '../services/persistence/jsonStore';
import { RoomManager } from '../services/rooms/roomManager';
import { DomainError } from '../utils/sanitize';

describe('Etapa 3 — Testes Unitários de Regras de Negócio e Persistência (14.1)', () => {
  let tmpDir: string;
  let dataFile: string;
  let manager: RoomManager;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cine-match-unit-'));
    dataFile = path.join(tmpDir, 'sessions.json');
    manager = new RoomManager({ store: new JsonStore(dataFile) });
    await manager.init();
  });

  afterEach(async () => {
    await manager.flushPersistence();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('cria sala com código de 6 caracteres sem ambiguidade e aceita no máximo 2 participantes', () => {
    const { room, participant: host } = manager.createRoom('  <Ana>  ', 'device_host_001', 'sock_1');

    expect(room.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(room.status).toBe('WAITING_PARTICIPANT');
    expect(host.name).toBe('Ana');

    const joined = manager.joinRoom(room.code, 'Bruno', 'device_guest_002', 'sock_2');
    expect(joined.reconnected).toBe(false);
    expect(joined.room.status).toBe('READY');
    expect(joined.room.participants).toHaveLength(2);

    // 3º participante deve ser bloqueado
    expect(() =>
      manager.joinRoom(room.code, 'Carlos', 'device_intruder_003', 'sock_3'),
    ).toThrowError(DomainError);

    try {
      manager.joinRoom(room.code, 'Carlos', 'device_intruder_003', 'sock_3');
    } catch (err) {
      expect((err as DomainError).code).toBe(ERROR_CODES.ROOM_FULL);
    }
  });

  it('embaralha filas independentes para cada participante e preserva privacidade no snapshot', async () => {
    let callCount = 0;
    const deterministicRng = () => {
      callCount += 1;
      return (callCount * 0.37) % 1;
    };

    const seededManager = new RoomManager({
      store: new JsonStore(dataFile),
      rng: deterministicRng,
    });
    await seededManager.init();

    const { room, participant: host } = seededManager.createRoom('Ana', 'device_a_001', 'sock_a');
    const { participant: guest } = seededManager.joinRoom(room.code, 'Bruno', 'device_b_002', 'sock_b');

    await seededManager.startSession(room.code, host.id);

    const queueA = room.queues[host.id]!.movieIds;
    const queueB = room.queues[guest.id]!.movieIds;

    expect(queueA.length).toBeGreaterThanOrEqual(10);
    expect(queueA.length).toBe(queueB.length);
    expect(new Set(queueA)).toEqual(new Set(queueB));
    expect(queueA).not.toEqual(queueB);

    // Ana vota no primeiro filme; snapshot de Bruno não deve vazar o voto de Ana
    const targetMovieId = queueA[0]!;
    seededManager.submitVote(room.code, host.id, 'op_vote_0001', targetMovieId, 'LIKE');

    const snapBruno = seededManager.getClientSnapshot(room, guest.id);
    expect(snapBruno.myVotedMovieIds).toEqual([]);
    expect(snapBruno.partnerProgress?.votedCount).toBe(1);
    expect(snapBruno.matches).toHaveLength(0);
  });

  it('previne votos duplicados (mesmo operationId e mesmo filme) e cria match apenas com dois LIKE', async () => {
    const { room, participant: host } = manager.createRoom('Ana', 'device_a_001', 'sock_a');
    const { participant: guest } = manager.joinRoom(room.code, 'Bruno', 'device_b_002', 'sock_b');
    await manager.startSession(room.code, host.id);

    const [movie1, movie2] = room.queues[host.id]!.movieIds;
    expect(movie1).toBeDefined();
    expect(movie2).toBeDefined();

    // LIKE de Ana no movie1
    const v1 = manager.submitVote(room.code, host.id, 'op_ana_m1_01', movie1!, 'LIKE');
    expect(v1.result.duplicate).toBe(false);
    expect(v1.result.matchCreated).toBeNull();

    // Reenvio com mesmo operationId -> idempotente
    const v1DupOp = manager.submitVote(room.code, host.id, 'op_ana_m1_01', movie1!, 'LIKE');
    expect(v1DupOp.result.duplicate).toBe(true);
    expect(room.votes).toHaveLength(1);

    // Novo operationId no mesmo filme -> bloqueia duplicidade
    const v1DupMovie = manager.submitVote(room.code, host.id, 'op_ana_m1_02', movie1!, 'DISLIKE');
    expect(v1DupMovie.result.duplicate).toBe(true);
    expect(room.votes).toHaveLength(1);

    // LIKE de Bruno no movie1 -> MATCH!
    const v2 = manager.submitVote(room.code, guest.id, 'op_bruno_m1_01', movie1!, 'LIKE');
    expect(v2.result.matchCreated).not.toBeNull();
    expect(Object.keys(room.matches)).toEqual([String(movie1!)]);

    // movie2: Ana LIKE, Bruno DISLIKE -> sem match
    manager.submitVote(room.code, host.id, 'op_ana_m2_01', movie2!, 'LIKE');
    const v4 = manager.submitVote(room.code, guest.id, 'op_bruno_m2_01', movie2!, 'DISLIKE');
    expect(v4.result.matchCreated).toBeNull();
    expect(Object.keys(room.matches)).toHaveLength(1);
  });

  it('remove match da lista de interesse sem apagar os votos originais e permite seleção final sincronizada', async () => {
    const { room, participant: host } = manager.createRoom('Ana', 'device_a_001', 'sock_a');
    const { participant: guest } = manager.joinRoom(room.code, 'Bruno', 'device_b_002', 'sock_b');
    await manager.startSession(room.code, host.id);

    const [movie1, movie2] = room.queues[host.id]!.movieIds;

    // Cria 2 matches
    manager.submitVote(room.code, host.id, 'op_a_1001', movie1!, 'LIKE');
    manager.submitVote(room.code, guest.id, 'op_b_1001', movie1!, 'LIKE');
    manager.submitVote(room.code, host.id, 'op_a_1002', movie2!, 'LIKE');
    manager.submitVote(room.code, guest.id, 'op_b_1002', movie2!, 'LIKE');

    expect(room.votes).toHaveLength(4);

    // Remove movie1 da lista de interesse
    manager.dismissMatch(room.code, host.id, movie1!);
    expect(room.matches[String(movie1!)]?.status).toBe('DISMISSED');
    expect(room.votes).toHaveLength(4); // Votos originais preservados!

    // Decisão final no movie2
    manager.enterDeciding(room.code, host.id);
    manager.proposeFinalMovie(room.code, host.id, movie2!);

    const confirmHost = await manager.confirmFinalMovie(room.code, host.id, movie2!);
    expect(confirmHost.finalized).toBe(false);

    const confirmGuest = await manager.confirmFinalMovie(room.code, guest.id, movie2!);
    expect(confirmGuest.finalized).toBe(true);
    expect(confirmGuest.chosenMovie?.tmdbId).toBe(movie2!);
    expect(room.status).toBe('FINISHED');
    expect(manager.getHistory()).toHaveLength(1);
    expect(manager.getHistory()[0]?.chosenMovie?.tmdbId).toBe(movie2!);
  });

  it('alterar filtros durante a sessão preserva votos e matches já registrados', async () => {
    const { room, participant: host } = manager.createRoom('Ana', 'device_a_001', 'sock_a');
    const { participant: guest } = manager.joinRoom(room.code, 'Bruno', 'device_b_002', 'sock_b');
    await manager.startSession(room.code, host.id);

    const votedMovieId = room.queues[host.id]!.movieIds[0]!;
    manager.submitVote(room.code, host.id, 'op_filter_a_1', votedMovieId, 'LIKE');
    manager.submitVote(room.code, guest.id, 'op_filter_b_1', votedMovieId, 'LIKE');

    // Filtra apenas filmes em português (pt)
    await manager.updateFilters(room.code, host.id, {
      genreIds: [],
      sortBy: 'popularity.desc',
      originalLanguage: 'pt',
    });

    // Votos e match preservados
    expect(room.votes).toHaveLength(2);
    expect(room.matches[String(votedMovieId)]).toBeDefined();

    // Fila atualizada contém somente filmes em pt e não repete o filme já votado
    const snapHost = manager.getClientSnapshot(room, host.id);
    expect(snapHost.queue.every((m) => m.originalLanguage === 'pt')).toBe(true);
    expect(snapHost.queue.some((m) => m.tmdbId === votedMovieId)).toBe(false);
  });

  it('persiste atomicamente em JSON, recupera após reinício e expira salas abandonadas', async () => {
    const { room, participant: host } = manager.createRoom('Ana', 'device_a_001', 'sock_a');
    const { participant: guest } = manager.joinRoom(room.code, 'Bruno', 'device_b_002', 'sock_b');
    await manager.startSession(room.code, host.id);

    const movieId = room.queues[host.id]!.movieIds[0]!;
    manager.submitVote(room.code, host.id, 'op_persist_a1', movieId, 'LIKE');
    manager.submitVote(room.code, guest.id, 'op_persist_b1', movieId, 'LIKE');
    await manager.flushPersistence();

    // Verifica que o arquivo existe e não sobrou .tmp
    const files = await fs.readdir(tmpDir);
    expect(files).toContain('sessions.json');
    expect(files.some((f) => f.endsWith('.tmp'))).toBe(false);

    // Simula reinicialização completa do servidor
    const recoveredManager = new RoomManager({ store: new JsonStore(dataFile) });
    await recoveredManager.init();

    const recoveredRoom = recoveredManager.getRoomByCode(room.code);
    expect(recoveredRoom).toBeDefined();
    expect(recoveredRoom?.votes).toHaveLength(2);
    expect(recoveredRoom?.matches[String(movieId)]).toBeDefined();
    expect(recoveredRoom?.participants.every((p) => p.connectionStatus === 'OFFLINE')).toBe(true);

    // Política de expiração: sala expirada sem participantes online é removida
    recoveredRoom!.expiresAt = new Date(Date.now() - 10_000).toISOString();
    expect(recoveredManager.purgeExpiredRooms()).toBe(1);
    expect(recoveredManager.getRoomByCode(room.code)).toBeUndefined();
  });
});
