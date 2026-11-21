import {
  ERROR_CODES,
  type MatchRecord,
  type MovieSummary,
  type Room,
  type Vote,
  type VoteDecision,
} from '@cine-match/shared';
import { DomainError } from '../../utils/sanitize';

export interface ApplyVoteResult {
  vote: Vote;
  duplicate: boolean;
  matchCreated: MatchRecord | null;
  movie: MovieSummary;
}

/**
 * Executa o registro de voto e a detecção de match de forma estritamente síncrona
 * em memória, garantindo idempotência e evitando race conditions em likes simultâneos.
 */
export function applyVote(
  room: Room,
  participantId: string,
  operationId: string,
  tmdbId: number,
  decision: VoteDecision,
): ApplyVoteResult {
  const participant = room.participants.find((p) => p.id === participantId);
  if (!participant) {
    throw new DomainError(
      ERROR_CODES.PARTICIPANT_NOT_IN_ROOM,
      'Participante não pertence a esta sala.',
    );
  }

  if (room.status !== 'IN_PROGRESS') {
    throw new DomainError(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      'A votação não está em andamento no momento.',
    );
  }

  const movieKey = String(tmdbId);
  const movie = room.moviesById[movieKey];
  if (!movie) {
    throw new DomainError(ERROR_CODES.MOVIE_NOT_FOUND, 'Filme não encontrado no catálogo da sala.');
  }

  // 1. Idempotência exata por operationId (ex: reenvio de rede após reconexão)
  const existingByOperation = room.votes.find(
    (v) => v.operationId === operationId && v.participantId === participantId,
  );
  if (existingByOperation) {
    return {
      vote: existingByOperation,
      duplicate: true,
      matchCreated: null,
      movie,
    };
  }

  // 2. Regra de negócio: um participante não pode votar duas vezes no mesmo filme
  const existingByMovie = room.votes.find(
    (v) => v.participantId === participantId && v.tmdbId === tmdbId,
  );
  if (existingByMovie) {
    return {
      vote: existingByMovie,
      duplicate: true,
      matchCreated: null,
      movie,
    };
  }

  const now = new Date().toISOString();
  const vote: Vote = {
    operationId,
    participantId,
    tmdbId,
    decision,
    createdAt: now,
  };

  room.votes.push(vote);

  // Remove o filme da fila pendente deste participante
  const queue = room.queues[participantId];
  if (queue) {
    const idx = queue.movieIds.indexOf(tmdbId);
    if (idx !== -1) {
      queue.movieIds.splice(idx, 1);
      queue.cursor += 1;
    }
  }

  // 3. Detecção idempotente de match: exige LIKE de ambos os participantes
  let matchCreated: MatchRecord | null = null;
  if (decision === 'LIKE') {
    const partner = room.participants.find((p) => p.id !== participantId);
    if (partner) {
      const partnerLiked = room.votes.some(
        (v) =>
          v.participantId === partner.id &&
          v.tmdbId === tmdbId &&
          v.decision === 'LIKE',
      );

      if (partnerLiked && !room.matches[movieKey]) {
        const record: MatchRecord = {
          tmdbId,
          matchedAt: now,
          status: 'ACTIVE',
        };
        room.matches[movieKey] = record;
        matchCreated = record;
      }
    }
  }

  return {
    vote,
    duplicate: false,
    matchCreated,
    movie,
  };
}
