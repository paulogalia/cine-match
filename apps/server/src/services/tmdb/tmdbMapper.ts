import type {
  CastMember,
  DirectorCredit,
  MovieDetails,
  MovieSummary,
  MovieTrailer,
  PersonRole,
  PersonSearchResult,
  WatchProvider,
} from '@cine-match/shared';

export interface TmdbRawMovieItem {
  id: number;
  title?: string | null;
  original_title?: string | null;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number | null;
  vote_count?: number | null;
  release_date?: string | null;
  genre_ids?: number[] | null;
  original_language?: string | null;
  popularity?: number | null;
  job?: string | null;
  character?: string | null;
}

export interface TmdbRawProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

export interface TmdbRawRegionProviders {
  link?: string | null;
  flatrate?: TmdbRawProviderEntry[];
  rent?: TmdbRawProviderEntry[];
  buy?: TmdbRawProviderEntry[];
}

export interface TmdbRawVideoItem {
  key?: string | null;
  name?: string | null;
  site?: string | null;
  type?: string | null;
  official?: boolean | null;
  iso_639_1?: string | null;
}

export interface TmdbRawCastItem {
  id: number;
  name?: string | null;
  character?: string | null;
  profile_path?: string | null;
  order?: number | null;
}

export interface TmdbRawCrewItem {
  id: number;
  name?: string | null;
  job?: string | null;
  department?: string | null;
  profile_path?: string | null;
}

export interface TmdbRawMovieDetail extends TmdbRawMovieItem {
  runtime?: number | null;
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    cast?: TmdbRawCastItem[];
    crew?: TmdbRawCrewItem[];
  };
  videos?: {
    results?: TmdbRawVideoItem[];
  };
  'watch/providers'?: {
    results?: Record<string, TmdbRawRegionProviders | undefined>;
  };
  translations?: {
    translations?: Array<{
      iso_3166_1?: string | null;
      iso_639_1?: string | null;
      data?: {
        title?: string | null;
      } | null;
    }>;
  };
}

export interface TmdbRawPersonItem {
  id: number;
  name?: string | null;
  profile_path?: string | null;
  known_for_department?: string | null;
  popularity?: number | null;
  known_for?: Array<{
    title?: string | null;
    name?: string | null;
    original_title?: string | null;
  }>;
}

export interface TmdbRawPersonCreditsResponse {
  cast?: TmdbRawMovieItem[];
  crew?: TmdbRawMovieItem[];
}

function parseReleaseYear(releaseDate?: string | null): number | null {
  if (!releaseDate || releaseDate.length < 4) return null;
  const year = Number(releaseDate.slice(0, 4));
  return Number.isInteger(year) && year >= 1880 && year <= 2100 ? year : null;
}

export function mapTmdbMovieSummary(
  raw: TmdbRawMovieItem,
  englishTitleOverride?: string | null,
): MovieSummary {
  const originalTitle = (raw.original_title ?? raw.title ?? 'Sem título').trim() || 'Sem título';
  const localizedTitle = (raw.title ?? '').trim();
  const originalLanguage = (raw.original_language ?? 'en').trim() || 'en';
  const resolvedEnglishTitle =
    (englishTitleOverride ?? '').trim() ||
    (originalLanguage === 'en' ? originalTitle : undefined);

  return {
    tmdbId: raw.id,
    title: localizedTitle || originalTitle,
    ...(resolvedEnglishTitle ? { englishTitle: resolvedEnglishTitle } : {}),
    originalTitle,
    overview: (raw.overview ?? '').trim(),
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    voteAverage: Number((raw.vote_average ?? 0).toFixed(1)),
    voteCount: Math.max(0, Math.round(raw.vote_count ?? 0)),
    releaseYear: parseReleaseYear(raw.release_date),
    genreIds: Array.isArray(raw.genre_ids) ? raw.genre_ids : [],
    originalLanguage,
  };
}

export function normalizeTmdbMovieList(
  items: TmdbRawMovieItem[],
  enTitleById?: ReadonlyMap<number, string>,
): MovieSummary[] {
  const seen = new Set<number>();
  const withPoster: MovieSummary[] = [];
  const withoutPoster: MovieSummary[] = [];

  for (const item of items) {
    if (!Number.isInteger(item.id) || item.id <= 0 || seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    const mapped = mapTmdbMovieSummary(item, enTitleById?.get(item.id));
    if (mapped.posterPath) {
      withPoster.push(mapped);
    } else {
      withoutPoster.push(mapped);
    }
  }

  return withPoster.length > 0 ? withPoster : withoutPoster;
}

function pickBestTrailer(videos?: TmdbRawVideoItem[]): MovieTrailer | null {
  if (!Array.isArray(videos) || videos.length === 0) return null;

  const youtubeOnly = videos.filter(
    (v) => v.site === 'YouTube' && Boolean(v.key) && (v.type === 'Trailer' || v.type === 'Teaser'),
  );
  if (youtubeOnly.length === 0) return null;

  const scoreVideo = (v: TmdbRawVideoItem): number => {
    let score = 0;
    if (v.type === 'Trailer') score += 40;
    if (v.official) score += 20;
    if (v.iso_639_1 === 'pt') score += 30;
    else if (v.iso_639_1 === 'en') score += 15;
    return score;
  };

  const sorted = [...youtubeOnly].sort((a, b) => scoreVideo(b) - scoreVideo(a));
  const best = sorted[0];
  if (!best?.key) return null;

  return {
    key: best.key,
    name: (best.name ?? 'Trailer oficial').trim() || 'Trailer oficial',
    site: 'YouTube',
    type: best.type ?? 'Trailer',
    language: best.iso_639_1 ?? 'en',
  };
}

function pickEnglishTranslationTitle(raw: TmdbRawMovieDetail): string | undefined {
  const list = raw.translations?.translations ?? [];
  const us = list.find(
    (t) => t.iso_639_1 === 'en' && t.iso_3166_1 === 'US' && Boolean(t.data?.title?.trim()),
  );
  if (us?.data?.title) return us.data.title.trim();

  const anyEn = list.find((t) => t.iso_639_1 === 'en' && Boolean(t.data?.title?.trim()));
  return anyEn?.data?.title?.trim() || undefined;
}

export function mapTmdbMovieDetails(raw: TmdbRawMovieDetail): MovieDetails {
  const summary = mapTmdbMovieSummary(
    {
      ...raw,
      genre_ids: raw.genres?.map((g) => g.id) ?? raw.genre_ids ?? [],
    },
    pickEnglishTranslationTitle(raw),
  );

  const brProviders = raw['watch/providers']?.results?.['BR'];
  const providers: WatchProvider[] = [];
  const seenKeys = new Set<string>();

  const appendGroup = (
    list: TmdbRawProviderEntry[] | undefined,
    type: WatchProvider['type'],
  ) => {
    if (!Array.isArray(list)) return;
    for (const p of list) {
      const key = `${p.provider_id}:${type}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      providers.push({
        providerId: p.provider_id,
        name: p.provider_name,
        logoPath: p.logo_path ?? null,
        type,
      });
    }
  };

  appendGroup(brProviders?.flatrate, 'flatrate');
  appendGroup(brProviders?.rent, 'rent');
  appendGroup(brProviders?.buy, 'buy');

  // Diretores (estritamente job === 'Director')
  const seenDirectorIds = new Set<number>();
  const directors: DirectorCredit[] = [];
  for (const member of raw.credits?.crew ?? []) {
    if (member.job !== 'Director' || !member.name || seenDirectorIds.has(member.id)) {
      continue;
    }
    seenDirectorIds.add(member.id);
    directors.push({
      id: member.id,
      name: member.name.trim(),
      profilePath: member.profile_path ?? null,
    });
  }

  // Elenco principal (top 8 ordenado por créditos)
  const cast: CastMember[] = [...(raw.credits?.cast ?? [])]
    .filter((c) => Number.isInteger(c.id) && c.id > 0 && Boolean(c.name))
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      name: c.name!.trim(),
      character: (c.character ?? '').trim(),
      profilePath: c.profile_path ?? null,
    }));

  return {
    ...summary,
    runtime: typeof raw.runtime === 'number' && raw.runtime > 0 ? raw.runtime : null,
    genres: Array.isArray(raw.genres) ? raw.genres : [],
    directors,
    cast,
    trailer: pickBestTrailer(raw.videos?.results),
    watchProvidersBR: {
      link: brProviders?.link ?? null,
      available: providers.length > 0,
      providers,
    },
    fetchedAt: new Date().toISOString(),
  };
}

export function mapTmdbPersonSearchList(
  items: TmdbRawPersonItem[],
  preferredRole?: PersonRole,
): PersonSearchResult[] {
  const preferredDept =
    preferredRole === 'director'
      ? 'Directing'
      : preferredRole === 'actor'
        ? 'Acting'
        : null;

  const valid = items.filter((p) => Number.isInteger(p.id) && p.id > 0 && Boolean(p.name));

  const sorted = [...valid].sort((a, b) => {
    const aMatch = preferredDept && a.known_for_department === preferredDept ? 1 : 0;
    const bMatch = preferredDept && b.known_for_department === preferredDept ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });

  return sorted.slice(0, 12).map((p) => ({
    id: p.id,
    name: p.name!.trim(),
    profilePath: p.profile_path ?? null,
    knownForDepartment: p.known_for_department ?? 'Acting',
    knownForTitles: (p.known_for ?? [])
      .map((k) => (k.title ?? k.name ?? k.original_title ?? '').trim())
      .filter(Boolean)
      .slice(0, 3),
  }));
}

export function mapTmdbPersonCredits(
  raw: TmdbRawPersonCreditsResponse,
  role: PersonRole,
  enTitleById?: ReadonlyMap<number, string>,
): MovieSummary[] {
  if (role === 'director') {
    const directed = (raw.crew ?? []).filter((item) => item.job === 'Director');
    const ordered = [...directed].sort(
      (a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0) || (b.popularity ?? 0) - (a.popularity ?? 0),
    );
    return normalizeTmdbMovieList(ordered, enTitleById);
  }

  // Para atores, exclui aparições como "Self / Himself / Herself" em documentários/especiais
  const acted = (raw.cast ?? []).filter((item) => {
    const char = (item.character ?? '').trim().toLowerCase();
    const isSelf =
      char === 'self' ||
      char.startsWith('self ') ||
      char.startsWith('self -') ||
      char === 'himself' ||
      char === 'herself' ||
      char.includes('(archive footage)');
    return !isSelf;
  });

  const pool = acted.length > 0 ? acted : (raw.cast ?? []);
  const ordered = [...pool].sort(
    (a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0) || (b.popularity ?? 0) - (a.popularity ?? 0),
  );
  return normalizeTmdbMovieList(ordered, enTitleById);
}