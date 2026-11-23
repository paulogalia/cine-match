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

export interface UndoVoteResult {
  undoneVote: Vote;
  matchReverted: boolean;
  movie: MovieSummary | null;
}

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

  const queue = room.queues[participantId];
  if (queue) {
    const idx = queue.movieIds.indexOf(tmdbId);
    if (idx !== -1) {
      queue.movieIds.splice(idx, 1);
      queue.cursor += 1;
    }
  }

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

/**
 * Desfaz o último voto do participante, recolocando o filme no topo da sua fila
 * e revertendo o match caso esse voto tenha sido o responsável por criá-lo.
 */
export function undoLastVote(room: Room, participantId: string): UndoVoteResult {
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
      'Só é possível desfazer votos enquanto a votação está em andamento.',
    );
  }

  let lastIdx = -1;
  for (let i = room.votes.length - 1; i >= 0; i--) {
    if (room.votes[i]?.participantId === participantId) {
      lastIdx = i;
      break;
    }
  }

  if (lastIdx === -1) {
    throw new DomainError(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      'Você ainda não tem nenhum voto para desfazer.',
    );
  }

  const lastVote = room.votes[lastIdx]!;
  const movieKey = String(lastVote.tmdbId);
  const existingMatch = room.matches[movieKey];

  if (existingMatch?.status === 'CHOSEN') {
    throw new DomainError(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      'Não é possível desfazer o voto de um filme já escolhido.',
    );
  }

  // Remove o voto
  room.votes.splice(lastIdx, 1);

  // Reverte match se o voto desfeito era um LIKE que gerou o match
  let matchReverted = false;
  if (lastVote.decision === 'LIKE' && existingMatch) {
    delete room.matches[movieKey];
    if (room.finalProposal?.tmdbId === lastVote.tmdbId) {
      room.finalProposal = null;
    }
    matchReverted = true;
  }

  // Recoloca o filme no topo da fila individual do participante
  const queue = room.queues[participantId] ?? { participantId, movieIds: [], cursor: 0 };
  const currentIdx = queue.movieIds.indexOf(lastVote.tmdbId);
  if (currentIdx !== -1) {
    queue.movieIds.splice(currentIdx, 1);
  }
  queue.movieIds.unshift(lastVote.tmdbId);
  queue.cursor = Math.max(0, queue.cursor - 1);
  room.queues[participantId] = queue;

  return {
    undoneVote: lastVote,
    matchReverted,
    movie: room.moviesById[movieKey] ?? null,
  };
}
