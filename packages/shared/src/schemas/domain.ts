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
  randomDiscovery: z.boolean().optional(),
  excludeHistory: z.boolean().optional(),
  presetId: z.string().trim().max(40).optional(),
  oscar: OscarFilterSchema.optional(),
});

export const MovieSummarySchema = z.object({
  tmdbId: z.number().int().positive(),
  title: z.string().min(1),
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

export const ParticipantSchema = z.object({
  id: z.string().min(1),
  deviceId: DeviceIdSchema,
  name: ParticipantNameSchema,
  avatarColor: z.string().min(1),
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
  dismissedBy: z.string().optional(),
  dismissedAt: z.string().optional(),
});

export const ParticipantQueueSchema = z.object({
  participantId: z.string().min(1),
  movieIds: z.array(z.number().int().positive()),
  cursor: z.number().int().min(0),
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
export type OscarCategory = z.infer<typeof OscarCategorySchema>;
export type OscarFilter = z.infer<typeof OscarFilterSchema>;
export type FilterCriteria = z.infer<typeof FilterCriteriaSchema>;
export type MovieSummary = z.infer<typeof MovieSummarySchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type PublicParticipant = z.infer<typeof PublicParticipantSchema>;
export type Vote = z.infer<typeof VoteSchema>;
export type MatchRecord = z.infer<typeof MatchRecordSchema>;
export type ParticipantQueue = z.infer<typeof ParticipantQueueSchema>;
export type FinalDecisionProposal = z.infer<typeof FinalDecisionProposalSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type SessionHistoryEntry = z.infer<typeof SessionHistoryEntrySchema>;
export type PersistedStore = z.infer<typeof PersistedStoreSchema>;
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
  filters: FilterCriteria;
  queue: MovieSummary[];
  queueTotalRemaining: number;
  catalogExhausted: boolean;
  myVotesCount: number;
  myVotedMovieIds: number[];
  matches: ClientMatchItem[];
  finalProposal: FinalDecisionProposal | null;
  chosenMovie: MovieSummary | null;
}
