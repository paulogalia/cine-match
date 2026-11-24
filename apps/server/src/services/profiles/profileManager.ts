import crypto from 'node:crypto';
import {
  AVATAR_COLORS,
  ERROR_CODES,
  type MovieSummary,
  type Participant,
  type PersistedProfilesStore,
  type ProfileUpdatePayload,
  type Room,
  type UserProfile,
  type VoteDecision,
} from '@cine-match/shared';
import { DomainError, sanitizeDisplayText } from '../../utils/sanitize';
import { getMovieCandidateKeys, parseLetterboxdCsv } from './letterboxdParser';
import type { ProfileStore } from './profileStore';

const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ALLOWED_AVATAR_PREFIX = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/;

export class ProfileManager {
  private readonly store: ProfileStore;
  private readonly profilesById = new Map<string, UserProfile>();
  private readonly watchedSetCache = new Map<string, Set<string>>();
  private readonly watchlistSetCache = new Map<string, Set<string>>();

  constructor(store: ProfileStore) {
    this.store = store;
  }

  async init(): Promise<void> {
    const persisted = await this.store.load();
    this.profilesById.clear();
    this.watchedSetCache.clear();
    this.watchlistSetCache.clear();

    for (const profile of Object.values(persisted.profiles)) {
      this.profilesById.set(profile.id, profile);
      this.rebuildKeyCaches(profile);
    }
  }

  async flush(): Promise<void> {
    await this.store.flush();
  }

  getProfile(profileId: string): UserProfile | undefined {
    return this.profilesById.get(profileId);
  }

  getOrCreateProfile(profileId: string, fallbackName?: string): UserProfile {
    const existing = this.profilesById.get(profileId);
    if (existing) {
      if (!existing.name && fallbackName) {
        const clean = sanitizeDisplayText(fallbackName);
        if (clean.length >= 2) {
          existing.name = clean;
          existing.updatedAt = new Date().toISOString();
          this.persistSoon();
        }
      }
      return existing;
    }

    const nowIso = new Date().toISOString();
    const colorIndex = Math.abs(this.hashString(profileId)) % AVATAR_COLORS.length;
    const cleanName = fallbackName ? sanitizeDisplayText(fallbackName) : undefined;

    const created: UserProfile = {
      id: profileId,
      publicId: `pub_${crypto.randomBytes(6).toString('hex')}`,
      recoveryCode: this.generateUniqueRecoveryCode(),
      name: cleanName && cleanName.length >= 2 ? cleanName : undefined,
      avatarColor: AVATAR_COLORS[colorIndex] ?? AVATAR_COLORS[0] ?? '#E11D48',
      avatarDataUrl: null,
      titleLanguage: 'pt-BR',
      letterboxd: {
        watchedKeys: [],
        watchedCount: 0,
        watchlistKeys: [],
        watchlistCount: 0,
        importedAt: null,
      },
      stats: {
        totalVotes: 0,
        totalLikes: 0,
        totalDislikes: 0,
        totalSessions: 0,
        totalMatches: 0,
        chosenMoviesCount: 0,
        watchedWithAppIds: [],
        genreLikes: {},
        pairAgreements: {},
      },
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.profilesById.set(profileId, created);
    this.rebuildKeyCaches(created);
    this.persistSoon();
    return created;
  }

  updateProfile(profileId: string, patch: ProfileUpdatePayload): UserProfile {
    const profile = this.getOrCreateProfile(profileId);

    if (patch.name !== undefined) {
      const clean = sanitizeDisplayText(patch.name);
      if (clean.length < 2) {
        throw new DomainError(
          ERROR_CODES.VALIDATION_ERROR,
          'O nome precisa ter pelo menos 2 caracteres.',
        );
      }
      profile.name = clean;
    }

    if (patch.avatarColor !== undefined) {
      profile.avatarColor = patch.avatarColor;
    }

    if (patch.avatarDataUrl !== undefined) {
      if (patch.avatarDataUrl === null || patch.avatarDataUrl === '') {
        profile.avatarDataUrl = null;
      } else {
        if (!ALLOWED_AVATAR_PREFIX.test(patch.avatarDataUrl)) {
          throw new DomainError(
            ERROR_CODES.VALIDATION_ERROR,
            'Formato de imagem inválido. Use WebP, JPEG ou PNG.',
          );
        }
        profile.avatarDataUrl = patch.avatarDataUrl;
      }
    }

    if (patch.titleLanguage !== undefined) {
      profile.titleLanguage = patch.titleLanguage;
    }

    profile.updatedAt = new Date().toISOString();
    this.persistSoon();
    return profile;
  }

  recoverByCode(rawCode: string): UserProfile | null {
    const normalized = rawCode.trim().toUpperCase();
    for (const profile of this.profilesById.values()) {
      if (profile.recoveryCode.toUpperCase() === normalized) {
        return profile;
      }
    }
    return null;
  }

  importLetterboxdCsv(
    profileId: string,
    kind: 'watched' | 'watchlist',
    csvText: string,
  ): { profile: UserProfile; importedCount: number } {
    const profile = this.getOrCreateProfile(profileId);

    let parsed;
    try {
      parsed = parseLetterboxdCsv(csvText);
    } catch (err) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        err instanceof Error ? err.message : 'Não foi possível ler o arquivo CSV.',
      );
    }

    if (parsed.movieCount === 0) {
      throw new DomainError(
        ERROR_CODES.VALIDATION_ERROR,
        'Nenhum filme foi encontrado neste CSV do Letterboxd.',
      );
    }

    if (kind === 'watched') {
      profile.letterboxd.watchedKeys = parsed.keys;
      profile.letterboxd.watchedCount = parsed.movieCount;
    } else {
      profile.letterboxd.watchlistKeys = parsed.keys;
      profile.letterboxd.watchlistCount = parsed.movieCount;
    }

    profile.letterboxd.importedAt = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();
    this.rebuildKeyCaches(profile);
    this.persistSoon();

    return { profile, importedCount: parsed.movieCount };
  }

  clearLetterboxdList(profileId: string, kind: 'watched' | 'watchlist'): UserProfile {
    const profile = this.getOrCreateProfile(profileId);
    if (kind === 'watched') {
      profile.letterboxd.watchedKeys = [];
      profile.letterboxd.watchedCount = 0;
    } else {
      profile.letterboxd.watchlistKeys = [];
      profile.letterboxd.watchlistCount = 0;
    }
    profile.updatedAt = new Date().toISOString();
    this.rebuildKeyCaches(profile);
    this.persistSoon();
    return profile;
  }

  // ==================== Estatísticas ====================

  recordVote(deviceId: string, movie: MovieSummary | undefined, decision: VoteDecision): void {
    const profile = this.getOrCreateProfile(deviceId);
    profile.stats.totalVotes += 1;
    if (decision === 'LIKE') {
      profile.stats.totalLikes += 1;
      for (const genreId of movie?.genreIds ?? []) {
        const key = String(genreId);
        profile.stats.genreLikes[key] = (profile.stats.genreLikes[key] ?? 0) + 1;
      }
    } else {
      profile.stats.totalDislikes += 1;
    }
    profile.updatedAt = new Date().toISOString();
    this.persistSoon();
  }

  revertVote(deviceId: string, movie: MovieSummary | undefined, decision: VoteDecision): void {
    const profile = this.profilesById.get(deviceId);
    if (!profile) return;

    profile.stats.totalVotes = Math.max(0, profile.stats.totalVotes - 1);
    if (decision === 'LIKE') {
      profile.stats.totalLikes = Math.max(0, profile.stats.totalLikes - 1);
      for (const genreId of movie?.genreIds ?? []) {
        const key = String(genreId);
        const current = profile.stats.genreLikes[key] ?? 0;
        if (current <= 1) {
          delete profile.stats.genreLikes[key];
        } else {
          profile.stats.genreLikes[key] = current - 1;
        }
      }
    } else {
      profile.stats.totalDislikes = Math.max(0, profile.stats.totalDislikes - 1);
    }

    profile.updatedAt = new Date().toISOString();
    this.persistSoon();
  }

  recordRoomFinished(room: Room): void {
    const activeOrChosenMatches = Object.values(room.matches).filter(
      (m) => m.status === 'ACTIVE' || m.status === 'CHOSEN',
    ).length;

    const profiles = room.participants.map((p) => ({
      participant: p,
      profile: this.getOrCreateProfile(p.deviceId, p.name),
    }));

    for (const { profile } of profiles) {
      profile.stats.totalSessions += 1;
      profile.stats.totalMatches += activeOrChosenMatches;

      if (room.chosenMovieId !== null) {
        profile.stats.chosenMoviesCount += 1;
        if (!profile.stats.watchedWithAppIds.includes(room.chosenMovieId)) {
          profile.stats.watchedWithAppIds.unshift(room.chosenMovieId);
        }
      }
      profile.updatedAt = new Date().toISOString();
    }

    // Calcula afinidade par-a-par com base nos filmes votados em comum na sessão
    const votesByParticipant = new Map<string, Map<number, VoteDecision>>();
    for (const vote of room.votes) {
      let map = votesByParticipant.get(vote.participantId);
      if (!map) {
        map = new Map<number, VoteDecision>();
        votesByParticipant.set(vote.participantId, map);
      }
      map.set(vote.tmdbId, vote.decision);
    }

    for (let i = 0; i < profiles.length; i += 1) {
      for (let j = i + 1; j < profiles.length; j += 1) {
        const a = profiles[i];
        const b = profiles[j];
        if (!a || !b) continue;

        const votesA = votesByParticipant.get(a.participant.id);
        const votesB = votesByParticipant.get(b.participant.id);
        if (!votesA || !votesB) continue;

        let common = 0;
        let agreed = 0;
        for (const [tmdbId, decisionA] of votesA.entries()) {
          const decisionB = votesB.get(tmdbId);
          if (!decisionB) continue;
          common += 1;
          if (decisionA === decisionB) agreed += 1;
        }

        if (common === 0) continue;

        this.addPairAgreement(a.profile, b.profile.publicId, b.participant.name, agreed, common);
        this.addPairAgreement(b.profile, a.profile.publicId, a.participant.name, agreed, common);
      }
    }

    this.persistSoon();
  }

  // ==================== Cruzamento Letterboxd ====================

  isMovieWatchedByAnyParticipant(participants: Participant[], movie: MovieSummary): boolean {
    const candidates = getMovieCandidateKeys(movie);
    if (candidates.length === 0) return false;

    for (const p of participants) {
      const watchedSet = this.watchedSetCache.get(p.deviceId);
      if (!watchedSet || watchedSet.size === 0) continue;
      for (const key of candidates) {
        if (watchedSet.has(key)) return true;
      }
    }
    return false;
  }

  getRoomMovieAnnotations(
    participants: Participant[],
    movies: MovieSummary[],
  ): {
    watchedByByMovieId: Record<string, string[]>;
    watchlistedByByMovieId: Record<string, string[]>;
  } {
    const watchedByByMovieId: Record<string, string[]> = {};
    const watchlistedByByMovieId: Record<string, string[]> = {};

    const participantCaches = participants.map((p) => ({
      name: p.name,
      watched: this.watchedSetCache.get(p.deviceId),
      watchlist: this.watchlistSetCache.get(p.deviceId),
    }));

    const hasAnyData = participantCaches.some(
      (c) => (c.watched?.size ?? 0) > 0 || (c.watchlist?.size ?? 0) > 0,
    );
    if (!hasAnyData) {
      return { watchedByByMovieId, watchlistedByByMovieId };
    }

    for (const movie of movies) {
      const candidates = getMovieCandidateKeys(movie);
      if (candidates.length === 0) continue;

      const watchedNames: string[] = [];
      const watchlistNames: string[] = [];

      for (const pc of participantCaches) {
        if (pc.watched && candidates.some((k) => pc.watched!.has(k))) {
          watchedNames.push(pc.name);
        }
        if (pc.watchlist && candidates.some((k) => pc.watchlist!.has(k))) {
          watchlistNames.push(pc.name);
        }
      }

      if (watchedNames.length > 0) {
        watchedByByMovieId[String(movie.tmdbId)] = watchedNames;
      }
      if (watchlistNames.length > 0) {
        watchlistedByByMovieId[String(movie.tmdbId)] = watchlistNames;
      }
    }

    return { watchedByByMovieId, watchlistedByByMovieId };
  }

  // ==================== Helpers ====================

  private addPairAgreement(
    profile: UserProfile,
    partnerPublicId: string,
    partnerName: string,
    agreedDelta: number,
    totalDelta: number,
  ): void {
    const prev = profile.stats.pairAgreements[partnerPublicId];
    profile.stats.pairAgreements[partnerPublicId] = {
      partnerPublicId,
      partnerName,
      agreed: (prev?.agreed ?? 0) + agreedDelta,
      total: (prev?.total ?? 0) + totalDelta,
    };
  }

  private rebuildKeyCaches(profile: UserProfile): void {
    this.watchedSetCache.set(profile.id, new Set(profile.letterboxd.watchedKeys));
    this.watchlistSetCache.set(profile.id, new Set(profile.letterboxd.watchlistKeys));
  }

  private generateUniqueRecoveryCode(): string {
    const existing = new Set(
      Array.from(this.profilesById.values()).map((p) => p.recoveryCode.toUpperCase()),
    );

    for (let attempt = 0; attempt < 20; attempt += 1) {
      let suffix = '';
      const bytes = crypto.randomBytes(4);
      for (let i = 0; i < 4; i += 1) {
        suffix += RECOVERY_ALPHABET[(bytes[i] ?? 0) % RECOVERY_ALPHABET.length] ?? 'X';
      }
      const code = `CINE-${suffix}`;
      if (!existing.has(code)) return code;
    }

    return `CINE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private hashString(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash * 31 + input.charCodeAt(i)) | 0;
    }
    return hash;
  }

  private buildStore(): PersistedProfilesStore {
    const profiles: Record<string, UserProfile> = {};
    for (const [id, profile] of this.profilesById.entries()) {
      profiles[id] = profile;
    }
    return {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      profiles,
    };
  }

  private persistSoon(): void {
    this.store.scheduleSave(() => this.buildStore());
  }
}