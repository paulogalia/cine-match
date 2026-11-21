const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function getPosterUrl(
  posterPath: string | null | undefined,
  size: 'w342' | 'w500' | 'w780' = 'w500',
): string | null {
  if (!posterPath) return null;
  if (posterPath.startsWith('http://') || posterPath.startsWith('https://')) {
    return posterPath;
  }
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
}

export function getBackdropUrl(
  backdropPath: string | null | undefined,
  size: 'w780' | 'w1280' = 'w780',
): string | null {
  if (!backdropPath) return null;
  if (backdropPath.startsWith('http://') || backdropPath.startsWith('https://')) {
    return backdropPath;
  }
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
}

export function getProviderLogoUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath) return null;
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) {
    return logoPath;
  }
  return `${TMDB_IMAGE_BASE}/w92${logoPath}`;
}

export function formatRuntime(minutes?: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function formatLanguageLabel(code: string): string {
  const map: Record<string, string> = {
    en: 'Inglês',
    pt: 'Português',
    es: 'Espanhol',
    ko: 'Coreano',
    ja: 'Japonês',
    fr: 'Francês',
    it: 'Italiano',
    de: 'Alemão',
  };
  return map[code.toLowerCase()] ?? code.toUpperCase();
}
