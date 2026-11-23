import { useEffect, useState } from 'react';
import { Clapperboard, Search, User, Users, X } from 'lucide-react';
import type { PersonRole, PersonSearchResult, SelectedPerson } from '@cine-match/shared';
import { searchPeople } from '../../services/api';
import { getProfileUrl } from '../../utils/tmdbImages';

interface PeopleFilterSectionProps {
  directors: SelectedPerson[];
  actors: SelectedPerson[];
  onChange: (next: { directors: SelectedPerson[]; actors: SelectedPerson[] }) => void;
}

export function PeopleFilterSection({
  directors,
  actors,
  onChange,
}: PeopleFilterSectionProps) {
  const [activeTab, setActiveTab] = useState<PersonRole>('director');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const delay = query.trim().length === 0 ? 0 : 250;

    const timer = setTimeout(() => {
      setLoading(true);
      void searchPeople(query, activeTab).then((list) => {
        if (!cancelled) {
          setResults(list);
          setLoading(false);
        }
      });
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, activeTab]);

  const currentList = activeTab === 'director' ? directors : actors;

  const togglePerson = (person: PersonSearchResult) => {
    const exists = currentList.some((p) => p.id === person.id);
    const nextList = exists
      ? currentList.filter((p) => p.id !== person.id)
      : currentList.length < 5
        ? [...currentList, { id: person.id, name: person.name, profilePath: person.profilePath }]
        : currentList;

    if (activeTab === 'director') {
      onChange({ directors: nextList, actors });
    } else {
      onChange({ directors, actors: nextList });
    }
  };

  const removePerson = (id: number, role: PersonRole) => {
    if (role === 'director') {
      onChange({ directors: directors.filter((p) => p.id !== id), actors });
    } else {
      onChange({ directors, actors: actors.filter((p) => p.id !== id) });
    }
  };

  return (
    <div
      style={{
        padding: 13,
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-input)',
        border: `1px solid ${
          directors.length + actors.length > 0
            ? 'rgba(168, 85, 247, 0.5)'
            : 'var(--border-subtle)'
        }`,
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
      }}
      data-testid="people-filter-section"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 700,
            color: 'var(--text-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <Clapperboard size={15} color="#C084FC" />
          <span>Diretores & Atores</span>
        </span>
        {directors.length > 0 && actors.length > 0 && (
          <span style={{ fontSize: 11, color: '#d8b4fe' }}>Buscando colaborações</span>
        )}
      </div>

      {/* Selecionados */}
      {(directors.length > 0 || actors.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {directors.map((d) => (
            <button
              key={`dir-${d.id}`}
              type="button"
              onClick={() => removePerson(d.id, 'director')}
              data-testid={`selected-director-${d.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid rgba(168, 85, 247, 0.6)',
                background: 'rgba(168, 85, 247, 0.18)',
                color: '#f3e8ff',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span>Dir: {d.name}</span>
              <X size={12} />
            </button>
          ))}
          {actors.map((a) => (
            <button
              key={`act-${a.id}`}
              type="button"
              onClick={() => removePerson(a.id, 'actor')}
              data-testid={`selected-actor-${a.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid rgba(255, 77, 109, 0.6)',
                background: 'var(--accent-primary-soft)',
                color: '#ffe4e6',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span>Ator: {a.name}</span>
              <X size={12} />
            </button>
          ))}
        </div>
      )}

      {/* Abas Diretores | Atores */}
      <div
        role="tablist"
        aria-label="Filtrar por pessoas"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          padding: 4,
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'director'}
          onClick={() => setActiveTab('director')}
          data-testid="people-tab-director"
          style={{
            padding: '7px 10px',
            borderRadius: 7,
            border: 'none',
            background: activeTab === 'director' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'director' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Clapperboard size={13} />
          <span>Diretores {directors.length > 0 ? `(${directors.length})` : ''}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'actor'}
          onClick={() => setActiveTab('actor')}
          data-testid="people-tab-actor"
          style={{
            padding: '7px 10px',
            borderRadius: 7,
            border: 'none',
            background: activeTab === 'actor' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'actor' ? '#ffffff' : 'var(--text-secondary)',
            fontSize: 13,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Users size={13} />
          <span>Atores {actors.length > 0 ? `(${actors.length})` : ''}</span>
        </button>
      </div>

      {/* Campo de busca */}
      <div style={{ position: 'relative' }}>
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            activeTab === 'director'
              ? 'Pesquisar diretor (ex: Nolan, Bong Joon-ho)...'
              : 'Pesquisar ator ou atriz (ex: Emma Stone, Wagner Moura)...'
          }
          aria-label={activeTab === 'director' ? 'Pesquisar diretor' : 'Pesquisar ator ou atriz'}
          data-testid="people-search-input"
          style={{
            width: '100%',
            height: 40,
            padding: '0 34px 0 36px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-canvas)',
            color: 'var(--text-primary)',
            fontSize: 13.5,
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpar busca"
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Resultados / Sugestões */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          maxHeight: 205,
          overflowY: 'auto',
          paddingRight: 2,
        }}
      >
        {loading ? (
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '6px 2px' }}>
            Buscando...
          </span>
        ) : results.length === 0 ? (
          <span style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '6px 2px' }}>
            Nenhum resultado encontrado para "{query}".
          </span>
        ) : (
          results.slice(0, 8).map((person) => {
            const selected = currentList.some((p) => p.id === person.id);
            const avatar = getProfileUrl(person.profilePath);

            return (
              <button
                key={person.id}
                type="button"
                onClick={() => togglePerson(person)}
                data-testid={`person-option-${person.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '7px 9px',
                  borderRadius: 10,
                  border: `1px solid ${
                    selected ? 'rgba(168, 85, 247, 0.7)' : 'var(--border-subtle)'
                  }`,
                  background: selected ? 'rgba(168, 85, 247, 0.16)' : 'var(--bg-surface)',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--text-muted)',
                  }}
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt=""
                      width={34}
                      height={34}
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <User size={16} />
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {person.name}
                  </div>
                  {person.knownForTitles.length > 0 && (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {person.knownForTitles.join(' • ')}
                    </div>
                  )}
                </div>

                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: selected ? '#e9d5ff' : 'var(--text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  {selected ? 'Selecionado' : '+'}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
