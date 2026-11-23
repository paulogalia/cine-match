let iosSwitchLabel: HTMLLabelElement | null = null;

function triggerIosSwitchTaptic(): void {
  if (typeof document === 'undefined' || !document.body) return;

  try {
    if (!iosSwitchLabel) {
      const id = 'cm-ios-taptic-switch';
      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.setAttribute('aria-hidden', 'true');
      label.style.position = 'fixed';
      label.style.left = '-9999px';
      label.style.top = '-9999px';
      label.style.opacity = '0';
      label.style.pointerEvents = 'none';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.setAttribute('switch', '');
      input.tabIndex = -1;

      label.appendChild(input);
      document.body.appendChild(label);
      iosSwitchLabel = label;
    }

    iosSwitchLabel.click();
  } catch {
    // Silencioso em navegadores sem suporte
  }
}

function vibrateSafe(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
      return;
    } catch {
      // Fallback silencioso
    }
  }

  // Fallback de micro-clique tátil no iOS 17.4+ (Taptic Engine via checkbox switch)
  triggerIosSwitchTaptic();
}

export const haptics = {
  like(): void {
    vibrateSafe(24);
  },
  dislike(): void {
    vibrateSafe(14);
  },
  undo(): void {
    vibrateSafe(12);
  },
  watched(): void {
    vibrateSafe([12, 30, 12]);
  },
  match(): void {
    vibrateSafe([35, 50, 55]);
  },
};
