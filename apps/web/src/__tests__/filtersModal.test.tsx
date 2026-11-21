import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FiltersModal } from '../features/filters/FiltersModal';

describe('Modal de Filtros — Gêneros, Oscar, Streamings BR e Variedade', () => {
  afterEach(() => {
    cleanup();
  });

  it('valida intervalo de anos inválido e envia filtros completos quando válidos', async () => {
    const onApply = vi.fn().mockResolvedValue(null);
    const onClose = vi.fn();

    render(
      <FiltersModal
        open
        currentFilters={{ genreIds: [], sortBy: 'popularity.desc' }}
        onClose={onClose}
        onApply={onApply}
      />,
    );

    fireEvent.click(screen.getByTestId('filter-genre-35'));
    fireEvent.click(screen.getByText('Até 1h40'));
    fireEvent.change(screen.getByTestId('filter-year-from'), { target: { value: '2024' } });
    fireEvent.change(screen.getByTestId('filter-year-to'), { target: { value: '2015' } });
    fireEvent.click(screen.getByTestId('filters-apply-btn'));

    expect(await screen.findByRole('alert')).toHaveTextContent('não pode ser maior');
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('filter-year-from'), { target: { value: '2015' } });
    fireEvent.change(screen.getByTestId('filter-year-to'), { target: { value: '2024' } });
    fireEvent.click(screen.getByTestId('filters-apply-btn'));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        genreIds: [35],
        yearFrom: 2015,
        yearTo: 2024,
        maxRuntime: 100,
      }),
    );
  });

  it('permite ativar filtro do Oscar por categorias/anos, streamings BR, descoberta aleatória e pular histórico', () => {
    const onApply = vi.fn().mockResolvedValue(null);

    render(
      <FiltersModal
        open
        currentFilters={{ genreIds: [], sortBy: 'popularity.desc' }}
        onClose={vi.fn()}
        onApply={onApply}
      />,
    );

    // Ativa Oscar, marca "Só vencedores", categoria Filme Internacional e anos 2020–2026
    fireEvent.click(screen.getByTestId('filter-oscar-toggle'));
    fireEvent.click(screen.getByTestId('filter-oscar-winners-only'));
    fireEvent.click(screen.getByTestId('oscar-cat-international_feature'));
    fireEvent.change(screen.getByTestId('oscar-year-from'), { target: { value: '2020' } });
    fireEvent.change(screen.getByTestId('oscar-year-to'), { target: { value: '2026' } });

    // Seleciona Netflix (8), ativa descoberta aleatória e pular histórico
    fireEvent.click(screen.getByTestId('provider-8'));
    fireEvent.click(screen.getByTestId('filter-random-discovery'));
    fireEvent.click(screen.getByTestId('filter-exclude-history'));

    fireEvent.click(screen.getByTestId('filters-apply-btn'));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        watchProviderIds: [8],
        randomDiscovery: true,
        excludeHistory: true,
        oscar: {
          enabled: true,
          winnersOnly: true,
          categories: ['international_feature'],
          ceremonyYearFrom: 2020,
          ceremonyYearTo: 2026,
        },
      }),
    );
  });
});
