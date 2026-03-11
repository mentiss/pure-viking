// src/client/src/components/layout/HistoryPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Panneau latéral historique jets de dés — VERSION générique.
//
// Changements v2 :
//   - Suppression toutes les classes viking-* → variables CSS génériques
//   - URL corrigée : utilise apiBase au lieu de /api/dice en dur
//   - Prop renderHistoryEntry optionnelle (injectée depuis Sheet/GMView)
//   - Rendu générique si renderHistoryEntry absent ou retourne null
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket }  from '../../context/SocketContext.jsx';
import ConfirmModal   from '../modals/ConfirmModal.jsx';
import { useFetch }   from '../../hooks/useFetch.js';
import { useSystem }  from '../../hooks/useSystem.js';

const HistoryPanel = ({
                          isOpen,
                          onClose,
                          sessionId           = null,
                          renderHistoryEntry  = null, // (entry) => JSX | null
                      }) => {
    const [history,            setHistory]            = useState([]);
    const [loading,            setLoading]            = useState(false);
    const [showConfirmDelete,  setShowConfirmDelete]  = useState(null);
    const [showConfirmReset,   setShowConfirmReset]   = useState(false);

    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();
    const socket        = useSocket();

    const loadHistory = useCallback(async () => {
        setLoading(true);
        try {
            const url = sessionId
                ? `${apiBase}/dice/history?limit=100&sessionId=${sessionId}`
                : `${apiBase}/dice/history?limit=100`;
            const response = await fetchWithAuth(url);
            const data     = await response.json();
            setHistory(data);
        } catch (error) {
            console.error('[HistoryPanel] Error loading history:', error);
        } finally {
            setLoading(false);
        }
    }, [apiBase, sessionId]);

    useEffect(() => {
        if (isOpen) loadHistory();
    }, [isOpen, loadHistory]);

    // Mise à jour temps réel via socket
    useEffect(() => {
        if (!socket) return;
        const handleDiceRoll = (rollData) => setHistory(prev => [rollData, ...prev]);
        socket.on('dice-roll', handleDiceRoll);
        return () => socket.off('dice-roll', handleDiceRoll);
    }, [socket]);

    const deleteRoll = async (id) => {
        try {
            await fetchWithAuth(`${apiBase}/dice/history/${id}`, { method: 'DELETE' });
            setHistory(prev => prev.filter(h => h.id !== id));
        } catch (error) {
            console.error('[HistoryPanel] Error deleting roll:', error);
        }
        setShowConfirmDelete(null);
    };

    const resetHistory = async () => {
        try {
            if (sessionId) {
                await fetchWithAuth(`${apiBase}/dice/history/session/${sessionId}`, { method: 'DELETE' });
            } else {
                await fetchWithAuth(`${apiBase}/dice/history`, { method: 'DELETE' });
            }
            setHistory([]);
        } catch (error) {
            console.error('[HistoryPanel] Error resetting history:', error);
        }
        setShowConfirmReset(false);
    };

    const getTimeAgo = (timestamp) => {
        const now = new Date();
        const tsStr = timestamp?.includes?.('Z') ? timestamp : (timestamp + 'Z');
        const past  = new Date(tsStr);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1)  return 'à l\'instant';
        if (diffMins < 60) return `il y a ${diffMins} min`;
        const diffH = Math.floor(diffMins / 60);
        if (diffH < 24)    return `il y a ${diffH}h`;
        return `il y a ${Math.floor(diffH / 24)}j`;
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Overlay de fond */}
            <div
                className="fixed inset-0 z-40"
                style={{ background: 'transparent' }}
                onClick={onClose}
            />

            {/* Panneau */}
            <div
                className="fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl"
                style={{
                    width: '360px',
                    background: 'var(--color-surface, #fff)',
                    borderLeft: '2px solid var(--color-border, #ccc)',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 border-b"
                    style={{ borderColor: 'var(--color-border, #ccc)' }}
                >
                    <h2 className="text-lg font-bold" style={{ color: 'var(--color-text, #111)' }}>
                        📜 Historique des jets
                    </h2>
                    <div className="flex items-center gap-2">
                        {history.length > 0 && (
                            <button
                                onClick={() => setShowConfirmReset(true)}
                                className="text-xs px-2 py-1 rounded"
                                style={{ color: 'var(--color-danger, #c0392b)', background: 'var(--color-surface-alt, #f5f5f5)' }}
                            >
                                🗑️ Tout effacer
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="text-xl"
                            style={{ color: 'var(--color-text-muted, #666)' }}
                        >✕</button>
                    </div>
                </div>

                {/* Corps */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {loading ? (
                        <div className="text-center py-8" style={{ color: 'var(--color-text-muted, #666)' }}>
                            Chargement…
                        </div>
                    ) : history.length === 0 ? (
                        <div className="text-center py-8" style={{ color: 'var(--color-text-muted, #666)' }}>
                            Aucun jet enregistré
                        </div>
                    ) : (
                        history.map(roll => {
                            // Tenter le rendu slug
                            const slugRender = renderHistoryEntry ? renderHistoryEntry(roll) : null;

                            return (
                                <div
                                    key={roll.id}
                                    className="rounded-lg overflow-hidden group"
                                    style={{ border: '1px solid var(--color-border, #ccc)' }}
                                >
                                    {/* Méta */}
                                    <div
                                        className="px-3 py-1.5 flex items-center justify-between text-[10px]"
                                        style={{
                                            background: 'var(--color-surface-alt, #f5f5f5)',
                                            color:      'var(--color-text-muted, #666)',
                                        }}
                                    >
                                        <span>{roll.character_name ?? 'Anonyme'}</span>
                                        <div className="flex items-center gap-2">
                                            <span>{getTimeAgo(roll.created_at)}</span>
                                            <button
                                                onClick={() => setShowConfirmDelete(roll.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] px-1.5 py-0.5 rounded"
                                                style={{ color: 'var(--color-danger, #c0392b)', background: 'var(--color-surface, #fff)' }}
                                            >✕</button>
                                        </div>
                                    </div>

                                    {/* Contenu : slug ou générique */}
                                    <div style={{ background: 'var(--color-surface, #fff)' }}>
                                        {slugRender ?? <GenericRollEntry roll={roll} />}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modales confirmation */}
            {showConfirmDelete && (
                <ConfirmModal
                    message="Supprimer ce jet de l'historique ?"
                    onConfirm={() => deleteRoll(showConfirmDelete)}
                    onCancel={() => setShowConfirmDelete(null)}
                />
            )}
            {showConfirmReset && (
                <ConfirmModal
                    message={sessionId ? "Effacer tout l'historique de cette session ?" : "Effacer tout l'historique ?"}
                    onConfirm={resetHistory}
                    onCancel={() => setShowConfirmReset(false)}
                />
            )}
        </>
    );
};

// ─── Rendu générique ─────────────────────────────────────────────────────────
// Fallback quand le slug ne fournit pas de renderHistoryEntry ou retourne null.
// Affiche notation, dés à plat, succès si présent.

const GenericRollEntry = ({ roll }) => {
    const result    = roll.roll_result ?? {};
    const allDice   = result.allDice ?? result.results ?? [];
    const successes = result.successes ?? result.succes ?? null;
    const notation  = roll.notation ?? '';

    return (
        <div className="px-3 py-2 space-y-1">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text, #111)' }}>
                    {roll.roll_type ?? 'Jet'}
                    {notation && <span className="ml-2 font-mono text-[10px]" style={{ color: 'var(--color-text-muted, #666)' }}>{notation}</span>}
                </span>
                {successes !== null && (
                    <span className="text-xs font-bold" style={{ color: 'var(--color-accent, #996633)' }}>
                        {successes} succès
                    </span>
                )}
            </div>
            {allDice.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {allDice.map((v, i) => (
                        <span
                            key={i}
                            className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold border"
                            style={{
                                background:  'var(--color-surface-alt, #f5f5f5)',
                                borderColor: 'var(--color-border, #ccc)',
                                color:       'var(--color-text, #111)',
                            }}
                        >
                            {v}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default HistoryPanel;