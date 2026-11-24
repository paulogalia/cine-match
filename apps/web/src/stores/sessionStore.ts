import { create } from 'zustand';
import type {
  CatalogStatus,
  ClientMatchItem,
  ClientRoomSnapshot,
  ConnectionStatus,
  FilterCriteria,
  FinalDecisionProposal,
  Genre,
  MovieSummary,
  NetworkInfoResponse,
  PartnerProgress,
  PublicParticipant,
  RoomStatus,
  RouletteSpin,
  TitleLanguage,
  UserProfile,
  WatchProviderOption,
} from '@cine-match/shared';
import { localPersistence } from '../services/storage';
import { POPULAR_GENRES } from '../utils/genres';
import { loadSoundPreference, saveSoundPreference } from '../utils/sounds';

export type SocketConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'unavailable';

export type AppView = 'home' | 'create' | 'join';

export interface ToastMessage {
  id: string;
  tone: 'info' | 'success' | 'error';
  text: string;
}

interface SessionStoreState {
  deviceId: string;
  savedName: string;
  profile: UserProfile | null;
  profileOpen: boolean;
  titleLanguage: TitleLanguage;
  view: AppView;
  prefilledJoinCode: string;
  connectionState: SocketConnectionState;
  networkInfo: NetworkInfoResponse | null;
  catalogStatus: CatalogStatus;
  genres: Genre[];
  watchProviders: WatchProviderOption[];
  soundEnabled: boolean;
  snapshot: ClientRoomSnapshot | null;
  pendingVoteMovieIds: number[];
  loadingMoreMovies: boolean;
  matchQueue: MovieSummary[];
  celebratedMatchIds: number[];
  selectedMovieForDetails: MovieSummary | null;
  activeRouletteSpin: RouletteSpin | null;
  historyOpen: boolean;
  diagnosticsOpen: boolean;
  toast: ToastMessage | null;
  busyAction: boolean;

  setView: (view: AppView) => void;
  setPrefilledJoinCode: (code: string) => void;
  setSavedName: (name: string) => void;
  setProfile: (profile: UserProfile | null) => void;
  applyRecoveredProfile: (profile: UserProfile) => void;
  setProfileOpen: (open: boolean) => void;
  setTitleLanguage: (language: TitleLanguage) => void;
  setConnectionState: (state: SocketConnectionState) => void;
  setNetworkInfo: (info: NetworkInfoResponse | null) => void;
  setCatalogStatus: (status: CatalogStatus) => void;
  setGenres: (genres: Genre[]) => void;
  setWatchProviders: (providers: WatchProviderOption[]) => void;
  toggleSound: () => void;
  setSnapshot: (snapshot: ClientRoomSnapshot | null) => void;
  setLoadingMoreMovies: (loading: boolean) => void;
  setDiagnosticsOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setBusyAction: (busy: boolean) => void;
  showToast: (text: string, tone?: ToastMessage['tone']) => void;
  clearToast: () => void;

  enqueueMatchCelebration: (movie: MovieSummary) => void;
  dismissCurrentMatchCelebration: () => void;
  openMovieDetails: (movie: MovieSummary) => void;
  closeMovieDetails: () => void;
  setActiveRouletteSpin: (spin: RouletteSpin | null) => void;

  addPendingVote: (tmdbId: number) => void;
  removePendingVote: (tmdbId: number) => void;
  reconcileVoteResult: (payload: {
    tmdbId: number;
    myVotesCount: number;
    queue: MovieSummary[];
    queueTotalRemaining: number;
    catalogExhausted: boolean;
    stateVersion: number;
  }) => void;
  applyUndoResult: (payload: {
    undoneMovieId: number;
    myVotesCount: number;
    canUndo: boolean;
    queue: MovieSummary[];
    queueTotalRemaining: number;
    catalogExhausted: boolean;
    matches: ClientMatchItem[];
    stateVersion: number;
  }) => void;
  applyWatchedRemoved: (payload: {
    tmdbId: number;
    queue: MovieSummary[];
    queueTotalRemaining: number;
    catalogExhausted: boolean;
    matches: ClientMatchItem[];
    stateVersion: number;
  }) => void;
  applyQueueUpdate: (payload: {
    queue: MovieSummary[];
    queueTotalRemaining: number;
    catalogExhausted: boolean;
  }) => void;

  applyParticipantJoined: (
    participant: PublicParticipant,
    roomStatus: RoomStatus,
    version: number,
  ) => void;
  applyParticipantStatus: (
    participantId: string,
    status: ConnectionStatus,
    lastSeenAt: string,
    version: number,
  ) => void;
  applyPartnerProgress: (progress: PartnerProgress) => void;
  applyRoomStatus: (status: RoomStatus, version: number) => void;
  applyFiltersUpdated: (
    filters: FilterCriteria,
    queue: MovieSummary[],
    queueTotalRemaining: number,
    catalogExhausted: boolean,
    version: number,
  ) => void;
  applyMatchesUpdated: (matches: ClientMatchItem[], version: number) => void;
  applyFinalProposal: (proposal: FinalDecisionProposal | null, version: number) => void;
  applyFinalized: (
    chosenMovie: MovieSummary | null,
    matches: ClientMatchItem[],
    version: number,
  ) => void;
  leaveSessionLocal: () => void;
}

function getInitialJoinCodeFromUrl(): string {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('join') ?? '';
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
}

const initialJoinCode = getInitialJoinCodeFromUrl();

function computeRequiredLikes(
  participants: PublicParticipant[],
  groupMatchMode?: FilterCriteria['groupMatchMode'],
): number {
  if (participants.length <= 2) return 2;
  const onlineCount = participants.filter((p) => p.connectionStatus === 'ONLINE').length;
  const effectiveActive = Math.min(participants.length, Math.max(2, onlineCount));
  return groupMatchMode === 'majority' ? Math.floor(effectiveActive / 2) + 1 : effectiveActive;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  deviceId: typeof window !== 'undefined' ? localPersistence.getDeviceId() : 'dev_ssr_fallback',
  savedName: typeof window !== 'undefined' ? localPersistence.getSavedName() : '',
  profile: null,
  profileOpen: false,
  titleLanguage: typeof window !== 'undefined' ? localPersistence.getTitleLanguage() : 'pt-BR',
  view: initialJoinCode ? 'join' : 'home',
  prefilledJoinCode: initialJoinCode,
  connectionState: 'connecting',
  networkInfo: null,
  catalogStatus: { source: 'seed', tmdbConfigured: false },
  genres: POPULAR_GENRES,
  watchProviders: [
    { providerId: 8, name: 'Netflix', logoPath: null },
    { providerId: 119, name: 'Amazon Prime Video', logoPath: null },
    { providerId: 1899, name: 'Max', logoPath: null },
    { providerId: 337, name: 'Disney+', logoPath: null },
    { providerId: 307, name: 'Globoplay', logoPath: null },
    { providerId: 350, name: 'Apple TV+', logoPath: null },
    { providerId: 11, name: 'MUBI', logoPath: null },
    { providerId: 531, name: 'Paramount+', logoPath: null },
  ],
  soundEnabled: loadSoundPreference(),
  snapshot: null,
  pendingVoteMovieIds: [],
  loadingMoreMovies: false,
  matchQueue: [],
  celebratedMatchIds: [],
  selectedMovieForDetails: null,
  activeRouletteSpin: null,
  historyOpen: false,
  diagnosticsOpen: false,
  toast: null,
  busyAction: false,

  setView: (view) => set({ view }),
  setPrefilledJoinCode: (prefilledJoinCode) => set({ prefilledJoinCode }),
  setSavedName: (name) => {
    localPersistence.saveName(name);
    set({ savedName: name.trim() });
  },
  setProfile: (profile) =>
    set((state) => {
      if (!profile) return { profile: null };
      const trimmedName = profile.name?.trim();
      if (trimmedName) {
        localPersistence.saveName(trimmedName);
      }
      const nextLang = profile.titleLanguage ?? state.titleLanguage;
      localPersistence.saveTitleLanguage(nextLang);
      return {
        profile,
        savedName: trimmedName || state.savedName,
        titleLanguage: nextLang,
      };
    }),
  applyRecoveredProfile: (profile) => {
    localPersistence.setDeviceId(profile.id);
    const trimmedName = profile.name?.trim() ?? '';
    if (trimmedName) {
      localPersistence.saveName(trimmedName);
    }
    localPersistence.saveTitleLanguage(profile.titleLanguage);
    set({
      deviceId: profile.id,
      profile,
      savedName: trimmedName,
      titleLanguage: profile.titleLanguage,
    });
  },
  setProfileOpen: (profileOpen) => set({ profileOpen }),
  setTitleLanguage: (titleLanguage) => {
    localPersistence.saveTitleLanguage(titleLanguage);
    set((state) => ({
      titleLanguage,
      profile: state.profile ? { ...state.profile, titleLanguage } : state.profile,
    }));
  },
  setConnectionState: (connectionState) => set({ connectionState }),
  setNetworkInfo: (networkInfo) => set({ networkInfo }),
  setCatalogStatus: (catalogStatus) => set({ catalogStatus }),
  setGenres: (genres) => set({ genres: genres.length > 0 ? genres : POPULAR_GENRES }),
  setWatchProviders: (watchProviders) =>
    set((state) => ({
      watchProviders: watchProviders.length > 0 ? watchProviders : state.watchProviders,
    })),
  toggleSound: () =>
    set((state) => {
      const next = !state.soundEnabled;
      saveSoundPreference(next);
      return { soundEnabled: next };
    }),
  setSnapshot: (snapshot) =>
    set((state) => {
      if (snapshot) {
        localPersistence.saveActiveRoomCode(snapshot.code);
      }
      const isSameRoom = Boolean(snapshot && state.snapshot?.code === snapshot.code);
      const existingMatchIds = snapshot ? snapshot.matches.map((m) => m.movie.tmdbId) : [];

      return {
        snapshot,
        pendingVoteMovieIds: [],
        celebratedMatchIds: isSameRoom ? state.celebratedMatchIds : existingMatchIds,
      };
    }),
  setLoadingMoreMovies: (loadingMoreMovies) => set({ loadingMoreMovies }),
  setDiagnosticsOpen: (diagnosticsOpen) => set({ diagnosticsOpen }),
  setHistoryOpen: (historyOpen) => set({ historyOpen }),
  setBusyAction: (busyAction) => set({ busyAction }),
  showToast: (text, tone = 'info') =>
    set({ toast: { id: `${Date.now()}_${Math.random()}`, tone, text } }),
  clearToast: () => set({ toast: null }),

  enqueueMatchCelebration: (movie) =>
    set((state) => {
      if (
        state.celebratedMatchIds.includes(movie.tmdbId) ||
        state.matchQueue.some((m) => m.tmdbId === movie.tmdbId)
      ) {
        return state;
      }
      return {
        celebratedMatchIds: [...state.celebratedMatchIds, movie.tmdbId],
        matchQueue: [...state.matchQueue, movie],
      };
    }),
  dismissCurrentMatchCelebration: () =>
    set((state) => ({ matchQueue: state.matchQueue.slice(1) })),
  openMovieDetails: (movie) => set({ selectedMovieForDetails: movie }),
  closeMovieDetails: () => set({ selectedMovieForDetails: null }),
  setActiveRouletteSpin: (activeRouletteSpin) => set({ activeRouletteSpin }),

  addPendingVote: (tmdbId) =>
    set((state) => ({
      pendingVoteMovieIds: state.pendingVoteMovieIds.includes(tmdbId)
        ? state.pendingVoteMovieIds
        : [...state.pendingVoteMovieIds, tmdbId],
    })),
  removePendingVote: (tmdbId) =>
    set((state) => ({
      pendingVoteMovieIds: state.pendingVoteMovieIds.filter((id) => id !== tmdbId),
    })),
  reconcileVoteResult: ({
    tmdbId,
    myVotesCount,
    queue,
    queueTotalRemaining,
    catalogExhausted,
    stateVersion,
  }) =>
    set((state) => {
      if (!state.snapshot) return state;
      const myVotedMovieIds = state.snapshot.myVotedMovieIds.includes(tmdbId)
        ? state.snapshot.myVotedMovieIds
        : [...state.snapshot.myVotedMovieIds, tmdbId];
      return {
        pendingVoteMovieIds: state.pendingVoteMovieIds.filter((id) => id !== tmdbId),
        snapshot: {
          ...state.snapshot,
          myVotesCount,
          myVotedMovieIds,
          canUndo: state.snapshot.status === 'IN_PROGRESS' && myVotesCount > 0,
          queue,
          queueTotalRemaining,
          catalogExhausted,
          stateVersion: Math.max(state.snapshot.stateVersion, stateVersion),
        },
      };
    }),

  applyUndoResult: ({
    undoneMovieId,
    myVotesCount,
    canUndo,
    queue,
    queueTotalRemaining,
    catalogExhausted,
    matches,
    stateVersion,
  }) =>
    set((state) => {
      if (!state.snapshot) return state;
      return {
        pendingVoteMovieIds: state.pendingVoteMovieIds.filter((id) => id !== undoneMovieId),
        celebratedMatchIds: state.celebratedMatchIds.filter((id) => id !== undoneMovieId),
        matchQueue: state.matchQueue.filter((m) => m.tmdbId !== undoneMovieId),
        snapshot: {
          ...state.snapshot,
          myVotesCount,
          myVotedMovieIds: state.snapshot.myVotedMovieIds.filter((id) => id !== undoneMovieId),
          canUndo,
          queue,
          queueTotalRemaining,
          catalogExhausted,
          matches,
          stateVersion: Math.max(state.snapshot.stateVersion, stateVersion),
        },
      };
    }),

  applyWatchedRemoved: ({
    tmdbId,
    queue,
    queueTotalRemaining,
    catalogExhausted,
    matches,
    stateVersion,
  }) =>
    set((state) => {
      if (!state.snapshot || stateVersion < state.snapshot.stateVersion) return state;
      return {
        pendingVoteMovieIds: state.pendingVoteMovieIds.filter((id) => id !== tmdbId),
        matchQueue: state.matchQueue.filter((m) => m.tmdbId !== tmdbId),
        snapshot: {
          ...state.snapshot,
          queue,
          queueTotalRemaining,
          catalogExhausted,
          matches,
          stateVersion,
        },
      };
    }),

  applyQueueUpdate: ({ queue, queueTotalRemaining, catalogExhausted }) =>
    set((state) => {
      if (!state.snapshot) return state;
      return {
        snapshot: { ...state.snapshot, queue, queueTotalRemaining, catalogExhausted },
      };
    }),

  applyParticipantJoined: (participant, roomStatus, version) =>
    set((state) => {
      if (!state.snapshot || version < state.snapshot.stateVersion) return state;
      const exists = state.snapshot.participants.some((p) => p.id === participant.id);
      const participants = exists
        ? state.snapshot.participants.map((p) => (p.id === participant.id ? participant : p))
        : [...state.snapshot.participants, participant];
      const existingList = state.snapshot.partnerProgressList ?? [];
      const nextProgressList =
        participant.id === state.snapshot.myParticipantId
          ? existingList
          : existingList.some((item) => item.participantId === participant.id)
            ? existingList
            : [
                ...existingList,
                { participantId: participant.id, votedCount: 0, queueRemaining: 0 },
              ];
      return {
        snapshot: {
          ...state.snapshot,
          participants,
          partnerProgress: nextProgressList[0] ?? state.snapshot.partnerProgress,
          partnerProgressList: nextProgressList,
          requiredLikesForMatch: computeRequiredLikes(
            participants,
            state.snapshot.filters.groupMatchMode,
          ),
          status: roomStatus,
          stateVersion: version,
        },
      };
    }),
  applyParticipantStatus: (participantId, connectionStatus, lastSeenAt, version) =>
    set((state) => {
      if (!state.snapshot || version < state.snapshot.stateVersion) return state;
      const participants = state.snapshot.participants.map((p) =>
        p.id === participantId ? { ...p, connectionStatus, lastSeenAt } : p,
      );
      return {
        snapshot: {
          ...state.snapshot,
          stateVersion: version,
          participants,
          requiredLikesForMatch: computeRequiredLikes(
            participants,
            state.snapshot.filters.groupMatchMode,
          ),
        },
      };
    }),
  applyPartnerProgress: (progress) =>
    set((state) => {
      if (!state.snapshot) return state;
      const prevList = state.snapshot.partnerProgressList ?? [];
      const found = prevList.some((p) => p.participantId === progress.participantId);
      const nextList = found
        ? prevList.map((p) => (p.participantId === progress.participantId ? progress : p))
        : [...prevList, progress];
      return {
        snapshot: {
          ...state.snapshot,
          partnerProgress: nextList[0] ?? progress,
          partnerProgressList: nextList,
        },
      };
    }),
  applyRoomStatus: (status, version) =>
    set((state) => {
      if (!state.snapshot || version < state.snapshot.stateVersion) return state;
      return {
        activeRouletteSpin: status === 'DECIDING' ? state.activeRouletteSpin : null,
        snapshot: {
          ...state.snapshot,
          status,
          canUndo: status === 'IN_PROGRESS' && state.snapshot.myVotesCount > 0,
          stateVersion: version,
        },
      };
    }),
  applyFiltersUpdated: (filters, queue, queueTotalRemaining, catalogExhausted, version) =>
    set((state) => {
      if (!state.snapshot || version < state.snapshot.stateVersion) return state;
      return {
        pendingVoteMovieIds: [],
        snapshot: {
          ...state.snapshot,
          filters,
          requiredLikesForMatch: computeRequiredLikes(
            state.snapshot.participants,
            filters.groupMatchMode,
          ),
          queue,
          queueTotalRemaining,
          catalogExhausted,
          stateVersion: version,
        },
      };
    }),
  applyMatchesUpdated: (matches, version) =>
    set((state) => {
      if (!state.snapshot || version < state.snapshot.stateVersion) return state;
      return { snapshot: { ...state.snapshot, matches, stateVersion: version } };
    }),
  applyFinalProposal: (finalProposal, version) =>
    set((state) => {
      if (!state.snapshot || version < state.snapshot.stateVersion) return state;
      return { snapshot: { ...state.snapshot, finalProposal, stateVersion: version } };
    }),
  applyFinalized: (chosenMovie, matches, version) =>
    set((state) => {
      if (!state.snapshot || version < state.snapshot.stateVersion) return state;
      return {
        matchQueue: [],
        activeRouletteSpin: null,
        snapshot: {
          ...state.snapshot,
          status: 'FINISHED',
          canUndo: false,
          chosenMovie,
          matches,
          stateVersion: version,
        },
      };
    }),
  leaveSessionLocal: () => {
    localPersistence.saveActiveRoomCode(null);
    if (typeof window !== 'undefined' && window.location.search.includes('join=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    set({
      snapshot: null,
      view: 'home',
      prefilledJoinCode: '',
      pendingVoteMovieIds: [],
      matchQueue: [],
      celebratedMatchIds: [],
      selectedMovieForDetails: null,
      activeRouletteSpin: null,
    });
  },
}));