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

/**
 * Calcula quantos LIKEs são necessários para formar um match na sala:
 * - Considera os participantes ONLINE (com piso mínimo de 2 e teto pelo total da sala).
 * - Modo 'majority': maioria simples (floor(active / 2) + 1).
 * - Modo 'all' (padrão): unanimidade entre os participantes ativos.
 */
export function getRequiredLikesForRoom(room: Room): number {
  const totalParticipants = room.participants.length;
  if (totalParticipants <= 2) return 2;

  const onlineCount = room.participants.filter((p) => p.connectionStatus === 'ONLINE').length;
  const effectiveActive = Math.min(totalParticipants, Math.max(2, onlineCount));

  if (room.filters.groupMatchMode === 'majority') {
    return Math.floor(effectiveActive / 2) + 1;
  }

  return effectiveActive;
}

export function getLikeParticipantIdsForMovie(room: Room, tmdbId: number): string[] {
  const validIds = new Set(room.participants.map((p) => p.id));
  const liked = new Set<string>();
  for (const vote of room.votes) {
    if (vote.tmdbId === tmdbId && vote.decision === 'LIKE' && validIds.has(vote.participantId)) {
      liked.add(vote.participantId);
    }
  }
  return Array.from(liked);
}

/**
 * Reavalia se algum filme pendente atingiu o quórum após mudança de regra ou desconexão.
 */
export function evaluateGroupMatchesForRoom(room: Room): MatchRecord[] {
  const required = getRequiredLikesForRoom(room);
  const likesByMovie = new Map<number, Set<string>>();
  const validIds = new Set(room.participants.map((p) => p.id));

  for (const vote of room.votes) {
    if (vote.decision !== 'LIKE' || !validIds.has(vote.participantId)) continue;
    let set = likesByMovie.get(vote.tmdbId);
    if (!set) {
      set = new Set<string>();
      likesByMovie.set(vote.tmdbId, set);
    }
    set.add(vote.participantId);
  }

  const created: MatchRecord[] = [];
  const now = new Date().toISOString();

  for (const [tmdbId, likerSet] of likesByMovie.entries()) {
    const movieKey = String(tmdbId);
    const existing = room.matches[movieKey];
    if (existing) {
      existing.likedByParticipantIds = Array.from(likerSet);
      continue;
    }

    if (likerSet.size >= required && room.moviesById[movieKey]) {
      const record: MatchRecord = {
        tmdbId,
        matchedAt: now,
        status: 'ACTIVE',
        likedByParticipantIds: Array.from(likerSet),
      };
      room.matches[movieKey] = record;
      created.push(record);
    }
  }

  return created;
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
    const likedIds = getLikeParticipantIdsForMovie(room, tmdbId);
    const requiredLikes = getRequiredLikesForRoom(room);
    const existingMatch = room.matches[movieKey];

    if (existingMatch) {
      existingMatch.likedByParticipantIds = likedIds;
    } else if (likedIds.length >= requiredLikes) {
      const record: MatchRecord = {
        tmdbId,
        matchedAt: now,
        status: 'ACTIVE',
        likedByParticipantIds: likedIds,
      };
      room.matches[movieKey] = record;
      matchCreated = record;
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
 * e revertendo o match caso os likes restantes fiquem abaixo do quórum.
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

  room.votes.splice(lastIdx, 1);

  let matchReverted = false;
  if (lastVote.decision === 'LIKE' && existingMatch) {
    const remainingLikers = getLikeParticipantIdsForMovie(room, lastVote.tmdbId);
    const requiredLikes = getRequiredLikesForRoom(room);

    if (remainingLikers.length < requiredLikes) {
      delete room.matches[movieKey];
      if (room.finalProposal?.tmdbId === lastVote.tmdbId) {
        room.finalProposal = null;
      }
      matchReverted = true;
    } else {
      existingMatch.likedByParticipantIds = remainingLikers;
    }
  }

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