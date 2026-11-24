import type { TitleLanguage } from '@cine-match/shared';
import { getOrCreateDeviceId, setStoredDeviceId } from '../utils/id';

const NAME_KEY = 'cine_match_participant_name';
const ACTIVE_ROOM_KEY = 'cine_match_active_room_code';
const TITLE_LANGUAGE_KEY = 'cine_match_title_language';

const VALID_TITLE_LANGUAGES: ReadonlySet<string> = new Set(['pt-BR', 'en-US', 'original']);

export const localPersistence = {
  getDeviceId(): string {
    return getOrCreateDeviceId();
  },

  setDeviceId(deviceId: string): void {
    setStoredDeviceId(deviceId);
  },

  getSavedName(): string {
    return window.localStorage.getItem(NAME_KEY) ?? '';
  },

  saveName(name: string): void {
    const trimmed = name.trim();
    if (trimmed) {
      window.localStorage.setItem(NAME_KEY, trimmed);
    }
  },

  getActiveRoomCode(): string | null {
    return window.localStorage.getItem(ACTIVE_ROOM_KEY);
  },

  saveActiveRoomCode(code: string | null): void {
    if (code) {
      window.localStorage.setItem(ACTIVE_ROOM_KEY, code.toUpperCase());
    } else {
      window.localStorage.removeItem(ACTIVE_ROOM_KEY);
    }
  },

  getTitleLanguage(): TitleLanguage {
    const raw = window.localStorage.getItem(TITLE_LANGUAGE_KEY);
    if (raw && VALID_TITLE_LANGUAGES.has(raw)) {
      return raw as TitleLanguage;
    }
    return 'pt-BR';
  },

  saveTitleLanguage(language: TitleLanguage): void {
    window.localStorage.setItem(TITLE_LANGUAGE_KEY, language);
  },
};