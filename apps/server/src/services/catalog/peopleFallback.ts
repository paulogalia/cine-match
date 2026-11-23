import type {
  CastMember,
  DirectorCredit,
  PersonRole,
  PersonSearchResult,
} from '@cine-match/shared';

export interface CuratedPerson extends PersonSearchResult {
  role: PersonRole;
  seedMovieIds: number[];
}

export const CURATED_DIRECTORS: CuratedPerson[] = [
  {
    id: 525,
    name: 'Christopher Nolan',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['A Origem', 'Interestelar', 'Oppenheimer'],
    role: 'director',
    seedMovieIds: [27205, 157336, 872585],
  },
  {
    id: 21684,
    name: 'Bong Joon-ho',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['Parasita', 'Memórias de um Assassino'],
    role: 'director',
    seedMovieIds: [496243],
  },
  {
    id: 138,
    name: 'Quentin Tarantino',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['Pulp Fiction', 'Bastardos Inglórios', 'Django Livre'],
    role: 'director',
    seedMovieIds: [],
  },
  {
    id: 1032,
    name: 'Martin Scorsese',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['Os Bons Companheiros', 'Os Infiltrados', 'Táxi Driver'],
    role: 'director',
    seedMovieIds: [],
  },
  {
    id: 137427,
    name: 'Denis Villeneuve',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['A Chegada', 'Duna', 'Blade Runner 2049'],
    role: 'director',
    seedMovieIds: [329865],
  },
  {
    id: 608,
    name: 'Hayao Miyazaki',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['A Viagem de Chihiro', 'O Menino e a Garça'],
    role: 'director',
    seedMovieIds: [129],
  },
  {
    id: 5655,
    name: 'Wes Anderson',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['O Grande Hotel Budapeste', 'Moonrise Kingdom'],
    role: 'director',
    seedMovieIds: [120467],
  },
  {
    id: 136495,
    name: 'Damien Chazelle',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['La La Land', 'Whiplash'],
    role: 'director',
    seedMovieIds: [313369, 244786],
  },
  {
    id: 8557,
    name: 'Fernando Meirelles',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['Cidade de Deus', 'Dois Papas'],
    role: 'director',
    seedMovieIds: [598],
  },
  {
    id: 8564,
    name: 'Walter Salles',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['Ainda Estou Aqui', 'Central do Brasil'],
    role: 'director',
    seedMovieIds: [666],
  },
  {
    id: 1033357,
    name: 'Kleber Mendonça Filho',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['Bacurau', 'Aquarius', 'O Agente Secreto'],
    role: 'director',
    seedMovieIds: [],
  },
  {
    id: 5953,
    name: 'Spike Jonze',
    profilePath: null,
    knownForDepartment: 'Directing',
    knownForTitles: ['Adaptação', 'Ela', 'Quero Ser John Malkovich'],
    role: 'director',
    seedMovieIds: [2757],
  },
];

export const CURATED_ACTORS: CuratedPerson[] = [
  {
    id: 6193,
    name: 'Leonardo DiCaprio',
    profilePath: null,
    knownForDepartment: 'Acting',
    knownForTitles: ['A Origem', 'Os Infiltrados', 'O Lobo de Wall Street'],
    role: 'actor',
    seedMovieIds: [27205],
  },
  {
    id: 54693,
    name: 'Emma Stone',
    profilePath: null,
    knownForDepartment: 'Acting',
    knownForTitles: ['La La Land', 'Pobres Criaturas', 'A Favorita'],
    role: 'actor',
    seedMovieIds: [313369],
  },
  {
    id: 8602,
    name: 'Fernanda Torres',
    profilePath: null,
    knownForDepartment: 'Acting',
    knownForTitles: ['Ainda Estou Aqui', 'Saneamento Básico'],
    role: 'actor',
    seedMovieIds: [],
  },
  {
    id: 52583,
    name: 'Wagner Moura',
    profilePath: null,
    knownForDepartment: 'Acting',
    knownForTitles: ['O Agente Secreto', 'Tropa de Elite', 'Guerra Civil'],
    role: 'actor',
    seedMovieIds: [],
  },
  {
    id: 20738,
    name: 'Song Kang-ho',
    profilePath: null,
    knownForDepartment: 'Acting',
    knownForTitles: ['Parasita', 'Memórias de um Assassino'],
    role: 'actor',
    seedMovieIds: [496243],
  },
  {
    id: 2037,
    name: 'Cillian Murphy',
    profilePath: null,
    knownForDepartment: 'Acting',
    knownForTitles: ['Oppenheimer', 'A Origem'],
    role: 'actor',
    seedMovieIds: [872585, 27205],
  },
  {
    id: 30614,
    name: 'Ryan Gosling',
    profilePath: null,
    knownForDepartment: 'Acting',
    knownForTitles: ['La La Land', 'Drive', 'Blade Runner 2049'],
    role: 'actor',
    seedMovieIds: [313369],
  },
  {
    id: 206,
    name: 'Jim Carrey',
    profilePath: null,
    knownForDepartment: 'Acting',
    knownForTitles: ['Brilho Eterno de uma Mente sem Lembranças', 'O Show de Truman'],
    role: 'actor',
    seedMovieIds: [38],
  },
  {
    id: 5064,
    name: 'Meryl Streep',
    profilePath: null,
    knownForDepartment: 'Acting',
    knownForTitles: ['Adaptação', 'O Diabo Veste Prada'],
    role: 'actor',
    seedMovieIds: [2757],
  },
  {
    id: 8596,
    name: 'Fernanda Montenegro',
    profilePath: null,
    knownForDepartment: 'Acting',
    knownForTitles: ['Central do Brasil', 'O Auto da Compadecida'],
    role: 'actor',
    seedMovieIds: [666, 40096],
  },
];

export function getSuggestedPeople(role?: PersonRole): PersonSearchResult[] {
  const list =
    role === 'director'
      ? CURATED_DIRECTORS
      : role === 'actor'
        ? CURATED_ACTORS
        : [...CURATED_DIRECTORS.slice(0, 6), ...CURATED_ACTORS.slice(0, 6)];

  return list.map(({ role: _r, seedMovieIds: _s, ...rest }) => rest);
}

export function getSeedCreditsForMovie(tmdbId: number): {
  directors: DirectorCredit[];
  cast: CastMember[];
} {
  const directors: DirectorCredit[] = CURATED_DIRECTORS.filter((d) =>
    d.seedMovieIds.includes(tmdbId),
  ).map((d) => ({
    id: d.id,
    name: d.name,
    profilePath: d.profilePath,
  }));

  const cast: CastMember[] = CURATED_ACTORS.filter((a) =>
    a.seedMovieIds.includes(tmdbId),
  ).map((a) => ({
    id: a.id,
    name: a.name,
    character: 'Elenco principal',
    profilePath: a.profilePath,
  }));

  return { directors, cast };
}
