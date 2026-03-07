// src/client/src/components/layout/DiceHistoryPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useSocket }  from '../../../context/SocketContext.jsx';
import { useFetch }   from '../../../hooks/useFetch.js';
import { useSystem }  from '../../../hooks/useSystem.js';
import ConfirmModal   from '../../modals/ConfirmModal.jsx';

/**
 * @param {object}   props.character    - Personnage complet (.id requis)
 * @param {Function} props.renderEntry  - (roll) => JSX
 * @param {number}   [props.sessionId]  - Filtre par session si fourni
 */
const DiceHistoryPage = ({ character, renderEntry, sessionId = null }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();
    const socket        = useSocket();

    const [rolls,           setRolls]           = useState([]);
    const [loading,         setLoading]         = useState(true);
    const [deleteTarget,    setDeleteTarget]    = useState(null);  // id du jet à supprimer
    const [confirmResetAll, setConfirmResetAll] = useState(false); // vider tout

    // ── Chargement ────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setLoading(true);
        try {
            let url = `${apiBase}/dice/history/${character.id}?limit=100`;
            if (sessionId) url += `&sessionId=${sessionId}`;
            const r = await fetchWithAuth(url);
            if (r.ok) setRolls(await r.json());
        } catch (e) {
            console.error('[DiceHistoryPage] Erreur chargement:', e);
        } finally {
            setLoading(false);
        }
    }, [apiBase, character.id, sessionId]);

    useEffect(() => { load(); }, [load]);

    // ── Temps réel ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const onRoll = (rollData) => {
            if (rollData.character_id === character.id || rollData.character_id === -1) {
                setRolls(prev => [rollData, ...prev]);
            }
        };
        socket.on('dice-roll', onRoll);
        return () => socket.off('dice-roll', onRoll);
    }, [socket, character.id]);

    // ── Suppression d'un jet ──────────────────────────────────────────────
    const deleteRoll = async (id) => {
        try {
            await fetchWithAuth(`${apiBase}/dice/history/${id}`, { method: 'DELETE' });
            setRolls(prev => prev.filter(r => r.id !== id));
        } catch (e) {
            console.error('[DiceHistoryPage] Erreur suppression:', e);
        } finally {
            setDeleteTarget(null);
        }
    };

    // ── Vider tout ────────────────────────────────────────────────────────
    const resetAll = async () => {
        try {
            // Si session active : purge par session ; sinon : purge globale perso
            const url = sessionId
                ? `${apiBase}/dice/history/session/${sessionId}`
                : `${apiBase}/dice/history`;
            await fetchWithAuth(url, { method: 'DELETE' });
            setRolls([]);
        } catch (e) {
            console.error('[DiceHistoryPage] Erreur reset:', e);
        } finally {
            setConfirmResetAll(false);
        }
    };

    // ── Format date ───────────────────────────────────────────────────────
    const formatDate = (ts) => {
        if (!ts) return '';
        const d = new Date(ts.includes('Z') ? ts : ts + 'Z');
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
            + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    // ── Rendu ─────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="text-center py-16" style={{ color: 'var(--color-text-muted, var(--dune-text-muted))' }}>
                <div className="text-2xl animate-pulse mb-2">⏳</div>
                <p className="text-sm">Chargement de l'historique…</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-w-2xl mx-auto">
            {/* ── Barre d'actions ──────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold"
                      style={{ color: 'var(--color-text-muted, var(--dune-text-muted))' }}>
                    {rolls.length} jet{rolls.length > 1 ? 's' : ''} enregistré{rolls.length > 1 ? 's' : ''}
                </span>
                <div className="flex gap-2">
                    <button onClick={load}
                            className="text-xs px-2 py-1 rounded"
                            style={{ background: 'var(--color-surface, var(--dune-surface))',
                                color: 'var(--color-text-muted, var(--dune-text-muted))' }}>
                        ↺ Actualiser
                    </button>
                    {rolls.length > 0 && (
                        <button onClick={() => setConfirmResetAll(true)}
                                className="text-xs px-2 py-1 rounded"
                                style={{ background: 'var(--color-surface, var(--dune-surface))',
                                    color: 'var(--dune-red, #c0392b)' }}>
                            🗑 Tout effacer
                        </button>
                    )}
                </div>
            </div>

            {rolls.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--color-text-muted, var(--dune-text-muted))' }}>
                    <div className="text-3xl mb-3">🎲</div>
                    <p className="text-sm">Aucun jet enregistré.</p>
                </div>
            ) : (
                rolls.map(roll => (
                    <div key={roll.id} className="rounded-lg overflow-hidden group"
                         style={{ border: '1px solid var(--color-border, var(--dune-border))' }}>
                        {/* Méta + bouton suppression */}
                        <div className="px-3 py-1.5 flex items-center justify-between text-[10px]"
                             style={{ background: 'var(--color-surface, var(--dune-surface-alt))',
                                 color: 'var(--color-text-muted, var(--dune-text-muted))' }}>
                            <span>{roll.character_name ?? 'Anonyme'}</span>
                            <div className="flex items-center gap-2">
                                <span>{formatDate(roll.created_at)}</span>
                                <button
                                    onClick={() => setDeleteTarget(roll.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] px-1.5 py-0.5 rounded"
                                    style={{ color: 'var(--dune-red, #c0392b)',
                                        background: 'var(--color-surface, var(--dune-surface))' }}
                                    title="Supprimer ce jet"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        {/* Rendu slug */}
                        <div style={{ background: 'var(--color-surface, var(--dune-surface))' }}>
                            {renderEntry(roll)}
                        </div>
                    </div>
                ))
            )}

            {/* ── Modales de confirmation ──────────────────────────────── */}
            {deleteTarget && (
                <ConfirmModal
                    message="Supprimer ce jet de l'historique ?"
                    onConfirm={() => deleteRoll(deleteTarget)}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
            {confirmResetAll && (
                <ConfirmModal
                    message={sessionId
                        ? "Effacer tout l'historique de cette session ?"
                        : "Effacer tout l'historique ?"}
                    onConfirm={resetAll}
                    onCancel={() => setConfirmResetAll(false)}
                />
            )}
        </div>
    );
};

export default DiceHistoryPage;