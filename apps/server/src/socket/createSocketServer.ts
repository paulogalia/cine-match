import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import {
  APP_LIMITS,
  DecisionMoviePayloadSchema,
  ERROR_CODES,
  FiltersUpdatePayloadSchema,
  MatchDismissPayloadSchema,
  MovieWatchedPayloadSchema,
  RoomActionPayloadSchema,
  RoomCreatePayloadSchema,
  RoomJoinPayloadSchema,
  SessionEndPayloadSchema,
  SessionSyncPayloadSchema,
  VoteSubmitPayloadSchema,
  type ClientToServerEvents,
  type PublicParticipant,
  type ServerToClientEvents,
  type SocketAck,
} from '@cine-match/shared';
import type { RoomManager } from '../services/rooms/roomManager';
import { DomainError, toErrorPayload } from '../utils/sanitize';
import { SlidingWindowRateLimiter } from './rateLimiter';

export type TypedSocketServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

interface SocketSessionBinding {
  roomCode: string;
  participantId: string;
}

function fail<T>(
  ack: ((res: SocketAck<T>) => void) | undefined,
  code: (typeof ERROR_CODES)[keyof typeof ERROR_CODES],
  message: string,
): void {
  ack?.({ ok: false, error: { code, message } });
}

export function createSocketServer(
  httpServer: HttpServer,
  roomManager: RoomManager,
): TypedSocketServer {
  const io: TypedSocketServer = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: APP_LIMITS.MAX_PAYLOAD_BYTES,
    pingInterval: 10_000,
    pingTimeout: 15_000,
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000,
      skipMiddlewares: true,
    },
  });

  const bindings = new Map<string, SocketSessionBinding>();
  const rateLimiter = new SlidingWindowRateLimiter();

  const checkGeneralLimit = (socket: TypedSocket): boolean => {
    const binding = bindings.get(socket.id);
    const key = binding ? `part:${binding.participantId}` : `evt:${socket.id}`;
    return rateLimiter.consume(key, 120, 10_000);
  };

  const requireBinding = (socket: TypedSocket, roomCode: string): SocketSessionBinding => {
    const binding = bindings.get(socket.id);
    if (!binding || binding.roomCode !== roomCode.trim().toUpperCase()) {
      throw new DomainError(
        ERROR_CODES.PARTICIPANT_NOT_IN_ROOM,
        'Sessão não vinculada a esta sala. Reconecte para continuar.',
      );
    }
    return binding;
  };

  io.on('connection', (socket) => {
    socket.on('room:create', (rawPayload, ack) => {
      const createKey = `create:${socket.handshake.address ?? socket.id}`;
      if (!rateLimiter.consume(createKey, 20, 60_000) || !checkGeneralLimit(socket)) {
        return fail(ack, ERROR_CODES.RATE_LIMITED, 'Muitas requisições em sequência.');
      }

      const parsed = RoomCreatePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Dados inválidos para criar a sala.');
      }

      try {
        const { room, participant } = roomManager.createRoom(
          parsed.data.hostName,
          parsed.data.deviceId,
          socket.id,
          parsed.data.filters,
        );

        void socket.join(room.code);
        bindings.set(socket.id, { roomCode: room.code, participantId: participant.id });

        const snapshot = roomManager.getClientSnapshot(room, participant.id);
        ack?.({
          ok: true,
          data: {
            snapshot,
            joinPath: `/?join=${room.code}`,
          },
        });
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('room:join', (rawPayload, ack) => {
      const clientKey = `join:${socket.handshake.address ?? socket.id}`;
      if (!rateLimiter.consume(clientKey, 15, 60_000)) {
        return fail(
          ack,
          ERROR_CODES.RATE_LIMITED,
          'Muitas tentativas de entrada. Aguarde um minuto.',
        );
      }

      const parsed = RoomJoinPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Código da sala ou nome inválido.');
      }

      try {
        const { room, participant, reconnected } = roomManager.joinRoom(
          parsed.data.code,
          parsed.data.participantName,
          parsed.data.deviceId,
          socket.id,
        );

        void socket.join(room.code);
        bindings.set(socket.id, { roomCode: room.code, participantId: participant.id });

        const snapshot = roomManager.getClientSnapshot(room, participant.id);
        ack?.({ ok: true, data: { snapshot, reconnected } });

        const { socketId: _s, deviceId: _d, ...publicParticipant } = participant;
        if (reconnected) {
          socket.to(room.code).emit('participant:status_changed', {
            participantId: participant.id,
            connectionStatus: 'ONLINE',
            lastSeenAt: participant.lastSeenAt,
            stateVersion: room.stateVersion,
          });
        } else {
          socket.to(room.code).emit('participant:joined', {
            participant: publicParticipant as PublicParticipant,
            roomStatus: room.status,
            stateVersion: room.stateVersion,
          });
        }
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('session:sync', (rawPayload, ack) => {
      if (!checkGeneralLimit(socket)) {
        return fail(ack, ERROR_CODES.RATE_LIMITED, 'Muitas requisições de sincronização.');
      }

      const parsed = SessionSyncPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Dados inválidos para sincronização.');
      }

      try {
        const { room, participant } = roomManager.syncSession(
          parsed.data.roomCode,
          parsed.data.deviceId,
          socket.id,
        );

        void socket.join(room.code);
        bindings.set(socket.id, { roomCode: room.code, participantId: participant.id });

        const snapshot = roomManager.getClientSnapshot(room, participant.id);
        ack?.({ ok: true, data: { snapshot } });

        socket.to(room.code).emit('participant:status_changed', {
          participantId: participant.id,
          connectionStatus: 'ONLINE',
          lastSeenAt: participant.lastSeenAt,
          stateVersion: room.stateVersion,
        });
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('session:start', async (rawPayload, ack) => {
      if (!checkGeneralLimit(socket)) {
        return fail(ack, ERROR_CODES.RATE_LIMITED, 'Muitas requisições em sequência.');
      }

      const parsed = RoomActionPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Código da sala inválido.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const room = await roomManager.startSession(binding.roomCode, binding.participantId);

        const hostSnapshot = roomManager.getClientSnapshot(room, binding.participantId);
        ack?.({ ok: true, data: { snapshot: hostSnapshot } });

        for (const p of room.participants) {
          if (p.socketId) {
            io.to(p.socketId).emit('session:started', {
              snapshot: roomManager.getClientSnapshot(room, p.id),
            });
          }
        }
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('session:pause', (rawPayload, ack) => {
      const parsed = RoomActionPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Código da sala inválido.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const room = roomManager.pauseSession(binding.roomCode, binding.participantId);
        ack?.({ ok: true, data: { status: room.status, stateVersion: room.stateVersion } });
        io.to(room.code).emit('session:state_changed', {
          status: room.status,
          stateVersion: room.stateVersion,
          updatedBy: binding.participantId,
        });
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('session:resume', (rawPayload, ack) => {
      const parsed = RoomActionPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Código da sala inválido.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const room = roomManager.resumeSession(binding.roomCode, binding.participantId);
        ack?.({ ok: true, data: { status: room.status, stateVersion: room.stateVersion } });
        io.to(room.code).emit('session:state_changed', {
          status: room.status,
          stateVersion: room.stateVersion,
          updatedBy: binding.participantId,
        });
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('filters:update', async (rawPayload, ack) => {
      if (!checkGeneralLimit(socket)) {
        return fail(ack, ERROR_CODES.RATE_LIMITED, 'Muitas requisições em sequência.');
      }

      const parsed = FiltersUpdatePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Filtros inválidos.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const room = await roomManager.updateFilters(
          binding.roomCode,
          binding.participantId,
          parsed.data.filters,
        );

        ack?.({
          ok: true,
          data: { snapshot: roomManager.getClientSnapshot(room, binding.participantId) },
        });

        for (const p of room.participants) {
          if (p.socketId) {
            const snap = roomManager.getClientSnapshot(room, p.id);
            io.to(p.socketId).emit('filters:updated', {
              filters: room.filters,
              updatedBy: binding.participantId,
              queue: snap.queue,
              queueTotalRemaining: snap.queueTotalRemaining,
              catalogExhausted: snap.catalogExhausted,
              stateVersion: room.stateVersion,
            });
          }
        }
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('queue:request_more', async (rawPayload, ack) => {
      const parsed = RoomActionPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Código da sala inválido.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const room = await roomManager.requestMoreMovies(binding.roomCode, binding.participantId);
        const snap = roomManager.getClientSnapshot(room, binding.participantId);

        ack?.({
          ok: true,
          data: {
            queue: snap.queue,
            queueTotalRemaining: snap.queueTotalRemaining,
            catalogExhausted: snap.catalogExhausted,
          },
        });
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('vote:submit', (rawPayload, ack) => {
      if (!checkGeneralLimit(socket)) {
        return fail(ack, ERROR_CODES.RATE_LIMITED, 'Muitos votos em sequência rápida.');
      }

      const parsed = VoteSubmitPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Dados de voto inválidos.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const { room, result } = roomManager.submitVote(
          binding.roomCode,
          binding.participantId,
          parsed.data.operationId,
          parsed.data.tmdbId,
          parsed.data.decision,
        );

        const snap = roomManager.getClientSnapshot(room, binding.participantId);

        ack?.({
          ok: true,
          data: {
            accepted: true,
            duplicate: result.duplicate,
            isMatch: Boolean(result.matchCreated),
            operationId: result.vote.operationId,
            tmdbId: result.vote.tmdbId,
            decision: result.vote.decision,
            myVotesCount: snap.myVotesCount,
            queue: snap.queue,
            queueTotalRemaining: snap.queueTotalRemaining,
            catalogExhausted: snap.catalogExhausted,
            stateVersion: room.stateVersion,
          },
        });

        socket.emit('vote:confirmed', {
          operationId: result.vote.operationId,
          tmdbId: result.vote.tmdbId,
          decision: result.vote.decision,
          myVotesCount: snap.myVotesCount,
        });

        if (!result.duplicate) {
          socket
            .to(room.code)
            .emit('participant:progress', roomManager.getPartnerProgress(room, binding.participantId));
        }

        if (result.matchCreated) {
          io.to(room.code).emit('match:created', {
            match: result.matchCreated,
            movie: result.movie,
            stateVersion: room.stateVersion,
          });
          io.to(room.code).emit('matches:updated', {
            matches: roomManager.getClientMatches(room),
            stateVersion: room.stateVersion,
          });
        }
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('vote:undo', (rawPayload, ack) => {
      if (!checkGeneralLimit(socket)) {
        return fail(ack, ERROR_CODES.RATE_LIMITED, 'Muitas requisições em sequência.');
      }

      const parsed = RoomActionPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Código da sala inválido.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const { room, result } = roomManager.undoLastVote(binding.roomCode, binding.participantId);
        const snap = roomManager.getClientSnapshot(room, binding.participantId);
        const matches = roomManager.getClientMatches(room);

        ack?.({
          ok: true,
          data: {
            undoneMovieId: result.undoneVote.tmdbId,
            matchReverted: result.matchReverted,
            myVotesCount: snap.myVotesCount,
            canUndo: Boolean(snap.canUndo),
            queue: snap.queue,
            queueTotalRemaining: snap.queueTotalRemaining,
            catalogExhausted: snap.catalogExhausted,
            matches,
            stateVersion: room.stateVersion,
          },
        });

        socket
          .to(room.code)
          .emit('participant:progress', roomManager.getPartnerProgress(room, binding.participantId));

        if (result.matchReverted) {
          io.to(room.code).emit('matches:updated', {
            matches,
            stateVersion: room.stateVersion,
          });
        }
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('movie:mark_watched', (rawPayload, ack) => {
      if (!checkGeneralLimit(socket)) {
        return fail(ack, ERROR_CODES.RATE_LIMITED, 'Muitas requisições em sequência.');
      }

      const parsed = MovieWatchedPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Dados inválidos para marcar filme.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const { room, entry } = roomManager.markMovieWatched(
          binding.roomCode,
          binding.participantId,
          parsed.data.tmdbId,
        );
        const matches = roomManager.getClientMatches(room);
        const mySnap = roomManager.getClientSnapshot(room, binding.participantId);

        ack?.({
          ok: true,
          data: {
            tmdbId: entry.tmdbId,
            title: entry.title,
            queue: mySnap.queue,
            queueTotalRemaining: mySnap.queueTotalRemaining,
            catalogExhausted: mySnap.catalogExhausted,
            matches,
            stateVersion: room.stateVersion,
          },
        });

        for (const p of room.participants) {
          if (p.id === binding.participantId || !p.socketId) continue;
          const partnerSnap = roomManager.getClientSnapshot(room, p.id);
          io.to(p.socketId).emit('movie:watched_removed', {
            tmdbId: entry.tmdbId,
            title: entry.title,
            markedBy: entry.markedBy,
            queue: partnerSnap.queue,
            queueTotalRemaining: partnerSnap.queueTotalRemaining,
            catalogExhausted: partnerSnap.catalogExhausted,
            matches,
            stateVersion: room.stateVersion,
          });
        }
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('match:dismiss', (rawPayload, ack) => {
      const parsed = MatchDismissPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Dados inválidos para remover match.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const room = roomManager.dismissMatch(
          binding.roomCode,
          binding.participantId,
          parsed.data.tmdbId,
        );
        const matches = roomManager.getClientMatches(room);

        ack?.({ ok: true, data: { matches, stateVersion: room.stateVersion } });
        io.to(room.code).emit('matches:updated', {
          matches,
          stateVersion: room.stateVersion,
        });
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('decision:enter', (rawPayload, ack) => {
      const parsed = RoomActionPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Código da sala inválido.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const room = roomManager.enterDeciding(binding.roomCode, binding.participantId);

        ack?.({ ok: true, data: { status: room.status, stateVersion: room.stateVersion } });
        io.to(room.code).emit('session:state_changed', {
          status: room.status,
          stateVersion: room.stateVersion,
          updatedBy: binding.participantId,
        });
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('decision:return', (rawPayload, ack) => {
      const parsed = RoomActionPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Código da sala inválido.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const room = roomManager.returnToVoting(binding.roomCode, binding.participantId);

        ack?.({ ok: true, data: { status: room.status, stateVersion: room.stateVersion } });
        io.to(room.code).emit('session:state_changed', {
          status: room.status,
          stateVersion: room.stateVersion,
          updatedBy: binding.participantId,
        });
        io.to(room.code).emit('decision:proposal_updated', {
          finalProposal: null,
          stateVersion: room.stateVersion,
        });
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('decision:spin_roulette', (rawPayload, ack) => {
      if (!checkGeneralLimit(socket)) {
        return fail(ack, ERROR_CODES.RATE_LIMITED, 'Muitas requisições em sequência.');
      }

      const parsed = RoomActionPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Código da sala inválido.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const { room, spin, proposal } = roomManager.spinDecisionRoulette(
          binding.roomCode,
          binding.participantId,
        );

        ack?.({
          ok: true,
          data: { spin, finalProposal: proposal, stateVersion: room.stateVersion },
        });
        io.to(room.code).emit('decision:roulette_spun', {
          spin,
          finalProposal: proposal,
          stateVersion: room.stateVersion,
        });
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('decision:propose', (rawPayload, ack) => {
      const parsed = DecisionMoviePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Dados inválidos para propor filme.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const { room, proposal } = roomManager.proposeFinalMovie(
          binding.roomCode,
          binding.participantId,
          parsed.data.tmdbId,
        );

        ack?.({
          ok: true,
          data: { finalProposal: proposal, stateVersion: room.stateVersion },
        });
        io.to(room.code).emit('decision:proposal_updated', {
          finalProposal: proposal,
          stateVersion: room.stateVersion,
        });
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('decision:confirm', async (rawPayload, ack) => {
      const parsed = DecisionMoviePayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(ack, ERROR_CODES.VALIDATION_ERROR, 'Dados inválidos para confirmar filme.');
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const outcome = await roomManager.confirmFinalMovie(
          binding.roomCode,
          binding.participantId,
          parsed.data.tmdbId,
        );

        ack?.({
          ok: true,
          data: {
            chosenMovie: outcome.chosenMovie,
            finalProposal: outcome.finalProposal,
            status: outcome.room.status,
            stateVersion: outcome.room.stateVersion,
          },
        });

        if (outcome.finalized) {
          io.to(outcome.room.code).emit('session:finalized', {
            chosenMovie: outcome.chosenMovie,
            matches: roomManager.getClientMatches(outcome.room),
            stateVersion: outcome.room.stateVersion,
          });
        } else {
          io.to(outcome.room.code).emit('decision:proposal_updated', {
            finalProposal: outcome.finalProposal,
            stateVersion: outcome.room.stateVersion,
          });
        }
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('session:end', async (rawPayload, ack) => {
      const parsed = SessionEndPayloadSchema.safeParse(rawPayload);
      if (!parsed.success) {
        return fail(
          ack,
          ERROR_CODES.VALIDATION_ERROR,
          'Confirmação explícita é obrigatória para encerrar a sessão.',
        );
      }

      try {
        const binding = requireBinding(socket, parsed.data.roomCode);
        const room = await roomManager.endSession(binding.roomCode, binding.participantId);

        ack?.({ ok: true, data: { status: room.status, stateVersion: room.stateVersion } });
        io.to(room.code).emit('session:finalized', {
          chosenMovie: null,
          matches: roomManager.getClientMatches(room),
          stateVersion: room.stateVersion,
        });
      } catch (err) {
        const payload = toErrorPayload(err);
        fail(ack, payload.code, payload.message);
      }
    });

    socket.on('disconnect', () => {
      rateLimiter.clearKey(`evt:${socket.id}`);
      const binding = bindings.get(socket.id);
      bindings.delete(socket.id);
      if (!binding) return;

      const updated = roomManager.markDisconnected(
        binding.roomCode,
        binding.participantId,
        socket.id,
      );

      if (updated?.changed) {
        io.to(updated.room.code).emit('participant:status_changed', {
          participantId: updated.participant.id,
          connectionStatus: 'OFFLINE',
          lastSeenAt: updated.participant.lastSeenAt,
          stateVersion: updated.room.stateVersion,
        });
      }
    });
  });

  return io;
}
