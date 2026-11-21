import type { FilterCriteria, Genre, MovieDetails, MovieSummary, WatchProviderOption } from '@cine-match/shared';
import { FALLBACK_WATCH_PROVIDERS_BR } from './watchProvidersFallback';
import type { CatalogPageResult, CatalogProvider } from './catalogProvider';

export const FALLBACK_GENRES_PT: Genre[] = [
  { id: 28, name: 'Ação' },
  { id: 12, name: 'Aventura' },
  { id: 16, name: 'Animação' },
  { id: 35, name: 'Comédia' },
  { id: 80, name: 'Crime' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Família' },
  { id: 14, name: 'Fantasia' },
  { id: 36, name: 'História' },
  { id: 27, name: 'Terror' },
  { id: 10402, name: 'Música' },
  { id: 9648, name: 'Mistério' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Ficção Científica' },
  { id: 53, name: 'Suspense' },
];

export const SEED_MOVIES: MovieSummary[] = [
  {
    tmdbId: 27205,
    title: 'A Origem',
    originalTitle: 'Inception',
    overview: 'Um ladrão que invade sonhos recebe a tarefa inversa de plantar uma ideia na mente de um herdeiro.',
    posterPath: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    backdropPath: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
    voteAverage: 8.4,
    voteCount: 36000,
    releaseYear: 2010,
    genreIds: [28, 878, 12],
    originalLanguage: 'en',
    runtime: 148,
  },
  {
    tmdbId: 496243,
    title: 'Parasita',
    originalTitle: 'Gisaengchung',
    overview: 'Uma família desempregada se infiltra gradualmente na rotina de uma família rica em Seul.',
    posterPath: '/igw938inb6Fy0YVcwIyxQ7Lu5FO.jpg',
    backdropPath: '/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
    voteAverage: 8.5,
    voteCount: 18000,
    releaseYear: 2019,
    genreIds: [35, 53, 18],
    originalLanguage: 'ko',
    runtime: 132,
  },
  {
    tmdbId: 157336,
    title: 'Interestelar',
    originalTitle: 'Interstellar',
    overview: 'Exploradores atravessam um buraco de minhoca em busca de um novo lar para a humanidade.',
    posterPath: '/nCbkOyOMTEwlEV0LtCOvCnwEONA.jpg',
    backdropPath: '/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
    voteAverage: 8.4,
    voteCount: 35000,
    releaseYear: 2014,
    genreIds: [12, 18, 878],
    originalLanguage: 'en',
    runtime: 169,
  },
  {
    tmdbId: 598,
    title: 'Cidade de Deus',
    originalTitle: 'Cidade de Deus',
    overview: 'A ascensão do crime organizado em uma comunidade do Rio de Janeiro sob o olhar de um jovem fotógrafo.',
    posterPath: '/gfnXixcGC060khG6gkOTAQz3r0P.jpg',
    backdropPath: '/uPYa165sraN2c8gZBM9C47g3JoU.jpg',
    voteAverage: 8.4,
    voteCount: 7300,
    releaseYear: 2002,
    genreIds: [18, 80],
    originalLanguage: 'pt',
    runtime: 130,
  },
  {
    tmdbId: 38,
    title: 'Brilho Eterno de uma Mente sem Lembranças',
    originalTitle: 'Eternal Sunshine of the Spotless Mind',
    overview: 'Após um término doloroso, um casal recorre a um procedimento para apagar as memórias um do outro.',
    posterPath: '/5MwkWH9tYHv3mV9OdYTMR5qreIz.jpg',
    backdropPath: '/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
    voteAverage: 8.1,
    voteCount: 14800,
    releaseYear: 2004,
    genreIds: [878, 18, 10749],
    originalLanguage: 'en',
    runtime: 108,
  },
  {
    tmdbId: 129,
    title: 'A Viagem de Chihiro',
    originalTitle: 'Sen to Chihiro no Kamikakushi',
    overview: 'Uma garota entra em um mundo mágico governado por espíritos e precisa salvar seus pais.',
    posterPath: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    backdropPath: '/mSDsSDwaP3E7dEfUPWy4J0djt4O.jpg',
    voteAverage: 8.5,
    voteCount: 16400,
    releaseYear: 2001,
    genreIds: [16, 10751, 14],
    originalLanguage: 'ja',
    runtime: 125,
  },
  {
    tmdbId: 120467,
    title: 'O Grande Hotel Budapeste',
    originalTitle: 'The Grand Budapest Hotel',
    overview: 'As aventuras de um lendário concierge e seu jovem ajudante durante o roubo de uma pintura renascentista.',
    posterPath: '/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
    backdropPath: '/nX5XotM9yprCKarRH4fzOq1VM1J.jpg',
    voteAverage: 8.0,
    voteCount: 14900,
    releaseYear: 2014,
    genreIds: [35, 18],
    originalLanguage: 'en',
    runtime: 100,
  },
  {
    tmdbId: 313369,
    title: 'La La Land: Cantando Estações',
    originalTitle: 'La La Land',
    overview: 'Um pianista de jazz e uma aspirante a atriz se apaixonam enquanto tentam realizar seus sonhos em Los Angeles.',
    posterPath: '/uDO8zWDhfWwoFdKS4fzkUJt0Rf0.jpg',
    backdropPath: '/nadTlnTE6DdgmYsN4iWc2a2wiaI.jpg',
    voteAverage: 7.9,
    voteCount: 16800,
    releaseYear: 2016,
    genreIds: [35, 18, 10749, 10402],
    originalLanguage: 'en',
    runtime: 128,
  },
  {
    tmdbId: 546554,
    title: 'Entre Facas e Segredos',
    originalTitle: 'Knives Out',
    overview: 'Um detetive excêntrico investiga a morte misteriosa do patriarca de uma família excêntrica.',
    posterPath: '/pThyQovXQrw2m0s9x82twj48Jq4.jpg',
    backdropPath: '/4HWAQu28e2yaWrtupFPGFkdNU7V.jpg',
    voteAverage: 7.8,
    voteCount: 12300,
    releaseYear: 2019,
    genreIds: [35, 80, 9648],
    originalLanguage: 'en',
    runtime: 130,
  },
  {
    tmdbId: 244786,
    title: 'Whiplash: Em Busca da Perfeição',
    originalTitle: 'Whiplash',
    overview: 'Um jovem baterista enfrenta os métodos extremos de um maestro obcecado pela perfeição.',
    posterPath: '/7fn624j5lj3xTme2SgiLCeuedmO.jpg',
    backdropPath: '/fRGxZuo7jJUWQsVg9PREb98Aclp.jpg',
    voteAverage: 8.4,
    voteCount: 15000,
    releaseYear: 2014,
    genreIds: [18, 10402],
    originalLanguage: 'en',
    runtime: 107,
  },
  {
    tmdbId: 329865,
    title: 'A Chegada',
    originalTitle: 'Arrival',
    overview: 'Uma linguista é recrutada para decifrar a comunicação de naves alienígenas que pousaram na Terra.',
    posterPath: '/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg',
    backdropPath: '/yIZ1xendyqKvY3FGeeUYUd5X9Mm.jpg',
    voteAverage: 7.6,
    voteCount: 17600,
    releaseYear: 2016,
    genreIds: [18, 878, 9648],
    originalLanguage: 'en',
    runtime: 116,
  },
  {
    tmdbId: 666277,
    title: 'Vidas Passadas',
    originalTitle: 'Past Lives',
    overview: 'Dois amigos de infância de Seul se reencontram duas décadas depois em Nova York.',
    posterPath: '/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg',
    backdropPath: '/7fN5kc5h2C4zP3fP7k5p1s6m2wQ.jpg',
    voteAverage: 7.8,
    voteCount: 1900,
    releaseYear: 2023,
    genreIds: [18, 10749],
    originalLanguage: 'en',
    runtime: 106,
  },
  {
    tmdbId: 2757,
    title: 'Adaptação',
    originalTitle: 'Adaptation.',
    overview: 'Um roteirista em crise criativa tenta adaptar um livro sobre orquídeas enquanto lida com seu irmão gêmeo.',
    posterPath: '/s2s421kG2M91u5y7K8S4n9D0P9r.jpg',
    backdropPath: '/r5c48kF7xH3l7M5l7Y2r3u4k5m6.jpg',
    voteAverage: 7.4,
    voteCount: 2500,
    releaseYear: 2002,
    genreIds: [35, 80, 18],
    originalLanguage: 'en',
    runtime: 115,
  },
  {
    tmdbId: 76,
    title: 'Antes do Amanhecer',
    originalTitle: 'Before Sunrise',
    overview: 'Um jovem americano e uma estudante francesa se conhecem em um trem e passam uma noite inesquecível em Viena.',
    posterPath: '/kf1Jb1c2JAOqjuzA3H4oDM263uB.jpg',
    backdropPath: '/qA2Jm6y0F7x2s4p8k9n3v1b2m5k.jpg',
    voteAverage: 8.0,
    voteCount: 4200,
    releaseYear: 1995,
    genreIds: [18, 10749],
    originalLanguage: 'en',
    runtime: 101,
  },
  {
    tmdbId: 545611,
    title: 'Tudo em Todo o Lugar ao Mesmo Tempo',
    originalTitle: 'Everything Everywhere All at Once',
    overview: 'Uma imigrante chinesa descobre que precisa conectar versões de si mesma em universos paralelos para salvar a família.',
    posterPath: '/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
    backdropPath: '/fIwiFha3WPu5nHkBePA4GzplP3A.jpg',
    voteAverage: 7.8,
    voteCount: 6400,
    releaseYear: 2022,
    genreIds: [28, 12, 878],
    originalLanguage: 'en',
    runtime: 139,
  },
  {
    tmdbId: 40096,
    title: 'O Auto da Compadecida',
    originalTitle: 'O Auto da Compadecida',
    overview: 'As aventuras de João Grilo e Chicó tentando sobreviver com astúcia no sertão nordestino.',
    posterPath: '/imcOp1kJsCsAFCoAgY5OnPaLDnj.jpg',
    backdropPath: '/alQqTpmEkxSLgajfEYTsTH6nAKB.jpg',
    voteAverage: 8.4,
    voteCount: 1100,
    releaseYear: 2000,
    genreIds: [12, 35, 18, 14],
    originalLanguage: 'pt',
    runtime: 104,
  },
  {
    tmdbId: 419430,
    title: 'Corra!',
    originalTitle: 'Get Out',
    overview: 'Um jovem fotógrafo descobre um segredo perturbador ao conhecer a família de sua namorada.',
    posterPath: '/tFXcEccSQMf3lfhfXKSU9iRBpa3.jpg',
    backdropPath: '/o8dPH0ZJpAgXmP5E7D2h3J2v6xL.jpg',
    voteAverage: 7.6,
    voteCount: 17300,
    releaseYear: 2017,
    genreIds: [9648, 53, 27],
    originalLanguage: 'en',
    runtime: 104,
  },
  {
    tmdbId: 76341,
    title: 'Mad Max: Estrada da Fúria',
    originalTitle: 'Mad Max: Fury Road',
    overview: 'Em um deserto pós-apocalíptico, uma rebelde e um andarilho lideram uma fuga alucinante contra um tirano.',
    posterPath: '/hA2ple9q4qnwxp3hKVNhroipsir.jpg',
    backdropPath: '/nlCHUWjY9XWbuEUQauCBgnY8ymF.jpg',
    voteAverage: 7.6,
    voteCount: 22400,
    releaseYear: 2015,
    genreIds: [28, 12, 878],
    originalLanguage: 'en',
    runtime: 120,
  },
  {
    tmdbId: 666,
    title: 'Central do Brasil',
    originalTitle: 'Central do Brasil',
    overview: 'Uma ex-professora escreve cartas na estação Central do Brasil e embarca em uma jornada com um menino à procura do pai.',
    posterPath: '/f6yW7D4X3R2b8n5k4j9p7s2m3v1.jpg',
    backdropPath: '/x9k2v5p3m8n4b7c1q6w3e8r2t5y.jpg',
    voteAverage: 8.1,
    voteCount: 950,
    releaseYear: 1998,
    genreIds: [18],
    originalLanguage: 'pt',
    runtime: 113,
  },
  {
    tmdbId: 324857,
    title: 'Homem-Aranha no Aranhaverso',
    originalTitle: 'Spider-Man: Into the Spider-Verse',
    overview: 'O adolescente Miles Morales ganha poderes e encontra versões do Homem-Aranha de outras dimensões.',
    posterPath: '/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
    backdropPath: '/7d6EY00g1c39SGZOoCJ5Py9nNth.jpg',
    voteAverage: 8.4,
    voteCount: 15500,
    releaseYear: 2018,
    genreIds: [16, 28, 12, 878],
    originalLanguage: 'en',
    runtime: 117,
  },
  {
    tmdbId: 497,
    title: 'À Espera de um Milagre',
    originalTitle: 'The Green Mile',
    overview: 'Um guarda penitenciário descobre que um detento no corredor da morte possui um dom extraordinário.',
    posterPath: '/8VG8fDNiy50H4FedGwdSVUPoaJe.jpg',
    backdropPath: '/l6hQWH9eDksNJNiXWYRkWqikOdu.jpg',
    voteAverage: 8.5,
    voteCount: 17300,
    releaseYear: 1999,
    genreIds: [14, 18, 80],
    originalLanguage: 'en',
    runtime: 189,
  },
  {
    tmdbId: 194,
    title: 'O Fabuloso Destino de Amélie Poulain',
    originalTitle: "Le Fabuleux Destin d'Amélie Poulain",
    overview: 'Uma jovem garçonete parisiense decide transformar discretamente a vida das pessoas ao seu redor.',
    posterPath: '/nSxDa3M9aMvGVLoItzWTepQ5h5d.jpg',
    backdropPath: '/5q2n9p8x3k7v1m4b6c2r5t8w1y9.jpg',
    voteAverage: 7.9,
    voteCount: 11400,
    releaseYear: 2001,
    genreIds: [35, 10749],
    originalLanguage: 'fr',
    runtime: 122,
  },
  {
    tmdbId: 872585,
    title: 'Oppenheimer',
    originalTitle: 'Oppenheimer',
    overview: 'A trajetória do físico J. Robert Oppenheimer à frente do Projeto Manhattan durante a Segunda Guerra.',
    posterPath: '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdropPath: '/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
    voteAverage: 8.1,
    voteCount: 9100,
    releaseYear: 2023,
    genreIds: [18, 36],
    originalLanguage: 'en',
    runtime: 181,
  },
  {
    tmdbId: 11216,
    title: 'Cinema Paradiso',
    originalTitle: 'Nuovo Cinema Paradiso',
    overview: 'Um cineasta recorda sua infância em uma pequena vila italiana e a amizade com o projecionista local.',
    posterPath: '/8SRUfRUi6x4O68n0VCbDNRa6iGL.jpg',
    backdropPath: '/g6h8j9k2l4m5n6b7v8c9x1z2a3s.jpg',
    voteAverage: 8.5,
    voteCount: 4300,
    releaseYear: 1988,
    genreIds: [18, 10749],
    originalLanguage: 'it',
    runtime: 124,
  },
];

export class SeedCatalogProvider implements CatalogProvider {
  readonly source = 'seed' as const;
  private readonly movies: MovieSummary[];
  private readonly pageSize: number;

  constructor(movies: MovieSummary[] = SEED_MOVIES, pageSize = 12) {
    this.movies = movies;
    this.pageSize = pageSize;
  }

  async fetchPage(filters: FilterCriteria, page: number): Promise<CatalogPageResult> {
    const filtered = this.movies.filter((movie) => {
      if (filters.genreIds.length > 0) {
        const hasGenre = filters.genreIds.some((gid) => movie.genreIds.includes(gid));
        if (!hasGenre) return false;
      }
      if (filters.yearFrom !== undefined && (movie.releaseYear ?? 0) < filters.yearFrom) {
        return false;
      }
      if (filters.yearTo !== undefined && (movie.releaseYear ?? 9999) > filters.yearTo) {
        return false;
      }
      if (filters.maxVoteCount !== undefined && movie.voteCount > filters.maxVoteCount) {
        return false;
      }
      if (filters.minRating !== undefined && movie.voteAverage < filters.minRating) {
        return false;
      }
      if (filters.originalLanguage && movie.originalLanguage !== filters.originalLanguage) {
        return false;
      }
      if (filters.minRuntime !== undefined && movie.runtime != null && movie.runtime < filters.minRuntime) {
        return false;
      }
      if (filters.maxRuntime !== undefined && movie.runtime != null && movie.runtime > filters.maxRuntime) {
        return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (filters.sortBy === 'vote_average.desc') return b.voteAverage - a.voteAverage;
      if (filters.sortBy === 'primary_release_date.desc') {
        return (b.releaseYear ?? 0) - (a.releaseYear ?? 0);
      }
      return b.voteCount - a.voteCount;
    });

    const start = (page - 1) * this.pageSize;
    const slice = sorted.slice(start, start + this.pageSize);
    return {
      movies: slice,
      page,
      hasMore: start + this.pageSize < sorted.length,
    };
  }

  async getMovieDetails(tmdbId: number): Promise<MovieDetails | null> {
    const movie = this.movies.find((m) => m.tmdbId === tmdbId);
    if (!movie) return null;

    const genreMap = new Map(FALLBACK_GENRES_PT.map((g) => [g.id, g.name]));
    return {
      ...movie,
      runtime: movie.runtime ?? null,
      genres: movie.genreIds.map((id) => ({
        id,
        name: genreMap.get(id) ?? `Gênero #${id}`,
      })),
      watchProvidersBR: {
        link: null,
        available: false,
        providers: [],
      },
      fetchedAt: new Date().toISOString(),
    };
  }

  async getWatchProvidersBR(): Promise<WatchProviderOption[]> {
    return FALLBACK_WATCH_PROVIDERS_BR;
  }

  async getGenres(): Promise<Genre[]> {
    return FALLBACK_GENRES_PT;
  }

  async searchMovies(query: string, page = 1): Promise<CatalogPageResult> {
    const needle = query.trim().toLowerCase();
    const matched = this.movies.filter(
      (m) =>
        m.title.toLowerCase().includes(needle) ||
        m.originalTitle.toLowerCase().includes(needle),
    );
    const start = (page - 1) * this.pageSize;
    return {
      movies: matched.slice(start, start + this.pageSize),
      page,
      hasMore: start + this.pageSize < matched.length,
    };
  }
}
