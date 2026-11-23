import type { FilterCriteria, MovieSummary } from '@cine-match/shared';
import type { CatalogPageResult, CatalogProvider } from './catalogProvider';
import { filterOscarEntries } from './oscarCatalog';

function dedupeById(movies: MovieSummary[]): MovieSummary[] {
  const map = new Map<number, MovieSummary>();
  for (const m of movies) {
    if (!map.has(m.tmdbId)) {
      map.set(m.tmdbId, m);
    }
  }
  return Array.from(map.values());
}

export async function fetchPeopleCatalogPage(
  filters: FilterCriteria,
  page: number,
  catalogProvider: CatalogProvider,
  pageSize = 12,
): Promise<CatalogPageResult> {
  const directors = filters.directors ?? [];
  const actors = filters.actors ?? [];

  const [directorLists, actorLists] = await Promise.all([
    Promise.all(directors.map((d) => catalogProvider.getPersonMovies(d.id, 'director'))),
    Promise.all(actors.map((a) => catalogProvider.getPersonMovies(a.id, 'actor'))),
  ]);

  const directorMovies = dedupeById(directorLists.flat());
  const actorMovies = dedupeById(actorLists.flat());

  let combined: MovieSummary[];
  if (directors.length > 0 && actors.length > 0) {
    // Quando ambos são selecionados (ex: Scorsese + DiCaprio), busca a interseção (colaborações)
    const actorIds = new Set(actorMovies.map((m) => m.tmdbId));
    combined = directorMovies.filter((m) => actorIds.has(m.tmdbId));
  } else if (directors.length > 0) {
    combined = directorMovies;
  } else {
    combined = actorMovies;
  }

  // Se o filtro Oscar também estiver ativo, cruza com a lista do Oscar
  let oscarIdSet: Set<number> | null = null;
  if (filters.oscar?.enabled) {
    oscarIdSet = new Set(filterOscarEntries(filters).map((e) => e.tmdbId));
  }

  const filtered = combined.filter((movie) => {
    if (oscarIdSet && !oscarIdSet.has(movie.tmdbId)) {
      return false;
    }
    if (filters.genreIds.length > 0) {
      if (!filters.genreIds.some((gid) => movie.genreIds.includes(gid))) return false;
    }
    if (filters.yearFrom !== undefined && (movie.releaseYear ?? 0) < filters.yearFrom) {
      return false;
    }
    if (filters.yearTo !== undefined && (movie.releaseYear ?? 9999) > filters.yearTo) {
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
    if (filters.sortBy === 'vote_average.desc') {
      return b.voteAverage - a.voteAverage || b.voteCount - a.voteCount;
    }
    if (filters.sortBy === 'primary_release_date.desc') {
      return (b.releaseYear ?? 0) - (a.releaseYear ?? 0);
    }
    return b.voteCount - a.voteCount;
  });

  const start = (page - 1) * pageSize;
  const slice = sorted.slice(start, start + pageSize);
  const hasMore = start + pageSize < sorted.length;

  return {
    movies: slice,
    page,
    hasMore,
  };
}
