import { useEffect } from 'react';
import { AnimatePresence, MotionConfig } from 'motion/react';
import type { PersonRole, SelectedPerson } from '@cine-match/shared';
import { MatchOverlay } from '../components/match/MatchOverlay';
import { RouletteOverlay } from '../components/match/RouletteOverlay';
import { MovieDetailsModal } from '../components/movie/MovieDetailsModal';
import { NetworkDiagnosticsModal } from '../components/session/NetworkDiagnosticsModal';
import { BrandLogo } from '../components/ui/BrandLogo';
import { ConnectionBadge } from '../components/ui/ConnectionBadge';
import { Toast } from '../components/ui/Toast';
import { HistoryModal } from '../features/history/HistoryModal';
import { HomeScreen } from '../features/home/HomeScreen';
import { CreateRoomScreen } from '../features/lobby/CreateRoomScreen';
import { JoinRoomScreen } from '../features/lobby/JoinRoomScreen';
import { LobbyScreen } from '../features/lobby/LobbyScreen';
import { DecisionScreen } from '../features/matches/DecisionScreen';
import { FinalChosenScreen } from '../features/matches/FinalChosenScreen';
import { ProfileModal } from '../features/profile/ProfileModal';
import { VotingScreen } from '../features/voting/VotingScreen';
import { useSocketController } from '../hooks/useSocketController';
import { fetchProfile } from '../services/api';
import { useSessionStore } from '../stores/sessionStore';
import styles from './App.module.css';

export function App() {
  const {
    createRoom,
    joinRoom,
    updateFilters,
    startSession,
    submitVote,
    undoLastVote,
    markMovieWatched,
    requestMoreMovies,
    dismissMatch,
    pauseSession,
    resumeSession,
    enterDeciding,
    returnToVoting,
    spinRoulette,
    proposeFinalMovie,
    confirmFinalMovie,
    endSession,
  } = useSocketController();

  const deviceId = useSessionStore((s) => s.deviceId);
  const view = useSessionStore((s) => s.view);
  const snapshot = useSessionStore((s) => s.snapshot);
  const connectionState = useSessionStore((s) => s.connectionState);
  const matchQueue = useSessionStore((s) => s.matchQueue);
  const selectedMovieForDetails = useSessionStore((s) => s.selectedMovieForDetails);
  const historyOpen = useSessionStore((s) => s.historyOpen);
  const profileOpen = useSessionStore((s) => s.profileOpen);
  const activeRouletteSpin = useSessionStore((s) => s.activeRouletteSpin);
  const setActiveRouletteSpin = useSessionStore((s) => s.setActiveRouletteSpin);

  const setProfile = useSessionStore((s) => s.setProfile);
  const setProfileOpen = useSessionStore((s) => s.setProfileOpen);
  const setDiagnosticsOpen = useSessionStore((s) => s.setDiagnosticsOpen);
  const setHistoryOpen = useSessionStore((s) => s.setHistoryOpen);
  const dismissCurrentMatchCelebration = useSessionStore((s) => s.dismissCurrentMatchCelebration);
  const openMovieDetails = useSessionStore((s) => s.openMovieDetails);
  const closeMovieDetails = useSessionStore((s) => s.closeMovieDetails);
  const leaveSessionLocal = useSessionStore((s) => s.leaveSessionLocal);
  const showToast = useSessionStore((s) => s.showToast);

  useEffect(() => {
    let cancelled = false;
    void fetchProfile(deviceId).then((loaded) => {
      if (!cancelled && loaded) {
        setProfile(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [deviceId, setProfile]);

  const canFilterFromDetails =
    Boolean(snapshot) &&
    snapshot?.status !== 'FINISHED' &&
    (snapshot?.status === 'IN_PROGRESS' ||
      snapshot?.status === 'PAUSED' ||
      snapshot?.status === 'DECIDING' ||
      snapshot?.participants.find((part) => part.id === snapshot.myParticipantId)?.role === 'HOST');

  const handleFilterByPerson = (person: SelectedPerson, role: PersonRole) => {
    if (!snapshot) return;
    void updateFilters({
      genreIds: [],
      sortBy: 'popularity.desc',
      watchProviderIds: snapshot.filters.watchProviderIds,
      excludeHistory: snapshot.filters.excludeHistory,
      letterboxdWatchedMode: snapshot.filters.letterboxdWatchedMode,
      directors: role === 'director' ? [person] : undefined,
      actors: role === 'actor' ? [person] : undefined,
    });
    showToast(`Filtrando filmes de ${person.name}`, 'success');
  };

  const isImmersiveSession =
    Boolean(snapshot) &&
    snapshot?.status !== 'WAITING_PARTICIPANT' &&
    snapshot?.status !== 'READY';

  const showTopBrand = Boolean(snapshot) || view !== 'home';
  const currentMatchMovie = matchQueue[0] ?? null;

  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.viewport}>
        <div className={styles.shell}>
          {!isImmersiveSession && (
            <header className={styles.header}>
              <div className={styles.brandMini}>
                {showTopBrand && (
                  <>
                    <BrandLogo size={26} animated={false} />
                    <span>Cine Match</span>
                  </>
                )}
              </div>
              <ConnectionBadge
                state={connectionState}
                onClick={() => setDiagnosticsOpen(true)}
              />
            </header>
          )}

          <main className={styles.main}>
            <AnimatePresence mode="wait">
              {snapshot ? (
                snapshot.status === 'WAITING_PARTICIPANT' || snapshot.status === 'READY' ? (
                  <LobbyScreen
                    key="lobby"
                    snapshot={snapshot}
                    onUpdateFilters={updateFilters}
                    onStartSession={startSession}
                  />
                ) : snapshot.status === 'DECIDING' ? (
                  <DecisionScreen
                    key="deciding"
                    snapshot={snapshot}
                    onSpinRoulette={spinRoulette}
                    onPropose={proposeFinalMovie}
                    onConfirm={confirmFinalMovie}
                    onReturnToVoting={returnToVoting}
                    onEndSession={endSession}
                    onOpenDetails={openMovieDetails}
                  />
                ) : snapshot.status === 'FINISHED' ? (
                  <FinalChosenScreen
                    key="finished"
                    snapshot={snapshot}
                    onOpenDetails={openMovieDetails}
                    onOpenHistory={() => setHistoryOpen(true)}
                    onNewSession={leaveSessionLocal}
                  />
                ) : (
                  <VotingScreen
                    key="voting"
                    snapshot={snapshot}
                    onVote={submitVote}
                    onUndo={undoLastVote}
                    onMarkWatched={markMovieWatched}
                    onRequestMore={requestMoreMovies}
                    onUpdateFilters={updateFilters}
                    onDismissMatch={dismissMatch}
                    onPause={pauseSession}
                    onResume={resumeSession}
                    onEnterDeciding={enterDeciding}
                    onOpenDetails={openMovieDetails}
                  />
                )
              ) : view === 'create' ? (
                <CreateRoomScreen key="create" onCreate={createRoom} />
              ) : view === 'join' ? (
                <JoinRoomScreen key="join" onJoin={joinRoom} />
              ) : (
                <HomeScreen key="home" />
              )}
            </AnimatePresence>
          </main>

          <MatchOverlay
            movie={currentMatchMovie}
            remainingInQueue={Math.max(0, matchQueue.length - 1)}
            onViewDetails={(movie) => openMovieDetails(movie)}
            onContinue={dismissCurrentMatchCelebration}
          />

          <RouletteOverlay
            spin={activeRouletteSpin}
            matches={snapshot?.matches ?? []}
            myParticipantId={snapshot?.myParticipantId ?? ''}
            triggerName={
              snapshot?.participants.find((p) => p.id === activeRouletteSpin?.triggeredBy)?.name
            }
            onConfirmWinner={confirmFinalMovie}
            onSpinAgain={spinRoulette}
            onViewDetails={(movie) => openMovieDetails(movie)}
            onClose={() => setActiveRouletteSpin(null)}
          />

          <MovieDetailsModal
            movie={selectedMovieForDetails}
            onClose={closeMovieDetails}
            onFilterByPerson={canFilterFromDetails ? handleFilterByPerson : undefined}
          />

          <HistoryModal
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            onOpenMovieDetails={(movie) => openMovieDetails(movie)}
          />

          <ProfileModal
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
          />

          <Toast />
          <NetworkDiagnosticsModal />
        </div>
      </div>
    </MotionConfig>
  );
}