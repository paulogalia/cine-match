import { useCallback, useEffect } from 'react';
import { APP_LIMITS, type FilterCriteria, type VoteDecision } from '@cine-match/shared';
import { fetchCatalogStatus, fetchGenres, fetchNetworkInfo, fetchWatchProviders } from '../services/api';
import { createClientSocket, type TypedClientSocket } from '../services/socket';
import { localPersistence } from '../services/storage';
import { useSessionStore } from '../stores/sessionStore';
import { haptics } from '../utils/haptics';
import { generateId } from '../utils/id';

let sharedSocket: TypedClientSocket | null = null;
let initializedListeners = false;

function getSharedSocket(): TypedClientSocket {
  if (!sharedSocket) {
    sharedSocket = createClientSocket();
  }
  return sharedSocket;
}

export function useSocketController() {
  useEffect(() => {
    const store = useSessionStore.getState();

    void fetchNetworkInfo().then((info) => {
      useSessionStore.getState().setNetworkInfo(info);
    });
    void fetchCatalogStatus().then((status) => {
      if (status) useSessionStore.getState().setCatalogStatus(status);
    });
    void fetchGenres().then((genres) => {
      if (genres) useSessionStore.getState().setGenres(genres);
    });
    void fetchWatchProviders().then((providers) => {
      if (providers) useSessionStore.getState().setWatchProviders(providers);
    });

    const socket = getSharedSocket();

    const syncIfNeeded = () => {
      const state = useSessionStore.getState();
      if (state.prefilledJoinCode && !state.snapshot) return;

      const roomCode = state.snapshot?.code ?? localPersistence.getActiveRoomCode();
      if (!roomCode || !socket.connected) return;

      const prevSnapshot = state.snapshot;

      socket.emit(
        'session:sync',
        {
          roomCode,
          deviceId: state.deviceId,
          lastStateVersion: prevSnapshot?.stateVersion,
        },
        (ack) => {
          const current = useSessionStore.getState();
          if (ack.ok) {
            if (ack.data.snapshot.status === 'FINISHED' && !current.snapshot) {
              localPersistence.saveActiveRoomCode(null);
              return;
            }

            current.setSnapshot(ack.data.snapshot);

            // Se reconectou na mesma sala e surgiu um match enquanto estava offline, celebra agora
            if (prevSnapshot && prevSnapshot.code === ack.data.snapshot.code) {
              for (const item of ack.data.snapshot.matches) {
                if (item.match.status === 'ACTIVE') {
                  useSessionStore.getState().enqueueMatchCelebration(item.movie);
                }
              }
            }
          } else if (
            ack.error.code === 'ROOM_NOT_FOUND' ||
            ack.error.code === 'PARTICIPANT_NOT_IN_ROOM'
          ) {
            localPersistence.saveActiveRoomCode(null);
          }
        },
      );
    };

    if (!initializedListeners) {
      initializedListeners = true;

      socket.on('connect', () => {
        useSessionStore.getState().setConnectionState('connected');
        syncIfNeeded();
      });
      socket.on('disconnect', () => {
        useSessionStore.getState().setConnectionState('disconnected');
      });
      socket.on('connect_error', () => {
        useSessionStore.getState().setConnectionState('unavailable');
      });
      socket.io.on('reconnect_attempt', () => {
        useSessionStore.getState().setConnectionState('reconnecting');
      });

      socket.on('participant:joined', ({ participant, roomStatus, stateVersion }) => {
        const s = useSessionStore.getState();
        s.applyParticipantJoined(participant, roomStatus, stateVersion);
        s.showToast(`${participant.name} entrou na sala!`, 'success');
      });

      socket.on('participant:status_changed', ({ participantId, connectionStatus, lastSeenAt, stateVersion }) => {
        const s = useSessionStore.getState();
        const target = s.snapshot?.participants.find((p) => p.id === participantId);
        s.applyParticipantStatus(participantId, connectionStatus, lastSeenAt, stateVersion);

        if (target && target.id !== s.snapshot?.myParticipantId) {
          s.showToast(
            connectionStatus === 'OFFLINE'
              ? `${target.name} perdeu conexão. Aguardando retorno...`
              : `${target.name} reconectou!`,
            connectionStatus === 'OFFLINE' ? 'info' : 'success',
          );
        }
      });

      socket.on('participant:progress', (progress) => {
        useSessionStore.getState().applyPartnerProgress(progress);
      });
      socket.on('session:started', ({ snapshot }) => {
        useSessionStore.getState().setSnapshot(snapshot);
      });
      socket.on('session:state_changed', ({ status, stateVersion }) => {
        useSessionStore.getState().applyRoomStatus(status, stateVersion);
      });
      socket.on('filters:updated', ({ filters, queue, queueTotalRemaining, catalogExhausted, stateVersion }) => {
        const s = useSessionStore.getState();
        s.applyFiltersUpdated(filters, queue, queueTotalRemaining, catalogExhausted, stateVersion);
        s.showToast('Filtros da sessão atualizados.', 'info');
      });
      socket.on('match:created', ({ movie }) => {
        haptics.match();
        useSessionStore.getState().enqueueMatchCelebration(movie);
      });
      socket.on('matches:updated', ({ matches, stateVersion }) => {
        useSessionStore.getState().applyMatchesUpdated(matches, stateVersion);
      });
      socket.on('decision:proposal_updated', ({ finalProposal, stateVersion }) => {
        useSessionStore.getState().applyFinalProposal(finalProposal, stateVersion);
      });
      socket.on('session:finalized', ({ chosenMovie, matches, stateVersion }) => {
        if (chosenMovie) haptics.match();
        useSessionStore.getState().applyFinalized(chosenMovie, matches, stateVersion);
      });
      socket.on('server:error', ({ message }) => {
        useSessionStore.getState().showToast(message, 'error');
      });
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      store.setConnectionState('disconnected');
    } else if (!socket.connected) {
      store.setConnectionState('connecting');
      socket.connect();
    } else {
      store.setConnectionState('connected');
      syncIfNeeded();
    }

    const handleOffline = () => {
      useSessionStore.getState().setConnectionState('disconnected');
    };

    const handleResume = () => {
      if (document.visibilityState === 'hidden') return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        useSessionStore.getState().setConnectionState('disconnected');
        return;
      }
      if (!socket.connected) {
        useSessionStore.getState().setConnectionState('reconnecting');
        socket.connect();
      } else {
        useSessionStore.getState().setConnectionState('connected');
        syncIfNeeded();
      }
    };

    document.addEventListener('visibilitychange', handleResume);
    window.addEventListener('online', handleResume);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pageshow', handleResume);

    return () => {
      document.removeEventListener('visibilitychange', handleResume);
      window.removeEventListener('online', handleResume);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pageshow', handleResume);
    };
  }, []);

  const createRoom = useCallback(async (hostName: string): Promise<string | null> => {
    const socket = getSharedSocket();
    const state = useSessionStore.getState();
    if (!socket.connected) return 'Sem conexão com o servidor local. Verifique o Wi-Fi.';

    state.setBusyAction(true);
    state.setSavedName(hostName);

    return new Promise((resolve) => {
      socket.emit('room:create', { hostName: hostName.trim(), deviceId: state.deviceId }, (ack) => {
        useSessionStore.getState().setBusyAction(false);
        if (ack.ok) {
          useSessionStore.getState().setSnapshot(ack.data.snapshot);
          resolve(null);
        } else {
          resolve(ack.error.message);
        }
      });
    });
  }, []);

  const joinRoom = useCallback(async (code: string, participantName: string): Promise<string | null> => {
    const socket = getSharedSocket();
    const state = useSessionStore.getState();
    if (!socket.connected) return 'Sem conexão com o servidor local. Verifique o Wi-Fi.';

    state.setBusyAction(true);
    state.setSavedName(participantName);

    return new Promise((resolve) => {
      socket.emit(
        'room:join',
        {
          code: code.trim().toUpperCase(),
          participantName: participantName.trim(),
          deviceId: state.deviceId,
        },
        (ack) => {
          useSessionStore.getState().setBusyAction(false);
          if (ack.ok) {
            if (window.location.search.includes('join=')) {
              window.history.replaceState({}, '', window.location.pathname);
            }
            useSessionStore.getState().setPrefilledJoinCode('');
            useSessionStore.getState().setSnapshot(ack.data.snapshot);
            resolve(null);
          } else {
            resolve(ack.error.message);
          }
        },
      );
    });
  }, []);

  const updateFilters = useCallback(async (filters: FilterCriteria): Promise<string | null> => {
    const socket = getSharedSocket();
    const snapshot = useSessionStore.getState().snapshot;
    if (!socket.connected || !snapshot) return 'Sem conexão com a sala.';

    return new Promise((resolve) => {
      socket.emit('filters:update', { roomCode: snapshot.code, filters }, (ack) => {
        if (ack.ok) {
          useSessionStore.getState().setSnapshot(ack.data.snapshot);
          resolve(null);
        } else {
          useSessionStore.getState().showToast(ack.error.message, 'error');
          resolve(ack.error.message);
        }
      });
    });
  }, []);

  const startSession = useCallback(async (): Promise<string | null> => {
    const socket = getSharedSocket();
    const snapshot = useSessionStore.getState().snapshot;
    if (!socket.connected || !snapshot) return 'Sem conexão com o servidor local.';

    useSessionStore.getState().setBusyAction(true);
    return new Promise((resolve) => {
      socket.emit('session:start', { roomCode: snapshot.code }, (ack) => {
        useSessionStore.getState().setBusyAction(false);
        if (ack.ok) {
          useSessionStore.getState().setSnapshot(ack.data.snapshot);
          resolve(null);
        } else {
          useSessionStore.getState().showToast(ack.error.message, 'error');
          resolve(ack.error.message);
        }
      });
    });
  }, []);

  const requestMoreMovies = useCallback(async (): Promise<void> => {
    const socket = getSharedSocket();
    const state = useSessionStore.getState();
    const snapshot = state.snapshot;
    if (!socket.connected || !snapshot || snapshot.catalogExhausted || state.loadingMoreMovies) {
      return;
    }

    state.setLoadingMoreMovies(true);
    return new Promise((resolve) => {
      socket.emit('queue:request_more', { roomCode: snapshot.code }, (ack) => {
        const s = useSessionStore.getState();
        s.setLoadingMoreMovies(false);
        if (ack.ok) s.applyQueueUpdate(ack.data);
        else s.showToast(ack.error.message, 'error');
        resolve();
      });
    });
  }, []);

  const submitVote = useCallback(
    async (tmdbId: number, decision: VoteDecision): Promise<boolean> => {
      const socket = getSharedSocket();
      const state = useSessionStore.getState();
      const snapshot = state.snapshot;

      if (!socket.connected || state.connectionState !== 'connected' || !snapshot) {
        state.showToast('Sem conexão com o servidor. Aguarde reconectar para votar.', 'error');
        return false;
      }
      if (snapshot.status !== 'IN_PROGRESS') return false;

      if (decision === 'LIKE') haptics.like();
      else haptics.dislike();

      state.addPendingVote(tmdbId);
      const operationId = generateId('op', 16);

      return new Promise((resolve) => {
        let settled = false;
        const timeoutId = setTimeout(() => {
          if (settled) return;
          settled = true;
          const s = useSessionStore.getState();
          s.removePendingVote(tmdbId);
          s.showToast('O servidor demorou para confirmar o voto. Tente novamente.', 'error');
          resolve(false);
        }, 8000);

        socket.emit('vote:submit', { roomCode: snapshot.code, operationId, tmdbId, decision }, (ack) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);

          const s = useSessionStore.getState();
          if (ack.ok) {
            s.reconcileVoteResult({
              tmdbId,
              myVotesCount: ack.data.myVotesCount,
              queue: ack.data.queue,
              queueTotalRemaining: ack.data.queueTotalRemaining,
              catalogExhausted: ack.data.catalogExhausted,
              stateVersion: ack.data.stateVersion,
            });
            if (
              ack.data.queueTotalRemaining <= APP_LIMITS.QUEUE_LOW_WATERMARK &&
              !ack.data.catalogExhausted
            ) {
              void requestMoreMovies();
            }
            resolve(true);
          } else {
            s.removePendingVote(tmdbId);
            s.showToast(ack.error.message, 'error');
            resolve(false);
          }
        });
      });
    },
    [requestMoreMovies],
  );

  const dismissMatch = useCallback(async (tmdbId: number): Promise<void> => {
    const socket = getSharedSocket();
    const snapshot = useSessionStore.getState().snapshot;
    if (!socket.connected || !snapshot) return;

    return new Promise((resolve) => {
      socket.emit('match:dismiss', { roomCode: snapshot.code, tmdbId }, (ack) => {
        if (ack.ok) {
          useSessionStore.getState().applyMatchesUpdated(ack.data.matches, ack.data.stateVersion);
        } else {
          useSessionStore.getState().showToast(ack.error.message, 'error');
        }
        resolve();
      });
    });
  }, []);

  const pauseSession = useCallback(async (): Promise<void> => {
    const socket = getSharedSocket();
    const snapshot = useSessionStore.getState().snapshot;
    if (!socket.connected || !snapshot) return;

    socket.emit('session:pause', { roomCode: snapshot.code }, (ack) => {
      if (ack.ok) useSessionStore.getState().applyRoomStatus(ack.data.status, ack.data.stateVersion);
    });
  }, []);

  const resumeSession = useCallback(async (): Promise<void> => {
    const socket = getSharedSocket();
    const snapshot = useSessionStore.getState().snapshot;
    if (!socket.connected || !snapshot) return;

    socket.emit('session:resume', { roomCode: snapshot.code }, (ack) => {
      if (ack.ok) useSessionStore.getState().applyRoomStatus(ack.data.status, ack.data.stateVersion);
    });
  }, []);

  const enterDeciding = useCallback(async (): Promise<string | null> => {
    const socket = getSharedSocket();
    const snapshot = useSessionStore.getState().snapshot;
    if (!socket.connected || !snapshot) return 'Sem conexão com o servidor.';

    return new Promise((resolve) => {
      socket.emit('decision:enter', { roomCode: snapshot.code }, (ack) => {
        if (ack.ok) {
          useSessionStore.getState().applyRoomStatus(ack.data.status, ack.data.stateVersion);
          resolve(null);
        } else {
          useSessionStore.getState().showToast(ack.error.message, 'error');
          resolve(ack.error.message);
        }
      });
    });
  }, []);

  const returnToVoting = useCallback(async (): Promise<string | null> => {
    const socket = getSharedSocket();
    const snapshot = useSessionStore.getState().snapshot;
    if (!socket.connected || !snapshot) return 'Sem conexão com o servidor.';

    return new Promise((resolve) => {
      socket.emit('decision:return', { roomCode: snapshot.code }, (ack) => {
        if (ack.ok) {
          const s = useSessionStore.getState();
          s.applyRoomStatus(ack.data.status, ack.data.stateVersion);
          s.applyFinalProposal(null, ack.data.stateVersion);
          resolve(null);
        } else {
          useSessionStore.getState().showToast(ack.error.message, 'error');
          resolve(ack.error.message);
        }
      });
    });
  }, []);

  const proposeFinalMovie = useCallback(async (tmdbId: number): Promise<string | null> => {
    const socket = getSharedSocket();
    const snapshot = useSessionStore.getState().snapshot;
    if (!socket.connected || !snapshot) return 'Sem conexão com o servidor.';

    return new Promise((resolve) => {
      socket.emit('decision:propose', { roomCode: snapshot.code, tmdbId }, (ack) => {
        if (ack.ok) {
          useSessionStore.getState().applyFinalProposal(ack.data.finalProposal, ack.data.stateVersion);
          resolve(null);
        } else {
          useSessionStore.getState().showToast(ack.error.message, 'error');
          resolve(ack.error.message);
        }
      });
    });
  }, []);

  const confirmFinalMovie = useCallback(async (tmdbId: number): Promise<string | null> => {
    const socket = getSharedSocket();
    const snapshot = useSessionStore.getState().snapshot;
    if (!socket.connected || !snapshot) return 'Sem conexão com o servidor.';

    return new Promise((resolve) => {
      socket.emit('decision:confirm', { roomCode: snapshot.code, tmdbId }, (ack) => {
        if (ack.ok) {
          const s = useSessionStore.getState();
          if (ack.data.status === 'FINISHED') {
            s.applyFinalized(ack.data.chosenMovie, s.snapshot?.matches ?? [], ack.data.stateVersion);
          } else {
            s.applyFinalProposal(ack.data.finalProposal, ack.data.stateVersion);
          }
          resolve(null);
        } else {
          useSessionStore.getState().showToast(ack.error.message, 'error');
          resolve(ack.error.message);
        }
      });
    });
  }, []);

  const endSession = useCallback(async (): Promise<string | null> => {
    const socket = getSharedSocket();
    const snapshot = useSessionStore.getState().snapshot;
    if (!socket.connected || !snapshot) return 'Sem conexão com o servidor.';

    return new Promise((resolve) => {
      socket.emit('session:end', { roomCode: snapshot.code, confirm: true }, (ack) => {
        if (ack.ok) {
          const s = useSessionStore.getState();
          s.applyFinalized(null, s.snapshot?.matches ?? [], ack.data.stateVersion);
          resolve(null);
        } else {
          useSessionStore.getState().showToast(ack.error.message, 'error');
          resolve(ack.error.message);
        }
      });
    });
  }, []);

  return {
    createRoom,
    joinRoom,
    updateFilters,
    startSession,
    submitVote,
    requestMoreMovies,
    dismissMatch,
    pauseSession,
    resumeSession,
    enterDeciding,
    returnToVoting,
    proposeFinalMovie,
    confirmFinalMovie,
    endSession,
  };
}
