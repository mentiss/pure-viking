import { useState, useEffect, useCallback } from 'react';
import { useSocket }   from '../../../../context/SocketContext.jsx';
import { useFetch }    from '../../../../hooks/useFetch.js';
import { useSystem }   from '../../../../hooks/useSystem.js';
import GMSendModal     from '../../../../components/gm/modals/GMSendModal.jsx';
import {
    DOMAINES, STAT_LABELS, SPECIALTY_NIVEAUX, SPECIALTY_TYPES,
    OMBRE_TYPES, computeMalusBlessure,
} from '../../config.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

const HEALTH_NIVEAUX = [
    { key: 'touche', label: 'Touché',  color: 'text-secondary' },
    { key: 'blesse', label: 'Blessé',  color: 'text-danger'    },
    { key: 'tue',    label: 'Tué',     color: 'text-danger'    },
];

// ── Composant principal ───────────────────────────────────────────────────────

const TabSession = ({ activeSession, onlineCharacters }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();
    const socket        = useSocket();

    const [characters,    setCharacters]    = useState({});
    const [selectedId,    setSelectedId]    = useState(null);
    const [loading,       setLoading]       = useState(false);
    const [showSendModal, setShowSendModal] = useState(false);
    const [sendPreSelect, setSendPreSelect] = useState(null);

    const onlineIds = new Set((onlineCharacters ?? []).map(c => c.characterId));

    // ── Chargement des fiches ─────────────────────────────────────────────────

    useEffect(() => {
        if (!activeSession?.characters?.length) {
            setCharacters({});
            setSelectedId(null);
            return;
        }
        setLoading(true);

        const load = async () => {
            const loaded = {};
            await Promise.all(activeSession.characters.map(async c => {
                try {
                    const r = await fetchWithAuth(`${apiBase}/characters/${c.id}`);
                    if (r.ok) loaded[c.id] = await r.json();
                } catch (e) {
                    console.error(`[TabSession/noctis] ${c.id}:`, e);
                }
            }));
            setCharacters(loaded);
            if (!selectedId || !loaded[selectedId]) {
                setSelectedId(activeSession.characters[0]?.id ?? null);
            }
            setLoading(false);
        };

        load();
    }, [activeSession?.id, activeSession?.characters?.length, apiBase]); // fetchWithAuth absent

    // ── Sync socket ───────────────────────────────────────────────────────────

    useEffect(() => {
        if (!socket) return;

        const onUpdate = ({ characterId }) => {
            if (!characterId || characterId === -1) return;
            fetchWithAuth(`${apiBase}/characters/${characterId}`)
                .then(r => r.ok ? r.json() : null)
                .then(char => {
                    if (char) setCharacters(prev => ({ ...prev, [characterId]: char }));
                });
        };

        socket.on('character-updated', onUpdate);
        return () => socket.off('character-updated', onUpdate);
    }, [socket, apiBase]); // fetchWithAuth absent

    // ── Patch GM ──────────────────────────────────────────────────────────────

    const patch = useCallback(async (charId, fields) => {
        const res = await fetchWithAuth(`${apiBase}/characters/${charId}`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(fields),
        });
        if (res.ok) {
            const updated = await res.json();
            setCharacters(prev => ({ ...prev, [charId]: { ...prev[charId], ...updated } }));
        }
    }, [apiBase]); // fetchWithAuth absent

    const char = selectedId ? characters[selectedId] : null;
    const malus = char ? computeMalusBlessure(char) : 0;

    // ── Render ────────────────────────────────────────────────────────────────

    if (!activeSession) {
        return (
            <div className="flex items-center justify-center h-64 text-muted text-sm">
                Aucune session active. Gérez votre table via le bouton ⚙ Table.
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0">

            {/* ── Colonne gauche — liste personnages ─────────────────────── */}
            <aside className="w-56 shrink-0 border-r border-default bg-surface overflow-y-auto">
                <div className="p-3 border-b border-default">
                    <p className="text-muted text-xs uppercase">Personnages</p>
                </div>
                {loading && (
                    <p className="text-muted text-xs text-center p-4">Chargement…</p>
                )}
                {!loading && activeSession.characters?.map(c => {
                    const full    = characters[c.id];
                    const online  = onlineIds.has(c.id);
                    const selected = selectedId === c.id;

                    return (
                        <button
                            key={c.id}
                            onClick={() => setSelectedId(c.id)}
                            className={`w-full text-left px-3 py-2.5 border-b border-default transition-colors flex items-center gap-2 ${
                                selected ? 'bg-primary/10 border-l-2 border-l-primary' : 'hover:bg-surface-alt'
                            }`}
                        >
                            {/* Indicateur online */}
                            <div className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-success' : 'bg-default/30'}`} />

                            <div className="flex-1 min-w-0">
                                <p className="text-default text-sm font-medium truncate">
                                    {full?.prenom ?? '…'} {full?.nom ?? ''}
                                </p>
                                <p className="text-muted text-xs truncate">{full?.player_name ?? ''}</p>
                            </div>

                            {/* Éclats */}
                            {full && (
                                <span className="text-accent text-xs shrink-0">
                                    {'✦'.repeat(full.eclats_current ?? 0)}
                                </span>
                            )}
                        </button>
                    );
                })}
            </aside>

            {/* ── Colonne droite — fiche GM ──────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!char ? (
                    <div className="flex items-center justify-center h-64 text-muted text-sm">
                        Sélectionnez un personnage.
                    </div>
                ) : (
                    <>
                        {/* ── En-tête personnage ────────────────────────── */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h2 className="text-primary font-bold text-xl">
                                    {char.prenom} {char.nom}
                                </h2>
                                <p className="text-muted text-sm">
                                    {char.player_name}
                                    {char.activite && ` · ${char.activite}`}
                                </p>
                                {malus < 0 && (
                                    <span className="text-danger text-xs font-bold">
                                        Malus blessure : {malus}D
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setSendPreSelect(char.id); setShowSendModal(true); }}
                                    className="px-3 py-1.5 text-xs rounded border border-default text-muted hover:text-default"
                                >
                                    ✉ Envoyer note
                                </button>
                            </div>
                        </div>

                        {/* ── Éclats ────────────────────────────────────── */}
                        <div className="bg-surface border border-default rounded-lg p-4 space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-primary font-semibold text-sm uppercase tracking-wide">Éclats</h3>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => patch(char.id, { eclats_current: Math.max(0, (char.eclats_current ?? 1) - 1) })}
                                        disabled={(char.eclats_current ?? 1) <= 0}
                                        className="w-7 h-7 rounded border border-default text-muted disabled:opacity-30"
                                    >−</button>
                                    <span className="text-accent font-bold text-lg w-16 text-center">
                                        {'✦'.repeat(char.eclats_current ?? 0)}
                                        <span className="text-muted text-xs ml-1">
                                            {char.eclats_current}/{char.eclats_max}
                                        </span>
                                    </span>
                                    <button
                                        onClick={() => patch(char.id, { eclats_current: Math.min(char.eclats_max ?? 1, (char.eclats_current ?? 1) + 1) })}
                                        disabled={(char.eclats_current ?? 1) >= (char.eclats_max ?? 1)}
                                        className="w-7 h-7 rounded border border-default text-muted disabled:opacity-30"
                                    >+</button>
                                </div>
                            </div>

                            {/* Max éclats */}
                            <div className="flex items-center gap-2 text-xs text-muted">
                                <span>Max :</span>
                                {[1, 2, 3].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => patch(char.id, { eclats_max: v, eclats_current: Math.min(char.eclats_current ?? 1, v) })}
                                        className={`w-6 h-6 rounded border text-xs font-bold ${
                                            char.eclats_max === v
                                                ? 'bg-accent border-accent text-bg'
                                                : 'border-default text-muted'
                                        }`}
                                    >{v}</button>
                                ))}
                            </div>

                            {/* Ombres */}
                            {char.ombres?.length > 0 && (
                                <div className="pt-2 border-t border-default space-y-1">
                                    {char.ombres.map((o, i) => (
                                        <p key={i} className="text-xs">
                                            <span className="text-secondary font-semibold">{OMBRE_TYPES[o.type]}</span>
                                            {o.description && <span className="text-muted"> — {o.description}</span>}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── Santé ─────────────────────────────────────── */}
                        <div className="bg-surface border border-default rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-primary font-semibold text-sm uppercase tracking-wide">Santé</h3>

                                {/* Toggle Fracturé */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-xs text-muted">Fracturé</span>
                                    <div
                                        onClick={() => patch(char.id, { is_fracture: char.is_fracture ? 0 : 1 })}
                                        className={`w-10 h-5 rounded-full border-2 transition-colors cursor-pointer ${
                                            char.is_fracture
                                                ? 'bg-accent border-accent'
                                                : 'bg-surface-alt border-default'
                                        }`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded-full bg-bg m-0.5 transition-transform ${
                                            char.is_fracture ? 'translate-x-5' : 'translate-x-0'
                                        }`} />
                                    </div>
                                </label>
                            </div>

                            {HEALTH_NIVEAUX.map(({ key, label, color }) => {
                                const maxKey     = `sante_${key}_max`;
                                const currentKey = `sante_${key}_current`;
                                const max        = char[maxKey]     ?? (key === 'touche' ? 4 : key === 'blesse' ? 2 : 1);
                                const current    = char[currentKey] ?? 0;

                                return (
                                    <div key={key}>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-semibold ${color}`}>{label}</span>
                                            {char.is_fracture && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => patch(char.id, { [maxKey]: Math.max(1, max - 1), [currentKey]: Math.min(current, max - 1) })}
                                                        className="w-5 h-5 text-xs rounded border border-default text-muted"
                                                    >−</button>
                                                    <span className="text-muted text-xs w-4 text-center">{max}</span>
                                                    <button
                                                        onClick={() => patch(char.id, { [maxKey]: max + 1 })}
                                                        className="w-5 h-5 text-xs rounded border border-default text-muted"
                                                    >+</button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-1 flex-wrap">
                                            {Array.from({ length: max }, (_, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => patch(char.id, { [currentKey]: i < current ? i : i + 1 })}
                                                    className={`w-6 h-6 rounded border transition-colors ${
                                                        i < current ? 'bg-danger border-danger' : 'bg-surface-alt border-default'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Réserves (lecture) ────────────────────────── */}
                        <div className="bg-surface border border-default rounded-lg p-4 space-y-3">
                            <h3 className="text-primary font-semibold text-sm uppercase tracking-wide">Réserves</h3>
                            {[
                                { label: 'Effort',     curr: char.reserve_effort_current,    max: char.reserve_effort_max },
                                { label: 'Sang-Froid', curr: char.reserve_sangfroid_current, max: char.reserve_sangfroid_max },
                            ].map(({ label, curr, max }) => (
                                <div key={label} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted">{label}</span>
                                        <span className="text-default font-bold">{curr ?? 0} / {max ?? 0}</span>
                                    </div>
                                    <div className="h-2 bg-surface-alt rounded-full overflow-hidden border border-default">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: max > 0 ? `${((curr ?? 0) / max) * 100}%` : '0%' }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ── XP ────────────────────────────────────────── */}
                        <div className="bg-surface border border-default rounded-lg p-4">
                            <h3 className="text-primary font-semibold text-sm uppercase tracking-wide mb-3">Expérience</h3>
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-1">
                                    <p className="text-muted text-xs">XP Total</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => patch(char.id, { xp_total: Math.max(0, (char.xp_total ?? 0) - 1) })}
                                            className="w-7 h-7 rounded border border-default text-muted"
                                        >−</button>
                                        <span className="text-primary font-bold text-xl w-10 text-center">
                                            {char.xp_total ?? 0}
                                        </span>
                                        <button
                                            onClick={() => patch(char.id, { xp_total: (char.xp_total ?? 0) + 1 })}
                                            className="w-7 h-7 rounded border border-default text-muted"
                                        >+</button>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-muted text-xs">XP Dépensé</p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => patch(char.id, { xp_spent: Math.max(0, (char.xp_spent ?? 0) - 1) })}
                                            className="w-7 h-7 rounded border border-default text-muted"
                                        >−</button>
                                        <span className="text-secondary font-bold text-xl w-10 text-center">
                                            {char.xp_spent ?? 0}
                                        </span>
                                        <button
                                            onClick={() => patch(char.id, { xp_spent: (char.xp_spent ?? 0) + 1 })}
                                            className="w-7 h-7 rounded border border-default text-muted"
                                        >+</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Caractéristiques (lecture) ────────────────── */}
                        <div className="bg-surface border border-default rounded-lg p-4">
                            <h3 className="text-primary font-semibold text-sm uppercase tracking-wide mb-3">
                                Caractéristiques
                                <span className="text-muted font-normal ml-2 text-xs">
                                    Initiative : {(char.agilite ?? 1) + (char.athletisme ?? 1)}
                                </span>
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(DOMAINES).map(([, domaine]) => (
                                    <div key={domaine.label}>
                                        <p className={`text-${domaine.color} text-xs font-bold uppercase mb-1`}>
                                            {domaine.label}
                                        </p>
                                        {domaine.stats.map(stat => (
                                            <div key={stat} className="flex justify-between text-sm py-0.5">
                                                <span className="text-muted">{STAT_LABELS[stat]}</span>
                                                <span className="text-primary font-bold">{char[stat] ?? 1}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ── Spécialités (lecture) ─────────────────────── */}
                        {char.specialties?.length > 0 && (
                            <div className="bg-surface border border-default rounded-lg p-4">
                                <h3 className="text-primary font-semibold text-sm uppercase tracking-wide mb-2">Spécialités</h3>
                                <div className="space-y-1">
                                    {char.specialties.map((s, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="text-default">
                                                {s.name}
                                                {SPECIALTY_TYPES[s.type]?.badge && (
                                                    <span className="text-accent text-xs ml-1">({SPECIALTY_TYPES[s.type].badge})</span>
                                                )}
                                            </span>
                                            <span className="text-muted text-xs">
                                                {SPECIALTY_NIVEAUX[s.niveau]?.label} (+{SPECIALTY_NIVEAUX[s.niveau]?.bonus}D)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ── Modal envoi note ─────────────────────────────────────── */}
            {showSendModal && (
                <GMSendModal
                    preSelectedCharId={sendPreSelect}
                    onClose={() => { setShowSendModal(false); setSendPreSelect(null); }}
                />
            )}
        </div>
    );
};

export default TabSession;