import type {
  CatalogStatus,
  Genre,
  MovieDetails,
  NetworkInfoResponse,
  SessionHistoryEntry,
  WatchProviderOption,
} from '@cine-match/shared';

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
