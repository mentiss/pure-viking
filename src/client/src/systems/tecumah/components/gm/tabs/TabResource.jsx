// src/client/src/systems/tecumah/gm/tabs/TabResource.jsx
// Onglet Ressources GM — jauge complications.
// Modifications via socket update-session-resources → broadcast session-resources-update.
// Historique en mémoire locale (remis à zéro à la déconnexion).

import React, { useState, useEffect, useCallback, useRef } from 'react';
import useSystem from "../../../../../hooks/useSystem.js";
import {useFetch} from "../../../../../hooks/useFetch.js";
import {useSocket} from "../../../../../context/SocketContext.jsx";

const TabResource = ({ activeSession }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();
    const socket        = useSocket();

    const sessionId = activeSession?.id ?? null;

    const [complications, setComplications] = useState(0);
    const [history,       setHistory]       = useState([]); // { delta, label, time }[]

    // ── Chargement initial ────────────────────────────────────────────────
    useEffect(() => {
        if (!sessionId) return;
        fetchWithAuth(`${apiBase}/session-resources/${sessionId}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setComplications(d.complications ?? 0); })
            .catch(() => {});
    }, [sessionId, apiBase]);

    // ── Socket ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const fn = (d) => {
            if (d.complications != null) setComplications(d.complications);
        };
        socket.on('session-resources-update', fn);
        return () => socket.off('session-resources-update', fn);
    }, [socket]);

    // ── Émission modification ─────────────────────────────────────────────
    const emitUpdate = useCallback((delta, label) => {
        if (!socket || !sessionId) return;
        socket.emit('update-session-resources', { sessionId, field: 'complications', delta });
        setHistory(prev => [
            { delta, label, time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) },
            ...prev.slice(0, 49), // garder 50 entrées max
        ]);
    }, [socket, sessionId]);

    if (!sessionId) {
        return (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 40, fontSize: '0.9rem' }}>
                Aucune session active.
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-6 max-w-md mx-auto">

            {/* ── Compteur complications ────────────────────────────────── */}
            <div
                className="rounded-xl p-6 text-center"
                style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}
            >
                <h2 style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '1rem', marginBottom: 16 }}>
                    ⚡ Complications de session
                </h2>

                <div className="flex items-center justify-center gap-6 mb-6">
                    <button
                        onClick={() => emitUpdate(-1, 'GM −1')}
                        disabled={complications <= 0}
                        className="w-12 h-12 rounded-full text-2xl flex items-center justify-center"
                        style={{
                            background: complications > 0 ? 'var(--color-surface-alt)' : 'var(--color-border)',
                            border: '2px solid var(--color-border)',
                            color: complications > 0 ? 'var(--color-text)' : 'var(--color-text-muted)',
                        }}
                    >
                        −
                    </button>

                    <span style={{ fontWeight: 900, fontSize: '3rem', color: complications > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', lineHeight: 1 }}>
                        {complications}
                    </span>

                    <button
                        onClick={() => emitUpdate(+1, 'GM +1')}
                        className="w-12 h-12 rounded-full text-2xl flex items-center justify-center"
                        style={{ background: 'var(--color-surface-alt)', border: '2px solid var(--color-border)', color: 'var(--color-text)' }}
                    >
                        +
                    </button>
                </div>

                {/* Dépense rapide */}
                {complications > 0 && (
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
                            Dépense rapide
                        </p>
                        <div className="flex gap-2 justify-center flex-wrap">
                            {[1, 2, 3].filter(n => n <= complications).map(n => (
                                <button
                                    key={n}
                                    onClick={() => emitUpdate(-n, `GM −${n}`)}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                                    style={{ background: 'var(--color-primary)', color: '#fff' }}
                                >
                                    −{n}
                                </button>
                            ))}
                            {complications > 0 && (
                                <button
                                    onClick={() => emitUpdate(-complications, `GM −${complications} (toutes)`)}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                                    style={{ background: 'var(--color-danger)', color: '#fff' }}
                                >
                                    Toutes (−{complications})
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Historique mémoire ────────────────────────────────────── */}
            {history.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                        Historique session (mémoire locale)
                    </h3>
                    <div className="flex flex-col gap-1">
                        {history.map((h, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between px-3 py-1.5 rounded"
                                style={{ background: 'var(--color-surface)', fontSize: '0.82rem' }}
                            >
                                <span style={{ color: h.delta > 0 ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
                                    {h.delta > 0 ? `+${h.delta}` : h.delta}
                                </span>
                                <span style={{ color: 'var(--color-text)', flex: 1, marginLeft: 12 }}>{h.label}</span>
                                <span style={{ color: 'var(--color-text-muted)' }}>{h.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TabResource;