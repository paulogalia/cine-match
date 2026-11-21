export interface GenreOption {
  id: number;
  name: string;
}

export const POPULAR_GENRES: GenreOption[] = [
  { id: 28, name: 'Ação' },
  { id: 35, name: 'Comédia' },
  { id: 18, name: 'Drama' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Ficção Científica' },
  { id: 53, name: 'Suspense' },
  { id: 16, name: 'Animação' },
  { id: 27, name: 'Terror' },
  { id: 12, name: 'Aventura' },
  { id: 9648, name: 'Mistério' },
];

export function getGenreName(id: number): string {
  return POPULAR_GENRES.find((g) => g.id === id)?.name ?? `Gênero #${id}`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[parts.length - 1]![0] ?? ''}`.toUpperCase();
}
