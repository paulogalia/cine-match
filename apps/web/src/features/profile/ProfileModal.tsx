import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  BarChart3,
  Camera,
  Check,
  Copy,
  Film,
  KeyRound,
  Languages,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import {
  AVATAR_COLORS,
  type TitleLanguage,
  type UserProfile,
} from '@cine-match/shared';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import {
  clearLetterboxdListApi,
  fetchProfile,
  importLetterboxdCsvApi,
  recoverProfileApi,
  updateProfileApi,
} from '../../services/api';
import { useSessionStore } from '../../stores/sessionStore';
import { getGenreName, getInitials } from '../../utils/genres';
import { TITLE_LANGUAGE_LABELS } from '../../utils/movieTitle';

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
}

type ProfileTab = 'profile' | 'letterboxd' | 'stats';

const TITLE_LANG_OPTIONS: TitleLanguage[] = ['pt-BR', 'en-US', 'original'];

async function compressAvatarFile(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
      el.src = objectUrl;
    });

    const size = 160;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Seu navegador não suporta compressão de imagem.');
    }

    const minSide = Math.min(img.width, img.height);
    const sx = (img.width - minSide) / 2;
    const sy = (img.height - minSide) / 2;

    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

    let dataUrl = canvas.toDataURL('image/webp', 0.78);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    }
    if (dataUrl.length > 44_000) {
      dataUrl = canvas.toDataURL('image/jpeg', 0.55);
    }
    if (dataUrl.length > 44_000) {
      throw new Error('A imagem ficou muito pesada mesmo após comprimir. Tente outra foto.');
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getVoterBadge(totalVotes: number, likeRatio: number): string {
  if (totalVotes < 10) return 'Recém-chegado';
  if (likeRatio <= 22) return 'Crítico Rigoroso';
  if (likeRatio <= 42) return 'Seletivo';
  if (likeRatio <= 68) return 'Equilibrado';
  return 'Mente Aberta';
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const deviceId = useSessionStore((s) => s.deviceId);
  const savedName = useSessionStore((s) => s.savedName);
  const profile = useSessionStore((s) => s.profile);
  const titleLanguage = useSessionStore((s) => s.titleLanguage);
  const setProfile = useSessionStore((s) => s.setProfile);
  const applyRecoveredProfile = useSessionStore((s) => s.applyRecoveredProfile);
  const setTitleLanguage = useSessionStore((s) => s.setTitleLanguage);
  const showToast = useSessionStore((s) => s.showToast);

  const [tab, setTab] = useState<ProfileTab>('profile');
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [nameInput, setNameInput] = useState('');
  const [avatarColor, setAvatarColor] = useState<string>(AVATAR_COLORS[0] ?? '#E11D48');
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [langDraft, setLangDraft] = useState<TitleLanguage>(titleLanguage);
  const [savingProfile, setSavingProfile] = useState(false);

  const [copiedCode, setCopiedCode] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recovering, setRecovering] = useState(false);

  const [importingKind, setImportingKind] = useState<'watched' | 'watchlist' | null>(null);
  const [clearingKind, setClearingKind] = useState<'watched' | 'watchlist' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const watchedCsvInputRef = useRef<HTMLInputElement | null>(null);
  const watchlistCsvInputRef = useRef<HTMLInputElement | null>(null);

  const syncDraftFromProfile = (p: UserProfile) => {
    setNameInput(p.name ?? savedName ?? '');
    setAvatarColor(p.avatarColor);
    setAvatarDataUrl(p.avatarDataUrl ?? null);
    setLangDraft(p.titleLanguage ?? 'pt-BR');
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setCopiedCode(false);

    let cancelled = false;
    setLoadingProfile(true);
    void fetchProfile(deviceId).then((loaded) => {
      if (cancelled) return;
      setLoadingProfile(false);
      if (loaded) {
        setProfile(loaded);
        syncDraftFromProfile(loaded);
      } else if (profile) {
        syncDraftFromProfile(profile);
      } else {
        setNameInput(savedName);
        setLangDraft(titleLanguage);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [open, deviceId]);

  const handlePhotoSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem válido.');
      return;
    }

    setError(null);
    try {
      const compressed = await compressAvatarFile(file);
      setAvatarDataUrl(compressed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar a foto.');
    }
  };

  const handleSaveProfile = async () => {
    const trimmedName = nameInput.trim();
    if (trimmedName.length > 0 && trimmedName.length < 2) {
      setError('O nome precisa ter pelo menos 2 caracteres.');
      return;
    }

    setError(null);
    setSavingProfile(true);
    const result = await updateProfileApi(deviceId, {
      ...(trimmedName.length >= 2 ? { name: trimmedName } : {}),
      avatarColor,
      avatarDataUrl,
      titleLanguage: langDraft,
    });
    setSavingProfile(false);

    if (result.error || !result.profile) {
      setError(result.error ?? 'Não foi possível salvar o perfil.');
      return;
    }

    setProfile(result.profile);
    setTitleLanguage(result.profile.titleLanguage);
    showToast('Perfil atualizado!', 'success');
  };

  const handleCopyRecoveryCode = async () => {
    if (!profile?.recoveryCode) return;
    try {
      await navigator.clipboard?.writeText(profile.recoveryCode);
      setCopiedCode(true);
      showToast('Código copiado!', 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      showToast(`Seu código: ${profile.recoveryCode}`, 'info');
    }
  };

  const handleRecoverProfile = async () => {
    const code = recoveryInput.trim().toUpperCase();
    if (code.length < 4) {
      setError('Digite o código de recuperação (ex: CINE-7X92).');
      return;
    }

    setError(null);
    setRecovering(true);
    const result = await recoverProfileApi(code);
    setRecovering(false);

    if (result.error || !result.profile) {
      setError(result.error ?? 'Código não encontrado.');
      return;
    }

    applyRecoveredProfile(result.profile);
    syncDraftFromProfile(result.profile);
    setRecoveryInput('');
    showToast('Perfil recuperado neste aparelho!', 'success');
  };

  const handleCsvSelected = async (
    kind: 'watched' | 'watchlist',
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError('Arquivo muito grande (máximo 2 MB).');
      return;
    }

    setError(null);
    setImportingKind(kind);
    try {
      const csvText = await file.text();
      const result = await importLetterboxdCsvApi(deviceId, kind, csvText);
      if (result.error || !result.profile) {
        setError(result.error ?? 'Erro ao importar CSV.');
      } else {
        setProfile(result.profile);
        const label = kind === 'watched' ? 'assistidos' : 'na watchlist';
        showToast(`${result.importedCount ?? 0} filmes ${label} importados!`, 'success');
      }
    } catch {
      setError('Não foi possível ler o arquivo selecionado.');
    } finally {
      setImportingKind(null);
    }
  };

  const handleClearLetterboxd = async (kind: 'watched' | 'watchlist') => {
    setError(null);
    setClearingKind(kind);
    const result = await clearLetterboxdListApi(deviceId, kind);
    setClearingKind(null);

    if (result.error || !result.profile) {
      setError(result.error ?? 'Erro ao limpar lista.');
      return;
    }

    setProfile(result.profile);
    showToast(
      kind === 'watched' ? 'Lista de assistidos limpa.' : 'Watchlist limpa.',
      'info',
    );
  };

  const statsSummary = useMemo(() => {
    const stats = profile?.stats;
    if (!stats) {
      return {
        likeRatio: 0,
        badge: 'Recém-chegado',
        topGenres: [] as Array<{ id: number; name: string; count: number }>,
        affinities: [] as Array<{ partnerPublicId: string; partnerName: string; pct: number; total: number }>,
      };
    }

    const likeRatio =
      stats.totalVotes > 0 ? Math.round((stats.totalLikes / stats.totalVotes) * 100) : 0;

    const topGenres = Object.entries(stats.genreLikes)
      .map(([id, count]) => ({ id: Number(id), name: getGenreName(Number(id)), count }))
      .filter((g) => g.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const affinities = Object.values(stats.pairAgreements)
      .filter((pair) => pair.total > 0)
      .map((pair) => ({
        partnerPublicId: pair.partnerPublicId,
        partnerName: pair.partnerName,
        pct: Math.round((pair.agreed / pair.total) * 100),
        total: pair.total,
      }))
      .sort((a, b) => b.pct - a.pct || b.total - a.total);

    return {
      likeRatio,
      badge: getVoterBadge(stats.totalVotes, likeRatio),
      topGenres,
      affinities,
    };
  }, [profile]);

  const tabBtnStyle = (active: boolean) => ({
    flex: 1,
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
    background: active ? 'var(--accent-primary-soft)' : 'var(--bg-input)',
    color: active ? '#FFFFFF' : 'var(--text-secondary)',
    fontSize: 12.5,
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  });

  const inputStyle = {
    width: '100%',
    height: 42,
    padding: '0 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-strong)',
    background: 'var(--bg-input)',
    color: 'var(--text-primary)',
    fontSize: 14,
  };

  const cardStyle = {
    padding: 13,
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-input)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  };

  const displayName = nameInput.trim() || profile?.name || 'Você';

  return (
    <Modal open={open} title="Seu perfil" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            style={tabBtnStyle(tab === 'profile')}
            onClick={() => setTab('profile')}
            data-testid="profile-tab-profile"
          >
            <User size={14} />
            <span>Perfil</span>
          </button>
          <button
            type="button"
            style={tabBtnStyle(tab === 'letterboxd')}
            onClick={() => setTab('letterboxd')}
            data-testid="profile-tab-letterboxd"
          >
            <Film size={14} />
            <span>Letterboxd</span>
          </button>
          <button
            type="button"
            style={tabBtnStyle(tab === 'stats')}
            onClick={() => setTab('stats')}
            data-testid="profile-tab-stats"
          >
            <BarChart3 size={14} />
            <span>Stats</span>
          </button>
        </div>

        {loadingProfile && !profile && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', padding: 12 }}>
            Carregando perfil...
          </p>
        )}

        {tab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            {/* Avatar + Foto */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: avatarColor,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 22,
                  color: '#fff',
                  flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.16)',
                }}
              >
                {avatarDataUrl ? (
                  <img
                    src={avatarDataUrl}
                    alt={displayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  getInitials(displayName)
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => void handlePhotoSelected(e)}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Camera size={14} />}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    {avatarDataUrl ? 'Trocar foto' : 'Escolher foto'}
                  </Button>
                  {avatarDataUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={14} />}
                      onClick={() => setAvatarDataUrl(null)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Foto comprimida automaticamente (~8 KB) sem precisar de cadastro.
                </span>
              </div>
            </div>

            {/* Cor do avatar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Cor do perfil
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AVATAR_COLORS.map((color) => {
                  const selected = avatarColor === color;
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      aria-label={`Selecionar cor ${color}`}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: color,
                        border: selected ? '2px solid #FFFFFF' : '2px solid transparent',
                        boxShadow: selected ? '0 0 0 2px var(--accent-primary)' : 'none',
                        cursor: 'pointer',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Nome */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Seu nome nas salas
              </span>
              <input
                type="text"
                maxLength={24}
                placeholder="Ex: Paulo"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                style={inputStyle}
                data-testid="profile-name-input"
              />
            </label>

            {/* Idioma dos títulos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Languages size={14} />
                <span>Idioma dos títulos dos filmes</span>
              </span>
              <div style={{ display: 'flex', gap: 7 }}>
                {TITLE_LANG_OPTIONS.map((lang) => {
                  const active = langDraft === lang;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLangDraft(lang)}
                      style={{
                        flex: 1,
                        padding: '8px 6px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        background: active ? 'var(--accent-primary-soft)' : 'var(--bg-input)',
                        color: active ? '#FFFFFF' : 'var(--text-secondary)',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      data-testid={`title-lang-${lang}`}
                    >
                      {TITLE_LANGUAGE_LABELS[lang]}
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                Preferência individual — cada amigo na sala vê os títulos no idioma que preferir.
              </span>
            </div>

            <Button
              fullWidth
              loading={savingProfile}
              onClick={() => void handleSaveProfile()}
              data-testid="profile-save-btn"
            >
              Salvar perfil
            </Button>

            {/* Código de recuperação */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <KeyRound size={14} />
                  <span>Código do seu perfil</span>
                </span>
                {profile?.recoveryCode && (
                  <button
                    type="button"
                    onClick={() => void handleCopyRecoveryCode()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px',
                      borderRadius: 'var(--radius-pill)',
                      border: '1px solid var(--border-strong)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                    }}
                  >
                    <span>{profile.recoveryCode}</span>
                    {copiedCode ? <Check size={13} color="#4ADE80" /> : <Copy size={13} />}
                  </button>
                )}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                Guarde este código para trazer suas estatísticas e listas do Letterboxd se trocar de celular ou navegador.
              </p>

              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  maxLength={14}
                  placeholder="Recuperar código (ex: CINE-7X92)"
                  value={recoveryInput}
                  onChange={(e) => setRecoveryInput(e.target.value.toUpperCase())}
                  style={{ ...inputStyle, height: 38, fontSize: 13 }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  loading={recovering}
                  onClick={() => void handleRecoverProfile()}
                >
                  Recuperar
                </Button>
              </div>
            </div>
          </div>
        )}

        {tab === 'letterboxd' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              No Letterboxd, acesse <strong>Settings → Import & Export → Export Your Data</strong>, extraia o ZIP e envie os arquivos <code>watched.csv</code> ou <code>watchlist.csv</code> abaixo.
            </p>

            {/* Watched CSV */}
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <strong style={{ display: 'block', fontSize: 14, color: 'var(--text-primary)' }}>
                    Filmes já assistidos (watched.csv)
                  </strong>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {profile && profile.letterboxd.watchedCount > 0
                      ? `${profile.letterboxd.watchedCount} filmes importados`
                      : 'Nenhum arquivo importado ainda'}
                  </span>
                </div>
              </div>

              <input
                ref={watchedCsvInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => void handleCsvSelected('watched', e)}
              />

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size="sm"
                  fullWidth
                  icon={<Upload size={14} />}
                  loading={importingKind === 'watched'}
                  onClick={() => watchedCsvInputRef.current?.click()}
                  data-testid="import-watched-csv-btn"
                >
                  Importar watched.csv
                </Button>
                {profile && profile.letterboxd.watchedCount > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Trash2 size={14} />}
                    loading={clearingKind === 'watched'}
                    onClick={() => void handleClearLetterboxd('watched')}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Watchlist CSV */}
            <div style={cardStyle}>
              <div>
                <strong style={{ display: 'block', fontSize: 14, color: 'var(--text-primary)' }}>
                  Quero ver (watchlist.csv)
                </strong>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {profile && profile.letterboxd.watchlistCount > 0
                    ? `${profile.letterboxd.watchlistCount} filmes na sua watchlist`
                    : 'Nenhuma watchlist importada ainda'}
                </span>
              </div>

              <input
                ref={watchlistCsvInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => void handleCsvSelected('watchlist', e)}
              />

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  fullWidth
                  icon={<Upload size={14} />}
                  loading={importingKind === 'watchlist'}
                  onClick={() => watchlistCsvInputRef.current?.click()}
                  data-testid="import-watchlist-csv-btn"
                >
                  Importar watchlist.csv
                </Button>
                {profile && profile.letterboxd.watchlistCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Trash2 size={14} />}
                    loading={clearingKind === 'watchlist'}
                    onClick={() => void handleClearLetterboxd('watchlist')}
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Nos <strong>Filtros da sessão</strong>, você escolhe se filmes já vistos pelos participantes serão ocultados automaticamente ou apenas marcados com um aviso no card.
            </p>
          </div>
        )}

        {tab === 'stats' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <div style={cardStyle}>
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  Escolhidos no app
                </span>
                <strong style={{ fontSize: 22, color: 'var(--text-primary)' }}>
                  {profile?.stats.chosenMoviesCount ?? 0}
                </strong>
              </div>
              <div style={cardStyle}>
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  Matches acumulados
                </span>
                <strong style={{ fontSize: 22, color: 'var(--text-primary)' }}>
                  {profile?.stats.totalMatches ?? 0}
                </strong>
              </div>
              <div style={cardStyle}>
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  Total de votos
                </span>
                <strong style={{ fontSize: 22, color: 'var(--text-primary)' }}>
                  {profile?.stats.totalVotes ?? 0}
                </strong>
              </div>
              <div style={cardStyle}>
                <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  Taxa de aprovação
                </span>
                <strong style={{ fontSize: 22, color: 'var(--text-primary)' }}>
                  {statsSummary.likeRatio}%
                </strong>
                <span style={{ fontSize: 11.5, color: '#FDBA74', fontWeight: 600 }}>
                  {statsSummary.badge}
                </span>
              </div>
            </div>

            {profile && profile.letterboxd.watchedCount > 0 && (
              <div style={cardStyle}>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                  Histórico total (Letterboxd + Cine Match):{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {profile.letterboxd.watchedCount} vistos no Letterboxd
                  </strong>{' '}
                  •{' '}
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {profile.stats.watchedWithAppIds.length} escolhidos pelo app
                  </strong>
                </span>
              </div>
            )}

            {statsSummary.topGenres.length > 0 && (
              <div style={cardStyle}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Gêneros que você mais curte
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {statsSummary.topGenres.map((genre) => (
                    <span
                      key={genre.id}
                      style={{
                        padding: '5px 10px',
                        borderRadius: 'var(--radius-pill)',
                        background: 'var(--accent-primary-soft)',
                        border: '1px solid rgba(225, 29, 72, 0.35)',
                        color: '#FFFFFF',
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    >
                      {genre.name} ({genre.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={cardStyle}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Users size={14} />
                <span>Afinidade com amigos</span>
              </span>
              {statsSummary.affinities.length === 0 ? (
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0 }}>
                  Finalize sessões com amigos para calcular sua porcentagem de sintonia cinematográfica.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {statsSummary.affinities.map((item) => (
                    <div
                      key={item.partnerPublicId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                        fontSize: 13,
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {item.partnerName}{' '}
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                          ({item.total} em comum)
                        </span>
                      </span>
                      <strong style={{ color: item.pct >= 65 ? '#4ADE80' : '#FDBA74' }}>
                        {item.pct}%
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" style={{ fontSize: 13, color: 'var(--status-danger)', margin: 0 }}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}