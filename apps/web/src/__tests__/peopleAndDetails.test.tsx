import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MovieDetails, MovieSummary } from '@cine-match/shared';
import { MovieDetailsModal } from '../components/movie/MovieDetailsModal';
import { FiltersModal } from '../features/filters/FiltersModal';
import * as api from '../services/api';

const SAMPLE_SUMMARY: MovieSummary = {
  tmdbId: 27205,
  title: 'A Origem',
  originalTitle: 'Inception',
  overview: 'Um ladrão que invade sonhos.',
  posterPath: '/inception.jpg',
  backdropPath: null,
  voteAverage: 8.4,
  voteCount: 35000,
  releaseYear: 2010,
  genreIds: [28, 878],
  originalLanguage: 'en',
  runtime: 148,
};

const SAMPLE_DETAILS: MovieDetails = {
  ...SAMPLE_SUMMARY,
  runtime: 148,
  genres: [{ id: 878, name: 'Ficção Científica' }],
  directors: [{ id: 525, name: 'Christopher Nolan', profilePath: null }],
  cast: [{ id: 6193, name: 'Leonardo DiCaprio', character: 'Cobb', profilePath: null }],
  trailer: {
    key: 'YoHD9XEInc0',
    name: 'Trailer Oficial',
    site: 'YouTube',
    type: 'Trailer',
    language: 'pt',
  },
  watchProvidersBR: { link: null, available: false, providers: [] },
  fetchedAt: new Date().toISOString(),
};

describe('Bloco A — Busca de Diretores/Atores e Detalhes com Trailer/Elenco', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('permite alternar abas Diretores/Atores, selecionar pessoa e aplicar no filtro', async () => {
    vi.spyOn(api, 'searchPeople').mockImplementation(async (_q, role) => {
      if (role === 'director') {
        return [
          {
            id: 525,
            name: 'Christopher Nolan',
            profilePath: null,
            knownForDepartment: 'Directing',
            knownForTitles: ['A Origem', 'Interestelar'],
          },
        ];
      }
      return [
        {
          id: 6193,
          name: 'Leonardo DiCaprio',
          profilePath: null,
          knownForDepartment: 'Acting',
          knownForTitles: ['A Origem'],
        },
      ];
    });

    const onApply = vi.fn().mockResolvedValue(null);

    render(
      <FiltersModal
        open
        currentFilters={{ genreIds: [], sortBy: 'popularity.desc' }}
        onClose={vi.fn()}
        onApply={onApply}
      />,
    );

    // Seleciona diretor
    const nolanOption = await screen.findByTestId('person-option-525');
    fireEvent.click(nolanOption);
    expect(screen.getByTestId('selected-director-525')).toBeInTheDocument();

    // Troca para aba Atores e seleciona ator
    fireEvent.click(screen.getByTestId('people-tab-actor'));
    const leoOption = await screen.findByTestId('person-option-6193');
    fireEvent.click(leoOption);
    expect(screen.getByTestId('selected-actor-6193')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('filters-apply-btn'));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({
        directors: [{ id: 525, name: 'Christopher Nolan', profilePath: null }],
        actors: [{ id: 6193, name: 'Leonardo DiCaprio', profilePath: null }],
      }),
    );
  });

  it('exibe trailer, direção e elenco no Modal de Detalhes e permite filtrar ao clicar no diretor', async () => {
    vi.spyOn(api, 'fetchMovieDetails').mockResolvedValue(SAMPLE_DETAILS);
    const onFilterByPerson = vi.fn();
    const onClose = vi.fn();

    render(
      <MovieDetailsModal
        movie={SAMPLE_SUMMARY}
        onClose={onClose}
        onFilterByPerson={onFilterByPerson}
      />,
    );

    const playBtn = await screen.findByTestId('details-play-trailer-btn');
    fireEvent.click(playBtn);
    expect(screen.getByTestId('details-trailer-player')).toBeInTheDocument();

    const dirBtn = screen.getByTestId('details-director-525');
    fireEvent.click(dirBtn);

    await waitFor(() => {
      expect(onFilterByPerson).toHaveBeenCalledWith(
        { id: 525, name: 'Christopher Nolan', profilePath: null },
        'director',
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
