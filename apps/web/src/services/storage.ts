import { getOrCreateDeviceId } from '../utils/id';

const NAME_KEY = 'cine_match_participant_name';
const ACTIVE_ROOM_KEY = 'cine_match_active_room_code';

export const localPersistence = {
  getDeviceId(): string {
    return getOrCreateDeviceId();
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
};
