// src/client/src/systems/dune/components/SessionResourcesBar.jsx
// Barre de ressources de session visible par tous (Impulsions + Menace).
// Complications : non rendues ici (GM only, dans TabResources).
// Se connecte au socket pour recevoir les mises à jour en temps réel.
// Envoie 'update-session-resources' pour les modifications.

import React, { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../../../context/SocketContext.jsx';
import { useFetch }  from '../../../hooks/useFetch.js';
import { useSystem } from '../../../hooks/useSystem.js';

const MAX_IMPULSIONS = 6;

/**
 * @param {object}  props
 * @param {number}  props.sessionId
 * @param {boolean} props.isGM        - Joueurs ne peuvent pas modifier la Menace
 */
const SessionResourcesBar = ({ sessionId, isGM }) => {
    const { slug, apiBase } = useSystem();
    const fetchWithAuth = useFetch();
    const socket = useSocket();

    const [resources, setResources] = useState({ impulsions: 0, menace: 0 });
    const [loading, setLoading]     = useState(true);

    // ── Chargement initial ────────────────────────────────────────────────
    useEffect(() => {
        if (!sessionId) return;
        fetchWithAuth(`${apiBase}/session-resources/${sessionId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setResources(data); })
            .finally(() => setLoading(false));
    }, [sessionId, apiBase]);

    // ── Socket : écoute des mises à jour ─────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const onUpdate = (data) => {
            setResources(prev => ({ ...prev, ...data }));
        };

        socket.on('session-resources-update', onUpdate);
        return () => socket.off('session-resources-update', onUpdate);
    }, [socket]);

    // ── Émission d'une modification ───────────────────────────────────────
    const updateField = useCallback((field, delta) => {
        if (!socket || !sessionId) return;
        socket.emit('update-session-resources', { sessionId, field, delta });
    }, [socket, sessionId]);

    if (!sessionId || loading) return null;

    return (
        <div className="flex gap-3 items-start justify-center py-2 px-3 rounded-lg"
             style={{ background: 'var(--dune-surface)', border: '1.5px solid var(--dune-border)' }}>

            {/* ── Impulsions ────────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-1">
                <span className="dune-label">Impulsions</span>
                <div className="flex gap-1">
                    {Array.from({ length: MAX_IMPULSIONS }).map((_, i) => (
                        <div
                            key={i}
                            className={`dune-pip ${i < resources.impulsions ? 'filled' : 'empty'}`}
                        />
                    ))}
                </div>
                <div className="flex gap-1 mt-0.5">
                    <button
                        onClick={() => updateField('impulsions', -1)}
                        disabled={resources.impulsions <= 0}
                        className="w-6 h-6 rounded text-xs font-bold disabled:opacity-30"
                        style={{ background: 'var(--dune-ochre)', color: 'var(--dune-parchment)' }}
                    >−</button>
                    <span className="text-xs font-bold w-6 text-center" style={{ color: 'var(--dune-gold)' }}>
                        {resources.impulsions}
                    </span>
                    <button
                        onClick={() => updateField('impulsions', 1)}
                        disabled={resources.impulsions >= MAX_IMPULSIONS}
                        className="w-6 h-6 rounded text-xs font-bold disabled:opacity-30"
                        style={{ background: 'var(--dune-gold)', color: 'var(--dune-dark)' }}
                    >+</button>
                </div>
            </div>

            {/* ── Menace ───────────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-1">
                <span className="dune-label">Menace</span>
                <span className="text-xl font-bold" style={{ color: 'var(--dune-red)' }}>
                    {resources.menace}
                </span>
                <div className="flex gap-1 mt-0.5">
                    {isGM ? (
                        <>
                            <button
                                onClick={() => updateField('menace', -1)}
                                disabled={resources.menace <= 0}
                                className="w-6 h-6 rounded text-xs font-bold disabled:opacity-30"
                                style={{ background: 'var(--dune-ochre)', color: 'var(--dune-parchment)' }}
                            >−</button>
                            <button
                                onClick={() => updateField('menace', 1)}
                                className="w-6 h-6 rounded text-xs font-bold"
                                style={{ background: 'var(--dune-red)', color: 'white' }}
                            >+</button>
                        </>
                    ) : (
                        <span className="text-[10px] italic" style={{ color: 'var(--dune-text-muted)' }}>
                            (lecture seule)
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SessionResourcesBar;