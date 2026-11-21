const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

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
  const key = 'cine_match_device_id';
  const existing = window.localStorage.getItem(key);
  if (existing && existing.length >= 8) {
    return existing;
  }

  const created = generateId('dev', 16);
  window.localStorage.setItem(key, created);
  return created;
}
