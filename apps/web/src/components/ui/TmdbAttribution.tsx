interface TmdbAttributionProps {
  compact?: boolean;
}

export function TmdbAttribution({ compact = false }: TmdbAttributionProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: compact ? 'flex-start' : 'center',
        gap: 8,
        fontSize: 11.5,
        color: 'var(--text-muted)',
        lineHeight: 1.4,
        textAlign: compact ? 'left' : 'center',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 7px',
          borderRadius: 6,
          background: 'linear-gradient(90deg, #90cea1 0%, #01b4e4 100%)',
          color: '#081b26',
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: 10,
          letterSpacing: '0.06em',
          flexShrink: 0,
        }}
      >
        TMDB
      </span>
      <span>
        Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
      </span>
    </div>
  );
}
