import { useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import type { NetworkInfoResponse } from '@cine-match/shared';
import { SPRING_SOFT } from '../../animations/presets';
import { copyTextSafe } from '../../utils/clipboard';
import styles from './QrCodePanel.module.css';

interface QrCodePanelProps {
  roomCode: string;
  networkInfo: NetworkInfoResponse | null;
}

export function QrCodePanel({ roomCode, networkInfo }: QrCodePanelProps) {
  const candidates = networkInfo?.candidates ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const joinUrl = useMemo(() => {
    const selectedBase =
      candidates[selectedIndex]?.url ??
      networkInfo?.primaryUrl ??
      window.location.origin;
    return `${selectedBase.replace(/\/$/, '')}/?join=${roomCode}`;
  }, [candidates, selectedIndex, networkInfo, roomCode]);

  const handleCopy = async () => {
    const ok = await copyTextSafe(joinUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_SOFT}
      className={styles.card}
    >
      <div className={styles.qrFrame}>
        <QRCodeSVG
          value={joinUrl}
          size={188}
          bgColor="#FFFFFF"
          fgColor="#0B0D14"
          level="M"
        />
      </div>

      <div className={styles.codeBox}>
        <span className={styles.codeLabel}>Código da sala</span>
        <span className={styles.codeValue} data-testid="room-code-display">
          {roomCode}
        </span>
      </div>

      <div className={styles.urlRow}>
        <span className={styles.urlText} title={joinUrl}>
          {joinUrl}
        </span>
        <button type="button" className={styles.copyBtn} onClick={() => void handleCopy()}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>

      {candidates.length > 1 && (
        <div className={styles.candidates}>
          {candidates.map((c, idx) => (
            <button
              key={c.address}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`${styles.ipChip} ${idx === selectedIndex ? styles.ipChipActive : ''}`}
            >
              {c.address} ({c.interfaceName})
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
