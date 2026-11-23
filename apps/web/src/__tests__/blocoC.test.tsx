import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClientRoomSnapshot, MovieSummary, RouletteSpin } from '@cine-match/shared';
import { RouletteOverlay } from '../components/match/RouletteOverlay';
import { InstallPwaButton } from '../features/home/InstallPwaButton';
import { DecisionScreen } from '../features/matches/DecisionScreen';

const M1: MovieSummary = {
  tmdbId: 496243,
  title: 'Parasita',
  originalTitle: 'Gisaengchung',
  overview: 'Sinopse 1',
  posterPath: null,
  backdropPath: null,
  voteAverage: 8.5,
  voteCount: 18000,
  releaseYear: 2019,
  genreIds: [18],
  originalLanguage: 'ko',
};

const M2: MovieSummary = {
  tmdbId: 27205,
  title: 'A Origem',
  originalTitle: 'Inception',
  overview: 'Sinopse 2',
  posterPath: null,
  backdropPath: null,
  voteAverage: 8.4,
  voteCount: 35000,
  releaseYear: 2010,
  genreIds: [878],
  originalLanguage: 'en',
};

function makeSnapshot(movies: MovieSummary[]): ClientRoomSnapshot {
  return {
    id: 'room_c',
    code: 'K7M9P2',
    status: 'DECIDING',
    stateVersion: 12,
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
    partnerProgress: { participantId: 'part_2', votedCount: 5, queueRemaining: 5 },
    filters: { genreIds: [], sortBy: 'popularity.desc' },
    queue: [],
    queueTotalRemaining: 0,
    catalogExhausted: false,
    myVotesCount: 5,
    myVotedMovieIds: movies.map((m) => m.tmdbId),
    matches: movies.map((movie) => ({
      match: { tmdbId: movie.tmdbId, matchedAt: new Date().toISOString(), status: 'ACTIVE' },
      movie,
    })),
    finalProposal: null,
    chosenMovie: null,
  };
}

describe('Bloco C — Roleta Sincronizada e PWA', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('mostra o botão da roleta somente com 2 ou mais matches ativos na DecisionScreen', () => {
    const onSpin = vi.fn().mockResolvedValue(null);

    const { rerender } = render(
      <DecisionScreen
        snapshot={makeSnapshot([M1])}
        onSpinRoulette={onSpin}
        onPropose={vi.fn().mockResolvedValue(null)}
        onConfirm={vi.fn().mockResolvedValue(null)}
        onReturnToVoting={vi.fn().mockResolvedValue(null)}
        onEndSession={vi.fn().mockResolvedValue(null)}
        onOpenDetails={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('decision-spin-roulette-btn')).not.toBeInTheDocument();

    rerender(
      <DecisionScreen
        snapshot={makeSnapshot([M1, M2])}
        onSpinRoulette={onSpin}
        onPropose={vi.fn().mockResolvedValue(null)}
        onConfirm={vi.fn().mockResolvedValue(null)}
        onReturnToVoting={vi.fn().mockResolvedValue(null)}
        onEndSession={vi.fn().mockResolvedValue(null)}
        onOpenDetails={vi.fn()}
      />,
    );

    const spinBtn = screen.getByTestId('decision-spin-roulette-btn');
    fireEvent.click(spinBtn);
    expect(onSpin).toHaveBeenCalledTimes(1);
  });

  it('revela o vencedor no RouletteOverlay e permite que o parceiro confirme o filme sorteado', () => {
    vi.useFakeTimers();
    const onConfirm = vi.fn().mockResolvedValue(null);

    const spin: RouletteSpin = {
      spinId: 'spin_1',
      triggeredBy: 'part_2',
      candidateIds: [M1.tmdbId, M2.tmdbId],
      winnerMovieId: M2.tmdbId,
      startedAt: new Date().toISOString(),
      durationMs: 3600,
    };

    render(
      <RouletteOverlay
        spin={spin}
        matches={makeSnapshot([M1, M2]).matches}
        myParticipantId="part_1"
        triggerName="Maria"
        onConfirmWinner={onConfirm}
        onSpinAgain={vi.fn().mockResolvedValue(null)}
        onViewDetails={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByTestId('roulette-overlay')).toBeInTheDocument();
    expect(screen.getByText(/Maria girou a roleta/i)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(3700); });

    expect(screen.getByTestId('roulette-winner-info')).toHaveTextContent('A Origem');
    fireEvent.click(screen.getByTestId('roulette-confirm-btn'));
    expect(onConfirm).toHaveBeenCalledWith(M2.tmdbId);
  });

  it('abre o guia de instalação em tela cheia (PWA) ao clicar no botão da Home', () => {
    render(<InstallPwaButton />);
    fireEvent.click(screen.getByTestId('home-install-pwa-btn'));
    expect(screen.getByText(/Abrir em tela cheia/i)).toBeInTheDocument();
    expect(screen.getByText(/Adicionar à Tela de Início/i)).toBeInTheDocument();
  });
});
