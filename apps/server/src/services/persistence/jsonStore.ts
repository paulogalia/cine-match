import fs from 'node:fs/promises';
import path from 'node:path';
import { PersistedStoreSchema, type PersistedStore } from '@cine-match/shared';

function createEmptyStore(): PersistedStore {
  return {
    schemaVersion: 1,
    savedAt: new Date().toISOString(),
    activeRooms: {},
    history: [],
  };
}

export class JsonStore {
  private readonly filePath: string;
  private writeChain: Promise<void> = Promise.resolve();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingStateGetter: (() => PersistedStore) | null = null;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  getFilePath(): string {
    return this.filePath;
  }

  async load(): Promise<PersistedStore> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsedJson: unknown = JSON.parse(raw);
      const validated = PersistedStoreSchema.safeParse(parsedJson);

      if (!validated.success) {
        await this.backupCorruptedFile();
        return createEmptyStore();
      }

      return validated.data;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') {
        return createEmptyStore();
      }
      await this.backupCorruptedFile();
      return createEmptyStore();
    }
  }

  private async backupCorruptedFile(): Promise<void> {
    try {
      const backupPath = `${this.filePath}.corrupt.${Date.now()}.json`;
      await fs.rename(this.filePath, backupPath);
    } catch {
      // Ignora se o arquivo não existir ou não puder ser renomeado
    }
  }

  saveAtomic(store: PersistedStore): Promise<void> {
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

  scheduleSave(getState: () => PersistedStore, delayMs = 150): void {
    this.pendingStateGetter = getState;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      const getter = this.pendingStateGetter;
      this.pendingStateGetter = null;
      if (getter) {
        this.saveAtomic(getter()).catch((err) => { console.error("[JsonStore] Erro ao persistir estado:", err); });
      }
    }, delayMs);
  }

  async flush(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    const getter = this.pendingStateGetter;
    this.pendingStateGetter = null;
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
