import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import {
  APP_LIMITS,
  DeviceIdSchema,
  LetterboxdImportPayloadSchema,
  ProfileRecoverPayloadSchema,
  ProfileUpdatePayloadSchema,
} from '@cine-match/shared';
import { getLocalNetworkInfo } from './config/network';
import { httpErrorHandler, securityHeaders } from './middleware/security';
import type { CatalogProvider } from './services/catalog/catalogProvider';
import { SeedCatalogProvider } from './services/catalog/seedCatalogProvider';
import { JsonStore } from './services/persistence/jsonStore';
import { ProfileManager } from './services/profiles/profileManager';
import { ProfileStore } from './services/profiles/profileStore';
import { RoomManager } from './services/rooms/roomManager';
import { TmdbCatalogProvider } from './services/tmdb/tmdbService';
import { createSocketServer, type TypedSocketServer } from './socket/createSocketServer';
import { DomainError } from './utils/sanitize';

export interface CreateAppOptions {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  dataFilePath?: string;
  tmdbApiKey?: string;
  catalogMode?: 'auto' | 'seed';
  catalogProvider?: CatalogProvider;
}

export interface AppInstance {
  app: express.Express;
  httpServer: http.Server;
  io: TypedSocketServer;
  roomManager: RoomManager;
  profileManager: ProfileManager;
  catalogProvider: CatalogProvider;
}

export function createApp(options: CreateAppOptions): AppInstance {
  const app = express();

  const sessionsPath = options.dataFilePath ?? './data/sessions.json';
  const store = new JsonStore(sessionsPath);
  const profilesPath = path.join(path.dirname(path.resolve(sessionsPath)), 'profiles.json');
  const profileManager = new ProfileManager(new ProfileStore(profilesPath));

  const trimmedKey = options.tmdbApiKey?.trim() ?? '';
  const useTmdb = options.catalogMode !== 'seed' && Boolean(trimmedKey);
  const catalogProvider: CatalogProvider =
    options.catalogProvider ??
    (useTmdb ? new TmdbCatalogProvider({ apiKey: trimmedKey }) : new SeedCatalogProvider());

  const roomManager = new RoomManager({
    store,
    catalogProvider,
    profileManager,
  });

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(cors({ origin: true }));

  // Rota de importação de CSV do Letterboxd registrada antes do limite padrão de payload
  app.post(
    '/api/profiles/:profileId/letterboxd',
    express.json({ limit: '2mb' }),
    (req, res) => {
      const parsedId = DeviceIdSchema.safeParse(req.params.profileId);
      if (!parsedId.success) {
        res.status(400).json({ error: 'ID de perfil inválido.' });
        return;
      }

      const parsedBody = LetterboxdImportPayloadSchema.safeParse(req.body);
      if (!parsedBody.success) {
        res.status(400).json({ error: 'Dados do CSV inválidos ou muito grandes (máx. 2 MB).' });
        return;
      }

      try {
        const result = profileManager.importLetterboxdCsv(
          parsedId.data,
          parsedBody.data.kind,
          parsedBody.data.csvText,
        );
        res.json({ profile: result.profile, importedCount: result.importedCount });
      } catch (err) {
        if (err instanceof DomainError) {
          res.status(400).json({ error: err.message });
          return;
        }
        res.status(500).json({ error: 'Erro ao importar CSV do Letterboxd.' });
      }
    },
  );

  app.use(express.json({ limit: APP_LIMITS.MAX_PAYLOAD_BYTES }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'cine-match-server',
      catalogSource: catalogProvider.source,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/network-info', (_req, res) => {
    const displayPort = options.nodeEnv === 'development' ? 5173 : options.port;
    res.json(getLocalNetworkInfo(displayPort));
  });

  app.get('/api/catalog-status', (_req, res) => {
    res.json({
      source: catalogProvider.source,
      tmdbConfigured: catalogProvider.source === 'tmdb',
    });
  });

  app.get('/api/profiles/:profileId', (req, res) => {
    const parsedId = DeviceIdSchema.safeParse(req.params.profileId);
    if (!parsedId.success) {
      res.status(400).json({ error: 'ID de perfil inválido.' });
      return;
    }

    const profile = profileManager.getOrCreateProfile(parsedId.data);
    res.json({ profile });
  });

  app.put('/api/profiles/:profileId', (req, res) => {
    const parsedId = DeviceIdSchema.safeParse(req.params.profileId);
    if (!parsedId.success) {
      res.status(400).json({ error: 'ID de perfil inválido.' });
      return;
    }

    const parsedBody = ProfileUpdatePayloadSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: 'Dados de perfil inválidos.' });
      return;
    }

    try {
      const profile = profileManager.updateProfile(parsedId.data, parsedBody.data);
      res.json({ profile });
    } catch (err) {
      if (err instanceof DomainError) {
        res.status(400).json({ error: err.message });
        return;
      }
      res.status(500).json({ error: 'Erro ao atualizar perfil.' });
    }
  });

  app.post('/api/profiles/recover', (req, res) => {
    const parsedBody = ProfileRecoverPayloadSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: 'Informe um código de recuperação válido.' });
      return;
    }

    const profile = profileManager.recoverByCode(parsedBody.data.recoveryCode);
    if (!profile) {
      res.status(404).json({ error: 'Código de recuperação não encontrado.' });
      return;
    }

    res.json({ profile });
  });

  app.delete('/api/profiles/:profileId/letterboxd/:kind', (req, res) => {
    const parsedId = DeviceIdSchema.safeParse(req.params.profileId);
    if (!parsedId.success) {
      res.status(400).json({ error: 'ID de perfil inválido.' });
      return;
    }

    const kind = req.params.kind;
    if (kind !== 'watched' && kind !== 'watchlist') {
      res.status(400).json({ error: 'Tipo de lista inválido.' });
      return;
    }

    const profile = profileManager.clearLetterboxdList(parsedId.data, kind);
    res.json({ profile });
  });

  app.get('/api/genres', async (_req, res) => {
    try {
      const genres = await catalogProvider.getGenres();
      res.json({ genres, source: catalogProvider.source });
    } catch {
      res.status(503).json({ error: 'Não foi possível carregar os gêneros no momento.' });
    }
  });

  app.get('/api/watch-providers', async (_req, res) => {
    try {
      const providers = await catalogProvider.getWatchProvidersBR();
      res.json({ providers, source: catalogProvider.source });
    } catch {
      res.status(503).json({ error: 'Não foi possível carregar os provedores de streaming.' });
    }
  });

  app.get('/api/people/search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const rawRole = typeof req.query.role === 'string' ? req.query.role : undefined;
    const role = rawRole === 'director' || rawRole === 'actor' ? rawRole : undefined;

    try {
      const people = await catalogProvider.searchPeople(q, role);
      res.json({ people, source: catalogProvider.source });
    } catch {
      res.status(503).json({ error: 'Busca de diretores e atores temporariamente indisponível.' });
    }
  });

  app.get('/api/history', (_req, res) => {
    res.json({ history: roomManager.getHistory() });
  });

  app.get('/api/watched', (_req, res) => {
    res.json({ watchedMovies: roomManager.getWatchedMovies() });
  });

  app.delete('/api/watched/:tmdbId', (req, res) => {
    const tmdbId = Number(req.params.tmdbId);
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      res.status(400).json({ error: 'ID do filme inválido.' });
      return;
    }
    const removed = roomManager.unmarkWatchedMovie(tmdbId);
    res.json({ removed, watchedMovies: roomManager.getWatchedMovies() });
  });

  app.get('/api/movies/search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const page = Number(req.query.page ?? 1);
    if (q.length < 2) {
      res.status(400).json({ error: 'Informe ao menos 2 caracteres para buscar.' });
      return;
    }

    try {
      const result = await catalogProvider.searchMovies(
        q,
        Number.isInteger(page) && page > 0 ? page : 1,
      );
      res.json(result);
    } catch {
      res.status(503).json({ error: 'Busca temporariamente indisponível.' });
    }
  });

  app.get('/api/movies/:tmdbId', async (req, res) => {
    const tmdbId = Number(req.params.tmdbId);
    if (!Number.isInteger(tmdbId) || tmdbId <= 0) {
      res.status(400).json({ error: 'ID do filme inválido.' });
      return;
    }

    try {
      const details = await catalogProvider.getMovieDetails(tmdbId);
      if (!details) {
        res.status(404).json({ error: 'Detalhes do filme não encontrados.' });
        return;
      }
      res.json(details);
    } catch {
      res.status(503).json({ error: 'Serviço de detalhes temporariamente indisponível.' });
    }
  });

  if (options.nodeEnv === 'production') {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const webDistPath = path.resolve(currentDir, '../../web/dist');

    if (fs.existsSync(webDistPath)) {
      app.use(
        express.static(webDistPath, {
          setHeaders: (res, filePath) => {
            if (filePath.endsWith('sw.js')) {
              res.setHeader('Cache-Control', 'no-cache');
            }
          },
        }),
      );
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
          return next();
        }
        res.sendFile(path.join(webDistPath, 'index.html'));
      });
    }
  }

  app.use(httpErrorHandler);

  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer, roomManager);

  return { app, httpServer, io, roomManager, profileManager, catalogProvider };
}