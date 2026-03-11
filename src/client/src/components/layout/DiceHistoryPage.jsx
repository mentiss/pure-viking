// src/client/src/components/layout/DiceHistoryPage.jsx
// (anciennement src/client/src/components/gm/layout/DiceHistoryPage.jsx — déplacé)
// ─────────────────────────────────────────────────────────────────────────────
// Page historique complète des jets de dés (vue GM plein écran / onglet).
//
// Changements v2 :
//   - Prop renderHistoryEntry optionnelle (injectée depuis GMView/Sheet)
//   - Rendu générique si renderHistoryEntry absent ou retourne null
//   - URL via apiBase (déjà correct dans la v1)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useFetch }   from '../../hooks/useFetch.js';
import { useSystem }  from '../../hooks/useSystem.js';
import ConfirmModal   from '../modals/ConfirmModal.jsx';

const DiceHistoryPage = ({
                             sessionId          = null,
                             renderHistoryEntry = null, // (entry) => JSX | null — optionnel
                         }) => {
    const [rolls,            setRolls]            = useState([]);
    const [loading,          setLoading]          = useState(false);
    const [deleteTarget,     setDeleteTarget]     = useState(null);
    const [confirmResetAll,  setConfirmResetAll]  = useState(false);

    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const url = sessionId
                ? `${apiBase}/dice/history?limit=200&sessionId=${sessionId}`
                : `${apiBase}/dice/history?limit=200`;
            const res  = await fetchWithAuth(url);
            const data = await res.json();
            setRolls(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('[DiceHistoryPage] Erreur chargement:', e);
        } finally {
            setLoading(false);
        }
    }, [apiBase, sessionId]);

    useEffect(() => { load(); }, [load]);

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

    const resetAll = async () => {
        try {
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

    const formatDate = (ts) => {
        if (!ts) return '';
        const d = new Date(ts.includes('Z') ? ts : ts + 'Z');
        return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
            + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    };

    // ── Rendu générique fallback ───────────────────────────────────────────────
    const renderEntry = (roll) => {
        const slugRender = renderHistoryEntry ? renderHistoryEntry(roll) : null;
        if (slugRender) return slugRender;

        const result        = roll.roll_result ?? {};
        const allDice   = result.allDice ?? result.results ?? [];
        const successes     = result.successes ?? result.succes ?? null;
        const notation   = roll.notation ?? '';

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
                            <span key={i} className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold border"
                                  style={{ background: 'var(--color-surface-alt, #f5f5f5)', borderColor: 'var(--color-border, #ccc)', color: 'var(--color-text, #111)' }}>
                                {v}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-16" style={{ color: 'var(--color-text-muted, #666)' }}>
                <div className="text-2xl animate-pulse mb-2">⏳</div>
                <p className="text-sm">Chargement de l'historique…</p>
            </div>
        );
    }

    return (
        <div className="space-y-3 max-w-2xl mx-auto">
            {/* Barre d'actions */}
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted, #666)' }}>
                    {rolls.length} jet{rolls.length > 1 ? 's' : ''} enregistré{rolls.length > 1 ? 's' : ''}
                </span>
                <div className="flex gap-2">
                    <button onClick={load} className="text-xs px-2 py-1 rounded"
                            style={{ background: 'var(--color-surface-alt, #f5f5f5)', color: 'var(--color-text-muted, #666)' }}>
                        ↺ Actualiser
                    </button>
                    {rolls.length > 0 && (
                        <button onClick={() => setConfirmResetAll(true)} className="text-xs px-2 py-1 rounded"
                                style={{ background: 'var(--color-surface-alt, #f5f5f5)', color: 'var(--color-danger, #c0392b)' }}>
                            🗑 Tout effacer
                        </button>
                    )}
                </div>
            </div>

            {rolls.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--color-text-muted, #666)' }}>
                    <div className="text-3xl mb-3">🎲</div>
                    <p className="text-sm">Aucun jet enregistré.</p>
                </div>
            ) : (
                rolls.map(roll => (
                    <div key={roll.id} className="rounded-lg overflow-hidden group"
                         style={{ border: '1px solid var(--color-border, #ccc)' }}>
                        {/* Méta */}
                        <div className="px-3 py-1.5 flex items-center justify-between text-[10px]"
                             style={{ background: 'var(--color-surface-alt, #f5f5f5)', color: 'var(--color-text-muted, #666)' }}>
                            <span>{roll.character_name ?? 'Anonyme'}</span>
                            <div className="flex items-center gap-2">
                                <span>{formatDate(roll.created_at)}</span>
                                <button
                                    onClick={() => setDeleteTarget(roll.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[11px] px-1.5 py-0.5 rounded"
                                    style={{ color: 'var(--color-danger, #c0392b)', background: 'var(--color-surface, #fff)' }}
                                    title="Supprimer ce jet"
                                >✕</button>
                            </div>
                        </div>
                        {/* Rendu slug ou générique */}
                        <div style={{ background: 'var(--color-surface, #fff)' }}>
                            {renderEntry(roll)}
                        </div>
                    </div>
                ))
            )}

            {/* Modales confirmation */}
            {deleteTarget && (
                <ConfirmModal
                    message="Supprimer ce jet de l'historique ?"
                    onConfirm={() => deleteRoll(deleteTarget)}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
            {confirmResetAll && (
                <ConfirmModal
                    message={sessionId ? "Effacer tout l'historique de cette session ?" : "Effacer tout l'historique ?"}
                    onConfirm={resetAll}
                    onCancel={() => setConfirmResetAll(false)}
                />
            )}
        </div>
    );
};

export default DiceHistoryPage;