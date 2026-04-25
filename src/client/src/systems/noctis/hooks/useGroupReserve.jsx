import { useState, useEffect, useCallback } from 'react';
import { useSocket }  from '../../../context/SocketContext.jsx';
import { useSession } from '../../../context/SessionContext.jsx';
import { useFetch }   from '../../../hooks/useFetch.js';
import { useSystem }  from '../../../hooks/useSystem.js';

const DEFAULT = {
    current:     0,
    principes:   [],
    interdits:   [],
    regle_acces: 'libre',
    notes:       '',
};

export function useGroupReserve() {
    const socket              = useSocket();
    const { activeGMSession } = useSession();
    const fetchWithAuth       = useFetch();
    const { apiBase }         = useSystem();

    const [groupReserve, setGroupReserve] = useState(null);
    const [loading,      setLoading]      = useState(false);

    // ── Chargement HTTP quand la session change ───────────────────────────────
    useEffect(() => {
        if (!activeGMSession) { setGroupReserve(null); return; }
        setLoading(true);
        fetchWithAuth(`${apiBase}/sessions/${activeGMSession}/group-reserve`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) setGroupReserve(data); })
            .catch(err => console.error('[useGroupReserve] load:', err))
            .finally(() => setLoading(false));
    }, [activeGMSession, apiBase]); // fetchWithAuth absent intentionnellement

    // ── Demande initiale via socket ────────────────────────────────────────────
    useEffect(() => {
        if (!socket || !activeGMSession) return;
        socket.emit('noctis:group-reserve-get', { sessionId: activeGMSession });
    }, [socket, activeGMSession]);

    // ── Sync socket ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;
        const handler = (data) => {
            setGroupReserve(prev => prev ? { ...prev, ...data } : { ...DEFAULT, ...data });
        };
        socket.on('noctis:group-reserve-update', handler);
        return () => socket.off('noctis:group-reserve-update', handler);
    }, [socket]);

    // ── Mise à jour complète (principes, interdits, règle, notes) ─────────────
    const updateGroupReserve = useCallback(async (patch) => {
        if (!activeGMSession) return;
        try {
            await fetchWithAuth(`${apiBase}/sessions/${activeGMSession}/group-reserve`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(patch),
            });
            // Le broadcast socket met à jour l'état local
        } catch (err) {
            console.error('[useGroupReserve] update:', err);
        }
    }, [activeGMSession, apiBase]); // fetchWithAuth absent

    // ── Fluctuation narrative (+3/+5/-3/-5) ───────────────────────────────────
    const applyFluctuation = useCallback(async (delta, raison = '') => {
        if (!activeGMSession) return;
        try {
            await fetchWithAuth(`${apiBase}/sessions/${activeGMSession}/group-reserve/fluctuation`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ delta, raison }),
            });
        } catch (err) {
            console.error('[useGroupReserve] fluctuation:', err);
        }
    }, [activeGMSession, apiBase]); // fetchWithAuth absent

    return {
        groupReserve: groupReserve ?? DEFAULT,
        loading,
        hasSession:   !!activeGMSession,
        updateGroupReserve,
        applyFluctuation,
    };
}