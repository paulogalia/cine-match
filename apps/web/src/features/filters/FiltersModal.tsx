import { useEffect, useState } from 'react';
import {
  Award,
  Clock,
  History,
  RotateCcw,
  Shuffle,
  Sparkles,
  Star,
  Tv,
} from 'lucide-react';
import {
  NIGHT_VIBE_PRESETS,
  OSCAR_CATEGORIES,
  type FilterCriteria,
  type OscarCategory,
} from '@cine-match/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useSessionStore } from '../../stores/sessionStore';
import { getProviderLogoUrl } from '../../utils/tmdbImages';
import { PeopleFilterSection } from './PeopleFilterSection';

interface FiltersModalProps {
  open: boolean;
  currentFilters: FilterCriteria;
  onClose: () => void;
  onApply: (filters: FilterCriteria) => Promise<string | null>;
}

const LANGUAGES = [
  { label: 'Todos', value: '' },
  { label: 'Inglês', value: 'en' },
  { label: 'Português', value: 'pt' },
  { label: 'Espanhol', value: 'es' },
  { label: 'Coreano', value: 'ko' },
  { label: 'Japonês', value: 'ja' },
  { label: 'Francês', value: 'fr' },
  { label: 'Italiano', value: 'it' },
];

const SORT_OPTIONS: Array<{ label: string; value: FilterCriteria['sortBy'] }> = [
  { label: 'Populares', value: 'popularity.desc' },
  { label: 'Melhor avaliados', value: 'vote_average.desc' },
  { label: 'Mais recentes', value: 'primary_release_date.desc' },
];

const YEAR_PRESETS: Array<{ label: string; from?: number; to?: number }> = [
  { label: 'Qualquer', from: undefined, to: undefined },
  { label: '2020+', from: 2020, to: undefined },
  { label: '2010+', from: 2010, to: undefined },
  { label: 'Anos 90/2000', from: 1990, to: 2009 },
  { label: 'Clássicos', from: undefined, to: 1989 },
];

const OSCAR_YEAR_PRESETS: Array<{ label: string; from?: number; to?: number }> = [
  { label: 'Todos', from: undefined, to: undefined },
  { label: '2024–2026', from: 2024, to: 2026 },
  { label: '2020–2026', from: 2020, to: 2026 },
  { label: '2010–2019', from: 2010, to: 2019 },
  { label: '2000–2009', from: 2000, to: 2009 },
  { label: 'Até 1999', from: undefined, to: 1999 },
];

const RUNTIME_PRESETS: Array<{ label: string; min?: number; max?: number }> = [
  { label: 'Qualquer', min: undefined, max: undefined },
  { label: 'Até 1h40', min: undefined, max: 100 },
  { label: '1h30 – 2h15', min: 90, max: 135 },
  { label: '2h+', min: 120, max: undefined },
];

function parseOptionalInt(raw: string): number | undefined {
  const cleaned = raw.replace(/\D/g, '');
  if (!cleaned) return undefined;
  const num = Number(cleaned);
  return Number.isInteger(num) ? num : undefined;
}

export function FiltersModal({ open, currentFilters, onClose, onApply }: FiltersModalProps) {
  const genres = useSessionStore((s) => s.genres);
  const watchProviders = useSessionStore((s) => s.watchProviders);
  const catalogStatus = useSessionStore((s) => s.catalogStatus);

  const [draft, setDraft] = useState<FilterCriteria>(currentFilters);
  const [yearFromInput, setYearFromInput] = useState('');
  const [yearToInput, setYearToInput] = useState('');
  const [oscarFromInput, setOscarFromInput] = useState('');
  const [oscarToInput, setOscarToInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(currentFilters);
      setYearFromInput(currentFilters.yearFrom ? String(currentFilters.yearFrom) : '');
      setYearToInput(currentFilters.yearTo ? String(currentFilters.yearTo) : '');
      setOscarFromInput(
        currentFilters.oscar?.ceremonyYearFrom ? String(currentFilters.oscar.ceremonyYearFrom) : '',
      );
      setOscarToInput(
        currentFilters.oscar?.ceremonyYearTo ? String(currentFilters.oscar.ceremonyYearTo) : '',
      );
      setError(null);
    }
  }, [open, currentFilters]);

  const toggleGenre = (id: number) => {
    setDraft((prev) => ({
      ...prev,
      presetId: undefined,
      genreIds: prev.genreIds.includes(id)
        ? prev.genreIds.filter((g) => g !== id)
        : prev.genreIds.length < 10
          ? [...prev.genreIds, id]
          : prev.genreIds,
    }));
  };

  const toggleProvider = (providerId: number) => {
    setDraft((prev) => {
      const current = prev.watchProviderIds ?? [];
      const next = current.includes(providerId)
        ? current.filter((id) => id !== providerId)
        : [...current, providerId];
      return { ...prev, watchProviderIds: next.length > 0 ? next : undefined };
    });
  };

  const toggleOscarEnabled = () => {
    setDraft((prev) => {
      const enabled = !prev.oscar?.enabled;
      return {
        ...prev,
        presetId: undefined,
        oscar: enabled
          ? {
              enabled: true,
              winnersOnly: prev.oscar?.winnersOnly ?? false,
              categories: prev.oscar?.categories ?? [],
              ceremonyYearFrom: prev.oscar?.ceremonyYearFrom,
              ceremonyYearTo: prev.oscar?.ceremonyYearTo,
            }
          : undefined,
      };
    });
  };

  const toggleOscarCategory = (cat: OscarCategory) => {
    setDraft((prev) => {
      const current = prev.oscar?.categories ?? [];
      const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
      return {
        ...prev,
        presetId: undefined,
        oscar: {
          enabled: true,
          winnersOnly: prev.oscar?.winnersOnly ?? false,
          categories: next,
          ceremonyYearFrom: prev.oscar?.ceremonyYearFrom,
          ceremonyYearTo: prev.oscar?.ceremonyYearTo,
        },
      };
    });
  };

  const applyOscarYearPreset = (from?: number, to?: number) => {
    setOscarFromInput(from ? String(from) : '');
    setOscarToInput(to ? String(to) : '');
    setDraft((prev) => ({
      ...prev,
      presetId: undefined,
      oscar: {
        enabled: true,
        winnersOnly: prev.oscar?.winnersOnly ?? false,
        categories: prev.oscar?.categories ?? [],
        ceremonyYearFrom: from,
        ceremonyYearTo: to,
      },
    }));
  };

  const applyPreset = (presetFilters: FilterCriteria) => {
    // Preserva streamings e excludeHistory escolhidos pelo casal ao trocar de vibe!
    const merged: FilterCriteria = {
      ...presetFilters,
      watchProviderIds: draft.watchProviderIds,
      excludeHistory: draft.excludeHistory,
    };
    setDraft(merged);
    setYearFromInput(merged.yearFrom ? String(merged.yearFrom) : '');
    setYearToInput(merged.yearTo ? String(merged.yearTo) : '');
    setOscarFromInput(merged.oscar?.ceremonyYearFrom ? String(merged.oscar.ceremonyYearFrom) : '');
    setOscarToInput(merged.oscar?.ceremonyYearTo ? String(merged.oscar.ceremonyYearTo) : '');
    setError(null);
  };

  const applyYearPreset = (from?: number, to?: number) => {
    setYearFromInput(from ? String(from) : '');
    setYearToInput(to ? String(to) : '');
    setDraft((prev) => ({ ...prev, presetId: undefined, yearFrom: from, yearTo: to }));
  };

  const handleReset = () => {
    setDraft({ genreIds: [], sortBy: 'popularity.desc' });
    setYearFromInput('');
    setYearToInput('');
    setOscarFromInput('');
    setOscarToInput('');
    setError(null);
  };

  const handleSave = async () => {
    const yearFrom = parseOptionalInt(yearFromInput);
    const yearTo = parseOptionalInt(yearToInput);
    const oscarFrom = parseOptionalInt(oscarFromInput);
    const oscarTo = parseOptionalInt(oscarToInput);

    if (yearFrom !== undefined && (yearFrom < 1900 || yearFrom > 2100)) {
      setError('Ano inicial deve estar entre 1900 e 2100.');
      return;
    }
    if (yearTo !== undefined && (yearTo < 1900 || yearTo > 2100)) {
      setError('Ano final deve estar entre 1900 e 2100.');
      return;
    }
    if (yearFrom !== undefined && yearTo !== undefined && yearFrom > yearTo) {
      setError('O ano inicial não pode ser maior que o ano final.');
      return;
    }
    if (draft.oscar?.enabled) {
      if (oscarFrom !== undefined && (oscarFrom < 1929 || oscarFrom > 2030)) {
        setError('Ano do Oscar deve estar entre 1929 e 2030.');
        return;
      }
      if (oscarTo !== undefined && (oscarTo < 1929 || oscarTo > 2030)) {
        setError('Ano do Oscar deve estar entre 1929 e 2030.');
        return;
      }
      if (oscarFrom !== undefined && oscarTo !== undefined && oscarFrom > oscarTo) {
        setError('O ano inicial do Oscar não pode ser maior que o ano final.');
        return;
      }
    }

    setError(null);
    setSaving(true);
    const err = await onApply({
      ...draft,
      yearFrom,
      yearTo,
      oscar: draft.oscar?.enabled
        ? {
            ...draft.oscar,
            ceremonyYearFrom: oscarFrom,
            ceremonyYearTo: oscarTo,
          }
        : undefined,
    });
    setSaving(false);
    if (!err) onClose();
  };

  const chipStyle = (active: boolean, gold = false) => ({
    padding: '7px 11px',
    borderRadius: 'var(--radius-pill)',
    border: `1px solid ${
      active
        ? gold
          ? 'rgba(251, 191, 36, 0.7)'
          : 'var(--accent-primary)'
        : 'var(--border-subtle)'
    }`,
    background: active
      ? gold
        ? 'rgba(245, 158, 11, 0.18)'
        : 'var(--accent-primary-soft)'
      : 'var(--bg-input)',
    color: active ? (gold ? '#fef3c7' : '#FFFFFF') : 'var(--text-secondary)',
    fontSize: 12.5,
    fontWeight: 500,
  });

  const numberInputStyle = {
    width: '100%',
    height: 40,
    padding: '0 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-strong)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: 14,
  };

  const toggleRowStyle = (active: boolean) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '11px 13px',
    borderRadius: 'var(--radius-md)',
    border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
    background: active ? 'var(--accent-primary-soft)' : 'var(--bg-input)',
    textAlign: 'left' as const,
  });

  const oscarEnabled = Boolean(draft.oscar?.enabled);

  return (
    <Modal open={open} title="Filtros da sessão" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Alterar os filtros renova os próximos filmes para vocês dois sem apagar votos nem matches já registrados.
        </p>

        {/* 1. Vibes da noite */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Sparkles size={13} color="#FDBA74" />
            <span>Vibes da noite</span>
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {NIGHT_VIBE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.filters)}
                style={chipStyle(draft.presetId === preset.id, preset.id === 'oscar_night')}
                title={preset.description}
                data-testid={`preset-${preset.id}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Filmes do Oscar (Categorias & Anos) */}
        <div
          style={{
            padding: 13,
            borderRadius: 'var(--radius-md)',
            background: oscarEnabled ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-input)',
            border: `1px solid ${oscarEnabled ? 'rgba(251, 191, 36, 0.45)' : 'var(--border-subtle)'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={toggleOscarEnabled}
            data-testid="filter-oscar-toggle"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              background: 'transparent',
              border: 'none',
              padding: 0,
              width: '100%',
              textAlign: 'left',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Award size={17} color="#FBBF24" />
              <span>
                <strong style={{ display: 'block', fontSize: 14, color: 'var(--text-primary)' }}>
                  Filmes do Oscar
                </strong>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Filtre por categorias e anos da cerimônia (1972–2026)
                </span>
              </span>
            </span>
            <span
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 11.5,
                fontWeight: 700,
                background: oscarEnabled ? '#F59E0B' : 'var(--bg-elevated)',
                color: oscarEnabled ? '#111827' : 'var(--text-secondary)',
              }}
            >
              {oscarEnabled ? 'Ativo' : 'Ativar'}
            </span>
          </button>

          {oscarEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      oscar: { ...p.oscar!, enabled: true, winnersOnly: false },
                    }))
                  }
                  style={{ ...chipStyle(!draft.oscar?.winnersOnly, true), flex: 1 }}
                >
                  Vencedores e indicados
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      oscar: { ...p.oscar!, enabled: true, winnersOnly: true },
                    }))
                  }
                  style={{ ...chipStyle(Boolean(draft.oscar?.winnersOnly), true), flex: 1 }}
                  data-testid="filter-oscar-winners-only"
                >
                  Só vencedores
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fde68a' }}>
                  Categorias (vazio = todas)
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {OSCAR_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleOscarCategory(cat.id)}
                      style={chipStyle(Boolean(draft.oscar?.categories?.includes(cat.id)), true)}
                      data-testid={`oscar-cat-${cat.id}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#fde68a' }}>
                  Anos da cerimônia
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {OSCAR_YEAR_PRESETS.map((preset) => {
                    const active =
                      parseOptionalInt(oscarFromInput) === preset.from &&
                      parseOptionalInt(oscarToInput) === preset.to;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => applyOscarYearPreset(preset.from, preset.to)}
                        style={chipStyle(active, true)}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="De (ex: 2020)"
                    aria-label="Ano inicial do Oscar"
                    value={oscarFromInput}
                    onChange={(e) => setOscarFromInput(e.target.value)}
                    style={numberInputStyle}
                    data-testid="oscar-year-from"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="Até (ex: 2026)"
                    aria-label="Ano final do Oscar"
                    value={oscarToInput}
                    onChange={(e) => setOscarToInput(e.target.value)}
                    style={numberInputStyle}
                    data-testid="oscar-year-to"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2.5 Diretores & Atores */}
        <PeopleFilterSection
          directors={draft.directors ?? []}
          actors={draft.actors ?? []}
          onChange={({ directors, actors }) =>
            setDraft((prev) => ({
              ...prev,
              presetId: undefined,
              directors: directors.length > 0 ? directors : undefined,
              actors: actors.length > 0 ? actors : undefined,
            }))
          }
        />

        {/* 3. Seus Streamings no Brasil */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Tv size={13} />
            <span>Onde assistir (Brasil)</span>
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {watchProviders.slice(0, 10).map((provider) => {
              const active = Boolean(draft.watchProviderIds?.includes(provider.providerId));
              const logo = getProviderLogoUrl(provider.logoPath);
              return (
                <button
                  key={provider.providerId}
                  type="button"
                  onClick={() => toggleProvider(provider.providerId)}
                  style={{
                    ...chipStyle(active),
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  data-testid={`provider-${provider.providerId}`}
                >
                  {logo && (
                    <img src={logo} alt="" width={16} height={16} style={{ borderRadius: 4 }} />
                  )}
                  <span>{provider.name}</span>
                </button>
              );
            })}
          </div>
          {!catalogStatus.tmdbConfigured && (
            <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Configure a TMDB_API_KEY no .env para filtrar em tempo real pelo catálogo de cada streaming.
            </span>
          )}
        </div>

        {/* 4. Variedade da lista (Descoberta Aleatória + Pular Histórico) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Variedade da lista
          </span>

          <button
            type="button"
            onClick={() => setDraft((p) => ({ ...p, randomDiscovery: !p.randomDiscovery }))}
            style={toggleRowStyle(Boolean(draft.randomDiscovery))}
            data-testid="filter-random-discovery"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <Shuffle size={16} color="var(--accent-primary)" />
              <span>
                <strong style={{ display: 'block', fontSize: 13.5, color: 'var(--text-primary)' }}>
                  Descoberta aleatória
                </strong>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Sorteia páginas diferentes do catálogo para sair do óbvio
                </span>
              </span>
            </span>
            <strong style={{ fontSize: 12, color: draft.randomDiscovery ? '#fff' : 'var(--text-muted)' }}>
              {draft.randomDiscovery ? 'ON' : 'OFF'}
            </strong>
          </button>

          <button
            type="button"
            onClick={() => setDraft((p) => ({ ...p, excludeHistory: !p.excludeHistory }))}
            style={toggleRowStyle(Boolean(draft.excludeHistory))}
            data-testid="filter-exclude-history"
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <History size={16} color="var(--accent-violet)" />
              <span>
                <strong style={{ display: 'block', fontSize: 13.5, color: 'var(--text-primary)' }}>
                  Pular filmes do histórico
                </strong>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Oculta filmes que já deram match em sessões anteriores
                </span>
              </span>
            </span>
            <strong style={{ fontSize: 12, color: draft.excludeHistory ? '#fff' : 'var(--text-muted)' }}>
              {draft.excludeHistory ? 'ON' : 'OFF'}
            </strong>
          </button>
        </div>

        {/* 5. Gêneros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Gêneros
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {genres.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGenre(g.id)}
                style={chipStyle(draft.genreIds.includes(g.id))}
                data-testid={`filter-genre-${g.id}`}
              >
                {g.name}
              </button>
            ))}
          </div>
        </div>

        {/* 6. Ano de lançamento */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Ano de lançamento
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {YEAR_PRESETS.map((preset) => {
              const active =
                parseOptionalInt(yearFromInput) === preset.from &&
                parseOptionalInt(yearToInput) === preset.to;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyYearPreset(preset.from, preset.to)}
                  style={chipStyle(active)}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="De (ex: 2010)"
              aria-label="Ano inicial"
              value={yearFromInput}
              onChange={(e) => setYearFromInput(e.target.value)}
              style={numberInputStyle}
              data-testid="filter-year-from"
            />
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="Até (ex: 2026)"
              aria-label="Ano final"
              value={yearToInput}
              onChange={(e) => setYearToInput(e.target.value)}
              style={numberInputStyle}
              data-testid="filter-year-to"
            />
          </div>
        </div>

        {/* 7. Duração */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Duração
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {RUNTIME_PRESETS.map((preset) => {
              const active = draft.minRuntime === preset.min && draft.maxRuntime === preset.max;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      presetId: undefined,
                      minRuntime: preset.min,
                      maxRuntime: preset.max,
                    }))
                  }
                  style={{ ...chipStyle(active), display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <Clock size={12} />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 8. Nota mínima */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Nota mínima
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            {[undefined, 6.5, 7, 7.5, 8].map((val) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setDraft((p) => ({ ...p, presetId: undefined, minRating: val }))}
                style={{
                  ...chipStyle(draft.minRating === val),
                  flex: 1,
                  padding: '7px 6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                <Star size={11} />
                <span>{val ? `${val}+` : 'Todas'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 9. Ordenação */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Ordenação
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDraft((p) => ({ ...p, sortBy: opt.value }))}
                style={chipStyle(draft.sortBy === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 10. Idioma original */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
            Idioma original
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {LANGUAGES.map((lang) => {
              const active = (draft.originalLanguage ?? '') === lang.value;
              return (
                <button
                  key={lang.label}
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({
                      ...p,
                      presetId: undefined,
                      originalLanguage: lang.value || undefined,
                    }))
                  }
                  style={chipStyle(active)}
                >
                  {lang.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p role="alert" style={{ fontSize: 13, color: 'var(--status-danger)' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <Button variant="secondary" icon={<RotateCcw size={15} />} onClick={handleReset}>
            Limpar
          </Button>
          <Button
            fullWidth
            loading={saving}
            onClick={() => void handleSave()}
            data-testid="filters-apply-btn"
          >
            Aplicar filtros
          </Button>
        </div>
      </div>
    </Modal>
  );
}
