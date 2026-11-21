import { useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MovieSummary } from '@cine-match/shared';
import { SwipeDeck } from '../components/swipe/SwipeDeck';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Modal } from '../components/ui/Modal';

const MOVIE: MovieSummary = {
  tmdbId: 27205,
  title: 'A Origem',
  originalTitle: 'Inception',
  overview: 'Um ladrão que invade sonhos.',
  posterPath: null,
  backdropPath: null,
  voteAverage: 8.4,
  voteCount: 36000,
  releaseYear: 2010,
  genreIds: [28, 878],
  originalLanguage: 'en',
  runtime: 148,
};

function BrokenComponent(): never {
  throw new Error('Falha simulada');
}

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)} data-testid="trigger-btn">
        Abrir
      </button>
      <Modal open={open} title="Modal de Teste" onClose={() => setOpen(false)}>
        <p>Conteúdo interno</p>
      </Modal>
    </div>
  );
}

describe('Etapa 9 — Acessibilidade, Foco e Resiliência de UI', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('ErrorBoundary captura falhas inesperadas e exibe tela de recuperação amigável', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('algo saiu do roteiro');
    expect(screen.getByText('Recarregar aplicativo')).toBeInTheDocument();
  });

  it('Modal fecha ao pressionar Escape e restaura o foco para o botão de origem', async () => {
    render(<ModalHarness />);

    const trigger = screen.getByTestId('trigger-btn');
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(trigger);
  });

  it('SwipeDeck anuncia o filme atual via aria-live e evita disparo duplo no mesmo filme', () => {
    const onVote = vi.fn();
    render(<SwipeDeck movies={[MOVIE]} onVote={onVote} />);

    expect(screen.getByTestId('deck-aria-live')).toHaveTextContent('A Origem, 2010, nota 8.4');

    const likeBtn = screen.getByTestId('vote-like-btn');
    fireEvent.click(likeBtn);
    fireEvent.click(likeBtn);

    expect(onVote).toHaveBeenCalledTimes(1);
    expect(onVote).toHaveBeenCalledWith(27205, 'LIKE');
  });
});
