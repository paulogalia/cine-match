import type { MovieSummary, TitleLanguage } from '@cine-match/shared';

export interface ResolvedMovieTitle {
  primary: string;
  secondary: string | null;
}

function normalizeCompare(value?: string | null): string {
  return (value ?? '').trim().toLowerCase();
}

export function resolveMovieTitle(
  movie: Pick<MovieSummary, 'title' | 'englishTitle' | 'originalTitle'>,
  language: TitleLanguage,
): ResolvedMovieTitle {
  const pt = movie.title.trim();
  const en = movie.englishTitle?.trim() || '';
  const orig = movie.originalTitle.trim();

  if (language === 'en-US') {
    const primary = en || orig || pt;
    const secondary =
      normalizeCompare(pt) !== normalizeCompare(primary)
        ? pt
        : normalizeCompare(orig) !== normalizeCompare(primary)
          ? orig
          : null;
    return { primary, secondary };
  }

  if (language === 'original') {
    const primary = orig || pt;
    const secondary =
      normalizeCompare(pt) !== normalizeCompare(primary)
        ? pt
        : en && normalizeCompare(en) !== normalizeCompare(primary)
          ? en
          : null;
    return { primary, secondary };
  }

  // Padrão: pt-BR
  const primary = pt || orig;
  const secondary =
    en && normalizeCompare(en) !== normalizeCompare(primary)
      ? en
      : normalizeCompare(orig) !== normalizeCompare(primary)
        ? orig
        : null;

  return { primary, secondary };
}

export const TITLE_LANGUAGE_LABELS: Record<TitleLanguage, string> = {
  'pt-BR': 'Português (BR)',
  'en-US': 'Inglês (US)',
  original: 'Original',
};