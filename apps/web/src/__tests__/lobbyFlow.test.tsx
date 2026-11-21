import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeScreen } from '../features/home/HomeScreen';
import { JoinRoomScreen } from '../features/lobby/JoinRoomScreen';
import { useSessionStore } from '../stores/sessionStore';

describe('Etapa 4 — Telas Home e Entrada na Sala', () => {
  beforeEach(() => {
    useSessionStore.setState({
      view: 'home',
      prefilledJoinCode: '',
      savedName: '',
      connectionState: 'connected',
      snapshot: null,
      busyAction: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza a tela inicial com os botões de criar e entrar em sessão', () => {
    render(<HomeScreen />);

    expect(screen.getByText('Cine Match')).toBeInTheDocument();
    expect(screen.getByTestId('home-create-btn')).toBeEnabled();
    expect(screen.getByTestId('home-join-btn')).toBeEnabled();

    fireEvent.click(screen.getByTestId('home-create-btn'));
    expect(useSessionStore.getState().view).toBe('create');
  });

  it('preenche o código automaticamente vindo do QR Code e valida campos antes de enviar', async () => {
    useSessionStore.setState({ prefilledJoinCode: 'K7M9P2' });
    const onJoin = vi.fn().mockResolvedValue(null);

    render(<JoinRoomScreen onJoin={onJoin} />);

    const codeInput = screen.getByTestId('join-code-input') as HTMLInputElement;
    expect(codeInput.value).toBe('K7M9P2');

    // Tenta enviar sem nome -> deve exibir erro e não chamar onJoin
    fireEvent.click(screen.getByTestId('join-submit-btn'));
    expect(await screen.findByRole('alert')).toHaveTextContent('pelo menos 2 letras');
    expect(onJoin).not.toHaveBeenCalled();

    // Preenche nome válido -> chama onJoin com código normalizado
    fireEvent.change(screen.getByTestId('join-name-input'), { target: { value: 'Maria' } });
    fireEvent.click(screen.getByTestId('join-submit-btn'));
    expect(onJoin).toHaveBeenCalledWith('K7M9P2', 'Maria');
  });
});
