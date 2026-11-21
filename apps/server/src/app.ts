import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express from 'express';
import { APP_LIMITS } from '@cine-match/shared';
import { getLocalNetworkInfo } from './config/network';
import { httpErrorHandler, securityHeaders } from './middleware/security';
import type { CatalogProvider } from './services/catalog/catalogProvider';
import { SeedCatalogProvider } from './services/catalog/seedCatalogProvider';
import { JsonStore } from './services/persistence/jsonStore';
import { RoomManager } from './services/rooms/roomManager';
import { TmdbCatalogProvider } from './services/tmdb/tmdbService';
import { createSocketServer, type TypedSocketServer } from './socket/createSocketServer';

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
  catalogProvider: CatalogProvider;
}

export function createApp(options: CreateAppOptions): AppInstance {
  const app = express();

  const store = new JsonStore(options.dataFilePath ?? './data/sessions.json');
  const trimmedKey = options.tmdbApiKey?.trim() ?? '';
  const useTmdb = options.catalogMode !== 'seed' && Boolean(trimmedKey);
  const catalogProvider: CatalogProvider =
    options.catalogProvider ??
    (useTmdb ? new TmdbCatalogProvider({ apiKey: trimmedKey }) : new SeedCatalogProvider());

  const roomManager = new RoomManager({
    store,
    catalogProvider,
  });

  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(cors({ origin: true }));
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

  app.get('/api/history', (_req, res) => {
    res.json({ history: roomManager.getHistory() });
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
      app.use(express.static(webDistPath));
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

  return { app, httpServer, io, roomManager, catalogProvider };
}
