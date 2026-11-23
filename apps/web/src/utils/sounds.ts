const SOUND_PREF_KEY = 'cine_match_sound_enabled';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;

  try {
    if (!audioCtx) {
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startOffsetSec: number,
  durationSec: number,
  volume: number,
  type: OscillatorType = 'sine',
  endFreq?: number,
): void {
  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + durationSec);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export function loadSoundPreference(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(SOUND_PREF_KEY);
  return stored === null ? true : stored === '1';
}

export function saveSoundPreference(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SOUND_PREF_KEY, enabled ? '1' : '0');
}

export const sounds = {
  like(enabled: boolean): void {
    if (!enabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 523.25, 0, 0.11, 0.07, 'triangle', 659.25);
    playTone(ctx, 659.25, 0.06, 0.13, 0.06, 'sine', 783.99);
  },

  dislike(enabled: boolean): void {
    if (!enabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 240, 0, 0.09, 0.06, 'triangle', 165);
  },

  undo(enabled: boolean): void {
    if (!enabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 440, 0, 0.09, 0.06, 'sine', 587.33);
  },

  watched(enabled: boolean): void {
    if (!enabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 392, 0, 0.07, 0.05, 'sine');
    playTone(ctx, 493.88, 0.08, 0.09, 0.05, 'sine');
  },

  tick(enabled: boolean): void {
    if (!enabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 760, 0, 0.032, 0.04, 'triangle', 480);
  },

  fanfare(enabled: boolean): void {
    if (!enabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 587.33, 0, 0.16, 0.075, 'triangle');
    playTone(ctx, 739.99, 0.08, 0.18, 0.075, 'triangle');
    playTone(ctx, 880, 0.16, 0.32, 0.08, 'sine');
    playTone(ctx, 1174.66, 0.24, 0.42, 0.065, 'sine');
  },

  match(enabled: boolean): void {
    if (!enabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 523.25, 0, 0.28, 0.08, 'triangle');
    playTone(ctx, 659.25, 0.07, 0.3, 0.075, 'triangle');
    playTone(ctx, 783.99, 0.14, 0.34, 0.075, 'sine');
    playTone(ctx, 987.77, 0.21, 0.42, 0.065, 'sine');
  },
};
