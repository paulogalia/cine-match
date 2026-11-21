import type { FilterCriteria, OscarCategory } from '../schemas';

export interface OscarCategoryMeta {
  id: OscarCategory;
  label: string;
}

export const OSCAR_CATEGORIES: OscarCategoryMeta[] = [
  { id: 'best_picture', label: 'Melhor Filme' },
  { id: 'best_director', label: 'Melhor Direção' },
  { id: 'international_feature', label: 'Filme Internacional' },
  { id: 'animated_feature', label: 'Melhor Animação' },
  { id: 'screenplay', label: 'Melhor Roteiro' },
  { id: 'acting', label: 'Atuação' },
];

export interface NightVibePreset {
  id: string;
  label: string;
  description: string;
  filters: FilterCriteria;
}

export const NIGHT_VIBE_PRESETS: NightVibePreset[] = [
  {
    id: 'oscar_night',
    label: 'Noite do Oscar',
    description: 'Vencedores e grandes indicados da Academia',
    filters: {
      genreIds: [],
      sortBy: 'vote_average.desc',
      presetId: 'oscar_night',
      oscar: {
        enabled: true,
        winnersOnly: true,
        categories: [],
      },
    },
  },
  {
    id: 'hidden_gems',
    label: 'Joias Escondidas',
    description: 'Nota alta fora do óbvio, com descoberta aleatória',
    filters: {
      genreIds: [],
      minRating: 7.4,
      maxVoteCount: 2500,
      sortBy: 'vote_average.desc',
      randomDiscovery: true,
      presetId: 'hidden_gems',
    },
  },
  {
    id: 'brazilian_cinema',
    label: 'Cinema Nacional',
    description: 'Filmes brasileiros aclamados',
    filters: {
      genreIds: [],
      originalLanguage: 'pt',
      minRating: 7,
      sortBy: 'vote_average.desc',
      presetId: 'brazilian_cinema',
    },
  },
  {
    id: 'short_night',
    label: 'Curtinho (até 1h40)',
    description: 'Bons filmes para noites sem tempo a perder',
    filters: {
      genreIds: [],
      maxRuntime: 100,
      minRating: 7,
      sortBy: 'popularity.desc',
      randomDiscovery: true,
      presetId: 'short_night',
    },
  },
  {
    id: 'classics',
    label: 'Clássicos',
    description: 'Obras marcantes até 1999',
    filters: {
      genreIds: [],
      yearTo: 1999,
      minRating: 7.8,
      sortBy: 'vote_average.desc',
      randomDiscovery: true,
      presetId: 'classics',
    },
  },
  {
    id: 'date_romance',
    label: 'Romance & Comédia',
    description: 'Leves, divertidos ou apaixonantes',
    filters: {
      genreIds: [10749, 35],
      minRating: 7,
      sortBy: 'popularity.desc',
      randomDiscovery: true,
      presetId: 'date_romance',
    },
  },
  {
    id: 'friday_thriller',
    label: 'Suspense & Terror',
    description: 'Tensão e mistério para prender na tela',
    filters: {
      genreIds: [53, 27, 9648],
      minRating: 6.8,
      sortBy: 'popularity.desc',
      randomDiscovery: true,
      presetId: 'friday_thriller',
    },
  },
];
