// src/client/src/systems/dune/gm/tabs/TabSession.jsx
// Onglet Session côté GM Dune.
// Liste les personnages de la session active, affiche la fiche sélectionnée.
// Actions disponibles : modifier détermination, envoyer note, envoyer atout.
// Pattern identique au TabSession générique mais avec DuneCharacterCard.

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket }  from '../../../../context/SocketContext.jsx';
import { useFetch }   from '../../../../hooks/useFetch.js';
import { useSystem }  from '../../../../hooks/useSystem.js';
import DuneCharacterCard from '../pj/DuneCharacterCard.jsx';
import EditCharacterModal from '../modals/EditCharacterModal.jsx';
import SendNoteModal      from '../modals/SendNoteModal.jsx';
import SendItemModal      from '../modals/SendItemModal.jsx';

/**
 * @param {object} props
 * @param {object} props.activeSession
 * @param {Array}  props.onlineCharacters  - [{ characterId, ... }]
 */
const TabSession = ({ activeSession, onlineCharacters }) => {
    const { apiBase }       = useSystem();
    const fetchWithAuth = useFetch();
    const socket            = useSocket();

    const [characters,    setCharacters]    = useState({});   // id → fullChar
    const [selectedId,    setSelectedId]    = useState(null);
    const [loading,       setLoading]       = useState(false);

    // Modales
    const [editModal,     setEditModal]     = useState(null);  // characterId | null
    const [sendNoteModal, setSendNoteModal] = useState(null);  // characterId | null
    const [sendItemModal, setSendItemModal] = useState(null);  // characterId | null

    const onlineIds = new Set((onlineCharacters ?? []).map(c => c.characterId));

    // ── Chargement des fiches ─────────────────────────────────────────────
    useEffect(() => {
        if (!activeSession?.characters?.length) {
            setCharacters({});
            setSelectedId(null);
            return;
        }

        const load = async () => {
            setLoading(true);
            const loaded = {};
            await Promise.all(
                (activeSession.characters ?? []).map(async c => {
                    try {
                        const r = await fetchWithAuth(`${apiBase}/characters/${c.id}`);
                        if (r.ok) loaded[c.id] = await r.json();
                    } catch (e) {
                        console.error(`[TabSession/dune] Erreur chargement perso ${c.id}:`, e);
                    }
                })
            );
            setCharacters(loaded);
            if (!selectedId || !loaded[selectedId]) {
                setSelectedId(activeSession.characters[0]?.id ?? null);
            }
            setLoading(false);
        };
        load();
    }, [activeSession?.id, activeSession?.characters?.length]);

    // ── Mises à jour temps réel ───────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const onUpdate = ({ characterId, character }) => {
            setCharacters(prev => prev[characterId] ? { ...prev, [characterId]: character } : prev);
        };
        socket.on('character-full-update', onUpdate);
        socket.on('character-update',      onUpdate);
        return () => {
            socket.off('character-full-update', onUpdate);
            socket.off('character-update',      onUpdate);
        };
    }, [socket]);

    // ── Mise à jour détermination ─────────────────────────────────────────
    const handleUpdateDetermination = useCallback(async (charId, { determination, determinationMax }) => {
        try {
            const r = await fetchWithAuth(`${apiBase}/characters/${charId}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ determination, determinationMax }),
            });
            if (r.ok) {
                const updated = await r.json();
                setCharacters(prev => ({ ...prev, [charId]: updated }));
            }
        } catch (e) {
            console.error('[TabSession/dune] Erreur update détermination:', e);
        }
        setEditModal(null);
    }, [apiBase, fetchWithAuth]);

    // ── Pas de session ────────────────────────────────────────────────────
    if (!activeSession) {
        return (
            <div className="text-center py-12" style={{ color: 'var(--dune-text-muted)' }}>
                <div className="text-4xl mb-3">🏜️</div>
                <p className="text-sm">Aucune session active.<br />Sélectionnez une table dans le menu.</p>
            </div>
        );
    }

    if (loading && Object.keys(characters).length === 0) {
        return (
            <div className="text-center py-12" style={{ color: 'var(--dune-text-muted)' }}>
                <div className="text-2xl animate-pulse mb-2">⏳</div>
                <p className="text-sm">Chargement des fiches…</p>
            </div>
        );
    }

    const selectedChar = selectedId ? characters[selectedId] : null;

    return (
        <div className="space-y-4">
            {/* ── Barre de sélection ───────────────────────────────── */}
            <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
                {(activeSession.characters ?? []).map(sc => {
                    const char     = characters[sc.id];
                    const isOnline = onlineIds.has(sc.id);
                    const isSel    = selectedId === sc.id;

                    return (
                        <button
                            key={sc.id}
                            onClick={() => setSelectedId(sc.id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                            style={{
                                background:  isSel ? 'var(--dune-gold)'        : 'var(--dune-surface)',
                                color:       isSel ? 'var(--dune-dark)'        : 'var(--dune-text)',
                                border:      isSel ? '2px solid var(--dune-ochre)' : '2px solid var(--dune-border)',
                                fontWeight:  isSel ? 700 : 400,
                            }}
                        >
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: isOnline ? 'var(--dune-success)' : 'var(--dune-dust)' }}
                            />
                            <span className="text-sm whitespace-nowrap">
                                {char?.nom ?? sc.name ?? `Perso ${sc.id}`}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Fiche sélectionnée ───────────────────────────────── */}
            {selectedChar ? (
                <div className="dune-card">
                    <DuneCharacterCard
                        character={selectedChar}
                        isOnline={onlineIds.has(selectedId)}
                        onEditCharacter={() => setEditModal(selectedId)}
                        onSendNote={() => setSendNoteModal(selectedId)}
                        onSendItem={() => setSendItemModal(selectedId)}
                    />
                </div>
            ) : (
                <div className="text-center py-8" style={{ color: 'var(--dune-text-muted)' }}>
                    <p className="text-sm">Sélectionnez un personnage.</p>
                </div>
            )}

            {/* ── Modales ──────────────────────────────────────────── */}
            {editModal && characters[editModal] && (
                <EditCharacterModal
                    character={characters[editModal]}
                    onSave={data => handleUpdateDetermination(editModal, data)}
                    onClose={() => setEditModal(null)}
                />
            )}
            {sendNoteModal && (
                <SendNoteModal
                    characterId={sendNoteModal}
                    characterName={characters[sendNoteModal]?.nom}
                    onClose={() => setSendNoteModal(null)}
                />
            )}
            {sendItemModal && (
                <SendItemModal
                    characterId={sendItemModal}
                    characterName={characters[sendItemModal]?.nom}
                    onClose={() => setSendItemModal(null)}
                />
            )}
        </div>
    );
};

export default TabSession;