import { useEffect, useState } from 'react';
import { Check, Copy, Globe, Wifi } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { NetworkInfoResponse } from '@cine-match/shared';

interface QrCodePanelProps {
  roomCode: string;
  networkInfo: NetworkInfoResponse | null;
}

function isLocalHostOrLan(hostname: string): boolean {
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.local')
  ) {
    return true;
  }
  if (/^10\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
  return false;
}

export function QrCodePanel({ roomCode, networkInfo }: QrCodePanelProps) {
  const isPublicDomain =
    typeof window !== 'undefined' && !isLocalHostOrLan(window.location.hostname);

  const [selectedBaseUrl, setSelectedBaseUrl] = useState<string>(() => {
    if (isPublicDomain && typeof window !== 'undefined') {
      return window.location.origin;
    }
    if (networkInfo?.primaryUrl) return networkInfo.primaryUrl;
    return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isPublicDomain && typeof window !== 'undefined') {
      setSelectedBaseUrl(window.location.origin);
      return;
    }
    if (networkInfo?.primaryUrl) {
      setSelectedBaseUrl(networkInfo.primaryUrl);
    }
  }, [isPublicDomain, networkInfo]);

  const joinUrl = `${selectedBaseUrl.replace(/\/$/, '')}/?join=${roomCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback silencioso em navegadores sem clipboard API
    }
  };

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 'var(--radius-xl)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          padding: 12,
          borderRadius: 16,
          background: '#FFFFFF',
          boxShadow: '0 10px 28px rgba(0, 0, 0, 0.35)',
        }}
      >
        <QRCodeSVG value={joinUrl} size={172} level="M" includeMargin={false} />
      </div>

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            fontSize: 11.5,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          Código da sala
        </span>
        <strong
          data-testid="room-code-display"
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 28,
            letterSpacing: '0.18em',
            color: 'var(--text-primary)',
          }}
        >
          {roomCode}
        </strong>
      </div>

      <button
        type="button"
        onClick={() => void handleCopy()}
        data-testid="copy-invite-link-btn"
        style={{
          width: '100%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-input)',
          color: 'var(--text-primary)',
          fontSize: 13.5,
          fontWeight: 600,
        }}
      >
        {copied ? <Check size={15} color="#4ADE80" /> : <Copy size={15} />}
        <span>{copied ? 'Link copiado!' : 'Copiar link de convite'}</span>
      </button>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--text-muted)',
          wordBreak: 'break-all',
          textAlign: 'center',
        }}
      >
        {isPublicDomain ? <Globe size={13} /> : <Wifi size={13} />}
        <span>{joinUrl}</span>
      </span>

      {!isPublicDomain && networkInfo && networkInfo.candidates.length > 1 && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 6,
            paddingTop: 4,
          }}
        >
          {networkInfo.candidates.map((cand) => {
            const active = selectedBaseUrl === cand.url;
            return (
              <button
                key={cand.url}
                type="button"
                onClick={() => setSelectedBaseUrl(cand.url)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 'var(--radius-pill)',
                  border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  background: active ? 'var(--accent-primary-soft)' : 'var(--bg-input)',
                  color: active ? '#FFFFFF' : 'var(--text-secondary)',
                  fontSize: 11.5,
                  fontWeight: 500,
                }}
              >
                {cand.address}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
