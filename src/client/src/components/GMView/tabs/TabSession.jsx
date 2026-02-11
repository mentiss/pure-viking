// components/GMView/tabs/TabSession.jsx - Onglet Session (vue personnages de la table)
import React, { useState, useEffect } from 'react';
import { useSocket } from '../../../context/SocketContext.jsx';
import { useFetch } from '../../../hooks/useFetch.js';
import GMCharacterCard from '../pj/GMCharacterCard.jsx';

const TabSession = ({ activeSession, onlineCharacters }) => {
    const [characters, setCharacters] = useState({}); // Map id -> fullCharacter
    const [selectedCharId, setSelectedCharId] = useState(null);
    const [loading, setLoading] = useState(false);

    const socket = useSocket();
    const fetchWithAuth = useFetch();

    // IDs des personnages en ligne pour lookup rapide
    const onlineIds = new Set(onlineCharacters.map(c => c.characterId));

    // --- Charger les fiches complètes quand la session change ---
    useEffect(() => {
        if (!activeSession?.characters?.length) {
            setCharacters({});
            setSelectedCharId(null);
            return;
        }

        const loadAllCharacters = async () => {
            setLoading(true);
            const loaded = {};

            // Charger toutes les fiches en parallèle
            const promises = activeSession.characters.map(async (c) => {
                try {
                    const response = await fetchWithAuth(`/api/characters/${c.id}`);
                    if (response.ok) {
                        const fullChar = await response.json();
                        loaded[c.id] = fullChar;
                    }
                } catch (error) {
                    console.error(`[TabSession] Error loading character ${c.id}:`, error);
                }
            });

            await Promise.all(promises);
            setCharacters(loaded);

            // Sélectionner le premier par défaut si aucun sélectionné
            if (!selectedCharId || !loaded[selectedCharId]) {
                const firstId = activeSession.characters[0]?.id;
                if (firstId) setSelectedCharId(firstId);
            }

            setLoading(false);
        };

        loadAllCharacters();
    }, [activeSession?.id, activeSession?.characters?.length]);

    // --- Écouter les mises à jour temps réel ---
    useEffect(() => {
        if (!socket) return;

        const handleCharacterFullUpdate = (data) => {
            console.log('[TabSession] character-full-update received:', data.characterId);
            setCharacters(prev => {
                if (prev[data.characterId]) {
                    return {
                        ...prev,
                        [data.characterId]: data.character
                    };
                }
                return prev;
            });
        };

        // Écouter aussi le broadcast léger pour les tokens (combat, etc.)
        const handleCharacterUpdate = (data) => {
            setCharacters(prev => {
                if (prev[data.characterId]) {
                    return {
                        ...prev,
                        [data.characterId]: {
                            ...prev[data.characterId],
                            ...data.updates
                        }
                    };
                }
                return prev;
            });
        };

        socket.on('character-full-update', handleCharacterFullUpdate);
        socket.on('character-update', handleCharacterUpdate);

        return () => {
            socket.off('character-full-update', handleCharacterFullUpdate);
            socket.off('character-update', handleCharacterUpdate);
        };
    }, [socket]);

    // --- Handler pour modifier tokens depuis GMCharacterCard ---
    const handleUpdateTokens = async (characterId, updates) => {
        // Optimistic update local
        setCharacters(prev => ({
            ...prev,
            [characterId]: {
                ...prev[characterId],
                ...updates
            }
        }));

        // Sauvegarder en backend
        try {
            const currentChar = characters[characterId];
            await fetchWithAuth(`/api/characters/${characterId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...currentChar,
                    ...updates
                })
            });
        } catch (error) {
            console.error('[TabSession] Error updating character tokens:', error);
            // TODO: rollback optimistic update si besoin
        }
    };

    // --- Pas de session active ---
    if (!activeSession) {
        return (
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-8 text-center">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment mb-2">
                    Aucune table sélectionnée
                </h3>
                <p className="text-viking-leather dark:text-viking-bronze">
                    Ouvrez le menu ☰ et gérez vos tables pour sélectionner une session active.
                </p>
            </div>
        );
    }

    // --- Session sans personnages ---
    if (!activeSession.characters?.length) {
        return (
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-8 text-center">
                <div className="text-4xl mb-4">👥</div>
                <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment mb-2">
                    Aucun personnage dans cette table
                </h3>
                <p className="text-viking-leather dark:text-viking-bronze">
                    Assignez des personnages à la table « {activeSession.name} » via la gestion des tables.
                </p>
            </div>
        );
    }

    // --- Loading ---
    if (loading && Object.keys(characters).length === 0) {
        return (
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-8 text-center">
                <div className="text-2xl animate-pulse mb-2">⏳</div>
                <p className="text-viking-leather dark:text-viking-bronze">
                    Chargement des fiches...
                </p>
            </div>
        );
    }

    const selectedCharacter = selectedCharId ? characters[selectedCharId] : null;

    return (
        <div className="space-y-4">
            {/* === BARRE DE SÉLECTION PERSONNAGE (horizontale) === */}
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {activeSession.characters.map(sessionChar => {
                        const fullChar = characters[sessionChar.id];
                        const isSelected = selectedCharId === sessionChar.id;
                        const isOnline = onlineIds.has(sessionChar.id);

                        return (
                            <button
                                key={sessionChar.id}
                                onClick={() => setSelectedCharId(sessionChar.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all shrink-0 ${
                                    isSelected
                                        ? 'bg-viking-bronze border-2 border-viking-leather shadow-md'
                                        : 'bg-viking-parchment dark:bg-gray-800 border-2 border-transparent hover:border-viking-bronze/50'
                                }`}
                            >
                                {/* Avatar mini */}
                                <div className="relative">
                                    {sessionChar.avatar ? (
                                        <img
                                            src={sessionChar.avatar}
                                            alt={sessionChar.name}
                                            className="w-8 h-8 rounded-full object-cover border border-viking-leather"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-viking-leather/20 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-viking-brown dark:text-viking-parchment border border-viking-leather">
                                            {sessionChar.name?.[0]?.toUpperCase() || '?'}
                                        </div>
                                    )}
                                    {/* Pastille online */}
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-viking-brown ${
                                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                                    }`} />
                                </div>

                                {/* Nom + indicateurs */}
                                <div className="text-left">
                                    <div className={`text-sm font-semibold ${
                                        isSelected
                                            ? 'text-viking-brown'
                                            : 'text-viking-brown dark:text-viking-parchment'
                                    }`}>
                                        {sessionChar.name}
                                    </div>
                                    <div className="flex gap-1">
                                        {/* Indicateur blessures compact */}
                                        {(fullChar?.tokensBlessure > 0 || sessionChar.tokensBlessure > 0) && (
                                            <span className={`text-[10px] px-1 rounded bg-red-500/20 ${
                                                isSelected
                                                    ? 'text-viking-brown'
                                                    : 'text-viking-brown dark:text-viking-parchment'
                                            }`}>
                                                ❤️ {fullChar?.tokensBlessure ?? sessionChar.tokensBlessure}/5
                                            </span>
                                        )}
                                        {/* Indicateur fatigue compact */}
                                        {(fullChar?.tokensFatigue > 0 || sessionChar.tokensFatigue > 0) && (
                                            <span className={`text-[10px] px-1 rounded bg-amber-500/20 ${
                                                isSelected
                                                    ? 'text-viking-brown'
                                                    : 'text-viking-brown dark:text-viking-parchment'
                                            }`}>
                                                💤 {fullChar?.tokensFatigue ?? sessionChar.tokensFatigue}/9
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* === FICHE DU PERSONNAGE SÉLECTIONNÉ === */}
            {selectedCharacter ? (
                <GMCharacterCard
                    character={selectedCharacter}
                    isOnline={onlineIds.has(selectedCharId)}
                    onUpdateTokens={handleUpdateTokens}
                />
            ) : (
                <div className="bg-white dark:bg-viking-brown rounded-lg shadow-lg border-2 border-viking-bronze p-8 text-center">
                    <p className="text-viking-leather dark:text-viking-bronze">
                        Sélectionnez un personnage ci-dessus pour voir sa fiche.
                    </p>
                </div>
            )}
        </div>
    );
};

export default TabSession;