function vibrateSafe(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // Alguns navegadores bloqueiam vibração sem gesto direto ou não suportam
  }
}

export const haptics = {
  like(): void {
    vibrateSafe(14);
  },
  dislike(): void {
    vibrateSafe(8);
  },
  match(): void {
    vibrateSafe([22, 45, 36]);
  },
};
