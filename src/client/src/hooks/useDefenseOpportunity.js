// src/client/src/hooks/useDefenseOpportunity.js
// Hook générique orchestrant l'opportunité de défense côté défenseur.
//
// Machine d'états : idle → defending → submitting → idle
//
// Activé uniquement si combatConfig.attack.defenseOpportunity est défini (non null).
// Pour Vikings (defenseOpportunity: null) → hook est un no-op total.
//
// Déclenché par l'événement socket 'combat-defense-opportunity' émis par le serveur
// sur instruction du GM. Le défenseur répond via POST /combat/defense-response.
//
// Usage :
//   const defense = useDefenseOpportunity({ combatConfig, socket, fetchWithAuth, apiBase });

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * @param {object}   combatConfig   - Config combat complète du slug
 * @param {object}   socket         - Instance socket.io
 * @param {function} fetchWithAuth
 * @param {string}   apiBase        - ex: '/api/vikings'
 */
export function useDefenseOpportunity({
                                          combatConfig,
                                          socket,
                                          fetchWithAuth,
                                          apiBase,
                                          myCombatantId = null,
                                      }) {
    const [step,       setStep]       = useState('idle');    // 'idle' | 'defending' | 'submitting'
    const [attackData, setAttackData] = useState(null);      // données de l'attaque entrante
    const [attackId,   setAttackId]   = useState(null);
    const timeoutRef = useRef(null);

    const defenseConfig = combatConfig?.attack?.defenseOpportunity ?? null;

    // Nettoyage du timeout si le composant se démonte
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // ── Abandon de défense (timeout ou annulation volontaire) ────────────────

    const cancel = useCallback(async () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        // On notifie le serveur que la défense est abandonnée (résultat null)
        if (attackId) {
            try {
                await fetchWithAuth(`${apiBase}/combat/defense-response`, {
                    method: 'POST',
                    body: JSON.stringify({ attackId, defenseResult: null }),
                });
            } catch (err) {
                console.error('[useDefenseOpportunity] Error sending cancel:', err);
            }
        }

        setStep('idle');
        setAttackData(null);
        setAttackId(null);
    }, [attackId, fetchWithAuth, apiBase]);

    // ── Écoute socket — ne s'enregistre que si le slug a une défense ─────────

    useEffect(() => {
        // Si pas de config défense dans ce slug → no-op total
        if (!defenseConfig || !socket) return;

        const handleDefenseOpportunity = ({ attackId: incomingAttackId, attackData: incomingAttackData, targetCombatantId }) => {
            if (myCombatantId && targetCombatantId !== myCombatantId) return;
            if (timeoutRef.current) clearTimeout(timeoutRef.current);

            setAttackId(incomingAttackId);
            setAttackData(incomingAttackData);
            setStep('defending');

            // Timeout automatique configurable dans le slug
            const timeout = defenseConfig.timeoutMs;
            if (timeout && timeout > 0) {
                timeoutRef.current = setTimeout(() => {
                    console.warn('[useDefenseOpportunity] Defense timeout — auto-cancel');
                    cancel();
                }, timeout);
            }
        };

        socket.on('combat-defense-opportunity', handleDefenseOpportunity);

        return () => {
            socket.off('combat-defense-opportunity', handleDefenseOpportunity);
        };
    }, [defenseConfig, socket, cancel]);

    // ── Défense résolue par le joueur ────────────────────────────────────────

    const handleDefenseComplete = useCallback(async (defenseResult) => {
        if (!attackId) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        setStep('submitting');

        try {
            await fetchWithAuth(`${apiBase}/combat/defense-response`, {
                method: 'POST',
                body: JSON.stringify({ attackId, defenseResult }),
            });

            setStep('idle');
            setAttackData(null);
            setAttackId(null);
        } catch (err) {
            console.error('[useDefenseOpportunity] Error sending defense result:', err);
            // On revient à defending pour laisser réessayer
            setStep('defending');
        }
    }, [attackId, fetchWithAuth, apiBase]);

    // ── Si pas de défense dans ce slug → interface vide garantie ────────────

    if (!defenseConfig) {
        return {
            step:                 'idle',
            attackData:           null,
            handleDefenseComplete: () => {},
            cancel:               () => {},
            isActive:             false,
        };
    }

    return {
        step,            // 'idle' | 'defending' | 'submitting'
        attackData,
        handleDefenseComplete,
        cancel,
        isActive: step !== 'idle',
    };
}

export default useDefenseOpportunity;