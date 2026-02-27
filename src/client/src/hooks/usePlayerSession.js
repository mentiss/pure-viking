// src/client/src/hooks/usePlayerSession.js
// Hook générique qui gère toute la couche socket/session côté joueur.
// Extrait de App.jsx Vikings — aucune logique système dedans.
//
// Responsabilités :
//   - Émettre character-loaded / character-left (présence en ligne)
//   - Écouter character-update → onCharacterUpdate callback
//   - Écouter gm-item-received → onCharacterReload + badge journal
//   - Écouter gm-message-received → badge journal
//   - Charger les sessions du personnage dans SessionContext

import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext.jsx';
import { useSession } from '../context/SessionContext.jsx';
import { useFetch } from './useFetch.js';

/**
 * @param {object|null} character       - personnage actif (null si pas connecté)
 * @param {function}    onCharacterUpdate - callback(updatedCharacter) — mise à jour temps réel
 * @param {function}    onCharacterReload  - callback() — recharger le perso complet depuis l'API
 * @param {string}      apiBase            - ex: '/api/vikings'
 * @returns {{ journalUnread: number, resetJournalUnread: function }}
 */
export function usePlayerSession({ character, onCharacterUpdate, onCharacterReload, apiBase }) {
    const socket = useSocket();
    const { updateCharacterSessions } = useSession();
    const fetchWithAuth = useFetch();
    const [journalUnread, setJournalUnread] = useState(0);

    // ── Charger les sessions du personnage ──────────────────────────────────
    useEffect(() => {
        if (!character?.id || character.id === -1) return;

        fetchWithAuth(`${apiBase}/characters/${character.id}/sessions`)
            .then(r => r.json())
            .then(sessions => updateCharacterSessions(sessions))
            .catch(err => console.error('[usePlayerSession] Error loading sessions:', err));
    }, [character?.id, apiBase]);

    // ── Présence en ligne ───────────────────────────────────────────────────
    useEffect(() => {
        if (!socket || !character?.id) return;

        socket.emit('character-loaded', {
            characterId: character.id,
            name:        character.name ?? `${character.prenom}${character.surnom ? ` "${character.surnom}"` : ''}`,
            playerName:  character.playerName,
            agilite:     character.agilite     ?? 1,
            actionsMax:  character.actionsDisponibles ?? 1,
        });

        return () => {
            socket.emit('character-left', character.id);
        };
    }, [socket, character?.id]);

    // ── Événements temps réel ───────────────────────────────────────────────
    useEffect(() => {
        if (!socket || !character?.id) return;

        // Mise à jour partielle (ex: tokens blessure/fatigue depuis combat)
        const handleCharacterUpdate = (data) => {
            if (String(data.characterId) === String(character.id)) {
                onCharacterUpdate(prev => ({ ...prev, ...data.updates }));
            }
        };

        // Réception d'un objet GM → recharger la fiche complète + badge journal
        const handleGMItemReceived = (data) => {
            if (String(data.characterId) === String(character.id)) {
                onCharacterReload();
                setJournalUnread(n => n + 1);
            }
        };

        // Message GM → badge journal uniquement
        const handleGMMessage = (data) => {
            if (String(data.characterId) === String(character.id)) {
                setJournalUnread(n => n + 1);
            }
        };

        socket.on('character-update',    handleCharacterUpdate);
        socket.on('gm-item-received',    handleGMItemReceived);
        socket.on('gm-message-received', handleGMMessage);

        return () => {
            socket.off('character-update',    handleCharacterUpdate);
            socket.off('gm-item-received',    handleGMItemReceived);
            socket.off('gm-message-received', handleGMMessage);
        };
    }, [socket, character?.id]);

    return {
        journalUnread,
        resetJournalUnread: () => setJournalUnread(0),
    };
}