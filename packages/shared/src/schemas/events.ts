import { z } from 'zod';
import {
  DeviceIdSchema,
  FilterCriteriaSchema,
  OperationIdSchema,
  ParticipantNameSchema,
  RoomCodeSchema,
  VoteDecisionSchema,
} from './domain';

export const RoomCreatePayloadSchema = z.object({
  hostName: ParticipantNameSchema,
  deviceId: DeviceIdSchema,
  filters: FilterCriteriaSchema.optional(),
});

export const RoomJoinPayloadSchema = z.object({
  code: RoomCodeSchema,
  participantName: ParticipantNameSchema,
  deviceId: DeviceIdSchema,
});

export const SessionSyncPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  deviceId: DeviceIdSchema,
  lastStateVersion: z.number().int().min(0).optional(),
});

export const RoomActionPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
});

export const FiltersUpdatePayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  filters: FilterCriteriaSchema,
});

export const VoteSubmitPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  operationId: OperationIdSchema,
  tmdbId: z.number().int().positive(),
  decision: VoteDecisionSchema,
});

export const MovieWatchedPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  tmdbId: z.number().int().positive(),
});

export const MatchDismissPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  tmdbId: z.number().int().positive(),
});

export const DecisionMoviePayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  tmdbId: z.number().int().positive(),
});

export const SessionEndPayloadSchema = z.object({
  roomCode: RoomCodeSchema,
  confirm: z.literal(true),
});

export type RoomCreatePayload = z.infer<typeof RoomCreatePayloadSchema>;
export type RoomJoinPayload = z.infer<typeof RoomJoinPayloadSchema>;
export type SessionSyncPayload = z.infer<typeof SessionSyncPayloadSchema>;
export type RoomActionPayload = z.infer<typeof RoomActionPayloadSchema>;
export type FiltersUpdatePayload = z.infer<typeof FiltersUpdatePayloadSchema>;
export type VoteSubmitPayload = z.infer<typeof VoteSubmitPayloadSchema>;
export type MovieWatchedPayload = z.infer<typeof MovieWatchedPayloadSchema>;
export type MatchDismissPayload = z.infer<typeof MatchDismissPayloadSchema>;
export type DecisionMoviePayload = z.infer<typeof DecisionMoviePayloadSchema>;
export type SessionEndPayload = z.infer<typeof SessionEndPayloadSchema>;
