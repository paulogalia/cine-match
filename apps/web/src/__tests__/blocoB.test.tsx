import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MovieSummary } from '@cine-match/shared';
import { SwipeDeck } from '../components/swipe/SwipeDeck';
import { HistoryModal } from '../features/history/HistoryModal';
import * as api from '../services/api';
import { useSessionStore } from '../stores/sessionStore';

const MOVIE: MovieSummary = {
  tmdbId: 496243,
  title: 'Parasita',
  originalTitle: 'Gisaengchung',
  overview: 'Uma família desempregada se infiltra na rotina de uma família rica.',
  posterPath: null,
  backdropPath: null,
  voteAverage: 8.5,
  voteCount: 18000,
  releaseYear: 2019,
  genreIds: [35, 53, 18],
  originalLanguage: 'ko',
  runtime: 132,
};

describe('Bloco B — Undo, Já assistimos e Controle de Som', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSessionStore.setState({ soundEnabled: true });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('aciona Desfazer (quando habilitado) e Já assistimos no SwipeDeck', () => {
    const onUndo = vi.fn();
    const onMarkWatched = vi.fn();

    const { rerender } = render(
      <SwipeDeck
        movies={[MOVIE]}
        canUndo={false}
        onVote={vi.fn()}
        onUndo={onUndo}
        onMarkWatched={onMarkWatched}
      />,
    );

    expect(screen.getByTestId('vote-undo-btn')).toBeDisabled();

    rerender(
      <SwipeDeck
        movies={[MOVIE]}
        canUndo={true}
        onVote={vi.fn()}
        onUndo={onUndo}
        onMarkWatched={onMarkWatched}
      />,
    );

    fireEvent.click(screen.getByTestId('vote-undo-btn'));
    expect(onUndo).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('vote-watched-btn'));
    expect(onMarkWatched).toHaveBeenCalledWith(496243);
  });

  it('alterna preferência de som no store e persiste no localStorage', () => {
    expect(useSessionStore.getState().soundEnabled).toBe(true);
    useSessionStore.getState().toggleSound();
    expect(useSessionStore.getState().soundEnabled).toBe(false);
    expect(window.localStorage.getItem('cine_match_sound_enabled')).toBe('0');
  });

  it('exibe e permite restaurar filmes na aba "Já assistimos" do HistoryModal', async () => {
    vi.spyOn(api, 'fetchHistory').mockResolvedValue([]);
    vi.spyOn(api, 'fetchWatchedMovies').mockResolvedValue([
      {
        tmdbId: 496243,
        title: 'Parasita',
        posterPath: null,
        releaseYear: 2019,
        markedAt: new Date().toISOString(),
        markedBy: 'Paulo',
      },
    ]);
    const unmarkSpy = vi.spyOn(api, 'unmarkWatchedMovie').mockResolvedValue([]);

    render(<HistoryModal open onClose={vi.fn()} onOpenMovieDetails={vi.fn()} />);

    const watchedTab = await screen.findByTestId('history-tab-watched');
    fireEvent.click(watchedTab);

    expect(await screen.findByTestId('watched-item-496243')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('restore-watched-496243'));
    await waitFor(() => {
      expect(unmarkSpy).toHaveBeenCalledWith(496243);
      expect(screen.queryByTestId('watched-item-496243')).not.toBeInTheDocument();
    });
  });
});
