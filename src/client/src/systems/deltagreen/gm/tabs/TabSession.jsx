// src/client/src/systems/deltagreen/gm/tabs/TabSession.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Vue GM des agents de la session :
//   - Carte par agent : SAN, PV, palier de dégradation, tags GM
//   - Palier modifiable directement → PUT + broadcast socket
//   - Tags assignables/retirables
//   - Initiative : tri par DEX décroissant, indicateur de tour actif
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../../../context/SocketContext.jsx';
import { useSystem } from '../../../../hooks/useSystem.js';
import {useFetch}      from '../../../../hooks/useFetch.js';
import { GM_TAGS }   from '../../config.jsx';

// ── Constantes ────────────────────────────────────────────────────────────────

const PALIER_LABELS = ['Stable', 'Sous pression', 'En crise', 'Fracturé', 'Perdu'];
const PALIER_COLORS = [
    'text-success border-success/40',
    'text-accent  border-accent/40',
    'text-accent  border-accent/60',
    'text-danger  border-danger/40',
    'text-danger  border-danger/70',
];

// ── Carte agent ───────────────────────────────────────────────────────────────

const AgentCard = ({ character, isOnline, isActiveTurn, onPalierChange, onTagChange, onSelect, isSelected }) => {
    const [showTags, setShowTags] = useState(false);

    const san  = character.sanCurrent ?? 0;
    const sanMax = character.sanMax ?? 1;
    const hp   = character.hpCurrent ?? 0;
    const hpMax = character.hpMax ?? 1;
    const palier = character.degradationPalier ?? 0;
    const tags   = character.tags ?? [];

    const sanPct = Math.round((san / sanMax) * 100);
    const hpPct  = Math.round((hp  / hpMax)  * 100);

    const toggleTag = (tagKey) => {
        const exists = tags.find(t => t.key === tagKey);
        const tagDef = GM_TAGS.find(t => t.key === tagKey);
        if (!tagDef) return;
        const next = exists
            ? tags.filter(t => t.key !== tagKey)
            : [...tags, { key: tagKey, label: tagDef.label, color: tagDef.color, bgColor: tagDef.bgColor }];
        onTagChange(character.id, next);
    };

    return (
        <div
            className={[
                'border bg-surface transition-all',
                isSelected ? 'border-accent' : 'border-default',
                isActiveTurn ? 'ring-2 ring-accent/50' : '',
            ].join(' ')}
        >
            {/* ── En-tête carte ──────────────────────────────────────────── */}
            <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-surface-alt"
                onClick={() => onSelect(character.id)}
            >
                {/* Avatar */}
                <div className="w-10 h-10 border border-default flex-shrink-0 overflow-hidden bg-surface-alt">
                    {character.avatar
                        ? <img src={character.avatar} alt="" className="w-full h-full object-cover" />
                        : <span className="w-full h-full flex items-center justify-center text-muted text-lg">☰</span>
                    }
                </div>

                {/* Identité */}
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-bold truncate">
                        {character.nom}
                        {character.alias && <span className="text-muted font-normal"> / {character.alias}</span>}
                    </p>
                    <p className="text-xs text-muted font-mono truncate">{character.profession}</p>
                </div>

                {/* Indicateur en ligne */}
                <div className={[
                    'w-2 h-2 rounded-full flex-shrink-0',
                    isOnline ? 'bg-success' : 'bg-muted/40',
                ].join(' ')} title={isOnline ? 'En ligne' : 'Hors ligne'} />

                {/* Tour actif */}
                {isActiveTurn && (
                    <span className="text-xs font-mono text-accent border border-accent/50 px-1.5 py-0.5">
                        TOUR
                    </span>
                )}
            </div>

            {/* ── Stats rapides ─────────────────────────────────────────── */}
            <div className="px-3 pb-2 space-y-1.5">
                {/* PV */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted font-mono w-8">PV</span>
                    <div className="flex-1 h-1.5 bg-surface-alt border border-default/30 overflow-hidden">
                        <div
                            className="h-full bg-success transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono">{hp}/{hpMax}</span>
                </div>

                {/* SAN */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted font-mono w-8">SAN</span>
                    <div className="flex-1 h-1.5 bg-surface-alt border border-default/30 overflow-hidden">
                        <div
                            className="h-full bg-danger transition-all"
                            style={{ width: `${Math.max(0, Math.min(100, sanPct))}%` }}
                        />
                    </div>
                    <span className="text-xs font-mono">{san}/{sanMax}</span>
                </div>

                {/* DEX (initiative) */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted font-mono w-8">DEX</span>
                    <span className="text-xs font-mono">{(character.dex ?? 10) * 5}%</span>
                    <span className="text-xs text-muted font-mono">(score {character.dex ?? 10})</span>
                </div>
            </div>

            {/* ── Palier de dégradation ─────────────────────────────────── */}
            <div className="px-3 pb-2">
                <p className="text-xs text-muted font-mono mb-1">Dégradation</p>
                <div className="flex gap-1">
                    {PALIER_LABELS.map((label, i) => (
                        <button
                            key={i}
                            onClick={() => onPalierChange(character.id, i)}
                            title={label}
                            className={[
                                'flex-1 py-1 text-xs font-mono border transition-colors',
                                palier === i
                                    ? `${PALIER_COLORS[i]} bg-surface-alt`
                                    : 'border-default/30 text-muted hover:border-default',
                            ].join(' ')}
                        >
                            {i}
                        </button>
                    ))}
                </div>
                <p className={`text-xs font-mono mt-1 ${PALIER_COLORS[palier]}`}>
                    {PALIER_LABELS[palier]}
                </p>
            </div>

            {/* ── Tags ─────────────────────────────────────────────────── */}
            <div className="px-3 pb-3">
                {/* Tags actifs */}
                <div className="flex flex-wrap gap-1 mb-1">
                    {tags.map(tag => (
                        <span
                            key={tag.key}
                            className="dg-tag cursor-pointer hover:opacity-70"
                            style={{ color: tag.color, backgroundColor: tag.bgColor, border: `1px solid ${tag.color}40` }}
                            onClick={() => toggleTag(tag.key)}
                            title="Retirer"
                        >
                            {tag.label} ✕
                        </span>
                    ))}
                </div>

                {/* Bouton gestion tags */}
                <button
                    onClick={() => setShowTags(v => !v)}
                    className="text-xs font-mono text-muted hover:text-default border border-default/30 hover:border-default px-2 py-0.5 transition-colors"
                >
                    {showTags ? '− Tags' : '+ Tags'}
                </button>

                {showTags && (
                    <div className="mt-2 flex flex-wrap gap-1">
                        {GM_TAGS.map(tagDef => {
                            const active = !!tags.find(t => t.key === tagDef.key);
                            return (
                                <button
                                    key={tagDef.key}
                                    onClick={() => toggleTag(tagDef.key)}
                                    className={[
                                        'dg-tag transition-opacity',
                                        active ? 'opacity-100' : 'opacity-40 hover:opacity-70',
                                    ].join(' ')}
                                    style={{
                                        color:           tagDef.color,
                                        backgroundColor: active ? tagDef.bgColor : 'transparent',
                                        border:          `1px solid ${tagDef.color}60`,
                                    }}
                                >
                                    {tagDef.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Composant principal ───────────────────────────────────────────────────────

const TabSession = ({ activeSession, onlineCharacters }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();
    const socket        = useSocket();

    const [characters,    setCharacters]    = useState({});
    const [loading,       setLoading]       = useState(false);
    const [selectedId,    setSelectedId]    = useState(null);
    const [activeTurnId,  setActiveTurnId]  = useState(null); // initiative
    const [initiativeOn,  setInitiativeOn]  = useState(false);

    const onlineIds = new Set((onlineCharacters ?? []).map(c => c.characterId));

    // ── Chargement des personnages de la session ──────────────────────────────

    useEffect(() => {
        if (!activeSession?.characters?.length) { setCharacters({}); return; }
        setLoading(true);

        Promise.all(
            activeSession.characters.map(c =>
                fetchWithAuth(`${apiBase}/characters/${c.id}`)
                    .then(r => r.ok ? r.json() : null)
                    .catch(() => null)
            )
        ).then(results => {
            const map = {};
            results.filter(Boolean).forEach(char => { map[char.id] = char; });
            setCharacters(map);
        }).finally(() => setLoading(false));
    }, [activeSession?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Socket — mises à jour personnage ─────────────────────────────────────

    useEffect(() => {
        if (!socket) return;
        const onUpdated = (data) => {
            if (data?.id && characters[data.id]) {
                setCharacters(prev => ({ ...prev, [data.id]: { ...prev[data.id], ...data } }));
            }
        };
        socket.on('character:updated', onUpdated);
        return () => socket.off('character:updated', onUpdated);
    }, [socket, characters]);

    // ── Modification du palier ────────────────────────────────────────────────

    const handlePalierChange = useCallback(async (charId, palier) => {
        // Mise à jour locale optimiste
        setCharacters(prev => ({
            ...prev,
            [charId]: { ...prev[charId], degradationPalier: palier },
        }));

        // Persist via PUT
        try {
            await fetchWithAuth(`${apiBase}/characters/${charId}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ degradationPalier: palier }),
            });
        } catch (err) {
            console.error('[TabSession] palier update:', err);
        }
    }, [apiBase, fetchWithAuth]);

    // ── Modification des tags ─────────────────────────────────────────────────

    const handleTagChange = useCallback(async (charId, tags) => {
        setCharacters(prev => ({
            ...prev,
            [charId]: { ...prev[charId], tags },
        }));
        try {
            await fetchWithAuth(`${apiBase}/characters/${charId}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ tags }),
            });
        } catch (err) {
            console.error('[TabSession] tag update:', err);
        }
    }, [apiBase, fetchWithAuth]);

    // ── Initiative — tri par DEX décroissant ──────────────────────────────────

    const sorted = Object.values(characters).sort((a, b) => (b.dex ?? 10) - (a.dex ?? 10));

    const handleNextTurn = () => {
        if (sorted.length === 0) return;
        const currentIndex = sorted.findIndex(c => c.id === activeTurnId);
        const nextIndex = (currentIndex + 1) % sorted.length;
        setActiveTurnId(sorted[nextIndex].id);
    };

    // ─────────────────────────────────────────────────────────────────────────

    if (!activeSession) {
        return (
            <div className="flex items-center justify-center h-48 text-muted font-mono text-sm">
                Aucune session active. Sélectionnez une table via le bouton «&nbsp;Table&nbsp;».
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48 text-muted font-mono text-sm animate-pulse">
                Chargement des agents…
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">

            {/* ── Barre initiative ─────────────────────────────────────── */}
            <div className="flex items-center gap-3 border border-default bg-surface px-4 py-2">
                <span className="text-xs font-mono text-muted uppercase tracking-wider">Initiative (DEX)</span>
                <div className="flex gap-2 flex-1 flex-wrap">
                    {sorted.map(c => (
                        <button
                            key={c.id}
                            onClick={() => { setInitiativeOn(true); setActiveTurnId(c.id); }}
                            className={[
                                'text-xs font-mono border px-2 py-0.5 transition-colors',
                                activeTurnId === c.id
                                    ? 'border-accent text-accent bg-accent/10'
                                    : 'border-default/40 text-muted hover:border-default',
                            ].join(' ')}
                        >
                            {c.nom ?? '?'} ({(c.dex ?? 10) * 5}%)
                        </button>
                    ))}
                </div>
                {initiativeOn && (
                    <button
                        onClick={handleNextTurn}
                        className="text-xs font-mono border border-accent text-accent px-3 py-1 hover:bg-accent/10 transition-colors flex-shrink-0"
                    >
                        Tour suivant →
                    </button>
                )}
                <button
                    onClick={() => { setInitiativeOn(false); setActiveTurnId(null); }}
                    className="text-xs font-mono border border-default/40 text-muted px-2 py-1 hover:border-default transition-colors flex-shrink-0"
                >
                    Reset
                </button>
            </div>

            {/* ── Grille agents ───────────────────────────────────────── */}
            {sorted.length === 0 ? (
                <p className="text-muted font-mono text-sm text-center py-8">
                    Aucun agent dans cette session.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sorted.map(char => (
                        <AgentCard
                            key={char.id}
                            character={char}
                            isOnline={onlineIds.has(char.id)}
                            isActiveTurn={activeTurnId === char.id}
                            isSelected={selectedId === char.id}
                            onSelect={setSelectedId}
                            onPalierChange={handlePalierChange}
                            onTagChange={handleTagChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default TabSession;