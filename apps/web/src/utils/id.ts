const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const DEVICE_ID_KEY = 'cine_match_device_id';

export function generateId(prefix = 'id', length = 16): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);

  let suffix = '';
  for (const byte of bytes) {
    suffix += ALPHABET[byte % ALPHABET.length];
  }
  return `${prefix}_${suffix}`;
}

export function getOrCreateDeviceId(): string {
  const existing = window.localStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.length >= 8) {
    return existing;
  }

  const created = generateId('dev', 16);
  window.localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
}

export function setStoredDeviceId(deviceId: string): void {
  const trimmed = deviceId.trim();
  if (trimmed.length >= 8) {
    window.localStorage.setItem(DEVICE_ID_KEY, trimmed);
  }
}