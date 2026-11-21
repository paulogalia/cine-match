import { UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import type { PublicParticipant } from '@cine-match/shared';
import { SPRING_SNAPPY } from '../../animations/presets';
import { getInitials } from '../../utils/genres';
import styles from './ParticipantSlot.module.css';

interface ParticipantSlotProps {
  participant?: PublicParticipant;
  isMe?: boolean;
  waitingLabel?: string;
}

export function ParticipantSlot({
  participant,
  isMe = false,
  waitingLabel = 'Aguardando...',
}: ParticipantSlotProps) {
  if (!participant) {
    return (
      <div className={`${styles.slot} ${styles.waiting}`}>
        <div className={styles.avatarWrap}>
          <span className={styles.pulseRing} aria-hidden="true" />
          <div className={styles.emptyAvatar}>
            <UserPlus size={22} />
          </div>
        </div>
        <span className={styles.name}>{waitingLabel}</span>
        <span className={styles.meta}>Escaneie o QR Code</span>
      </div>
    );
  }

  const isOnline = participant.connectionStatus === 'ONLINE';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_SNAPPY}
      className={`${styles.slot} ${styles.occupied}`}
    >
      <div className={styles.avatarWrap}>
        <div className={styles.avatar} style={{ background: participant.avatarColor }}>
          {getInitials(participant.name)}
        </div>
        <span
          className={`${styles.statusDot} ${isOnline ? styles.online : styles.offline}`}
          title={isOnline ? 'Conectado' : 'Reconectando'}
        />
      </div>
      <span className={styles.name}>
        {participant.name} {isMe ? '(você)' : ''}
      </span>
      <span className={styles.meta}>
        {isOnline ? (participant.role === 'HOST' ? 'Anfitrião' : 'Conectado') : 'Offline'}
      </span>
    </motion.div>
  );
}
