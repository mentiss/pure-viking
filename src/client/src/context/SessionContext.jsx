// context/SessionContext.jsx - Gestion de la session active (broadcast par le GM)
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { getSystemFromPath } from '../hooks/useSystem.js';
import {useFetch} from "../hooks/useFetch.js";

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
    const [activeGMSession, setActiveGMSession] = useState(null);
    const [activeSessionName, setActiveSessionName] = useState(null);
    const [characterSessions, setCharacterSessions] = useState([]); // Sessions du perso
    const [pendingSessionId, setPendingSessionId] = useState(null);
    const socket = useSocket();
    const fetchWithAuth = useFetch();

    useEffect(() => {
        if (!socket) return;

        const handleGMSessionActive = (sessionId) => {
            console.log('[SessionContext] GM session changed to:', sessionId);
            setPendingSessionId(sessionId); // ← Toujours stocker
        };

        socket.on('gm-session-active', handleGMSessionActive);

        return () => {
            socket.off('gm-session-active', handleGMSessionActive);
        };
    }, [socket]);

    useEffect(() => {
        if (!socket || !pendingSessionId) return;
        const system   = getSystemFromPath();
        const isGM = characterSessions.some(s => s.id === -1);
        const isMember = isGM || characterSessions.some(s => s.id === pendingSessionId);

        if (!isMember) {
            console.log('[SessionContext] Not a member of session:', pendingSessionId);
            if (activeGMSession) {
                socket.emit('leave-session', { sessionId: activeGMSession, system });
                setActiveGMSession(null);
            }
            return;
        }

        // Quitter l'ancienne room
        if (activeGMSession && activeGMSession !== pendingSessionId) {
            socket.emit('leave-session', { sessionId: activeGMSession, system });
        }

        // Rejoindre la nouvelle room
        socket.emit('join-session', { sessionId: pendingSessionId, system });
        setActiveGMSession(pendingSessionId);
        console.log('[SessionContext] Joined session:', pendingSessionId);
    }, [socket, pendingSessionId, characterSessions]);

    useEffect(() => {
        return () => {
            if (socket && activeGMSession) {
                socket.emit('leave-session', { sessionId: activeGMSession, system });
            }
        };
    }, [socket, activeGMSession]);

    useEffect(() => {
        if (!activeGMSession) { setActiveSessionName(null); return; }
        const system = getSystemFromPath();
        fetchWithAuth(`/api/${system}/sessions/${activeGMSession}`)
            .then(r => r.ok ? r.json() : null)
            .then(s => { if (s) setActiveSessionName(s.name); })
            .catch(() => {});
    }, [activeGMSession]);

    // Méthode pour enregistrer les sessions du personnage
    const updateCharacterSessions = (sessions) => {
        console.log('[SessionContext] Character sessions updated:', sessions);
        setCharacterSessions(sessions);
    };

    return (
        <SessionContext.Provider value={{
            activeGMSession,
            activeSessionName,
            updateCharacterSessions
        }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (!context) {
        throw new Error('useSession must be used within SessionProvider');
    }
    return context;
};