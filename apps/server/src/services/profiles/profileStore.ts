import fs from 'node:fs/promises';
import path from 'node:path';
import { PersistedProfilesStoreSchema, type PersistedProfilesStore } from '@cine-match/shared';

function createEmptyProfilesStore(): PersistedProfilesStore {
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    profiles: {},
  };
}

export class ProfileStore {
  private readonly filePath: string;
  private writeChain: Promise<void> = Promise.resolve();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingGetter: (() => PersistedProfilesStore) | null = null;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  getFilePath(): string {
    return this.filePath;
  }

  async load(): Promise<PersistedProfilesStore> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed: unknown = JSON.parse(raw);
      const validated = PersistedProfilesStoreSchema.safeParse(parsed);

      if (!validated.success) {
        await this.backupCorrupted();
        return createEmptyProfilesStore();
      }

      return validated.data;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') {
        return createEmptyProfilesStore();
      }
      await this.backupCorrupted();
      return createEmptyProfilesStore();
    }
  }

  private async backupCorrupted(): Promise<void> {
    try {
      await fs.rename(this.filePath, `${this.filePath}.corrupt.${Date.now()}.json`);
    } catch {
      // Ignora se o arquivo não existir ou não puder ser renomeado
    }
  }

  saveAtomic(store: PersistedProfilesStore): Promise<void> {
    const payload = JSON.stringify(
      {
        ...store,
        savedAt: new Date().toISOString(),
      },
      null,
      2,
    );

    this.writeChain = this.writeChain
      .catch(() => undefined)
      .then(() => this.performAtomicWrite(payload));

    return this.writeChain;
  }

  scheduleSave(getState: () => PersistedProfilesStore, delayMs = 200): void {
    this.pendingGetter = getState;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      const getter = this.pendingGetter;
      this.pendingGetter = null;
      if (getter) {
        this.saveAtomic(getter()).catch((err) => {
          console.error('[ProfileStore] Erro ao persistir perfis:', err);
        });
      }
    }, delayMs);
  }

  async flush(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    const getter = this.pendingGetter;
    this.pendingGetter = null;
    if (getter) {
      await this.saveAtomic(getter());
    } else {
      await this.writeChain;
    }
  }

  private async performAtomicWrite(serialized: string): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    const tmpPath = `${this.filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    await fs.writeFile(tmpPath, serialized, 'utf8');

    let attempts = 0;
    while (attempts < 3) {
      try {
        await fs.rename(tmpPath, this.filePath);
        return;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException)?.code;
        attempts += 1;
        if ((code === 'EPERM' || code === 'EBUSY') && attempts < 3) {
          await new Promise((resolve) => setTimeout(resolve, 40 * attempts));
          continue;
        }
        await fs.unlink(tmpPath).catch(() => undefined);
        throw err;
      }
    }
  }
}