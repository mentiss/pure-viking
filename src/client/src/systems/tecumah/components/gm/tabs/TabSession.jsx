// src/client/src/systems/tecumah/components/gm/tabs/TabSession.jsx
// Onglet Session GM — liste des personnages + actions GM + fiche lecture seule.
// Actions : envoi note (GMSendModal), envoi item (send-item), blessure, PD, PP.
// Fiche : calquée sur Sheet.jsx, mode lecture seule uniquement.

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket }  from '../../../../../context/SocketContext.jsx';
import { useFetch }   from '../../../../../hooks/useFetch.js';
import { useSystem }  from '../../../../../hooks/useSystem.js';
import GMSendModal    from '../../../../../components/gm/modals/GMSendModal.jsx';

import HealthDisplay  from '../../HealthDisplay.jsx';
import ResourcesBar   from '../../ResourcesBar.jsx';
import DefensePanel   from '../../DefensePanel.jsx';
import AttributeRow   from '../../AttributeRow.jsx';
import SkillRow       from '../../SkillRow.jsx';

import {
    ATTRIBUTS, ATTRIBUT_LABELS, SKILLS_BY_ATTR,
    BACKGROUNDS_BY_ID, BLESSURE_LABELS,
} from '../../../config.jsx';
import SendItemModal from "../modals/SendItemModal.jsx";
import {useParams} from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────

const TabSession = ({ activeSession, onlineCharacters }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();
    const socket        = useSocket();

    const [characters,       setCharacters]       = useState({});
    const [selectedId,       setSelectedId]       = useState(null);
    const [loading,          setLoading]          = useState(false);
    const [showSendModal,    setShowSendModal]    = useState(false);
    const [sendPreSelected,  setSendPreSelected]  = useState(null);
    const [showSendItem,     setShowSendItem]     = useState(null); // charId | null

    const onlineIds = new Set((onlineCharacters ?? []).map(c => c.characterId));

    // ── Chargement ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeSession?.characters?.length) { setCharacters({}); setSelectedId(null); return; }
        setLoading(true);
        const load = async () => {
            const loaded = {};
            await Promise.all((activeSession.characters ?? []).map(async c => {
                try {
                    const r = await fetchWithAuth(`${apiBase}/characters/${c.id}`);
                    if (r.ok) loaded[c.id] = await r.json();
                } catch (e) { console.error(`[TabSession/tecumah] ${c.id}:`, e); }
            }));
            setCharacters(loaded);
            if (!selectedId || !loaded[selectedId]) setSelectedId(activeSession.characters[0]?.id ?? null);
            setLoading(false);
        };
        load();
    }, [activeSession?.id, activeSession?.characters?.length]);

    // ── Temps réel ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const onFull    = ({ characterId, character }) => setCharacters(p => p[characterId] ? { ...p, [characterId]: character } : p);
        const onPartial = ({ characterId, updates })  => setCharacters(p => p[characterId] ? { ...p, [characterId]: { ...p[characterId], ...updates } } : p);
        socket.on('character-full-update', onFull);
        socket.on('character-update',      onPartial);
        return () => { socket.off('character-full-update', onFull); socket.off('character-update', onPartial); };
    }, [socket]);

    // ── Mise à jour personnage (blessure, PP, PD) ─────────────────────────
    const updateCharacter = useCallback(async (charId, patch) => {
        const current = characters[charId];
        if (!current) return;
        setCharacters(p => ({ ...p, [charId]: { ...p[charId], ...patch } }));
        try {
            const r = await fetchWithAuth(`${apiBase}/characters/${charId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...current, ...patch }),
            });
            if (r.ok) {
                const updated = await r.json();
                setCharacters(p => ({ ...p, [charId]: updated }));
            }
        } catch (e) {
            console.error('[TabSession/tecumah] update:', e);
            setCharacters(p => ({ ...p, [charId]: current }));
        }
    }, [characters]);

    // ── Envoi note ────────────────────────────────────────────────────────
    const handleGMSend = useCallback(async (sendData) => {
        const r = await fetchWithAuth(`${apiBase}/journal/gm-send`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetCharacterIds: sendData.targetCharacterIds,
                sessionId:      activeSession?.id ?? null,
                title:          sendData.title ?? null,
                body:           sendData.body  ?? null,
                metadata:       sendData.imageData ? { imageUrl: sendData.imageData } : null,
                toastAnimation: sendData.toastAnimation ?? 'default',
            }),
        });
        if (!r.ok) throw new Error('Envoi échoué');
    }, [activeSession?.id]);

    const sessionCharacters = (activeSession?.characters ?? []).map(sc => ({
        id:   sc.id,
        name: `${characters[sc.id]?.prenom ?? ''} ${characters[sc.id]?.nom ?? sc.name ?? `Perso ${sc.id}`}`.trim(),
    }));

    // ── Pas de session ────────────────────────────────────────────────────
    if (!activeSession) return (
        <p className="text-center py-12 text-muted text-sm">
            Aucune session active. Sélectionnez une table dans le menu.
        </p>
    );

    if (loading && Object.keys(characters).length === 0) return (
        <p className="text-center py-12 text-muted text-sm animate-pulse">Chargement…</p>
    );

    const selectedChar = selectedId ? characters[selectedId] : null;

    return (
        <div className="flex flex-col gap-4">

            {/* ── Barre de sélection ───────────────────────────────────── */}
            <div className="flex gap-2 flex-wrap">
                {(activeSession.characters ?? []).map(sc => {
                    const char     = characters[sc.id];
                    const isOnline = onlineIds.has(sc.id);
                    const isSel    = selectedId === sc.id;
                    return (
                        <button
                            key={sc.id}
                            onClick={() => setSelectedId(sc.id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm"
                            style={{
                                background: isSel ? 'var(--color-primary)' : 'var(--color-surface)',
                                color:      isSel ? '#fff'                 : 'var(--color-text)',
                                border:     `2px solid ${isSel ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                fontWeight: isSel ? 700 : 400,
                            }}
                        >
                            <span className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: isOnline ? 'var(--color-success)' : 'var(--color-border)' }}
                            />
                            {char?.prenom ?? sc.name ?? `Perso ${sc.id}`}
                        </button>
                    );
                })}
            </div>

            {selectedChar ? (
                <>
                    {/* ── Actions GM ──────────────────────────────────────── */}
                    <div className="flex flex-wrap gap-2">
                        <GmBtn onClick={() => { setSendPreSelected(selectedId); setShowSendModal(true); }}>
                            📩 Envoyer une note
                        </GmBtn>
                        <GmBtn onClick={() => setShowSendItem(selectedId)}>
                            🎁 Envoyer un item
                        </GmBtn>
                    </div>

                    {/* ── Fiche lecture seule ──────────────────────────────── */}
                    <CharSheet
                        char={selectedChar}
                        isOnline={onlineIds.has(selectedId)}
                        onUpdate={patch => updateCharacter(selectedId, patch)}
                    />
                </>
            ) : (
                <p className="text-center py-8 text-muted text-sm">Sélectionnez un personnage.</p>
            )}

            {/* ── Modales ─────────────────────────────────────────────────── */}
            {showSendModal && (
                <GMSendModal
                    onClose={() => { setShowSendModal(false); setSendPreSelected(null); }}
                    onSend={handleGMSend}
                    sessionCharacters={sessionCharacters}
                    preSelectedCharId={sendPreSelected}
                />
            )}
            {showSendItem && (
                <SendItemModal
                    characterId={showSendItem}
                    characterName={`${characters[showSendItem]?.prenom ?? ''} ${characters[showSendItem]?.nom ?? ''}`.trim()}
                    onClose={() => setShowSendItem(null)}
                />
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Fiche lecture seule — calquée sur Sheet.jsx, sans mode édition
// ─────────────────────────────────────────────────────────────────────────────

const CharSheet = ({ char, isOnline, onUpdate }) => {
    const pd = char.points_destin    ?? 0;
    const pp = char.points_personnage ?? 0;
    const { system } = useParams();

    return (
        <div className="flex flex-col gap-6 rounded-xl p-4"
             style={{ background: 'var(--color-surface)', border: `2px solid ${isOnline ? 'var(--color-success)' : 'var(--color-border)'}` }}>

            {/* ── Identité ─────────────────────────────────────────────── */}
            <Section title="Identité">
                <div className="flex items-start gap-3">
                    {char.avatar ? (
                        <img src={char.avatar} alt={char.prenom}
                             className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                             style={{ border: '2px solid var(--color-accent)' }} />
                    ) : (
                        <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                             style={{ background: 'var(--color-surface-alt)', border: '2px solid var(--color-border)' }}>
                            🤠
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>
                                {char.prenom} {char.nom}
                            </p>
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                  style={{ background: isOnline ? 'var(--color-success)' : 'var(--color-surface-alt)', color: isOnline ? '#fff' : 'var(--color-text-muted)' }}>
                                {isOnline ? '🟢 En ligne' : '⚫ Hors ligne'}
                            </span>
                            <CopyLinkButton
                                char={char}
                                system={system}
                            />
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{char.playerName}</p>
                        {(char.age || char.taille || char.sexe) && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                                {[char.age ? `${char.age} ans` : null, char.taille, char.sexe].filter(Boolean).join(' · ')}
                            </p>
                        )}
                        {char.description && (
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 6, fontStyle: 'italic' }}>
                                {char.description}
                            </p>
                        )}
                    </div>
                </div>
            </Section>

            {/* ── Santé + Ressources ──────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
                <Section title="Santé">
                    <HealthDisplay
                        mode="track"
                        niveau={char.blessure_niveau ?? 0}
                        onChange={n => onUpdate({ blessure_niveau: n })}
                    />
                </Section>
                {/* ── Défense ─────────────────────────────────────────────── */}
                <Section title="Défense">
                    <DefensePanel character={char} />
                </Section>
                <Section title="Ressources">
                    <ResourcesBar
                        pointsDestin={pd}
                        pointsPersonnage={pp}
                        canEdit={true}
                        onUpdatePD={d => onUpdate({ points_destin:    Math.max(0, pd + d) })}
                        onUpdatePP={d => onUpdate({ points_personnage: Math.max(0, pp + d) })}
                    />
                </Section>

            </div>



            {/* ── Attributs + Compétences ──────────────────────────────── */}
            <Section>
                <div className="grid grid-cols-2 gap-3">
                    {ATTRIBUTS.map(attrKey => (
                        <div key={attrKey}>
                            <AttributeRow
                                attrKey={attrKey}
                                label={ATTRIBUT_LABELS[attrKey]}
                                pips={char[attrKey] ?? 3}
                                editMode={false}
                                onChangePips={() => {}}
                                onRoll={() => {}}
                                displayDice={false}
                            />
                            <div className="ml-2">
                                {(SKILLS_BY_ATTR[attrKey] ?? [])
                                    .filter(skill => (char[skill.key] ?? 0) > 0)
                                    .map(skill => (
                                        <SkillRow
                                            key={skill.key}
                                            skillKey={skill.key}
                                            label={skill.label}
                                            attrKey={attrKey}
                                            attrPips={char[attrKey] ?? 3}
                                            compPips={char[skill.key] ?? 0}
                                            editMode={false}
                                            onChangeComp={() => {}}
                                            onRoll={() => {}}
                                            displayDice={false}
                                        />
                                    ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            {/* ── Backgrounds ─────────────────────────────────────────── */}
            {(char.backgrounds ?? []).length > 0 && (
                <Section title="Backgrounds">
                    <div className="flex flex-col gap-2">
                        {char.backgrounds.map((bg, i) => {
                            const def    = BACKGROUNDS_BY_ID[bg.type];
                            if (!def) return null;
                            const effect = def.effects[(bg.niveau ?? 1) - 1] ?? '';
                            return (
                                <div key={i} className="rounded-lg p-3"
                                     style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{def.name}</span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Niv. {bg.niveau}</span>
                                    </div>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{def.description}</p>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{effect}</p>
                                    {bg.notes && <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{bg.notes}</p>}
                                </div>
                            );
                        })}
                    </div>
                </Section>
            )}

            {/* ── Inventaire résumé ────────────────────────────────────── */}
            {(char.items ?? []).length > 0 && (
                <Section title="Inventaire">
                    <div className="flex flex-col gap-1">
                        {char.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded"
                                 style={{ background: item.location === 'equipped' ? 'var(--color-surface-alt)' : 'transparent',
                                     border: '1px solid var(--color-border)' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
                                    {item.location === 'equipped' ? '⚔️ ' : '📦 '}{item.name}
                                    {item.quantity > 1 && <span style={{ color: 'var(--color-text-muted)' }}> ×{item.quantity}</span>}
                                </span>
                                {item.damage > 0 && (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        Dég. {item.damage}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sous-composants internes
// ─────────────────────────────────────────────────────────────────────────────

const Section = ({ title, children }) => (
    <section>
        {title && (
            <h3 className="tecumah-title-font" style={{
                fontWeight: 700, color: 'var(--color-primary)',
                fontSize: '0.8rem', textTransform: 'uppercase',
                letterSpacing: '0.05em', borderBottom: '1px solid var(--color-border)',
                paddingBottom: 4, marginBottom: 8,
            }}>
                {title}
            </h3>
        )}
        {children}
    </section>
);

const GmBtn = ({ onClick, children }) => (
    <button
        onClick={onClick}
        className="px-3 py-1.5 rounded text-xs font-semibold transition-colors hover:bg-surface-alt"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
    >
        {children}
    </button>
);

const CopyLinkButton = ({ char, system }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const text = `🤠 ${char.prenom} ${char.nom}\nCode : ${char.accessCode}\nURL : ${window.location.origin}/${system}/${char.accessUrl}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            title="Copier le lien d'accès"
            className="px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200"
            style={{
                background:  copied ? 'var(--color-success)' : 'var(--color-surface)',
                border:      `1px solid ${copied ? 'var(--color-success)' : 'var(--color-border)'}`,
                color:       copied ? '#fff' : 'var(--color-text)',
                transform:   copied ? 'scale(1.05)' : 'scale(1)',
            }}
        >
            {copied ? '✓ Copié !' : '🔗 Copier le lien'}
        </button>
    );
};

export default TabSession;