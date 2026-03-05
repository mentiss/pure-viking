// src/client/src/systems/vikings/components/modals/PostureModal.jsx
// Modal Posture Défensive Vikings.
// Flux :
//   1. Sélection de la compétence CàC (si plusieurs disponibles)
//   2. Sélection du type (passif / actif)
//   3a. Passif → calcul immédiat, activation
//   3b. Actif  → roll diceEngine direct + animation, puis activation

import React, { useState, useRef, useCallback } from 'react';
import { roll }           from '../../../../tools/diceEngine.js';
import vikingsConfig      from '../../config.jsx';
import DiceAnimationOverlay from '../../../../components/shared/DiceAnimationOverlay.jsx';
import { readDiceConfig } from '../../../../components/modals/DiceConfigModal.jsx';
import { useFetch }       from '../../../../hooks/useFetch.js';
import { useSystem }      from '../../../../hooks/useSystem.js';
import {
    getBestCharacteristic,
    getExplosionThreshold,
    getSuccessThreshold,
    getBlessureMalus,
    getFatigueMalus,
} from '../../../../tools/utils.js';

const PostureModal = ({ character, combatant, onClose }) => {
    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();

    // ── Compétences CàC disponibles ──────────────────────────────────────────
    const combatSkills = character.skills?.filter(
        s => (s.name === 'Combat CàC armé' || s.name === 'Combat CàC non armé') && s.specialization != null
    ) ?? [];
    console.log('[PostureModal] combatSkills:', combatSkills, 'all skills:', character.skills);
    // ── États ────────────────────────────────────────────────────────────────
    const [selectedSkill, setSelectedSkill] = useState(combatSkills[0] ?? null);
    const [type,          setType]          = useState('passif');
    const [animationData, setAnimationData] = useState(null);
    const [rollResult,    setRollResult]    = useState(null);
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState(null);

    const pendingResultRef = useRef(null);
    const isBerserk = combatant.activeStates?.some(s => s.id === 'berserk') ?? false;

    // ── Valeur passive calculée ───────────────────────────────────────────────
    const passifValue = selectedSkill
        ? Math.min(3, Math.floor(selectedSkill.level / 2))
        : 0;

    // ── Activation effective (après roll ou directe) ──────────────────────────
    const activate = useCallback(async (postureType, value) => {
        setLoading(true);
        try {
            // 1. Burn d'action
            await fetchWithAuth(`${apiBase}/combat/action`, {
                method: 'POST',
                body:   JSON.stringify({ combatantId: combatant.id }),
            });

            // 2. Ajouter l'état dans activeStates
            const newState = {
                id:   'posture-defensive',
                name: 'Posture Défensive',
                data: { type: postureType, value, skillName: selectedSkill?.name ?? null },
            };
            await fetchWithAuth(`${apiBase}/combat/combatant/${combatant.id}`, {
                method: 'PUT',
                body:   JSON.stringify({
                    updates: {
                        activeStates: [...(combatant.activeStates ?? []), newState],
                    },
                }),
            });

            onClose();
        } catch (err) {
            console.error('[PostureModal] activate error:', err);
            setError('Erreur lors de l\'activation.');
            setLoading(false);
        }
    }, [fetchWithAuth, apiBase, combatant, selectedSkill, onClose]);

    // ── Fin d'animation ───────────────────────────────────────────────────────
    const handleAnimationComplete = useCallback(() => {
        const pending = pendingResultRef.current;
        if (!pending) return;
        pendingResultRef.current = null;
        setAnimationData(null);
        setRollResult(pending.result);
        // On affiche le résultat — l'utilisateur clique "Confirmer"
    }, []);

    // ── Lancer dés (mode actif) ───────────────────────────────────────────────
    const handleRollActif = useCallback(() => {
        if (!selectedSkill) return;

        const bestCarac = getBestCharacteristic(character, selectedSkill);
        const caracLevel = bestCarac?.level ?? 2;

        const ctx = {
            characterId:   character.id,
            characterName: `${character.prenom}${character.surnom ? ` "${character.surnom}"` : ''}`,
            sessionId:     null,
            systemSlug:    'vikings',
            label:         `Posture Défensive — ${selectedSkill.name}`,
            rollType:      'skill',
            declaredMode:  null,
            character,
            systemData: {
                rollType:               'skill',
                selectedCarac:          bestCarac?.name ?? 'force',
                selectedSkill,
                autoSuccesses:          0,
                activeConditionalBonuses: [],
                traitAutoBonus:         0,
                caracLevel,
                tokensBlessure:         combatant.healthData?.tokensBlessure ?? 0,
                tokensFatigue:          combatant.healthData?.tokensFatigue  ?? 0,
                isBerserk,
                sagaActuelle:           character.sagaActuelle ?? 0,
                declaredMode:           null,
            },
        };

        try {
            const engineResult = roll(ctx, vikingsConfig.dice);
            const { animationEnabled } = readDiceConfig();

            if (animationEnabled !== false) {
                pendingResultRef.current = { result: engineResult.result };
                setAnimationData({ animationSequence: engineResult.animationSequence });
            } else {
                setRollResult(engineResult.result);
            }
        } catch (err) {
            setError(err.message ?? 'Erreur lors du jet.');
        }
    }, [character, selectedSkill, combatant, isBerserk]);

    // ── Si animation en cours ─────────────────────────────────────────────────
    if (animationData) {
        return (
            <DiceAnimationOverlay
                animationSequence={animationData.animationSequence}
                onComplete={handleAnimationComplete}
                onSkip={handleAnimationComplete}
            />
        );
    }

    // ── Résultat actif affiché — confirmation ─────────────────────────────────
    if (rollResult) {
        const mr = rollResult.successes ?? 0;
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
                <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-sm w-full border-4 border-viking-bronze p-4"
                     onClick={e => e.stopPropagation()}>
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment mb-4">
                        🛡️ Posture Défensive Active
                    </h3>

                    {/* Résumé dés */}
                    <div className="p-3 bg-viking-bronze/10 rounded mb-4 text-center">
                        <div className="text-2xl font-bold text-viking-brown dark:text-viking-parchment">
                            {mr} succès
                        </div>
                        <div className="flex flex-wrap gap-1 justify-center mt-2">
                            {(rollResult.allDice ?? []).map((v, i) => {
                                const threshold = rollResult.detail?.threshold ?? 7;
                                const isSuccess = v >= threshold;
                                const exploded  = rollResult.flags?.exploded?.includes?.(v);
                                return (
                                    <span key={i} className={`w-8 h-8 flex items-center justify-center rounded font-bold text-sm border-2 ${
                                        exploded  ? 'bg-viking-bronze border-viking-bronze text-viking-brown' :
                                            isSuccess ? 'bg-viking-success border-viking-success text-white' :
                                                'bg-gray-200 dark:bg-gray-700 border-gray-400 text-viking-text dark:text-viking-parchment'
                                    }`}>{v}</span>
                                );
                            })}
                        </div>
                        <div className="text-xs text-viking-leather dark:text-viking-bronze mt-2">
                            {mr > 0
                                ? `+${mr} au seuil des attaquants`
                                : 'Aucun succès — posture inactive'}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button onClick={onClose} disabled={loading}
                                className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment rounded font-semibold hover:bg-gray-400">
                            Annuler
                        </button>
                        <button
                            onClick={() => activate('actif', mr)}
                            disabled={loading || mr === 0}
                            className="flex-1 px-4 py-2 bg-viking-success text-white rounded font-semibold hover:bg-green-700 disabled:opacity-50"
                        >
                            {loading ? 'Activation…' : mr > 0 ? 'Confirmer' : 'Aucun effet'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Formulaire principal ──────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-sm w-full border-4 border-viking-bronze p-4"
                 onClick={e => e.stopPropagation()}>

                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment">
                        🛡️ Posture Défensive
                    </h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather hover:text-viking-danger">✕</button>
                </div>

                {/* Sélection compétence */}
                {combatSkills.length > 0 && (
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                            Compétence
                        </label>
                        <div className="space-y-1">
                            {combatSkills.map(skill => (
                                <button
                                    key={`${skill.name}-${skill.specialization}`}
                                    onClick={() => setSelectedSkill(skill)}
                                    className={`w-full px-3 py-2 rounded text-sm text-left ${
                                        selectedSkill === skill
                                            ? 'bg-viking-bronze text-viking-brown font-semibold'
                                            : 'bg-gray-100 dark:bg-gray-800 text-viking-text dark:text-viking-parchment hover:bg-viking-bronze/30'
                                    }`}
                                >
                                    {skill.name}
                                    {skill.specialization && ` — ${skill.specialization}`}
                                    <span className="ml-2 opacity-70">niv. {skill.level}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sélection type */}
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                        Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {['passif', 'actif'].map(t => (
                            <button key={t} onClick={() => setType(t)}
                                    className={`px-3 py-2 rounded text-sm font-semibold ${
                                        type === t
                                            ? 'bg-viking-bronze text-viking-brown'
                                            : 'bg-gray-200 dark:bg-gray-700 text-viking-text dark:text-viking-parchment'
                                    }`}
                            >
                                {t === 'actif' ? 'Actif (jet)' : 'Passif'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Description */}
                <div className="mb-4 p-3 bg-viking-bronze/10 rounded text-sm text-viking-text dark:text-viking-parchment">
                    {type === 'passif' ? (
                        <>
                            <strong>Passif :</strong> +{passifValue} au seuil des attaquants.
                            {selectedSkill && (
                                <span className="block text-xs mt-1 text-viking-leather dark:text-viking-bronze">
                                    {selectedSkill.name} niv.{selectedSkill.level} → {passifValue} pts
                                </span>
                            )}
                        </>
                    ) : (
                        <><strong>Actif :</strong> Jet de {selectedSkill?.name ?? 'Combat'} — chaque succès augmente le seuil des attaquants de 1.</>
                    )}
                </div>

                {error && (
                    <div className="mb-3 text-xs text-viking-danger bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <button onClick={onClose} disabled={loading}
                            className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment rounded font-semibold hover:bg-gray-400">
                        Annuler
                    </button>
                    <button
                        disabled={loading || !selectedSkill}
                        onClick={() => type === 'passif' ? activate('passif', passifValue) : handleRollActif()}
                        className="flex-1 px-4 py-2 bg-viking-success text-white rounded font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? 'Activation…' : type === 'actif' ? '🎲 Lancer' : 'Activer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostureModal;