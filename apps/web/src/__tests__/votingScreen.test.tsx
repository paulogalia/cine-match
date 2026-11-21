import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientRoomSnapshot } from '@cine-match/shared';
import { VotingScreen } from '../features/voting/VotingScreen';
import { useSessionStore } from '../stores/sessionStore';

function createMockSnapshot(overrides?: Partial<ClientRoomSnapshot>): ClientRoomSnapshot {
  return {
    id: 'room_1',
    code: 'K7M9P2',
    status: 'IN_PROGRESS',
    stateVersion: 4,
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
    partnerProgress: { participantId: 'part_2', votedCount: 3, queueRemaining: 9 },
    filters: { genreIds: [], sortBy: 'popularity.desc' },
    queue: [
      {
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
      },
    ],
    queueTotalRemaining: 1,
    catalogExhausted: false,
    myVotesCount: 2,
    myVotedMovieIds: [1, 2],
    matches: [],
    finalProposal: null,
    chosenMovie: null,
    ...overrides,
  };
}

describe('Etapa 5 — Tela Principal de Votação e Espera', () => {
  beforeEach(() => {
    useSessionStore.setState({
      connectionState: 'connected',
      pendingVoteMovieIds: [],
      loadingMoreMovies: false,
      matchQueue: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('exibe o card principal do filme, expande sinopse e dispara votos via botões', () => {
    const onVote = vi.fn().mockResolvedValue(true);

    render(
      <VotingScreen
        snapshot={createMockSnapshot()}
        onVote={onVote}
        onRequestMore={vi.fn().mockResolvedValue(undefined)}
        onUpdateFilters={vi.fn().mockResolvedValue(null)}
        onDismissMatch={vi.fn().mockResolvedValue(undefined)}
        onPause={vi.fn().mockResolvedValue(undefined)}
        onResume={vi.fn().mockResolvedValue(undefined)}
        onEnterDeciding={vi.fn().mockResolvedValue(null)}
        onOpenDetails={vi.fn()}
      />,
    );

    expect(screen.getByText('Parasita')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('expand-synopsis-btn'));
    expect(screen.getByTestId('expanded-synopsis-panel')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('vote-like-btn'));
    expect(onVote).toHaveBeenCalledWith(496243, 'LIKE');
  });

  it('bloqueia os botões de votação quando desconectado', () => {
    useSessionStore.setState({ connectionState: 'disconnected' });

    render(
      <VotingScreen
        snapshot={createMockSnapshot()}
        onVote={vi.fn().mockResolvedValue(true)}
        onRequestMore={vi.fn().mockResolvedValue(undefined)}
        onUpdateFilters={vi.fn().mockResolvedValue(null)}
        onDismissMatch={vi.fn().mockResolvedValue(undefined)}
        onPause={vi.fn().mockResolvedValue(undefined)}
        onResume={vi.fn().mockResolvedValue(undefined)}
        onEnterDeciding={vi.fn().mockResolvedValue(null)}
        onOpenDetails={vi.fn()}
      />,
    );

    expect(screen.getByTestId('voting-offline-banner')).toBeInTheDocument();
    expect(screen.getByTestId('vote-like-btn')).toBeDisabled();
    expect(screen.getByTestId('vote-dislike-btn')).toBeDisabled();
  });

  it('exibe a tela de espera quando a fila individual acaba antes do parceiro', () => {
    render(
      <VotingScreen
        snapshot={createMockSnapshot({ queue: [], queueTotalRemaining: 0 })}
        onVote={vi.fn().mockResolvedValue(true)}
        onRequestMore={vi.fn().mockResolvedValue(undefined)}
        onUpdateFilters={vi.fn().mockResolvedValue(null)}
        onDismissMatch={vi.fn().mockResolvedValue(undefined)}
        onPause={vi.fn().mockResolvedValue(undefined)}
        onResume={vi.fn().mockResolvedValue(undefined)}
        onEnterDeciding={vi.fn().mockResolvedValue(null)}
        onOpenDetails={vi.fn()}
      />,
    );

    expect(screen.getByTestId('waiting-queue-view')).toBeInTheDocument();
    expect(screen.getByText(/Maria ainda está avaliando 9 filmes/)).toBeInTheDocument();
  });
});
