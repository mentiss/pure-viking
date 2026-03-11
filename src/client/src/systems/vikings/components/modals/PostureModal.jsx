// src/client/src/systems/vikings/components/modals/PostureModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modale posture défensive active Vikings — VERSION v2 (diceEngine async).
//
// Suppressions par rapport à v1 :
//   - Plus de DiceAnimationOverlay local (singleton dans PlayerPage)
//   - Plus de pendingResultRef / animationData
//   - roll() est maintenant async (animation + persist inclus)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import {
    getBestCharacteristic,
    getExplosionThreshold,
    getSuccessThreshold,
    getBlessureMalus,
    getFatigueMalus,
    formatSkillName,
} from '../../../../tools/utils.js';
import { roll, RollError } from '../../../../tools/diceEngine.js';
import vikingsConfig       from '../../config.jsx';
import { useFetch }        from '../../../../hooks/useFetch.js';
import { useSystem }       from '../../../../hooks/useSystem.js';

const PostureModal = ({
                          character,
                          combatant,
                          isBerserk = false,
                          onClose,
                          onActivatePosture, // (mode, successes) => void
                          sessionId = null,
                      }) => {
    const [rollResult, setRollResult] = useState(null);
    const [rolling,    setRolling]    = useState(false);
    const [error,      setError]      = useState(null);

    // Compétences défensives disponibles
    const defensiveSkills = (character.skills || []).filter(s =>
        ['Esquive', 'Parade', 'Combat CàC armé'].includes(s.name) && s.level > 0
    );
    const [selectedSkill, setSelectedSkill] = useState(defensiveSkills[0] ?? null);

    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();

    const handleRollActif = useCallback(async () => {
        if (rolling || !selectedSkill) return;
        setRolling(true);
        setError(null);

        try {
            const caracLevel = getBestCharacteristic(character, selectedSkill).level;

            const ctx = {
                apiBase,
                fetchFn:       fetchWithAuth,
                characterId:   character.id,
                characterName: `${character.prenom}${character.surnom ? ` "${character.surnom}"` : ''}`,
                sessionId,
                rollType:      'vikings_posture',
                label:         'Posture Défensive Active',
                character,
                systemData: {
                    rollType:       'skill',
                    selectedCarac:  null,
                    selectedSkill,
                    autoSuccesses:  0,
                    activeConditionalBonuses: [],
                    traitAutoBonus: 0,
                    caracLevel,
                    threshold:      getSuccessThreshold(selectedSkill.level),
                    skillLevel:     selectedSkill.level,
                    tokensBlessure: combatant.healthData?.tokensBlessure ?? 0,
                    tokensFatigue:  combatant.healthData?.tokensFatigue  ?? 0,
                    isBerserk,
                    sagaActuelle:   character.sagaActuelle ?? 0,
                    declaredMode:   null,
                },
            };

            const notation = vikingsConfig.dice.buildNotation(ctx);
            // await : animation + persist inclus dans roll()
            const result   = await roll(notation, ctx, vikingsConfig.dice);

            setRollResult(result);

        } catch (err) {
            setError(err instanceof RollError ? err.message : 'Erreur lors du jet.');
            console.error('[PostureModal]', err);
        } finally {
            setRolling(false);
        }
    }, [rolling, selectedSkill, character, combatant, isBerserk, sessionId, apiBase, fetchWithAuth]);

    // ── Résultat affiché ──────────────────────────────────────────────────────
    if (rollResult) {
        const successes = rollResult.successes ?? 0;
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
                <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-sm w-full border-4 border-viking-bronze p-4"
                     onClick={e => e.stopPropagation()}>

                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment mb-4">
                        🛡️ Posture Défensive Active
                    </h3>

                    <div className="p-3 bg-viking-bronze/10 rounded mb-4 text-center">
                        <div className="text-2xl font-bold text-viking-brown dark:text-viking-parchment">
                            {successes} succès
                        </div>
                        <div className="flex flex-wrap gap-1 justify-center mt-2">
                            {(rollResult.allDice ?? []).map((v, i) => {
                                const threshold = rollResult.detail?.threshold ?? 7;
                                const isSuccess = v >= threshold;
                                const isExploded = rollResult.flags?.exploded?.includes?.(v);
                                return (
                                    <span key={i} className={`w-9 h-9 rounded flex items-center justify-center font-bold text-sm border-2 ${
                                        isExploded
                                            ? 'bg-orange-500 text-white border-orange-700'
                                            : isSuccess
                                                ? 'bg-green-600 text-white border-green-800'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-400'
                                    }`}>
                                        {v}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => onActivatePosture('actif', successes)}
                            className="flex-1 py-2 rounded bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700"
                        >
                            ✅ Activer ({successes} succès)
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 rounded bg-gray-200 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment font-semibold text-sm"
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Formulaire ────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-sm w-full border-4 border-viking-bronze p-4"
                 onClick={e => e.stopPropagation()}>

                <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment mb-4">
                    🛡️ Posture Défensive
                </h3>

                {error && (
                    <div className="p-2 mb-3 bg-red-100 dark:bg-red-900/30 border border-red-400 rounded text-red-700 dark:text-red-300 text-xs">
                        ⚠️ {error}
                    </div>
                )}

                {/* Sélection compétence défensive */}
                {defensiveSkills.length > 1 && (
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                            Compétence
                        </label>
                        <div className="space-y-1">
                            {defensiveSkills.map((skill, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedSkill(skill)}
                                    className={`w-full px-3 py-1.5 rounded text-xs text-left font-semibold ${
                                        selectedSkill?.name === skill.name
                                            ? 'bg-viking-bronze text-viking-brown'
                                            : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'
                                    }`}
                                >
                                    {formatSkillName(skill)} — seuil {getSuccessThreshold(skill.level)}+
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!selectedSkill && (
                    <div className="text-sm text-viking-leather dark:text-viking-bronze mb-4">
                        Aucune compétence défensive disponible.
                    </div>
                )}

                <div className="flex gap-2">
                    <button
                        onClick={handleRollActif}
                        disabled={rolling || !selectedSkill}
                        className="flex-1 py-2 rounded bg-viking-bronze text-viking-brown font-semibold text-sm hover:bg-viking-leather hover:text-viking-parchment disabled:opacity-50"
                    >
                        {rolling ? '⏳ Jet…' : '🎲 Lancer'}
                    </button>
                    <button
                        onClick={() => onActivatePosture('passive', 0)}
                        className="flex-1 py-2 rounded bg-gray-200 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment font-semibold text-sm"
                    >
                        Posture passive
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostureModal;