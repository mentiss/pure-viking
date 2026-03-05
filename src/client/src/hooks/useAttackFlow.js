// src/client/src/hooks/useAttackFlow.js
// Hook générique orchestrant le flow d'attaque côté attaquant.
//
// Machine d'états : idle → rolling → targeting → submitting → idle
//
// Le slug injecte sa logique via attackConfig (extrait de combatConfig.attack).
// Ce hook ne connaît aucune règle métier — il orchestre uniquement les transitions.
//
// Usage :
//   const flow = useAttackFlow({ character, combatant, combatState, attackConfig, fetchWithAuth, apiBase });

import { useState, useCallback } from 'react';

/**
 * @param {object} character      - Personnage complet du joueur attaquant
 * @param {object} combatant      - Combattant actif (depuis combatState)
 * @param {object} combatState    - État combat complet
 * @param {object} attackConfig   - combatConfig.attack du slug
 * @param {function} fetchWithAuth
 * @param {string}   apiBase      - ex: '/api/vikings'
 */
export function useAttackFlow({
                                  character,
                                  combatant,
                                  combatState,
                                  attackConfig,
                                  fetchWithAuth,
                                  apiBase,
                              }) {
    const [step,           setStep]           = useState('idle');
    const [rollResult,     setRollResult]     = useState(null);
    const [selectedWeapon, setSelectedWeapon] = useState(null);
    const [error,          setError]          = useState(null);

    // ── Lancer le flow ───────────────────────────────────────────────────────

    const startAttack = useCallback(() => {
        setRollResult(null);
        setError(null);

        // Init arme par défaut si le slug fournit getWeapons
        if (attackConfig?.getWeapons) {
            const weapons = attackConfig.getWeapons(character);
            setSelectedWeapon(weapons?.[0] ?? null);
        }

        // Si un step de dés est défini → étape rolling, sinon sauter à targeting
        if (attackConfig?.renderRollStep) {
            setStep('rolling');
        } else {
            setStep('targeting');
        }
    }, [character, attackConfig]);

    // ── Jet de dés terminé ───────────────────────────────────────────────────

    const onRollDone = useCallback((result) => {
        setRollResult(result);
        setStep('rolled'); // ← reste sur la DiceModal pour voir les résultats
    }, []);

    // Appelé par le bouton "Continuer" dans renderRollStep
    const proceedToTargeting = useCallback(() => {
        setStep('targeting');
    }, []);

    // ── Cible confirmée : soumettre l'attaque ────────────────────────────────

    const handleTargetConfirm = useCallback(async (target, finalDamage) => {
        console.log('[useAttackFlow] handleTargetConfirm called', { target, finalDamage, combatant, apiBase });
        if (!combatant) return;
        setStep('submitting');
        setError(null);

        try {
            // 1. Décrémenter actionsRemaining (générique)
            await fetchWithAuth(`${apiBase}/combat/action`, {
                method: 'POST',
                body: JSON.stringify({ combatantId: combatant.id }),
            });

            // 2. Effet secondaire slug après burn d'action (optionnel)
            if (attackConfig?.onBurnAction) {
                await attackConfig.onBurnAction({
                    combatant,
                    fetchWithAuth,
                    apiBase,
                });
            }

            // 3. Soumettre l'attaque dans la file GM
            await fetchWithAuth(`${apiBase}/combat/submit-attack`, {
                method: 'POST',
                body: JSON.stringify({
                    attack: {
                        attackerId:   combatant.id,
                        attackerName: combatant.name,
                        targetId:     target.id,
                        targetName:   target.name,
                        weapon:       selectedWeapon,
                        damage:       finalDamage,
                        rollResult,
                    },
                }),
            });

            setStep('idle');
        } catch (err) {
            console.error('[useAttackFlow] Error submitting attack:', err);
            setError(err.message ?? 'Erreur lors de la soumission de l\'attaque');
            setStep('targeting'); // on revient à targeting pour laisser réessayer
        }
    }, [combatant, selectedWeapon, rollResult, attackConfig, fetchWithAuth, apiBase]);

    // ── Annuler le flow ──────────────────────────────────────────────────────

    const cancel = useCallback(() => {
        setStep('idle');
        setRollResult(null);
        setError(null);
    }, []);

    return {
        step,            // 'idle' | 'rolling' | 'targeting' | 'submitting'
        rollResult,
        selectedWeapon,
        setSelectedWeapon,
        error,
        startAttack,
        onRollDone,
        proceedToTargeting,
        handleTargetConfirm,
        cancel,
    };
}

export default useAttackFlow;