import {
  ERROR_CODES,
  type FinalDecisionProposal,
  type MovieSummary,
  type Room,
  type SessionHistoryEntry,
} from '@cine-match/shared';
import { DomainError } from '../../utils/sanitize';

export function dismissMatchFromInterestList(
  room: Room,
  participantId: string,
  tmdbId: number,
): void {
  const key = String(tmdbId);
  const match = room.matches[key];
  if (!match) {
    throw new DomainError(ERROR_CODES.MATCH_NOT_FOUND, 'Match não encontrado nesta sala.');
  }

  if (match.status === 'CHOSEN') {
    throw new DomainError(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      'Não é possível remover um filme já escolhido como filme da noite.',
    );
  }

  // Preserva os votos originais; apenas marca o match como DISMISSED
  match.status = 'DISMISSED';
  match.dismissedBy = participantId;
  match.dismissedAt = new Date().toISOString();

  if (room.finalProposal?.tmdbId === tmdbId) {
    room.finalProposal = null;
  }
}

export function proposeFinalMovie(
  room: Room,
  participantId: string,
  tmdbId: number,
): FinalDecisionProposal {
  if (room.status !== 'DECIDING' && room.status !== 'IN_PROGRESS') {
    throw new DomainError(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      'Não é possível propor um filme no estado atual da sala.',
    );
  }

  const match = room.matches[String(tmdbId)];
  if (!match || match.status !== 'ACTIVE') {
    throw new DomainError(
      ERROR_CODES.MATCH_NOT_FOUND,
      'Somente filmes ativos na lista de matches podem ser escolhidos.',
    );
  }

  room.status = 'DECIDING';
  const proposal: FinalDecisionProposal = {
    tmdbId,
    proposedBy: participantId,
    proposedAt: new Date().toISOString(),
    confirmedBy: [participantId],
  };

  room.finalProposal = proposal;
  return proposal;
}

export interface ConfirmDecisionResult {
  finalized: boolean;
  chosenMovie: MovieSummary | null;
  finalProposal: FinalDecisionProposal | null;
}

export function confirmFinalMovie(
  room: Room,
  participantId: string,
  tmdbId: number,
): ConfirmDecisionResult {
  if (room.status !== 'DECIDING') {
    throw new DomainError(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      'A sala não está em modo de decisão final.',
    );
  }

  const proposal = room.finalProposal;
  if (!proposal || proposal.tmdbId !== tmdbId) {
    throw new DomainError(
      ERROR_CODES.INVALID_STATE_TRANSITION,
      'Não existe proposta pendente para este filme.',
    );
  }

  if (!proposal.confirmedBy.includes(participantId)) {
    proposal.confirmedBy.push(participantId);
  }

  const allConfirmed = room.participants.every((p) => proposal.confirmedBy.includes(p.id));
  if (!allConfirmed) {
    return {
      finalized: false,
      chosenMovie: null,
      finalProposal: proposal,
    };
  }

  const key = String(tmdbId);
  const match = room.matches[key];
  if (match) {
    match.status = 'CHOSEN';
  }

  room.chosenMovieId = tmdbId;
  room.status = 'FINISHED';

  const chosenMovie = room.moviesById[key] ?? null;
  return {
    finalized: true,
    chosenMovie,
    finalProposal: proposal,
  };
}

export function buildHistoryEntry(room: Room): SessionHistoryEntry {
  const matches = Object.values(room.matches)
    .map((m) => {
      const movie = room.moviesById[String(m.tmdbId)];
      if (!movie) return null;
      return {
        movie,
        matchedAt: m.matchedAt,
        status: m.status,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .sort((a, b) => b.matchedAt.localeCompare(a.matchedAt));

  const chosenMovie =
    room.chosenMovieId !== null ? (room.moviesById[String(room.chosenMovieId)] ?? null) : null;

  return {
    roomId: room.id,
    roomCode: room.code,
    createdAt: room.createdAt,
    finishedAt: new Date().toISOString(),
    participantNames: room.participants.map((p) => p.name),
    totalVotes: room.votes.length,
    matches,
    chosenMovie,
  };
}
