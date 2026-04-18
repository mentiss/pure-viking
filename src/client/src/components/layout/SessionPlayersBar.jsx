// src/client/src/components/layout/SessionPlayersBar.jsx
// Panneau latéral des personnages de la session.
// Composant générique — utilise exclusivement var(--color-*) définis par chaque thème slug.
// Ne contient aucune classe Tailwind spécifique à un slug (plus de bg-viking-*, etc.)

import React, { useState, useEffect } from 'react';
import { useSocket }         from '../../context/SocketContext.jsx';
import { toSystemUrl, useFetch } from '../../hooks/useFetch.js';
import useSystem from "../../hooks/useSystem.js";

const SessionPlayersBar = ({ character, sessionId, sessionName, headerHeight = null, bottomHeight = null, noWidthWhenCollapsed = false }) => {
    const [sessionCharacters, setSessionCharacters] = useState([]);
    const [onlineCharacters,  setOnlineCharacters]  = useState([]);
    const [isListFixed,       setIsListFixed]        = useState(false);
    const [isButtonScrolled,  setIsButtonScrolled]   = useState(false);

    const socket        = useSocket();
    const fetchWithAuth = useFetch();
    const {slug} = useSystem();
    const STORAGE_KEY = `${slug}_player_session_bar`;

    const [isCollapsed,       setIsCollapsed]        = useState(localStorage.getItem(STORAGE_KEY) === '1');

    // Détecter le scroll pour fixer la liste
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, isCollapsed ? '1' : '0');
        if(bottomHeight !== null && isCollapsed) return;
        const handleScroll = () => {
            setIsListFixed(window.scrollY > 100 && !isCollapsed);
            setIsButtonScrolled(window.scrollY > 100 && isCollapsed);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isCollapsed]);

    // Charger les personnages de la session
    useEffect(() => {
        if (!sessionId) { setSessionCharacters([]); return; }
        fetchWithAuth(`/api/sessions/${sessionId}`)
            .then(res => res.json())
            .then(session => setSessionCharacters(session.characters || []))
            .catch(err => console.error('[SessionPlayersBar] Error loading session characters:', err));
    }, [sessionId]);

    // Écouter les mises à jour des personnages en ligne
    useEffect(() => {
        if (!socket) return;
        const handleOnlineUpdate = (characters) => setOnlineCharacters(characters);
        fetch(toSystemUrl('/api/online-characters'))
            .then(res => res.json())
            .then(setOnlineCharacters)
            .catch(console.error);
        socket.on('online-characters-update', handleOnlineUpdate);
        return () => socket.off('online-characters-update', handleOnlineUpdate);
    }, [socket]);

    const charactersWithStatus = sessionCharacters.map(char => ({
        ...char,
        isOnline: onlineCharacters.some(oc => oc.characterId === char.id),
        isMe:     char.id === character?.id,
    }));

    //console.log(sessionCharacters, charactersWithStatus);

    if (!sessionId || sessionCharacters.length === 0) return null;

    // ── Styles partagés calculés depuis les variables CSS génériques ──────
    const panelStyle = {
        background:   'var(--color-surface)',
        borderRight:  isCollapsed ? 'none' : '4px solid var(--color-border)',
        boxShadow:    '4px 0 24px rgba(0,0,0,0.18)',
        transition:   'width 0.3s',
        width:        isCollapsed ? 0 : '14rem',
        overflow:     'hidden',
        flexShrink:   0,
    };

    const headerStyle = {
        background:   'var(--color-surface)',
        borderBottom: '2px solid var(--color-border)',
        padding:      '0.75rem',
    };

    const btnCollapseStyle = {
        background: 'var(--color-primary)',
        color:      'var(--color-primary-dark, #fff)',
        width:      '100%',
        padding:    '0.25rem 0.5rem',
        borderRadius: '0.375rem',
        fontWeight:  600,
        fontSize:    '0.875rem',
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        gap:         '0.25rem',
        border:      'none',
        cursor:      'pointer',
    };

    const listContainerStyle = isListFixed ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '14rem',
        height: '100vh',
        overflowY: 'auto',
        zIndex: 50,
        borderRight: '4px solid var(--color-border)',
        background: 'var(--color-surface)',
        padding: '0.5rem',
    } : {
        maxHeight: '100vh',
        overflowY: 'auto',
        background: 'var(--color-surface)',
        padding: '0.5rem',
    };

    const getAvatarBorderStyle = (char) => {
        if (char.isMe)     return '4px solid var(--color-primary)';
        if (char.isOnline) return '2px solid var(--color-primary)';
        return '2px solid #9ca3af'; // gray-400 neutre
    };

    return (
        <>
            {/* Panneau */}
            <div style={panelStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <div
                        className="font-bold text-sm mb-2 truncate"
                        style={{ color: 'var(--color-text)' }}
                    >
                        📋 {sessionName || 'Session active'}
                    </div>
                    <button
                        onClick={() => setIsCollapsed(true)}
                        style={btnCollapseStyle}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Réduire</span>
                    </button>
                </div>

                {/* Liste des personnages */}
                <div style={listContainerStyle}>
                    <div className="space-y-3">
                        {charactersWithStatus.map(char => (
                            <div key={char.id} className="flex flex-col items-center gap-1">
                                {/* Avatar */}
                                <div className="relative">
                                    {char.avatar ? (
                                        <img
                                            src={char.avatar}
                                            alt={char.name}
                                            className={`w-12 h-12 rounded-full object-cover ${!char.isOnline && !char.isMe ? 'grayscale opacity-60' : ''}`}
                                            style={{ border: getAvatarBorderStyle(char) }}
                                            title={char.name}
                                        />
                                    ) : (
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center ${!char.isOnline && !char.isMe ? 'grayscale opacity-60' : ''}`}
                                            style={{
                                                border:     getAvatarBorderStyle(char),
                                                background: 'var(--color-surface)',
                                            }}
                                            title={char.name}
                                        >
                                            <span className="text-xl">👤</span>
                                        </div>
                                    )}
                                    {/* Indicateur en ligne */}
                                    {char.isOnline && (
                                        <div
                                            className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                                            style={{
                                                background:   '#22c55e',
                                                borderColor:  'var(--color-surface)',
                                            }}
                                        />
                                    )}
                                </div>

                                {/* Nom du perso */}
                                <div
                                    className="text-xs font-bold text-center max-w-full truncate px-1"
                                    style={{ color: char.isOnline || char.isMe ? 'var(--color-text)' : '#6b7280' }}
                                >
                                    {char.name}
                                </div>

                                {/* Nom du joueur */}
                                <div
                                    className="text-[10px] text-center max-w-full truncate px-1"
                                    style={{ color: char.isOnline ? 'var(--color-primary)' : '#9ca3af' }}
                                >
                                    {char.playerName}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Spacer pour garder la marge en mode collapsed */}
            {!noWidthWhenCollapsed && (
                <div
                    className="flex-shrink-0 transition-all duration-300"
                    style={{ width: isCollapsed ? '3rem' : 0 }}
                />
            )}


            {/* Bouton flottant pour rouvrir */}
            {isCollapsed && (
                <button
                    onClick={() => setIsCollapsed(false)}
                    className={`fixed left-2 z-40 w-8 h-8 rounded-full shadow-lg flex items-center justify-center ${!headerHeight && isButtonScrolled ? 'top-0' : ''}`}
                    style={{
                        top:        headerHeight !== null ? `${headerHeight + 8}px` : undefined,
                        bottom:     bottomHeight !== null ? `${bottomHeight + 8}px` : undefined,
                        background: 'var(--color-primary)',
                        color:      'var(--color-primary-dark, #fff)',
                        border:     '2px solid var(--color-border)',
                    }}
                    title="Afficher la table"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}
        </>
    );
};

export default SessionPlayersBar;