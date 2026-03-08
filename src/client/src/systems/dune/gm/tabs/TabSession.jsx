// src/client/src/systems/dune/gm/tabs/TabSession.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSocket }         from '../../../../context/SocketContext.jsx';
import { useFetch }          from '../../../../hooks/useFetch.js';
import { useSystem }         from '../../../../hooks/useSystem.js';
import DuneCharacterCard     from '../pj/DuneCharacterCard.jsx';
import EditCharacterModal    from '../modals/EditCharacterModal.jsx';
import SendNoteModal         from '../modals/SendNoteModal.jsx';
import SendItemModal         from '../modals/SendItemModal.jsx';
import GMSendModal from "../../../../components/gm/modals/GMSendModal.jsx";

const TabSession = ({ activeSession, onlineCharacters }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();
    const socket        = useSocket();

    const [characters,    setCharacters]    = useState({});
    const [selectedId,    setSelectedId]    = useState(null);
    const [loading,       setLoading]       = useState(false);

    const [editModal,     setEditModal]     = useState(null);
    const [showSendModal,    setShowSendModal]    = useState(false);
    const [sendPreSelectedId,setSendPreSelectedId]= useState(null);
    const [sendItemModal, setSendItemModal] = useState(null);

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

    // ── Mise à jour détermination — plus de determinationMax ─────────────
    const handleUpdateDetermination = useCallback(async (charId, { determination }) => {
        try {
            const r = await fetchWithAuth(`${apiBase}/characters/${charId}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ determination }),
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

    // ── Envoi note GM via GMSendModal ─────────────────────────────────────
    // onSend reçoit { targetCharacterIds, title, body, imageData, toastAnimation }
    const handleGMSend = useCallback(async (sendData) => {
        const r = await fetchWithAuth(`${apiBase}/journal/gm-send`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetCharacterIds: sendData.targetCharacterIds,
                sessionId:   activeSession?.id ?? null,
                title:       sendData.title     ?? null,
                body:        sendData.body       ?? null,
                metadata:    sendData.imageData ? { imageUrl: sendData.imageData } : null,
                toastAnimation: sendData.toastAnimation ?? 'default',
            }),
        });
        if (!r.ok) throw new Error('Envoi échoué');
    }, [apiBase, fetchWithAuth, activeSession?.id]);

    // ── sessionCharacters au format attendu par GMSendModal ──────────────
    const sessionCharacters = (activeSession?.characters ?? []).map(sc => ({
        id:   sc.id,
        name: characters[sc.id]?.nom ?? sc.name ?? `Perso ${sc.id}`,
    }));

    // ── États vides ───────────────────────────────────────────────────────
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
                                background: isSel ? 'var(--dune-gold)'            : 'var(--dune-surface)',
                                color:      isSel ? 'var(--dune-dark)'            : 'var(--dune-text)',
                                border:     isSel ? '2px solid var(--dune-ochre)' : '2px solid var(--dune-border)',
                                fontWeight: isSel ? 700 : 400,
                            }}
                        >
                            <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: isOnline ? 'var(--dune-success)' : 'var(--dune-dust)' }}
                            />
                            <span className="text-sm whitespace-nowrap">
                                {char?.prenom ?? sc.prenom} {char?.nom ?? sc.name ?? `Perso ${sc.id}`}
                            </span>
                        </button>
                    );
                })}
            </div>

            {selectedChar ? (
                <>
                    {/* ── Boutons actions GM — EN HAUT pour l'accessibilité ── */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setEditModal(selectedId)}
                            className="dune-btn-secondary text-xs"
                        >
                            🎯 Détermination
                        </button>
                        <button
                            onClick={() => { setSendPreSelectedId(selectedId); setShowSendModal(true); }}
                            className="dune-btn-secondary text-xs"
                        >
                            📩 Envoyer une note
                        </button>
                        <button
                            onClick={() => setSendItemModal(selectedId)}
                            className="dune-btn-secondary text-xs"
                        >
                            🎁 Envoyer un atout
                        </button>
                    </div>

                    {/* ── Fiche sélectionnée ── */}
                    <div className="dune-card">
                        <DuneCharacterCard
                            character={selectedChar}
                            isOnline={onlineIds.has(selectedId)}
                        />
                    </div>
                </>
            ) : (
                <div className="text-center py-8" style={{ color: 'var(--dune-text-muted)' }}>
                    <p className="text-sm">Sélectionnez un personnage.</p>
                </div>
            )}

            {/* ── Modales ──────────────────────────────────────────────── */}
            {editModal && characters[editModal] && (
                <EditCharacterModal
                    character={characters[editModal]}
                    onSave={data => handleUpdateDetermination(editModal, data)}
                    onClose={() => setEditModal(null)}
                />
            )}
            {showSendModal && (
                <GMSendModal
                    onClose={() => { setShowSendModal(false); setSendPreSelectedId(null); }}
                    onSend={handleGMSend}
                    sessionCharacters={sessionCharacters}
                    preSelectedCharId={sendPreSelectedId}
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