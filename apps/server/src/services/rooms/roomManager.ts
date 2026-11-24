import {
  APP_LIMITS,
  AVATAR_COLORS,
  DEFAULT_FILTERS,
  ERROR_CODES,
  type ClientMatchItem,
  type ClientRoomSnapshot,
  type FilterCriteria,
  type FinalDecisionProposal,
  type MatchRecord,
  type MovieSummary,
  type Participant,
  type PartnerProgress,
  type PersistedStore,
  type PublicParticipant,
  type Room,
  type RouletteSpin,
  type SessionHistoryEntry,
  type VoteDecision,
  type WatchedMovieEntry,
} from '@cine-match/shared';
import type { CatalogPageResult, CatalogProvider } from '../catalog/catalogProvider';
import { fetchOscarCatalogPage } from '../catalog/oscarCatalog';
import { fetchPeopleCatalogPage } from '../catalog/peopleCatalog';
import { SeedCatalogProvider } from '../catalog/seedCatalogProvider';
import type { JsonStore } from '../persistence/jsonStore';
import type { ProfileManager } from '../profiles/profileManager';
import {
  buildHistoryEntry,
  confirmFinalMovie,
  dismissMatchFromInterestList,
  proposeFinalMovie,
  spinRouletteForActiveMatches,
} from '../matching/matchingService';
import {
  applyVote,
  evaluateGroupMatchesForRoom,
  getLikeParticipantIdsForMovie,
  getRequiredLikesForRoom,
  undoLastVote as undoLastVoteInRoom,
  type ApplyVoteResult,
  type UndoVoteResult,
} from '../voting/votingService';
import { generateRoomCode, generateServerId } from './roomCode';
import { DomainError, sanitizeDisplayText } from '../../utils/sanitize';
import { shuffleArray } from '../../utils/shuffle';

export interface RoomManagerOptions {
  store: JsonStore;
  catalogProvider?: CatalogProvider;
  profileManager?: ProfileManager;
  rng?: () => number;
}

export class RoomManager {
  private readonly store: JsonStore;
  private readonly catalogProvider: CatalogProvider;
  private readonly profileManager?: ProfileManager;
  private readonly rng: () => number;
  private readonly roomsByCode = new Map<string, Room>();
  private history: SessionHistoryEntry[] = [];
  private watchedMovies: WatchedMovieEntry[] = [];
  private expirationTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: RoomManagerOptions) {
    this.store = options.store;
    this.catalogProvider = options.catalogProvider ?? new SeedCatalogProvider();
    this.profileManager = options.profileManager;
    this.rng = options.rng ?? Math.random;
  }

  async init(): Promise<void> {
    if (this.profileManager) {
      await this.profileManager.init();
    }

    const persisted = await this.store.load();
    this.roomsByCode.clear();
    this.history = [...persisted.history];
    this.watchedMovies = [...(persisted.watchedMovies ?? [])];

    for (const room of Object.values(persisted.activeRooms)) {
      for (const participant of room.participants) {
        participant.connectionStatus = 'OFFLINE';
        participant.socketId = null;
      }
      this.roomsByCode.set(room.code, room);
    }

    this.purgeExpiredRooms();
  }

  startExpirationJob(intervalMs = 15 * 60 * 1000): void {
    this.stopExpirationJob();
    this.expirationTimer = setInterval(() => {
      const removed = this.purgeExpiredRooms();
      if (removed > 0) {
        this.persistSoon();
      }
    }, intervalMs);
    this.expirationTimer.unref();
  }

  stopExpirationJob(): void {
    if (this.expirationTimer) {
      clearInterval(this.expirationTimer);
      this.expirationTimer = null;
    }
  }

  getHistory(): SessionHistoryEntry[] {
    return [...this.history];
  }

  getWatchedMovies(): WatchedMovieEntry[] {
    return [...this.watchedMovies];
  }

  unmarkWatchedMovie(tmdbId: number): boolean {
    const before = this.watchedMovies.length;
    this.watchedMovies = this.watchedMovies.filter((m) => m.tmdbId !== tmdbId);
    const removed = this.watchedMovies.length < before;
    if (removed) {
      this.persistSoon();
    }
    return removed;
  }

  getRoomByCode(code: string): Room | undefined {
    return this.roomsByCode.get(code.toUpperCase());
  }

  createRoom(
    rawHostName: string,
    deviceId: string,
    socketId: string,
    filters?: FilterCriteria,
  ): { room: Room; participant: Participant } {
    const hostName = sanitizeDisplayText(rawHostName);
    if (hostName.length < APP_LIMITS.MIN_NAME_LENGTH) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        'Informe um nome válido com pelo menos 2 caracteres.',
      );
    }

    let code = generateRoomCode();
    while (this.roomsByCode.has(code)) {
      code = generateRoomCode();
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresIso = new Date(now.getTime() + APP_LIMITS.WAITING_ROOM_TTL_MS).toISOString();
    const profile = this.profileManager?.getOrCreateProfile(deviceId, hostName);

    const host: Participant = {
      id: generateServerId('part'),
      deviceId,
      name: hostName,
      avatarColor: profile?.avatarColor ?? AVATAR_COLORS[0],
      avatarDataUrl: profile?.avatarDataUrl ?? null,
      publicProfileId: profile?.publicId,
      role: 'HOST',
      connectionStatus: 'ONLINE',
      socketId,
      joinedAt: nowIso,
      lastSeenAt: nowIso,
    };

    const room: Room = {
      id: generateServerId('room'),
      code,
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt: expiresIso,
      status: 'WAITING_PARTICIPANT',
      stateVersion: 1,
      participants: [host],
      filters: filters ? { ...DEFAULT_FILTERS, ...filters } : { ...DEFAULT_FILTERS, genreIds: [] },
      catalogPage: 0,
      visitedCatalogPages: [],
      catalogExhausted: false,
      moviesById: {},
      queues: {
        [host.id]: { participantId: host.id, movieIds: [], cursor: 0 },
      },
      votes: [],
      matches: {},
      finalProposal: null,
      chosenMovieId: null,
    };

    this.roomsByCode.set(code, room);
    this.persistSoon();

    return { room, participant: host };
  }

  joinRoom(
    rawCode: string,
    rawName: string,
    deviceId: string,
    socketId: string,
  ): { room: Room; participant: Participant; reconnected: boolean } {
    const code = rawCode.trim().toUpperCase();
    const room = this.roomsByCode.get(code);
    if (!room) {
      throw new DomainError(ERROR_CODES.ROOM_NOT_FOUND, 'Sala não encontrada ou expirada.');
    }

    const nowIso = new Date().toISOString();

    const existing = room.participants.find((p) => p.deviceId === deviceId);
    if (existing) {
      const cleanName = sanitizeDisplayText(rawName);
      if (cleanName.length >= APP_LIMITS.MIN_NAME_LENGTH) {
        existing.name = cleanName;
      }
      const profile = this.profileManager?.getOrCreateProfile(deviceId, existing.name);
      if (profile) {
        existing.avatarColor = profile.avatarColor;
        existing.avatarDataUrl = profile.avatarDataUrl;
        existing.publicProfileId = profile.publicId;
      }
      existing.connectionStatus = 'ONLINE';
      existing.socketId = socketId;
      existing.lastSeenAt = nowIso;
      this.touchRoom(room);
      this.persistSoon();
      return { room, participant: existing, reconnected: true };
    }

    if (room.status === 'FINISHED') {
      throw new DomainError(ERROR_CODES.ROOM_CLOSED, 'Esta sessão já foi encerrada.');
    }

    if (room.participants.length >= APP_LIMITS.MAX_PARTICIPANTS_PER_ROOM) {
      throw new DomainError(
        ERROR_CODES.ROOM_FULL,
        `Esta sala já atingiu o limite máximo de ${APP_LIMITS.MAX_PARTICIPANTS_PER_ROOM} participantes.`,
      );
    }

    const name = sanitizeDisplayText(rawName);
    if (name.length < APP_LIMITS.MIN_NAME_LENGTH) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        'Informe um nome válido com pelo menos 2 caracteres.',
      );
    }

    const profile = this.profileManager?.getOrCreateProfile(deviceId, name);
    const fallbackColor =
      AVATAR_COLORS[room.participants.length % AVATAR_COLORS.length] ?? AVATAR_COLORS[1];

    const guest: Participant = {
      id: generateServerId('part'),
      deviceId,
      name,
      avatarColor: profile?.avatarColor ?? fallbackColor,
      avatarDataUrl: profile?.avatarDataUrl ?? null,
      publicProfileId: profile?.publicId,
      role: 'GUEST',
      connectionStatus: 'ONLINE',
      socketId,
      joinedAt: nowIso,
      lastSeenAt: nowIso,
    };

    room.participants.push(guest);

    // Se a sessão já está em andamento, entrega a fila de filmes atuais embaralhada para quem acabou de entrar
    const activeMovieIds = Object.keys(room.moviesById)
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);

    room.queues[guest.id] = {
      participantId: guest.id,
      movieIds:
        room.status === 'IN_PROGRESS' || room.status === 'PAUSED' || room.status === 'DECIDING'
          ? shuffleArray(activeMovieIds, this.rng)
          : [],
      cursor: 0,
    };

    if (room.status === 'WAITING_PARTICIPANT') {
      room.status = 'READY';
    }

    this.touchRoom(room);
    this.persistSoon();

    return { room, participant: guest, reconnected: false };
  }

  syncSession(
    rawCode: string,
    deviceId: string,
    socketId: string,
  ): { room: Room; participant: Participant } {
    const code = rawCode.trim().toUpperCase();
    const room = this.roomsByCode.get(code);
    if (!room) {
      throw new DomainError(ERROR_CODES.ROOM_NOT_FOUND, 'Sala não encontrada ou expirada.');
    }

    const participant = room.participants.find((p) => p.deviceId === deviceId);
    if (!participant) {
      throw new DomainError(
        ERROR_CODES.PARTICIPANT_NOT_IN_ROOM,
        'Este dispositivo não faz parte desta sala.',
      );
    }

    const profile = this.profileManager?.getProfile(deviceId);
    if (profile) {
      participant.avatarColor = profile.avatarColor;
      participant.avatarDataUrl = profile.avatarDataUrl;
      participant.publicProfileId = profile.publicId;
    }

    participant.connectionStatus = 'ONLINE';
    participant.socketId = socketId;
    participant.lastSeenAt = new Date().toISOString();
    this.touchRoom(room);
    this.persistSoon();

    return { room, participant };
  }

  markDisconnected(
    roomCode: string,
    participantId: string,
    socketId: string,
  ): {
    room: Room;
    participant: Participant;
    changed: boolean;
    newlyMatched: MatchRecord[];
  } | null {
    const room = this.roomsByCode.get(roomCode);
    if (!room) return null;

    const participant = room.participants.find((p) => p.id === participantId);
    if (!participant) return null;

    if (participant.socketId !== socketId) {
      return { room, participant, changed: false, newlyMatched: [] };
    }

    participant.connectionStatus = 'OFFLINE';
    participant.socketId = null;
    participant.lastSeenAt = new Date().toISOString();

    const newlyMatched =
      room.status === 'IN_PROGRESS' ? evaluateGroupMatchesForRoom(room) : [];

    this.touchRoom(room);
    this.persistSoon();

    return { room, participant, changed: true, newlyMatched };
  }

  async startSession(roomCode: string, participantId: string): Promise<Room> {
    const room = this.requireRoom(roomCode);
    const participant = this.requireParticipant(room, participantId);

    if (participant.role !== 'HOST') {
      throw new DomainError(
        ERROR_CODES.UNAUTHORIZED_ACTION,
        'Apenas quem criou a sala pode iniciar a sessão.',
      );
    }

    if (room.status !== 'READY') {
      throw new DomainError(
        ERROR_CODES.INVALID_STATE_TRANSITION,
        'A sala precisa ter pelo menos dois participantes prontos para iniciar.',
      );
    }

    const onlineParticipants = room.participants.filter((p) => p.connectionStatus === 'ONLINE');
    if (room.participants.length < 2 || onlineParticipants.length < 2) {
      throw new DomainError(
        ERROR_CODES.INVALID_STATE_TRANSITION,
        'Pelo menos dois participantes precisam estar conectados para começar.',
      );
    }

    room.catalogPage = 0;
    room.visitedCatalogPages = [];
    room.catalogExhausted = false;

    const loadedIds = await this.loadNextMoviesIntoRoom(room);

    for (const p of room.participants) {
      room.queues[p.id] = {
        participantId: p.id,
        movieIds: shuffleArray(loadedIds, this.rng),
        cursor: 0,
      };
    }

    room.status = 'IN_PROGRESS';
    this.touchRoom(room);
    await this.persistNow();

    return room;
  }

  pauseSession(roomCode: string, participantId: string): Room {
    const room = this.requireRoom(roomCode);
    this.requireParticipant(room, participantId);

    if (room.status !== 'IN_PROGRESS') {
      throw new DomainError(
        ERROR_CODES.INVALID_STATE_TRANSITION,
        'A sessão só pode ser pausada quando está em andamento.',
      );
    }

    room.status = 'PAUSED';
    this.touchRoom(room);
    this.persistSoon();
    return room;
  }

  resumeSession(roomCode: string, participantId: string): Room {
    const room = this.requireRoom(roomCode);
    this.requireParticipant(room, participantId);

    if (room.status !== 'PAUSED') {
      throw new DomainError(ERROR_CODES.INVALID_STATE_TRANSITION, 'A sessão não está pausada.');
    }

    room.status = 'IN_PROGRESS';
    this.touchRoom(room);
    this.persistSoon();
    return room;
  }

  async updateFilters(
    roomCode: string,
    participantId: string,
    filters: FilterCriteria,
  ): Promise<Room> {
    const room = this.requireRoom(roomCode);
    const participant = this.requireParticipant(room, participantId);

    if (room.status === 'FINISHED') {
      throw new DomainError(ERROR_CODES.ROOM_CLOSED, 'Não é possível alterar filtros após encerrar.');
    }

    if (
      (room.status === 'WAITING_PARTICIPANT' || room.status === 'READY') &&
      participant.role !== 'HOST'
    ) {
      throw new DomainError(
        ERROR_CODES.UNAUTHORIZED_ACTION,
        'No lobby, apenas quem criou a sala altera os filtros iniciais.',
      );
    }

    room.filters = { ...filters };
    room.catalogPage = 0;
    room.visitedCatalogPages = [];
    room.catalogExhausted = false;

    if (room.status === 'IN_PROGRESS' || room.status === 'PAUSED' || room.status === 'DECIDING') {
      evaluateGroupMatchesForRoom(room);
      const freshIds = await this.loadNextMoviesIntoRoom(room);

      for (const p of room.participants) {
        const votedSet = new Set(
          room.votes.filter((v) => v.participantId === p.id).map((v) => v.tmdbId),
        );
        const unvotedIds = freshIds.filter((id) => !votedSet.has(id));
        const previousCursor = room.queues[p.id]?.cursor ?? 0;

        room.queues[p.id] = {
          participantId: p.id,
          movieIds: shuffleArray(unvotedIds, this.rng),
          cursor: previousCursor,
        };
      }
    }

    this.touchRoom(room);
    this.persistSoon();
    return room;
  }

  async requestMoreMovies(roomCode: string, participantId: string): Promise<Room> {
    const room = this.requireRoom(roomCode);
    this.requireParticipant(room, participantId);

    if (room.catalogExhausted) {
      return room;
    }

    const newIds = await this.loadNextMoviesIntoRoom(room);

    for (const p of room.participants) {
      const queue = room.queues[p.id] ?? { participantId: p.id, movieIds: [], cursor: 0 };
      const votedSet = new Set(
        room.votes.filter((v) => v.participantId === p.id).map((v) => v.tmdbId),
      );
      const pendingSet = new Set(queue.movieIds);
      const additions = newIds.filter((id) => !votedSet.has(id) && !pendingSet.has(id));

      queue.movieIds.push(...shuffleArray(additions, this.rng));
      room.queues[p.id] = queue;
    }

    this.touchRoom(room);
    this.persistSoon();
    return room;
  }

  submitVote(
    roomCode: string,
    participantId: string,
    operationId: string,
    tmdbId: number,
    decision: VoteDecision,
  ): { room: Room; result: ApplyVoteResult } {
    const room = this.requireRoom(roomCode);
    const result = applyVote(room, participantId, operationId, tmdbId, decision);

    if (!result.duplicate) {
      const participant = room.participants.find((p) => p.id === participantId);
      if (participant && this.profileManager) {
        this.profileManager.recordVote(
          participant.deviceId,
          room.moviesById[String(tmdbId)],
          decision,
        );
      }
      this.touchRoom(room);
      this.persistSoon();
    }

    return { room, result };
  }

  undoLastVote(
    roomCode: string,
    participantId: string,
  ): { room: Room; result: UndoVoteResult } {
    const room = this.requireRoom(roomCode);
    const lastVoteBefore = [...room.votes].reverse().find((v) => v.participantId === participantId);
    const result = undoLastVoteInRoom(room, participantId);

    if (lastVoteBefore && this.profileManager) {
      const participant = room.participants.find((p) => p.id === participantId);
      if (participant) {
        this.profileManager.revertVote(
          participant.deviceId,
          room.moviesById[String(lastVoteBefore.tmdbId)],
          lastVoteBefore.decision,
        );
      }
    }

    this.touchRoom(room);
    this.persistSoon();
    return { room, result };
  }

  markMovieWatched(
    roomCode: string,
    participantId: string,
    tmdbId: number,
  ): { room: Room; entry: WatchedMovieEntry } {
    const room = this.requireRoom(roomCode);
    const participant = this.requireParticipant(room, participantId);

    if (room.status !== 'IN_PROGRESS' && room.status !== 'PAUSED') {
      throw new DomainError(
        ERROR_CODES.INVALID_STATE_TRANSITION,
        'Só é possível marcar filmes como assistidos durante a sessão.',
      );
    }

    const movieKey = String(tmdbId);
    const movie = room.moviesById[movieKey];
    if (!movie) {
      throw new DomainError(ERROR_CODES.MOVIE_NOT_FOUND, 'Filme não encontrado nesta sala.');
    }

    const nowIso = new Date().toISOString();
    const existing = this.watchedMovies.find((w) => w.tmdbId === tmdbId);
    const entry: WatchedMovieEntry = existing ?? {
      tmdbId,
      title: movie.title,
      posterPath: movie.posterPath,
      releaseYear: movie.releaseYear,
      markedAt: nowIso,
      markedBy: participant.name,
    };

    if (!existing) {
      this.watchedMovies.unshift(entry);
      if (this.watchedMovies.length > 500) {
        this.watchedMovies = this.watchedMovies.slice(0, 500);
      }
    }

    for (const p of room.participants) {
      const queue = room.queues[p.id];
      if (!queue) continue;
      const idx = queue.movieIds.indexOf(tmdbId);
      if (idx !== -1) {
        queue.movieIds.splice(idx, 1);
      }
    }

    const match = room.matches[movieKey];
    if (match && match.status === 'ACTIVE') {
      match.status = 'DISMISSED';
      match.dismissedBy = participantId;
      match.dismissedAt = nowIso;
      if (room.finalProposal?.tmdbId === tmdbId) {
        room.finalProposal = null;
      }
    }

    this.touchRoom(room);
    this.persistSoon();

    return { room, entry };
  }

  dismissMatch(roomCode: string, participantId: string, tmdbId: number): Room {
    const room = this.requireRoom(roomCode);
    this.requireParticipant(room, participantId);

    dismissMatchFromInterestList(room, participantId, tmdbId);
    this.touchRoom(room);
    this.persistSoon();
    return room;
  }

  enterDeciding(roomCode: string, participantId: string): Room {
    const room = this.requireRoom(roomCode);
    this.requireParticipant(room, participantId);

    if (room.status !== 'IN_PROGRESS' && room.status !== 'PAUSED' && room.status !== 'DECIDING') {
      throw new DomainError(
        ERROR_CODES.INVALID_STATE_TRANSITION,
        'A decisão final só está disponível durante uma sessão ativa.',
      );
    }

    room.status = 'DECIDING';
    this.touchRoom(room);
    this.persistSoon();
    return room;
  }

  returnToVoting(roomCode: string, participantId: string): Room {
    const room = this.requireRoom(roomCode);
    this.requireParticipant(room, participantId);

    if (room.status !== 'DECIDING') {
      throw new DomainError(
        ERROR_CODES.INVALID_STATE_TRANSITION,
        'A sala não está em modo de decisão.',
      );
    }

    room.status = 'IN_PROGRESS';
    room.finalProposal = null;
    this.touchRoom(room);
    this.persistSoon();
    return room;
  }

  spinDecisionRoulette(
    roomCode: string,
    participantId: string,
  ): { room: Room; spin: RouletteSpin; proposal: FinalDecisionProposal } {
    const room = this.requireRoom(roomCode);
    this.requireParticipant(room, participantId);

    const { spin, proposal } = spinRouletteForActiveMatches(room, participantId, this.rng);
    this.touchRoom(room);
    this.persistSoon();
    return { room, spin, proposal };
  }

  proposeFinalMovie(
    roomCode: string,
    participantId: string,
    tmdbId: number,
  ): { room: Room; proposal: FinalDecisionProposal } {
    const room = this.requireRoom(roomCode);
    this.requireParticipant(room, participantId);

    const proposal = proposeFinalMovie(room, participantId, tmdbId);
    this.touchRoom(room);
    this.persistSoon();
    return { room, proposal };
  }

  async confirmFinalMovie(
    roomCode: string,
    participantId: string,
    tmdbId: number,
  ): Promise<{
    room: Room;
    finalized: boolean;
    chosenMovie: MovieSummary | null;
    finalProposal: FinalDecisionProposal | null;
  }> {
    const room = this.requireRoom(roomCode);
    this.requireParticipant(room, participantId);

    const outcome = confirmFinalMovie(room, participantId, tmdbId);
    this.touchRoom(room);

    if (outcome.finalized) {
      this.archiveToHistory(room);
      await this.persistNow();
    } else {
      this.persistSoon();
    }

    return { room, ...outcome };
  }

  async endSession(roomCode: string, participantId: string): Promise<Room> {
    const room = this.requireRoom(roomCode);
    this.requireParticipant(room, participantId);

    if (room.status !== 'FINISHED') {
      room.status = 'FINISHED';
      room.finalProposal = null;
      this.touchRoom(room);
      this.archiveToHistory(room);
      await this.persistNow();
    }

    return room;
  }

  removeRoom(roomCode: string): boolean {
    const deleted = this.roomsByCode.delete(roomCode.toUpperCase());
    if (deleted) {
      this.persistSoon();
    }
    return deleted;
  }

  purgeExpiredRooms(nowMs: number = Date.now()): number {
    let removed = 0;
    for (const [code, room] of this.roomsByCode.entries()) {
      const expiresAtMs = Date.parse(room.expiresAt);
      const anyOnline = room.participants.some((p) => p.connectionStatus === 'ONLINE');
      if (!anyOnline && Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs) {
        this.roomsByCode.delete(code);
        removed += 1;
      }
    }
    return removed;
  }

  getClientSnapshot(room: Room, participantId: string): ClientRoomSnapshot {
    const queueIds = room.queues[participantId]?.movieIds ?? [];
    const queue = queueIds
      .slice(0, APP_LIMITS.QUEUE_SLICE_SIZE)
      .map((id) => room.moviesById[String(id)])
      .filter((m): m is MovieSummary => Boolean(m));

    const myVotes = room.votes.filter((v) => v.participantId === participantId);
    const others = room.participants.filter((p) => p.id !== participantId);
    const partnerProgressList: PartnerProgress[] = others.map((p) => ({
      participantId: p.id,
      votedCount: room.votes.filter((v) => v.participantId === p.id).length,
      queueRemaining: room.queues[p.id]?.movieIds.length ?? 0,
    }));
    const partnerProgress: PartnerProgress | null = partnerProgressList[0] ?? null;

    const publicParticipants: PublicParticipant[] = room.participants.map(
      ({ socketId: _socketId, deviceId: _deviceId, ...rest }) => rest,
    );

    const chosenMovie =
      room.chosenMovieId !== null ? (room.moviesById[String(room.chosenMovieId)] ?? null) : null;

    const matches = this.getClientMatches(room);
    const visibleMovies: MovieSummary[] = [
      ...queue,
      ...matches.map((m) => m.movie),
      ...(chosenMovie ? [chosenMovie] : []),
    ];
    const annotations =
      room.filters.letterboxdWatchedMode === 'ignore' || !this.profileManager
        ? { watchedByByMovieId: {}, watchlistedByByMovieId: {} }
        : this.profileManager.getRoomMovieAnnotations(room.participants, visibleMovies);

    const likeCountsByMovieId: Record<string, number> = {};
    for (const movie of visibleMovies) {
      const count = getLikeParticipantIdsForMovie(room, movie.tmdbId).length;
      if (count > 0) {
        likeCountsByMovieId[String(movie.tmdbId)] = count;
      }
    }

    return {
      id: room.id,
      code: room.code,
      status: room.status,
      stateVersion: room.stateVersion,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      myParticipantId: participantId,
      participants: publicParticipants,
      partnerProgress,
      partnerProgressList,
      filters: room.filters,
      queue,
      queueTotalRemaining: queueIds.length,
      catalogExhausted: room.catalogExhausted,
      myVotesCount: myVotes.length,
      myVotedMovieIds: myVotes.map((v) => v.tmdbId),
      canUndo: room.status === 'IN_PROGRESS' && myVotes.length > 0,
      matches,
      finalProposal: room.finalProposal,
      chosenMovie,
      watchedByByMovieId: annotations.watchedByByMovieId,
      watchlistedByByMovieId: annotations.watchlistedByByMovieId,
      likeCountsByMovieId,
      requiredLikesForMatch: getRequiredLikesForRoom(room),
    };
  }

  getClientMatches(room: Room): ClientMatchItem[] {
    return Object.values(room.matches)
      .map((match) => {
        const movie = room.moviesById[String(match.tmdbId)];
        if (!movie) return null;
        return { match, movie };
      })
      .filter((item): item is ClientMatchItem => item !== null)
      .sort((a, b) => b.match.matchedAt.localeCompare(a.match.matchedAt));
  }

  getPartnerProgress(room: Room, participantId: string): PartnerProgress {
    return {
      participantId,
      votedCount: room.votes.filter((v) => v.participantId === participantId).length,
      queueRemaining: room.queues[participantId]?.movieIds.length ?? 0,
    };
  }

  async flushPersistence(): Promise<void> {
    await this.store.flush();
    if (this.profileManager) {
      await this.profileManager.flush();
    }
  }

  // ==================== Motor de Carregamento ====================

  private getExcludedMovieIds(includeHistory: boolean): Set<number> {
    const ids = new Set<number>();

    for (const w of this.watchedMovies) {
      ids.add(w.tmdbId);
    }

    if (includeHistory) {
      for (const entry of this.history) {
        if (entry.chosenMovie) ids.add(entry.chosenMovie.tmdbId);
        for (const m of entry.matches) {
          ids.add(m.movie.tmdbId);
        }
      }
    }

    return ids;
  }

  private pickNextCatalogPage(room: Room): number | null {
    const visited = new Set(room.visitedCatalogPages ?? []);
    const isOscar = Boolean(room.filters.oscar?.enabled);
    const isPeopleFilter =
      (room.filters.directors?.length ?? 0) > 0 || (room.filters.actors?.length ?? 0) > 0;

    if (
      room.filters.randomDiscovery &&
      !isOscar &&
      !isPeopleFilter &&
      this.catalogProvider.source === 'tmdb'
    ) {
      const hasNarrowFilters =
        Boolean(room.filters.originalLanguage) ||
        (room.filters.watchProviderIds?.length ?? 0) > 0 ||
        room.filters.minRuntime !== undefined ||
        room.filters.maxRuntime !== undefined ||
        room.filters.maxVoteCount !== undefined;

      const maxPool = hasNarrowFilters ? 8 : 25;
      const candidates: number[] = [];
      for (let p = 1; p <= maxPool; p++) {
        if (!visited.has(p)) candidates.push(p);
      }

      if (candidates.length === 0) return null;
      const chosenIndex = Math.floor(this.rng() * candidates.length);
      return candidates[chosenIndex] ?? candidates[0]!;
    }

    let nextPage = room.catalogPage + 1;
    while (visited.has(nextPage)) {
      nextPage += 1;
    }
    return nextPage;
  }

  private async fetchUnifiedPage(filters: FilterCriteria, page: number): Promise<CatalogPageResult> {
    if ((filters.directors?.length ?? 0) > 0 || (filters.actors?.length ?? 0) > 0) {
      return fetchPeopleCatalogPage(filters, page, this.catalogProvider);
    }
    if (filters.oscar?.enabled) {
      return fetchOscarCatalogPage(filters, page, this.catalogProvider);
    }
    return this.catalogProvider.fetchPage(filters, page);
  }

  private async loadNextMoviesIntoRoom(room: Room): Promise<number[]> {
    const excludedIds = this.getExcludedMovieIds(Boolean(room.filters.excludeHistory));
    const hideLetterboxdWatched = room.filters.letterboxdWatchedMode === 'hide';

    const filterMovie = (m: MovieSummary): boolean => {
      if (excludedIds.has(m.tmdbId)) return false;
      if (
        hideLetterboxdWatched &&
        this.profileManager?.isMovieWatchedByAnyParticipant(room.participants, m)
      ) {
        return false;
      }
      return true;
    };

    const visited = room.visitedCatalogPages ?? [];
    room.visitedCatalogPages = visited;

    let chosenPage = this.pickNextCatalogPage(room);
    if (chosenPage === null) {
      room.catalogExhausted = true;
      return [];
    }

    let pageResult = await this.fetchUnifiedPage(room.filters, chosenPage);
    if (!visited.includes(chosenPage)) visited.push(chosenPage);

    if (
      pageResult.movies.length === 0 &&
      room.filters.randomDiscovery &&
      chosenPage !== 1 &&
      !visited.includes(1)
    ) {
      chosenPage = 1;
      pageResult = await this.fetchUnifiedPage(room.filters, 1);
      visited.push(1);
    }

    room.catalogPage = chosenPage;

    let filteredMovies = pageResult.movies.filter(filterMovie);

    if (filteredMovies.length === 0 && pageResult.hasMore) {
      const next = this.pickNextCatalogPage(room);
      if (next !== null) {
        const secondResult = await this.fetchUnifiedPage(room.filters, next);
        if (!visited.includes(next)) visited.push(next);
        room.catalogPage = next;
        pageResult = secondResult;
        filteredMovies = secondResult.movies.filter(filterMovie);
      }
    }

    const isCustomCatalog =
      Boolean(room.filters.oscar?.enabled) ||
      (room.filters.directors?.length ?? 0) > 0 ||
      (room.filters.actors?.length ?? 0) > 0;

    if (room.filters.randomDiscovery && !isCustomCatalog && this.catalogProvider.source === 'tmdb') {
      room.catalogExhausted = !pageResult.hasMore && visited.includes(1);
    } else {
      room.catalogExhausted = !pageResult.hasMore;
    }

    const loadedIds: number[] = [];
    for (const movie of filteredMovies) {
      room.moviesById[String(movie.tmdbId)] = movie;
      loadedIds.push(movie.tmdbId);
    }

    return loadedIds;
  }

  private archiveToHistory(room: Room): void {
    const alreadyArchived = this.history.some((entry) => entry.roomId === room.id);
    if (!alreadyArchived) {
      this.history.unshift(buildHistoryEntry(room));
      if (this.history.length > 50) {
        this.history = this.history.slice(0, 50);
      }
      this.profileManager?.recordRoomFinished(room);
    }
  }

  private requireRoom(roomCode: string): Room {
    const room = this.roomsByCode.get(roomCode.trim().toUpperCase());
    if (!room) {
      throw new DomainError(ERROR_CODES.ROOM_NOT_FOUND, 'Sala não encontrada.');
    }
    return room;
  }

  private requireParticipant(room: Room, participantId: string): Participant {
    const participant = room.participants.find((p) => p.id === participantId);
    if (!participant) {
      throw new DomainError(
        ERROR_CODES.PARTICIPANT_NOT_IN_ROOM,
        'Participante não pertence a esta sala.',
      );
    }
    return participant;
  }

  private touchRoom(room: Room): void {
    const now = new Date();
    room.updatedAt = now.toISOString();
    const ttl =
      room.status === 'WAITING_PARTICIPANT'
        ? APP_LIMITS.WAITING_ROOM_TTL_MS
        : APP_LIMITS.ACTIVE_ROOM_TTL_MS;
    room.expiresAt = new Date(now.getTime() + ttl).toISOString();
    room.stateVersion += 1;
  }

  private buildPersistedStore(): PersistedStore {
    const activeRooms: Record<string, Room> = {};
    for (const [code, room] of this.roomsByCode.entries()) {
      activeRooms[code] = room;
    }
    return {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      activeRooms,
      history: this.history,
      watchedMovies: this.watchedMovies,
    };
  }

  private persistSoon(): void {
    this.store.scheduleSave(() => this.buildPersistedStore());
  }

  private async persistNow(): Promise<void> {
    await this.store.saveAtomic(this.buildPersistedStore());
  }
}