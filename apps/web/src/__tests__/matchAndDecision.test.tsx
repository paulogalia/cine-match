import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClientRoomSnapshot, MovieSummary } from '@cine-match/shared';
import { MatchOverlay } from '../components/match/MatchOverlay';
import { DecisionScreen } from '../features/matches/DecisionScreen';
import { FinalChosenScreen } from '../features/matches/FinalChosenScreen';

const SAMPLE_MOVIE: MovieSummary = {
  tmdbId: 496243,
  title: 'Parasita',
  originalTitle: 'Gisaengchung',
  overview: 'Uma família desempregada se infiltra na rotina de uma família rica.',
  posterPath: '/igw938inb6Fy0YVcwIyxQ7Lu5FO.jpg',
  backdropPath: null,
  voteAverage: 8.5,
  voteCount: 18000,
  releaseYear: 2019,
  genreIds: [35, 53, 18],
  originalLanguage: 'ko',
  runtime: 132,
};

function makeDecisionSnapshot(overrides?: Partial<ClientRoomSnapshot>): ClientRoomSnapshot {
  return {
    id: 'room_1',
    code: 'K7M9P2',
    status: 'DECIDING',
    stateVersion: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    myParticipantId: 'part_1',
    participants: [
      {
        id: 'part_1',
        name: 'Paulo',
        avatarColor: '#FF4D6D',
        role: 'HOST',
        connectionStatus: 'ONLINE',
        joinedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
      {
        id: 'part_2',
        name: 'Maria',
        avatarColor: '#8B5CF6',
        role: 'GUEST',
        connectionStatus: 'ONLINE',
        joinedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      },
    ],
    partnerProgress: { participantId: 'part_2', votedCount: 5, queueRemaining: 7 },
    filters: { genreIds: [], sortBy: 'popularity.desc' },
    queue: [],
    queueTotalRemaining: 0,
    catalogExhausted: false,
    myVotesCount: 5,
    myVotedMovieIds: [496243],
    matches: [],
    finalProposal: null,
    chosenMovie: null,
    ...overrides,
  };
}

describe('Etapa 6 — Celebração de Match e Decisão Final', () => {
  afterEach(() => {
    cleanup();
  });

  it('renderiza MatchOverlay com fila restante e aciona detalhes/continuar', () => {
    const onDetails = vi.fn();
    const onContinue = vi.fn();

    render(
      <MatchOverlay
        movie={SAMPLE_MOVIE}
        remainingInQueue={2}
        onViewDetails={onDetails}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByTestId('match-celebration-overlay')).toBeInTheDocument();
    expect(screen.getByText('É MATCH!')).toBeInTheDocument();
    expect(screen.getByTestId('match-queue-remaining')).toHaveTextContent('+2 novos matches');

    fireEvent.click(screen.getByTestId('match-details-btn'));
    expect(onDetails).toHaveBeenCalledWith(SAMPLE_MOVIE);

    fireEvent.click(screen.getByTestId('match-continue-btn'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('exibe tela divertida quando entra em Decidir agora sem matches', () => {
    render(
      <DecisionScreen
        snapshot={makeDecisionSnapshot({ matches: [] })}
        onPropose={vi.fn().mockResolvedValue(null)}
        onConfirm={vi.fn().mockResolvedValue(null)}
        onReturnToVoting={vi.fn().mockResolvedValue(null)}
        onEndSession={vi.fn().mockResolvedValue(null)}
        onOpenDetails={vi.fn()}
      />,
    );

    expect(screen.getByTestId('decision-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/pipoca ainda está esperando/i)).toBeInTheDocument();
  });

  it('permite confirmar a proposta feita pelo parceiro na tela de decisão', () => {
    const onConfirm = vi.fn().mockResolvedValue(null);

    render(
      <DecisionScreen
        snapshot={makeDecisionSnapshot({
          matches: [
            {
              match: { tmdbId: 496243, matchedAt: new Date().toISOString(), status: 'ACTIVE' },
              movie: SAMPLE_MOVIE,
            },
          ],
          finalProposal: {
            tmdbId: 496243,
            proposedBy: 'part_2',
            proposedAt: new Date().toISOString(),
            confirmedBy: ['part_2'],
          },
        })}
        onPropose={vi.fn().mockResolvedValue(null)}
        onConfirm={onConfirm}
        onReturnToVoting={vi.fn().mockResolvedValue(null)}
        onEndSession={vi.fn().mockResolvedValue(null)}
        onOpenDetails={vi.fn()}
      />,
    );

    expect(screen.getByTestId('decision-proposal-banner')).toHaveTextContent('Maria sugeriu "Parasita"');
    fireEvent.click(screen.getByTestId('confirm-proposal-btn'));
    expect(onConfirm).toHaveBeenCalledWith(496243);
  });

  it('exibe a tela final sincronizada com o filme escolhido em destaque', () => {
    render(
      <FinalChosenScreen
        snapshot={makeDecisionSnapshot({ status: 'FINISHED', chosenMovie: SAMPLE_MOVIE })}
        onOpenDetails={vi.fn()}
        onOpenHistory={vi.fn()}
        onNewSession={vi.fn()}
      />,
    );

    expect(screen.getByTestId('final-chosen-screen')).toBeInTheDocument();
    expect(screen.getByText('Filme da noite escolhido')).toBeInTheDocument();
    expect(screen.getByText('Parasita')).toBeInTheDocument();
  });
});
