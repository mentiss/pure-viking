// components/SessionPlayersBar.jsx - Panneau latéral des personnages de la session
import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useFetch } from '../hooks/useFetch';

const SessionPlayersBar = ({ character, sessionId, sessionName }) => {
    const [sessionCharacters, setSessionCharacters] = useState([]);
    const [onlineCharacters, setOnlineCharacters] = useState([]);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isListFixed, setIsListFixed] = useState(false);
    const [isButtonScrolled, setIsButtonScrolled] = useState(false);

    const socket = useSocket();
    const fetchWithAuth = useFetch();

    // Détecter le scroll pour fixer la liste
    useEffect(() => {
        const handleScroll = () => {
            // Fixer la liste si on a scrollé plus de 100px ET que le panneau n'est pas collapsed
            setIsListFixed(window.scrollY > 100 && !isCollapsed);
            setIsButtonScrolled(window.scrollY > 100 && isCollapsed);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isCollapsed]); // Dépendre de isCollapsed pour recalculer

    // Charger les personnages de la session
    useEffect(() => {
        if (!sessionId) {
            setSessionCharacters([]);
            return;
        }

        const loadSessionCharacters = async () => {
            try {
                const response = await fetchWithAuth(`/api/sessions/${sessionId}`);
                const session = await response.json();
                setSessionCharacters(session.characters || []);
            } catch (error) {
                console.error('[SessionPlayersBar] Error loading session characters:', error);
            }
        };

        loadSessionCharacters();
    }, [sessionId]);

    // Écouter les mises à jour des personnages en ligne
    useEffect(() => {
        if (!socket) return;

        const handleOnlineUpdate = (characters) => {
            setOnlineCharacters(characters);
        };

        // Charger l'état initial
        fetch('/api/online-characters')
            .then(res => res.json())
            .then(setOnlineCharacters)
            .catch(console.error);

        socket.on('online-characters-update', handleOnlineUpdate);

        return () => {
            socket.off('online-characters-update', handleOnlineUpdate);
        };
    }, [socket]);

    // Fusionner les données
    const charactersWithStatus = sessionCharacters.map(char => ({
        ...char,
        isOnline: onlineCharacters.some(oc => oc.characterId === char.id),
        isMe: char.id === character?.id
    }));

    // Ne rien afficher si pas de session ou pas de persos
    if (!sessionId || sessionCharacters.length === 0) {
        return null;
    }

    return (
        <>
            {/* Panneau */}
            <div
                className={`bg-white dark:bg-viking-brown border-r-4 border-viking-bronze shadow-2xl transition-all duration-300 overflow-hidden flex-shrink-0 ${
                    isCollapsed ? 'w-0 border-r-0' : 'w-56'
                }`}
            >
                {/* Header (scroll avec la page) */}
                <div className="p-3 bg-viking-parchment dark:bg-gray-800 border-b-2 border-viking-bronze">
                    <div className="font-bold text-sm text-viking-brown dark:text-viking-parchment mb-2 truncate">
                        📋 {sessionName || 'Session active'}
                    </div>
                    <button
                        onClick={() => setIsCollapsed(true)}
                        className="w-full px-2 py-1 bg-viking-bronze text-viking-brown rounded hover:bg-viking-leather font-semibold text-sm flex items-center justify-center gap-1"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Réduire</span>
                    </button>
                </div>

                {/* Liste des personnages (FIXED après scroll) */}
                <div className={`p-2 bg-white dark:bg-viking-brown transition-all ${
                    isListFixed
                        ? 'fixed top-0 left-0 w-56 h-screen overflow-y-auto z-50 border-r-4 border-viking-bronze'
                        : 'max-h-screen overflow-y-auto'
                }`}>
                    <div className="space-y-3">
                        {charactersWithStatus.map(char => (
                            <div
                                key={char.id}
                                className="flex flex-col items-center gap-1"
                            >
                                {/* Avatar */}
                                <div className="relative">
                                    {char.avatar ? (
                                        <img
                                            src={char.avatar}
                                            alt={char.name}
                                            className={`w-12 h-12 rounded-full ${
                                                char.isMe
                                                    ? 'border-4 border-viking-bronze'
                                                    : char.isOnline
                                                        ? 'border-2 border-viking-bronze'
                                                        : 'border-2 border-gray-400 grayscale opacity-60'
                                            }`}
                                            title={char.name}
                                        />
                                    ) : (
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                char.isMe
                                                    ? 'border-4 border-viking-bronze bg-viking-parchment dark:bg-gray-700'
                                                    : char.isOnline
                                                        ? 'border-2 border-viking-bronze bg-viking-parchment dark:bg-gray-700'
                                                        : 'border-2 border-gray-400 bg-gray-200 dark:bg-gray-600 grayscale opacity-60'
                                            }`}
                                            title={char.name}
                                        >
                                            <span className="text-xl">👤</span>
                                        </div>
                                    )}
                                </div>

                                {/* Nom du perso */}
                                <div className={`text-xs font-bold text-center max-w-full truncate px-1 ${
                                    char.isOnline
                                        ? 'text-viking-brown dark:text-viking-parchment'
                                        : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                    {char.name}
                                </div>

                                {/* Nom du joueur */}
                                <div className={`text-[10px] text-center max-w-full truncate px-1 ${
                                    char.isOnline
                                        ? 'text-viking-bronze'
                                        : 'text-gray-400'
                                }`}>
                                    {char.playerName}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Spacer invisible pour garder la marge en mode collapsed */}
            <div
                className={`flex-shrink-0 transition-all duration-300 ${
                    isCollapsed ? 'w-12' : 'w-0'
                }`}
            />

            {/* Bouton flottant pour rouvrir (visible uniquement si collapsed) */}
            {isCollapsed && (
                <button
                    onClick={() => setIsCollapsed(false)}
                    className={`fixed left-2 z-40 w-8 h-8 bg-viking-bronze text-viking-brown rounded-full shadow-lg hover:bg-viking-leather transition-all flex items-center justify-center ${
                        isButtonScrolled ? 'top-0' : ''
                    }`}
                    title="Afficher la table"
                >
                    <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}
        </>
    );
};

export default SessionPlayersBar;