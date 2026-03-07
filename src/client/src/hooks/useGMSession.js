// src/client/src/hooks/useGMSession.js
// Hook générique qui gère toute la couche socket/session côté GM.
// Extrait de GMView.jsx Vikings — aucune logique système dedans.
//
// Responsabilités :
//   - Charger la session active depuis localStorage au boot
//   - Émettre gm-set-active-session + join/leave session quand activeSession change
//   - Écouter online-characters-update
//   - Exposer activeSession + setActiveSession pour que GMView puisse en changer

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { useFetch } from './useFetch.js';

/**
 * @param {string} apiBase - ex: '/api/vikings'
 * @returns {{
 *   activeSession: object|null,
 *   setActiveSession: function,
 *   onlineCharacters: array,
 * }}
 */
export function useGMSession({ apiBase }) {
    const socket = useSocket();
    const fetchWithAuth = useFetch();

    const [activeSession,    setActiveSessionState] = useState(null);
    const [onlineCharacters, setOnlineCharacters]   = useState([]);

    const slug = apiBase.replace(/^\/api\//, '').replace(/\/$/, '');

    // ── Chargement initial depuis localStorage ──────────────────────────────
    useEffect(() => {
        const savedId = localStorage.getItem('activeSessionId');
        if (!savedId) return;

        fetchWithAuth(`${apiBase}/sessions/${savedId}`)
            .then(r => r.ok ? r.json() : null)
            .then(session => { if (session) setActiveSessionState(session); })
            .catch(err => {
                console.error('[useGMSession] Error loading saved session:', err);
                localStorage.removeItem('activeSessionId');
            });
    }, [apiBase]);

    // ── Présence en ligne ───────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        // Charger l'état initial
        fetch('/api/online-characters')
            .then(r => r.json())
            .then(setOnlineCharacters)
            .catch(console.error);

        const handleOnlineUpdate = (chars) => setOnlineCharacters(chars);
        socket.on('online-characters-update', handleOnlineUpdate);

        return () => socket.off('online-characters-update', handleOnlineUpdate);
    }, [socket]);

    // ── Broadcast session active + join/leave room ──────────────────────────
    useEffect(() => {
        if (!socket) return;

        if (activeSession) {
            socket.emit('gm-set-active-session', { sessionId: activeSession.id, system: slug });
            socket.emit('join-session',           { sessionId: activeSession.id, system: slug });
        } else {
            // Informer les joueurs qu'il n'y a plus de session active
            socket.emit('gm-set-active-session', { sessionId: null, system: slug });
        }

        return () => {
            if (activeSession) {
                socket.emit('leave-session', { sessionId: activeSession.id, system: slug });
            }
        };
    }, [socket, activeSession?.id]);

    // ── setActiveSession avec effet de bord localStorage ───────────────────
    const setActiveSession = useCallback((session) => {
        setActiveSessionState(session);
        if (session) {
            localStorage.setItem('activeSessionId', session.id);
        } else {
            localStorage.removeItem('activeSessionId');
        }
    }, []);

    return { activeSession, setActiveSession, onlineCharacters };
}