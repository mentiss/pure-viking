// src/client/src/systems/dune/gm/tabs/TabResources.jsx
// Onglet Ressources de session — vue GM complète.
// Affiche : Impulsions, Menace, Complications (GM uniquement), Maison.
// Temps réel via socket (event session-resources-update / session-resources-gm-update).
// Historique des jets intégré via HistoryPanel partagé.

import React, { useState, useEffect, useCallback } from 'react';
import { useSocket }    from '../../../../context/SocketContext.jsx';
import { useFetch }     from '../../../../hooks/useFetch.js';
import { useSystem }    from '../../../../hooks/useSystem.js';
import HistoryPanel     from '../../../../components/layout/HistoryPanel.jsx';
import VerticalGauge    from '../../components/VerticalGauge.jsx';

const MAX_IMPULSIONS = 6;
const MAX_MENACE_VIZ = 12; // plafond visuel de la jauge (menace n'a pas de max réel)

/**
 * @param {object} props
 * @param {object} props.activeSession
 */
const TabResources = ({ activeSession }) => {
    const { apiBase }       = useSystem();
    const fetchWithAuth = useFetch();
    const socket            = useSocket();

    const sessionId = activeSession?.id ?? null;

    // ── État ressources ───────────────────────────────────────────────────
    const [resources, setResources] = useState({ impulsions: 0, menace: 0, complications: 0 });
    const [maison,    setMaison]    = useState({ nom: '', description: '' });
    const [maisonEdit, setMaisonEdit] = useState(false);
    const [maisonDraft, setMaisonDraft] = useState({ nom: '', description: '' });
    const [historyOpen, setHistoryOpen] = useState(false);

    // ── Chargement initial ────────────────────────────────────────────────
    useEffect(() => {
        if (!sessionId) return;

        // Ressources (GM voit tout — complications incluses)
        fetchWithAuth(`${apiBase}/session-resources/${sessionId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setResources(data); })
            .catch(console.error);

        // Maison
        fetchWithAuth(`${apiBase}/session-maison/${sessionId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setMaison(data);
                    setMaisonDraft({ nom: data.nom ?? '', description: data.description ?? '' });
                }
            })
            .catch(console.error);
    }, [sessionId, apiBase]);

    // ── Socket : mises à jour ─────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        // Le GM reçoit l'événement complet (avec complications)
        const onGMUpdate = (data) => setResources(prev => ({ ...prev, ...data }));
        socket.on('session-resources-gm-update', onGMUpdate);
        socket.on('session-resources-update',    onGMUpdate);
        const onMaison = (data) => {
            setMaison(data);
            setMaisonDraft({ nom: data.nom ?? '', description: data.description ?? '' });
        };
        socket.on('session-maison-update', onMaison);
        return () => {
            socket.off('session-resources-gm-update', onGMUpdate);
            socket.off('session-resources-update',    onGMUpdate);
            socket.off('session-maison-update',       onMaison);
        };
    }, [socket]);

    // ── Modification ressources via socket (optimiste) ───────────────────
    const updateResource = useCallback((field, delta) => {
        if (!socket || !sessionId) return;
        // Mise à jour locale immédiate
        setResources(prev => {
            const max = field === 'impulsions' ? MAX_IMPULSIONS : Infinity;
            return { ...prev, [field]: Math.max(0, Math.min(max, (prev[field] ?? 0) + delta)) };
        });
        socket.emit('update-session-resources', { sessionId, field, delta });
    }, [socket, sessionId]);

    // ── Sauvegarde maison ─────────────────────────────────────────────────
    const saveMaison = useCallback(async () => {
        try {
            await fetchWithAuth(`${apiBase}/session-maison/${sessionId}`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(maisonDraft),
            });
            setMaisonEdit(false);
        } catch (e) {
            console.error('[TabResources] Erreur save maison:', e);
        }
    }, [apiBase, sessionId, maisonDraft, fetchWithAuth]);

    // ── Pas de session ────────────────────────────────────────────────────
    if (!sessionId) {
        return (
            <div className="text-center py-12" style={{ color: 'var(--dune-text-muted)' }}>
                <div className="text-4xl mb-3">🏜️</div>
                <p className="text-sm">Aucune session active.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 max-w-2xl mx-auto">

            {/* ── Jauges verticales ─────────────────────────────────── */}
            <div className="dune-card">
                <div className="dune-label mb-4 text-center">Ressources de session</div>
                <div className="flex justify-center items-end gap-8">

                    {/* Impulsions */}
                    <VerticalGauge
                        label="Impulsions"
                        value={resources.impulsions}
                        max={MAX_IMPULSIONS}
                        filledColor="var(--dune-gold)"
                        emptyColor="var(--dune-surface-alt)"
                        borderColor="var(--dune-ochre)"
                        onInc={() => updateResource('impulsions', 1)}
                        onDec={() => updateResource('impulsions', -1)}
                    />

                    {/* Menace */}
                    <VerticalGauge
                        label="Menace"
                        value={Math.min(resources.menace, MAX_MENACE_VIZ)}
                        max={MAX_MENACE_VIZ}
                        filledColor="var(--dune-red)"
                        emptyColor="var(--dune-surface-alt)"
                        borderColor="var(--dune-red)"
                        onInc={() => updateResource('menace', 1)}
                        onDec={() => updateResource('menace', -1)}
                    />

                    {/* Complications — GM uniquement, jauge numérique simple */}
                    <div className="flex flex-col items-center gap-2">
                        <span
                            className="text-[9px] font-bold tracking-widest uppercase"
                            style={{ color: 'var(--dune-red)' }}
                        >
                            Complic.
                        </span>
                        <div
                            className="text-3xl font-bold tabular-nums"
                            style={{ color: 'var(--dune-red)' }}
                        >
                            {resources.complications}
                        </div>
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={() => updateResource('complications', 1)}
                                className="w-7 h-7 rounded font-bold text-sm flex items-center justify-center"
                                style={{ background: 'var(--dune-red)', color: '#fff' }}
                            >+</button>
                            <button
                                onClick={() => updateResource('complications', -1)}
                                disabled={resources.complications <= 0}
                                className="w-7 h-7 rounded font-bold text-sm flex items-center justify-center disabled:opacity-25"
                                style={{ background: 'transparent', color: 'var(--dune-red)', border: '1.5px solid var(--dune-red)' }}
                            >−</button>
                        </div>
                        <div className="text-[9px] italic text-center" style={{ color: 'var(--dune-red)' }}>
                            GM only
                        </div>
                    </div>

                </div>

                {/* Menace réelle si > 12 */}
                {resources.menace > MAX_MENACE_VIZ && (
                    <div className="text-center mt-3 text-xs font-bold" style={{ color: 'var(--dune-red)' }}>
                        ⚠ Menace totale : {resources.menace}
                    </div>
                )}
            </div>

            {/* ── Maison ───────────────────────────────────────────── */}
            <div className="dune-card">
                <div className="flex items-center justify-between mb-2">
                    <div className="dune-label">Maison de session</div>
                    {!maisonEdit ? (
                        <button
                            onClick={() => { setMaisonDraft({ nom: maison.nom ?? '', description: maison.description ?? '' }); setMaisonEdit(true); }}
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}
                        >
                            ✏️ Éditer
                        </button>
                    ) : (
                        <div className="flex gap-1">
                            <button
                                onClick={() => setMaisonEdit(false)}
                                className="text-xs px-2 py-0.5 rounded"
                                style={{ background: 'var(--dune-surface-alt)', color: 'var(--dune-text)' }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={saveMaison}
                                className="dune-btn-primary text-xs px-2"
                            >
                                ✓ Sauvegarder
                            </button>
                        </div>
                    )}
                </div>

                {maisonEdit ? (
                    <div className="space-y-2">
                        <input
                            value={maisonDraft.nom}
                            onChange={e => setMaisonDraft(p => ({ ...p, nom: e.target.value }))}
                            className="dune-input text-sm font-bold"
                            placeholder="Nom de la Maison…"
                        />
                        <textarea
                            value={maisonDraft.description}
                            onChange={e => setMaisonDraft(p => ({ ...p, description: e.target.value }))}
                            className="dune-input text-xs"
                            rows={3}
                            placeholder="Description narrative…"
                        />
                    </div>
                ) : (
                    <div>
                        {maison.nom ? (
                            <>
                                <div className="font-bold text-sm" style={{ color: 'var(--dune-gold)' }}>
                                    {maison.nom}
                                </div>
                                {maison.description && (
                                    <div className="text-xs mt-1 leading-relaxed"
                                         style={{ color: 'var(--dune-text-muted)' }}>
                                        {maison.description}
                                    </div>
                                )}
                            </>
                        ) : (
                            <p className="text-xs italic" style={{ color: 'var(--dune-text-muted)' }}>
                                Aucune maison définie pour cette session.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ── Historique des jets ───────────────────────────────── */}
            <div className="flex justify-end">
                <button
                    onClick={() => setHistoryOpen(true)}
                    className="dune-btn-secondary text-xs"
                >
                    📜 Historique des jets
                </button>
            </div>

            <HistoryPanel
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                sessionId={sessionId}
            />
        </div>
    );
};

export default TabResources;