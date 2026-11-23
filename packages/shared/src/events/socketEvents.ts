import type { ErrorCode } from '../constants/errors';
import type {
  ClientMatchItem,
  ClientRoomSnapshot,
  ConnectionStatus,
  DecisionMoviePayload,
  FilterCriteria,
  FiltersUpdatePayload,
  FinalDecisionProposal,
  MatchDismissPayload,
  MatchRecord,
  MovieSummary,
  MovieWatchedPayload,
  PartnerProgress,
  PublicParticipant,
  RoomActionPayload,
  RoomCreatePayload,
  RoomJoinPayload,
  RoomStatus,
  RouletteSpin,
  SessionEndPayload,
  SessionSyncPayload,
  VoteDecision,
  VoteSubmitPayload,
} from '../schemas';

export type SocketAck<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };

export interface VoteSubmitAckData {
  accepted: boolean;
  duplicate: boolean;
  isMatch: boolean;
  operationId: string;
  tmdbId: number;
  decision: VoteDecision;
  myVotesCount: number;
  queue: MovieSummary[];
  queueTotalRemaining: number;
  catalogExhausted: boolean;
  stateVersion: number;
}

export interface VoteUndoAckData {
  undoneMovieId: number;
  matchReverted: boolean;
  myVotesCount: number;
  canUndo: boolean;
  queue: MovieSummary[];
  queueTotalRemaining: number;
  catalogExhausted: boolean;
  matches: ClientMatchItem[];
  stateVersion: number;
}

export interface MovieWatchedAckData {
  tmdbId: number;
  title: string;
  queue: MovieSummary[];
  queueTotalRemaining: number;
  catalogExhausted: boolean;
  matches: ClientMatchItem[];
  stateVersion: number;
}

export interface ClientToServerEvents {
  'room:create': (
    payload: RoomCreatePayload,
    ack: (res: SocketAck<{ snapshot: ClientRoomSnapshot; joinPath: string }>) => void,
  ) => void;
  'room:join': (
    payload: RoomJoinPayload,
    ack: (res: SocketAck<{ snapshot: ClientRoomSnapshot; reconnected: boolean }>) => void,
  ) => void;
  'session:sync': (
    payload: SessionSyncPayload,
    ack: (res: SocketAck<{ snapshot: ClientRoomSnapshot }>) => void,
  ) => void;
  'session:start': (
    payload: RoomActionPayload,
    ack: (res: SocketAck<{ snapshot: ClientRoomSnapshot }>) => void,
  ) => void;
  'session:pause': (
    payload: RoomActionPayload,
    ack: (res: SocketAck<{ status: RoomStatus; stateVersion: number }>) => void,
  ) => void;
  'session:resume': (
    payload: RoomActionPayload,
    ack: (res: SocketAck<{ status: RoomStatus; stateVersion: number }>) => void,
  ) => void;
  'filters:update': (
    payload: FiltersUpdatePayload,
    ack: (res: SocketAck<{ snapshot: ClientRoomSnapshot }>) => void,
  ) => void;
  'queue:request_more': (
    payload: RoomActionPayload,
    ack: (
      res: SocketAck<{
        queue: MovieSummary[];
        queueTotalRemaining: number;
        catalogExhausted: boolean;
      }>,
    ) => void,
  ) => void;
  'vote:submit': (
    payload: VoteSubmitPayload,
    ack: (res: SocketAck<VoteSubmitAckData>) => void,
  ) => void;
  'vote:undo': (
    payload: RoomActionPayload,
    ack: (res: SocketAck<VoteUndoAckData>) => void,
  ) => void;
  'movie:mark_watched': (
    payload: MovieWatchedPayload,
    ack: (res: SocketAck<MovieWatchedAckData>) => void,
  ) => void;
  'match:dismiss': (
    payload: MatchDismissPayload,
    ack: (res: SocketAck<{ matches: ClientMatchItem[]; stateVersion: number }>) => void,
  ) => void;
  'decision:enter': (
    payload: RoomActionPayload,
    ack: (res: SocketAck<{ status: RoomStatus; stateVersion: number }>) => void,
  ) => void;
  'decision:return': (
    payload: RoomActionPayload,
    ack: (res: SocketAck<{ status: RoomStatus; stateVersion: number }>) => void,
  ) => void;
  'decision:spin_roulette': (
    payload: RoomActionPayload,
    ack: (
      res: SocketAck<{
        spin: RouletteSpin;
        finalProposal: FinalDecisionProposal;
        stateVersion: number;
      }>,
    ) => void,
  ) => void;
  'decision:propose': (
    payload: DecisionMoviePayload,
    ack: (res: SocketAck<{ finalProposal: FinalDecisionProposal; stateVersion: number }>) => void,
  ) => void;
  'decision:confirm': (
    payload: DecisionMoviePayload,
    ack: (
      res: SocketAck<{
        chosenMovie: MovieSummary | null;
        finalProposal: FinalDecisionProposal | null;
        status: RoomStatus;
        stateVersion: number;
      }>,
    ) => void,
  ) => void;
  'session:end': (
    payload: SessionEndPayload,
    ack: (res: SocketAck<{ status: RoomStatus; stateVersion: number }>) => void,
  ) => void;
}

export interface ServerToClientEvents {
  'participant:joined': (payload: {
    participant: PublicParticipant;
    roomStatus: RoomStatus;
    stateVersion: number;
  }) => void;
  'participant:status_changed': (payload: {
    participantId: string;
    connectionStatus: ConnectionStatus;
    lastSeenAt: string;
    stateVersion: number;
  }) => void;
  'participant:progress': (payload: PartnerProgress) => void;
  'session:started': (payload: { snapshot: ClientRoomSnapshot }) => void;
  'session:state_changed': (payload: {
    status: RoomStatus;
    stateVersion: number;
    updatedBy?: string;
  }) => void;
  'filters:updated': (payload: {
    filters: FilterCriteria;
    updatedBy: string;
    queue: MovieSummary[];
    queueTotalRemaining: number;
    catalogExhausted: boolean;
    stateVersion: number;
  }) => void;
  'vote:confirmed': (payload: {
    operationId: string;
    tmdbId: number;
    decision: VoteDecision;
    myVotesCount: number;
  }) => void;
  'movie:watched_removed': (payload: {
    tmdbId: number;
    title: string;
    markedBy: string;
    queue: MovieSummary[];
    queueTotalRemaining: number;
    catalogExhausted: boolean;
    matches: ClientMatchItem[];
    stateVersion: number;
  }) => void;
  'match:created': (payload: {
    match: MatchRecord;
    movie: MovieSummary;
    stateVersion: number;
  }) => void;
  'matches:updated': (payload: {
    matches: ClientMatchItem[];
    stateVersion: number;
  }) => void;
  'decision:roulette_spun': (payload: {
    spin: RouletteSpin;
    finalProposal: FinalDecisionProposal;
    stateVersion: number;
  }) => void;
  'decision:proposal_updated': (payload: {
    finalProposal: FinalDecisionProposal | null;
    stateVersion: number;
  }) => void;
  'session:finalized': (payload: {
    chosenMovie: MovieSummary | null;
    matches: ClientMatchItem[];
    stateVersion: number;
  }) => void;
  'server:error': (payload: {
    code: ErrorCode;
    message: string;
    recoverable: boolean;
  }) => void;
}
