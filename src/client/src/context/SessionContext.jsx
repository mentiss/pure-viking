// context/SessionContext.jsx - Gestion de la session active (broadcast par le GM)
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSocket } from './SocketContext';

const SessionContext = createContext();

export const SessionProvider = ({ children }) => {
    const [activeGMSession, setActiveGMSession] = useState(null);
    const [characterSessions, setCharacterSessions] = useState([]); // Sessions du perso
    const [pendingSessionId, setPendingSessionId] = useState(null);
    const socket = useSocket();

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

        const isGM = characterSessions.some(s => s.id === -1);
        const isMember = isGM || characterSessions.some(s => s.id === pendingSessionId);

        if (!isMember) {
            console.log('[SessionContext] Not a member of session:', pendingSessionId);
            if (activeGMSession) {
                socket.emit('leave-session', activeGMSession);
                setActiveGMSession(null);
            }
            return;
        }

        // Quitter l'ancienne room
        if (activeGMSession && activeGMSession !== pendingSessionId) {
            socket.emit('leave-session', activeGMSession);
        }

        // Rejoindre la nouvelle room
        socket.emit('join-session', pendingSessionId);
        setActiveGMSession(pendingSessionId);
        console.log('[SessionContext] Joined session:', pendingSessionId);
    }, [socket, pendingSessionId, characterSessions]);

    useEffect(() => {
        return () => {
            if (socket && activeGMSession) {
                socket.emit('leave-session', activeGMSession);
            }
        };
    }, [socket, activeGMSession]);

    // Méthode pour enregistrer les sessions du personnage
    const updateCharacterSessions = (sessions) => {
        console.log('[SessionContext] Character sessions updated:', sessions);
        setCharacterSessions(sessions);
    };

    return (
        <SessionContext.Provider value={{
            activeGMSession,
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