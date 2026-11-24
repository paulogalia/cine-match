import type {
  CatalogStatus,
  Genre,
  MovieDetails,
  NetworkInfoResponse,
  PersonRole,
  PersonSearchResult,
  ProfileUpdatePayload,
  SessionHistoryEntry,
  UserProfile,
  WatchedMovieEntry,
  WatchProviderOption,
} from '@cine-match/shared';

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchNetworkInfo(): Promise<NetworkInfoResponse | null> {
  try {
    const res = await fetch('/api/network-info');
    if (!res.ok) return null;
    return (await res.json()) as NetworkInfoResponse;
  } catch {
    return null;
  }
}

export async function fetchCatalogStatus(): Promise<CatalogStatus | null> {
  try {
    const res = await fetch('/api/catalog-status');
    if (!res.ok) return null;
    return (await res.json()) as CatalogStatus;
  } catch {
    return null;
  }
}

export async function fetchGenres(): Promise<Genre[] | null> {
  try {
    const res = await fetch('/api/genres');
    if (!res.ok) return null;
    const data = (await res.json()) as { genres: Genre[] };
    return data.genres ?? null;
  } catch {
    return null;
  }
}

export async function fetchWatchProviders(): Promise<WatchProviderOption[] | null> {
  try {
    const res = await fetch('/api/watch-providers');
    if (!res.ok) return null;
    const data = (await res.json()) as { providers: WatchProviderOption[] };
    return data.providers ?? null;
  } catch {
    return null;
  }
}

export async function searchPeople(
  query: string,
  role: PersonRole,
): Promise<PersonSearchResult[]> {
  try {
    const params = new URLSearchParams({ role });
    if (query.trim()) params.set('q', query.trim());
    const res = await fetch(`/api/people/search?${params.toString()}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { people: PersonSearchResult[] };
    return data.people ?? [];
  } catch {
    return [];
  }
}

export async function fetchHistory(): Promise<SessionHistoryEntry[]> {
  try {
    const res = await fetch('/api/history', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { history: SessionHistoryEntry[] };
    return data.history ?? [];
  } catch {
    return [];
  }
}

export async function fetchWatchedMovies(): Promise<WatchedMovieEntry[]> {
  try {
    const res = await fetch('/api/watched', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as { watchedMovies: WatchedMovieEntry[] };
    return data.watchedMovies ?? [];
  } catch {
    return [];
  }
}

export async function unmarkWatchedMovie(tmdbId: number): Promise<WatchedMovieEntry[] | null> {
  try {
    const res = await fetch(`/api/watched/${tmdbId}`, { method: 'DELETE' });
    if (!res.ok) return null;
    const data = (await res.json()) as { watchedMovies: WatchedMovieEntry[] };
    return data.watchedMovies ?? [];
  } catch {
    return null;
  }
}

export async function fetchMovieDetails(tmdbId: number): Promise<MovieDetails | null> {
  try {
    const res = await fetch(`/api/movies/${tmdbId}`);
    if (!res.ok) return null;
    return (await res.json()) as MovieDetails;
  } catch {
    return null;
  }
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

// ==================== Perfis & Letterboxd ====================

export async function fetchProfile(profileId: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(profileId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { profile: UserProfile };
    return data.profile ?? null;
  } catch {
    return null;
  }
}

export async function updateProfileApi(
  profileId: string,
  patch: ProfileUpdatePayload,
): Promise<{ profile?: UserProfile; error?: string }> {
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(profileId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      return { error: await readErrorMessage(res, 'Não foi possível salvar o perfil.') };
    }
    const data = (await res.json()) as { profile: UserProfile };
    return { profile: data.profile };
  } catch {
    return { error: 'Falha de conexão ao salvar o perfil.' };
  }
}

export async function recoverProfileApi(
  recoveryCode: string,
): Promise<{ profile?: UserProfile; error?: string }> {
  try {
    const res = await fetch('/api/profiles/recover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recoveryCode }),
    });
    if (!res.ok) {
      return { error: await readErrorMessage(res, 'Código de recuperação não encontrado.') };
    }
    const data = (await res.json()) as { profile: UserProfile };
    return { profile: data.profile };
  } catch {
    return { error: 'Falha de conexão ao recuperar o perfil.' };
  }
}

export async function importLetterboxdCsvApi(
  profileId: string,
  kind: 'watched' | 'watchlist',
  csvText: string,
): Promise<{ profile?: UserProfile; importedCount?: number; error?: string }> {
  try {
    const res = await fetch(`/api/profiles/${encodeURIComponent(profileId)}/letterboxd`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, csvText }),
    });
    if (!res.ok) {
      return { error: await readErrorMessage(res, 'Não foi possível importar o CSV.') };
    }
    const data = (await res.json()) as { profile: UserProfile; importedCount: number };
    return { profile: data.profile, importedCount: data.importedCount };
  } catch {
    return { error: 'Falha de conexão ao enviar o arquivo do Letterboxd.' };
  }
}

export async function clearLetterboxdListApi(
  profileId: string,
  kind: 'watched' | 'watchlist',
): Promise<{ profile?: UserProfile; error?: string }> {
  try {
    const res = await fetch(
      `/api/profiles/${encodeURIComponent(profileId)}/letterboxd/${kind}`,
      { method: 'DELETE' },
    );
    if (!res.ok) {
      return { error: await readErrorMessage(res, 'Não foi possível limpar a lista.') };
    }
    const data = (await res.json()) as { profile: UserProfile };
    return { profile: data.profile };
  } catch {
    return { error: 'Falha de conexão ao limpar a lista.' };
  }
}