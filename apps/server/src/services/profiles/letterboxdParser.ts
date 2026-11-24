import type { MovieSummary } from '@cine-match/shared';

export interface ParsedLetterboxdResult {
  keys: string[];
  movieCount: number;
}

export function normalizeMovieMatchKey(title: string, year?: number | null): string {
  const clean = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .trim();

  if (!clean) return '';
  return year && Number.isInteger(year) ? `${clean}|${year}` : clean;
}

export function getMovieCandidateKeys(movie: MovieSummary): string[] {
  const titles = new Set<string>();
  if (movie.englishTitle) titles.add(movie.englishTitle);
  if (movie.originalTitle) titles.add(movie.originalTitle);
  if (movie.title) titles.add(movie.title);

  const keys = new Set<string>();
  const year = movie.releaseYear;

  for (const title of titles) {
    if (year) {
      const exact = normalizeMovieMatchKey(title, year);
      const prev = normalizeMovieMatchKey(title, year - 1);
      const next = normalizeMovieMatchKey(title, year + 1);
      if (exact) keys.add(exact);
      if (prev) keys.add(prev);
      if (next) keys.add(next);
    } else {
      const noYear = normalizeMovieMatchKey(title, null);
      if (noYear) keys.add(noYear);
    }
  }

  return Array.from(keys);
}

function parseCsvRow(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  cells.push(current.trim());
  return cells;
}

export function parseLetterboxdCsv(csvText: string): ParsedLetterboxdResult {
  const cleaned = csvText.replace(/^\uFEFF/, '');
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { keys: [], movieCount: 0 };
  }

  const header = parseCsvRow(lines[0] ?? '').map((h) => h.toLowerCase());
  const nameIdx = header.findIndex((h) => h === 'name' || h === 'title');
  const yearIdx = header.findIndex((h) => h === 'year');

  if (nameIdx === -1) {
    throw new Error(
      'CSV inválido: coluna "Name" não encontrada. Envie o arquivo watched.csv ou watchlist.csv exportado do Letterboxd.',
    );
  }

  const keySet = new Set<string>();

  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvRow(lines[i] ?? '');
    const rawName = row[nameIdx]?.trim() ?? '';
    if (!rawName) continue;

    const rawYear = yearIdx !== -1 ? Number(row[yearIdx]) : NaN;
    const year = Number.isInteger(rawYear) && rawYear >= 1880 && rawYear <= 2100 ? rawYear : null;

    const key = normalizeMovieMatchKey(rawName, year);
    if (key) {
      keySet.add(key);
    }
  }

  const keys = Array.from(keySet);
  return { keys, movieCount: keys.length };
}