import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

function findWorkspaceRoot(startDir: string): string {
  let current = startDir;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const WORKSPACE_ROOT = findWorkspaceRoot(currentDir);

const envCandidates = [
  path.join(WORKSPACE_ROOT, '.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate });
    break;
  }
}

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TMDB_API_KEY: z.string().trim().optional().default(''),
  CATALOG_MODE: z.enum(['auto', 'seed']).default('auto'),
  DATA_FILE_PATH: z.string().trim().default('./data/sessions.json'),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export function loadEnv(): AppEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('[Env] Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  const rawDataPath = parsed.data.DATA_FILE_PATH;
  const resolvedDataPath = path.isAbsolute(rawDataPath)
    ? rawDataPath
    : path.resolve(WORKSPACE_ROOT, rawDataPath);

  return {
    ...parsed.data,
    DATA_FILE_PATH: resolvedDataPath,
  };
}
