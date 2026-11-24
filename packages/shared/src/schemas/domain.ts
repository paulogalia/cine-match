import { z } from 'zod';
import { APP_LIMITS } from '../constants/errors';

export const RoomStatusSchema = z.enum([
  'WAITING_PARTICIPANT',
  'READY',
  'IN_PROGRESS',
  'PAUSED',
  'DECIDING',
  'FINISHED',
]);

export const ConnectionStatusSchema = z.enum(['ONLINE', 'OFFLINE']);
export const ParticipantRoleSchema = z.enum(['HOST', 'GUEST']);
export const VoteDecisionSchema = z.enum(['LIKE', 'DISLIKE']);
export const MatchStatusSchema = z.enum(['ACTIVE', 'DISMISSED', 'CHOSEN']);
export const SortBySchema = z.enum([
  'popularity.desc',
  'vote_average.desc',
  'primary_release_date.desc',
]);

export const PersonRoleSchema = z.enum(['director', 'actor']);
export const TitleLanguageSchema = z.enum(['pt-BR', 'en-US', 'original']);
export const LetterboxdWatchedModeSchema = z.enum(['hide', 'warn', 'ignore']);
export const GroupMatchModeSchema = z.enum(['all', 'majority']);

export const SelectedPersonSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().trim().min(1).max(80),
  profilePath: z.string().nullable().optional(),
});

export const OscarCategorySchema = z.enum([
  'best_picture',
  'best_director',
  'international_feature',
  'animated_feature',
  'screenplay',
  'acting',
]);

export const OscarFilterSchema = z.object({
  enabled: z.boolean(),
  winnersOnly: z.boolean().optional(),
  categories: z.array(OscarCategorySchema).max(6).optional(),
  ceremonyYearFrom: z.number().int().min(1929).max(2030).optional(),
  ceremonyYearTo: z.number().int().min(1929).max(2030).optional(),
});

export const DeviceIdSchema = z.string().trim().min(8).max(64);
export const RoomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(APP_LIMITS.ROOM_CODE_LENGTH)
  .regex(/^[A-Z0-9]+$/);
export const ParticipantNameSchema = z
  .string()
  .trim()
  .min(APP_LIMITS.MIN_NAME_LENGTH)
  .max(APP_LIMITS.MAX_NAME_LENGTH);
export const OperationIdSchema = z.string().trim().min(8).max(80);

export const FilterCriteriaSchema = z.object({
  genreIds: z.array(z.number().int().positive()).max(10).default([]),
  yearFrom: z.number().int().min(1900).max(2100).optional(),
  yearTo: z.number().int().min(1900).max(2100).optional(),
  minRating: z.number().min(0).max(10).optional(),
  maxVoteCount: z.number().int().positive().optional(),
  sortBy: SortBySchema.default('popularity.desc'),
  originalLanguage: z.string().trim().min(2).max(5).optional(),
  minRuntime: z.number().int().min(1).max(600).optional(),
  maxRuntime: z.number().int().min(1).max(600).optional(),
  watchProviderIds: z.array(z.number().int().positive()).max(15).optional(),
  directors: z.array(SelectedPersonSchema).max(5).optional(),
  actors: z.array(SelectedPersonSchema).max(5).optional(),
  randomDiscovery: z.boolean().optional(),
  excludeHistory: z.boolean().optional(),
  presetId: z.string().trim().max(40).optional(),
  oscar: OscarFilterSchema.optional(),
  letterboxdWatchedMode: LetterboxdWatchedModeSchema.optional(),
  groupMatchMode: GroupMatchModeSchema.optional(),
});

export const MovieSummarySchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1),
  englishTitle: z.string().min(1).optional(),
  originalTitle: z.string().min(1),
  overview: z.string(),
  posterPath: z.string().nullable(),
  backdropPath: z.string().nullable(),
  voteAverage: z.number().min(0).max(10),
  voteCount: z.number().int().min(0),
  releaseYear: z.number().int().nullable(),
  genreIds: z.array(z.number().int()),
  originalLanguage: z.string(),
  runtime: z.number().int().positive().nullable().optional(),
  oscarBadge: z.string().max(90).optional(),
});

export const WatchedMovieEntrySchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1),
  posterPath: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
  markedAt: z.string(),
  markedBy: z.string().min(1),
});

export const ParticipantSchema = z.object({
  id: z.string().min(1),
  deviceId: DeviceIdSchema,
  name: ParticipantNameSchema,
  avatarColor: z.string().min(1),
  avatarDataUrl: z.string().max(45_000).nullable().optional(),
  publicProfileId: z.string().min(1).optional(),
  role: ParticipantRoleSchema,
  connectionStatus: ConnectionStatusSchema,
  socketId: z.string().nullable(),
  joinedAt: z.string(),
  lastSeenAt: z.string(),
});

export const PublicParticipantSchema = ParticipantSchema.omit({
  socketId: true,
  deviceId: true,
});

export const VoteSchema = z.object({
  operationId: OperationIdSchema,
  participantId: z.string().min(1),
  tmdbId: z.number().int().positive(),
  decision: VoteDecisionSchema,
  createdAt: z.string(),
});

export const MatchRecordSchema = z.object({
  tmdbId: z.number().int().positive(),
  matchedAt: z.string(),
  status: MatchStatusSchema,
  likedByParticipantIds: z.array(z.string()).optional(),
  dismissedBy: z.string().optional(),
  dismissedAt: z.string().optional(),
});

export const ParticipantQueueSchema = z.object({
  participantId: z.string().min(1),
  movieIds: z.array(z.number().int().positive()),
  cursor: z.number().int().min(0),
});

export const RouletteSpinSchema = z.object({
  spinId: z.string().min(1),
  triggeredBy: z.string().min(1),
  candidateIds: z.array(z.number().int().positive()).min(2),
  winnerMovieId: z.number().int().positive(),
  startedAt: z.string(),
  durationMs: z.number().int().positive(),
});

export const FinalDecisionProposalSchema = z.object({
  tmdbId: z.number().int().positive(),
  proposedBy: z.string().min(1),
  proposedAt: z.string(),
  confirmedBy: z.array(z.string()),
});

export const RoomSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
  status: RoomStatusSchema,
  stateVersion: z.number().int().min(0),
  participants: z.array(ParticipantSchema).max(APP_LIMITS.MAX_PARTICIPANTS_PER_ROOM),
  filters: FilterCriteriaSchema,
  catalogPage: z.number().int().min(0),
  visitedCatalogPages: z.array(z.number().int().positive()).optional(),
  catalogExhausted: z.boolean(),
  moviesById: z.record(z.string(), MovieSummarySchema),
  queues: z.record(z.string(), ParticipantQueueSchema),
  votes: z.array(VoteSchema),
  matches: z.record(z.string(), MatchRecordSchema),
  finalProposal: FinalDecisionProposalSchema.nullable(),
  chosenMovieId: z.number().int().positive().nullable(),
});

export const SessionHistoryEntrySchema = z.object({
  roomId: z.string().min(1),
  roomCode: z.string().min(1),
  createdAt: z.string(),
  finishedAt: z.string(),
  participantNames: z.array(z.string()),
  totalVotes: z.number().int().min(0),
  matches: z.array(
    z.object({
      movie: MovieSummarySchema,
      matchedAt: z.string(),
      status: MatchStatusSchema,
    }),
  ),
  chosenMovie: MovieSummarySchema.nullable(),
});

export const PersistedStoreSchema = z.object({
  schemaVersion: z.literal(1),
  savedAt: z.string(),
  activeRooms: z.record(z.string(), RoomSchema),
  history: z.array(SessionHistoryEntrySchema),
  watchedMovies: z.array(WatchedMovieEntrySchema).default([]),
});

export const ProfileLetterboxdDataSchema = z.object({
  watchedKeys: z.array(z.string()).default([]),
  watchedCount: z.number().int().min(0).default(0),
  watchlistKeys: z.array(z.string()).default([]),
  watchlistCount: z.number().int().min(0).default(0),
  importedAt: z.string().nullable().default(null),
});

export const PairAgreementSchema = z.object({
  partnerPublicId: z.string().min(1),
  partnerName: z.string().min(1),
  agreed: z.number().int().min(0),
  total: z.number().int().min(0),
});

export const ProfileStatsSchema = z.object({
  totalVotes: z.number().int().min(0).default(0),
  totalLikes: z.number().int().min(0).default(0),
  totalDislikes: z.number().int().min(0).default(0),
  totalSessions: z.number().int().min(0).default(0),
  totalMatches: z.number().int().min(0).default(0),
  chosenMoviesCount: z.number().int().min(0).default(0),
  watchedWithAppIds: z.array(z.number().int().positive()).default([]),
  genreLikes: z.record(z.string(), z.number().int().min(0)).default({}),
  pairAgreements: z.record(z.string(), PairAgreementSchema).default({}),
});

export const UserProfileSchema = z.object({
  id: DeviceIdSchema,
  publicId: z.string().min(1),
  recoveryCode: z.string().min(4).max(20),
  name: ParticipantNameSchema.optional(),
  avatarColor: z.string().min(1),
  avatarDataUrl: z.string().max(45_000).nullable().default(null),
  titleLanguage: TitleLanguageSchema.default('pt-BR'),
  letterboxd: ProfileLetterboxdDataSchema.default({
    watchedKeys: [],
    watchedCount: 0,
    watchlistKeys: [],
    watchlistCount: 0,
    importedAt: null,
  }),
  stats: ProfileStatsSchema.default({
    totalVotes: 0,
    totalLikes: 0,
    totalDislikes: 0,
    totalSessions: 0,
    totalMatches: 0,
    chosenMoviesCount: 0,
    watchedWithAppIds: [],
    genreLikes: {},
    pairAgreements: {},
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const ProfileUpdatePayloadSchema = z.object({
  name: ParticipantNameSchema.optional(),
  avatarColor: z.string().min(1).max(32).optional(),
  avatarDataUrl: z.string().max(45_000).nullable().optional(),
  titleLanguage: TitleLanguageSchema.optional(),
});

export const ProfileRecoverPayloadSchema = z.object({
  recoveryCode: z.string().trim().min(4).max(20),
});

export const LetterboxdImportPayloadSchema = z.object({
  kind: z.enum(['watched', 'watchlist']),
  csvText: z.string().min(1).max(2_000_000),
});

export const PersistedProfilesStoreSchema = z.object({
  schemaVersion: z.literal(1),
  savedAt: z.string(),
  profiles: z.record(z.string(), UserProfileSchema),
});

export const NetworkInterfaceInfoSchema = z.object({
  interfaceName: z.string(),
  address: z.string(),
  url: z.string().url(),
  recommended: z.boolean(),
});

export const NetworkInfoResponseSchema = z.object({
  port: z.number().int().positive(),
  primaryUrl: z.string().url(),
  candidates: z.array(NetworkInterfaceInfoSchema),
  hostname: z.string(),
});

export type RoomStatus = z.infer<typeof RoomStatusSchema>;
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;
export type ParticipantRole = z.infer<typeof ParticipantRoleSchema>;
export type VoteDecision = z.infer<typeof VoteDecisionSchema>;
export type MatchStatus = z.infer<typeof MatchStatusSchema>;
export type PersonRole = z.infer<typeof PersonRoleSchema>;
export type TitleLanguage = z.infer<typeof TitleLanguageSchema>;
export type LetterboxdWatchedMode = z.infer<typeof LetterboxdWatchedModeSchema>;
export type GroupMatchMode = z.infer<typeof GroupMatchModeSchema>;
export type SelectedPerson = z.infer<typeof SelectedPersonSchema>;
export type OscarCategory = z.infer<typeof OscarCategorySchema>;
export type OscarFilter = z.infer<typeof OscarFilterSchema>;
export type FilterCriteria = z.infer<typeof FilterCriteriaSchema>;
export type MovieSummary = z.infer<typeof MovieSummarySchema>;
export type WatchedMovieEntry = z.infer<typeof WatchedMovieEntrySchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type PublicParticipant = z.infer<typeof PublicParticipantSchema>;
export type Vote = z.infer<typeof VoteSchema>;
export type MatchRecord = z.infer<typeof MatchRecordSchema>;
export type ParticipantQueue = z.infer<typeof ParticipantQueueSchema>;
export type RouletteSpin = z.infer<typeof RouletteSpinSchema>;
export type FinalDecisionProposal = z.infer<typeof FinalDecisionProposalSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type SessionHistoryEntry = z.infer<typeof SessionHistoryEntrySchema>;
export type PersistedStore = z.infer<typeof PersistedStoreSchema>;
export type ProfileLetterboxdData = z.infer<typeof ProfileLetterboxdDataSchema>;
export type PairAgreement = z.infer<typeof PairAgreementSchema>;
export type ProfileStats = z.infer<typeof ProfileStatsSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type ProfileUpdatePayload = z.infer<typeof ProfileUpdatePayloadSchema>;
export type ProfileRecoverPayload = z.infer<typeof ProfileRecoverPayloadSchema>;
export type LetterboxdImportPayload = z.infer<typeof LetterboxdImportPayloadSchema>;
export type PersistedProfilesStore = z.infer<typeof PersistedProfilesStoreSchema>;
export type NetworkInterfaceInfo = z.infer<typeof NetworkInterfaceInfoSchema>;
export type NetworkInfoResponse = z.infer<typeof NetworkInfoResponseSchema>;

export interface ClientMatchItem {
  match: MatchRecord;
  movie: MovieSummary;
}

export interface PartnerProgress {
  participantId: string;
  votedCount: number;
  queueRemaining: number;
}

export interface ClientRoomSnapshot {
  id: string;
  code: string;
  status: RoomStatus;
  stateVersion: number;
  createdAt: string;
  updatedAt: string;
  myParticipantId: string;
  participants: PublicParticipant[];
  partnerProgress: PartnerProgress | null;
  partnerProgressList?: PartnerProgress[];
  filters: FilterCriteria;
  queue: MovieSummary[];
  queueTotalRemaining: number;
  catalogExhausted: boolean;
  myVotesCount: number;
  myVotedMovieIds: number[];
  canUndo?: boolean;
  matches: ClientMatchItem[];
  finalProposal: FinalDecisionProposal | null;
  chosenMovie: MovieSummary | null;
  watchedByByMovieId?: Record<string, string[]>;
  watchlistedByByMovieId?: Record<string, string[]>;
  likeCountsByMovieId?: Record<string, number>;
  requiredLikesForMatch?: number;
}