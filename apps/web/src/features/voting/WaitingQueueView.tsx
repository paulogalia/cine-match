import { Heart, Hourglass, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import type { ClientRoomSnapshot } from '@cine-match/shared';
import { Button } from '../../components/ui/Button';

interface WaitingQueueViewProps {
  snapshot: ClientRoomSnapshot;
  loadingMore: boolean;
  activeMatchesCount: number;
  onRequestMore: () => Promise<void>;
  onOpenMatches: () => void;
  onOpenFilters: () => void;
}

export function WaitingQueueView({
  snapshot,
  loadingMore,
  activeMatchesCount,
  onRequestMore,
  onOpenMatches,
  onOpenFilters,
}: WaitingQueueViewProps) {
  const partner = snapshot.participants.find((p) => p.id !== snapshot.myParticipantId);
  const partnerRemaining = snapshot.partnerProgress?.queueRemaining ?? 0;

  return (
    <motion.div
      data-testid="waiting-queue-view"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px 12px',
        gap: 16,
      }}
    >
      <motion.div
        animate={{ rotate: [0, 12, -12, 0] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--accent-primary-soft)',
          border: '1px solid rgba(255, 77, 109, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-primary)',
        }}
      >
        <Hourglass size={32} />
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 320 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>
          {partnerRemaining > 0
            ? `Você terminou sua fila!`
            : 'Nenhum filme pendente por aqui'}
        </h2>
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {partnerRemaining > 0 && partner
            ? `${partner.name} ainda está avaliando ${partnerRemaining} ${
                partnerRemaining === 1 ? 'filme' : 'filmes'
              }. Novos matches vão aparecer automaticamente.`
            : snapshot.catalogExhausted
              ? 'Vocês já avaliaram todos os filmes com os filtros atuais. Que tal ajustar os filtros ou conferir os matches?'
              : 'Você pode carregar mais filmes do catálogo ou conferir os matches enquanto aguarda.'}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300, marginTop: 8 }}>
        {!snapshot.catalogExhausted && (
          <Button
            fullWidth
            loading={loadingMore}
            icon={<RefreshCw size={16} />}
            onClick={() => void onRequestMore()}
          >
            Carregar mais filmes
          </Button>
        )}

        <Button
          variant={snapshot.catalogExhausted ? 'primary' : 'secondary'}
          fullWidth
          icon={<Heart size={16} />}
          onClick={onOpenMatches}
        >
          Ver matches ({activeMatchesCount})
        </Button>

        <Button
          variant="ghost"
          fullWidth
          icon={<SlidersHorizontal size={16} />}
          onClick={onOpenFilters}
        >
          Ajustar filtros
        </Button>
      </div>
    </motion.div>
  );
}
