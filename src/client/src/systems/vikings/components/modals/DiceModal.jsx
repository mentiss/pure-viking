// src/client/src/systems/vikings/components/modals/DiceModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modale lanceur de dés Vikings.
// Responsabilité : UX/UI uniquement.
//   - Construit le RollContext depuis les choix du joueur
//   - Délègue TOUT le calcul à diceEngine (via vikingsConfig.dice)
//   - Gère l'animation via DiceAnimationOverlay
//   - Gère le workflow en 2 phases du jet Héroïque/Épique (confirm SAGA)
//
// Ce composant ne contient AUCUNE logique de dés — elle est dans
// src/client/src/systems/vikings/config.js (hooks dice).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    formatSkillName,
    getBestCharacteristic,
    getExplosionThreshold,
    getSuccessThreshold,
} from '../../../../tools/utils.js';
import getTraitBonuses          from '../../../../tools/traitBonuses.js';
import { CARACNAMES }           from '../../../../tools/data.js';
import { roll, rollWithInsurance, rollSagaBonus, RollError } from '../../../../tools/diceEngine.js';
import vikingsConfig            from '../../config.js';
import DiceAnimationOverlay     from '../../../../components/shared/DiceAnimationOverlay.jsx';
import { readDiceConfig }       from '../../../../components/modals/DiceConfigModal.jsx';
import { useFetch }             from '../../../../hooks/useFetch.js';

const DiceModal = ({ character, isBerserk, context, onClose, onUpdate, sessionId = null }) => {

    // ── État UI ───────────────────────────────────────────────────────────────
    const [rollType,    setRollType]    = useState('carac');
    const [selectedCarac, setSelectedCarac] = useState('force');
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [autoSuccesses, setAutoSuccesses] = useState(0);
    const [sagaMode,    setSagaMode]    = useState(null); // null | 'insurance' | 'heroic' | 'epic'
    const [diceResults, setDiceResults] = useState(null);
    const [rolling,     setRolling]     = useState(false);
    const [animationData, setAnimationData] = useState(null);

    // Confirmation jet SAGA (entre jet initial et jet bonus)
    const [showSagaConfirm, setShowSagaConfirm] = useState(null);

    // Bonus traits
    const [traitAutoBonus,          setTraitAutoBonus]          = useState(0);
    const [conditionalBonuses,      setConditionalBonuses]      = useState([]);
    const [activeConditionalBonuses, setActiveConditionalBonuses] = useState([]);

    const fetchWithAuth = useFetch();

    // Refs pour éviter les stale closures dans les callbacks
    const pendingResultRef = useRef(null);
    const contextRef       = useRef(context);
    useEffect(() => { contextRef.current = context; }, [context]);

    // ── Contexte pré-rempli (depuis la fiche personnage) ─────────────────────
    useEffect(() => {
        if (context?.type === 'carac') {
            setRollType('carac');
            setSelectedCarac(context.data);
        } else if (context?.type === 'skill') {
            setRollType('skill');
            setSelectedSkill(context.data);
        }
    }, [context]);

    // ── Recalcul des bonus traits à chaque changement de cible ───────────────
    useEffect(() => {
        const rollTarget = rollType === 'skill' ? selectedSkill?.name : null;
        const caracUsed  = rollType === 'carac'
            ? selectedCarac
            : (selectedSkill ? getBestCharacteristic(character, selectedSkill).name : null);

        const bonuses    = getTraitBonuses(character, caracUsed, rollTarget);
        setTraitAutoBonus(bonuses.auto);
        const applicable = bonuses.conditional.filter(c => c.applies);
        setConditionalBonuses(applicable);
        setActiveConditionalBonuses([]);
    }, [rollType, selectedCarac, selectedSkill]);

    // ── Envoi API ─────────────────────────────────────────────────────────────
    const sendRollToAPI = useCallback(async (result, notation) => {
        try {
            const characterName = `${character.prenom}${character.surnom ? ` "${character.surnom}"` : ''}`;
            await fetchWithAuth('/api/dice/roll', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id:   character.id,
                    character_name: characterName,
                    session_id:     sessionId,

                    // Format générique
                    notation,
                    roll_result: result,

                    // Format legacy Vikings (rétrocompatibilité historique)
                    roll_type:      result.detail?.rollType || rollType,
                    roll_target:    result.detail?.rollTarget,
                    pool:           result.detail?.pool,
                    threshold:      result.detail?.threshold,
                    results:        result.allDice,
                    successes:      result.successes,
                    saga_spent:     result.meta?.resourceSpent  || 0,
                    saga_recovered: result.meta?.resourceGained || 0,
                })
            });
        } catch (err) {
            console.error('[DiceModal] sendRollToAPI error:', err);
        }
    }, [character, sessionId, rollType, fetchWithAuth]);

    // ── Fin d'animation ───────────────────────────────────────────────────────
    const handleAnimationComplete = useCallback(() => {
        const pending = pendingResultRef.current;
        if (!pending) return;

        if (pending.isSagaPending) {
            // Jet initial terminé → afficher résultat + ouvrir confirmation SAGA
            setDiceResults(pending.engineResult.result);
            setShowSagaConfirm({
                engineResult: pending.engineResult,
                finalTarget:  pending.finalTarget,
                sagaMode:     pending.sagaMode,
            });
        } else {
            // Jet normal ou bonus SAGA : afficher + envoyer API
            setDiceResults(pending.engineResult.result);
            sendRollToAPI(pending.engineResult.result, pending.engineResult.notation);
            contextRef.current?.onRollComplete?.(pending.engineResult.result);
        }

        pendingResultRef.current = null;
        setAnimationData(null);
        setRolling(false);
    }, [sendRollToAPI]);

    // ── Helper : déclenche animation ou court-circuite ────────────────────────
    const triggerAnimation = useCallback((engineResult, options = {}) => {
        const { animationEnabled } = readDiceConfig();

        if (animationEnabled !== false) {
            pendingResultRef.current = { engineResult, ...options };
            setAnimationData({ animationSequence: engineResult.animationSequence });
        } else {
            // Résultat instantané
            if (options.isSagaPending) {
                setDiceResults(engineResult.result);
                setShowSagaConfirm({
                    engineResult,
                    finalTarget: options.finalTarget,
                    sagaMode:    options.sagaMode,
                });
            } else {
                setDiceResults(engineResult.result);
                sendRollToAPI(engineResult.result, engineResult.notation);
                contextRef.current?.onRollComplete?.(engineResult.result);
            }
            setRolling(false);
        }
    }, [sendRollToAPI]);

    // ── Lancer les dés ────────────────────────────────────────────────────────
    const handleRoll = () => {
        setRolling(true);
        setDiceResults(null);

        // Construction du RollContext
        const ctx = {
            characterId:   character.id,
            characterName: `${character.prenom}${character.surnom ? ` "${character.surnom}"` : ''}`,
            sessionId,
            systemSlug:    'vikings',
            label:         rollType === 'skill' && selectedSkill
                ? formatSkillName(selectedSkill)
                : CARACNAMES[selectedCarac] || selectedCarac,
            rollType,
            declaredMode: sagaMode,
            character,      // objet complet pour les hooks
            systemData: {
                rollType,
                selectedCarac,
                selectedSkill,
                autoSuccesses,
                activeConditionalBonuses,
                traitAutoBonus,
                caracLevel: rollType === 'carac'
                    ? (character[selectedCarac] || 2)
                    : (selectedSkill ? getBestCharacteristic(character, selectedSkill).level : 2),
                skillLevel:     selectedSkill?.level || 0,
                tokensBlessure: character.tokensBlessure,
                tokensFatigue:  character.tokensFatigue,
                isBerserk,
                sagaActuelle:   character.sagaActuelle,
                declaredMode:   sagaMode,
            },
        };

        try {
            let engineResult;

            // ── Assurance ─────────────────────────────────────────────────────
            if (sagaMode === 'insurance') {
                engineResult = rollWithInsurance(ctx, vikingsConfig.dice);

                // Dépenser SAGA immédiatement (avant animation)
                onUpdate({ ...character, sagaActuelle: character.sagaActuelle - 1, sagaTotale: character.sagaTotale + 1 });

                triggerAnimation(engineResult);
                return;
            }

            // ── Jet normal ────────────────────────────────────────────────────
            engineResult = roll(ctx, vikingsConfig.dice);

            // Dépenser points compétence si succès auto
            if (rollType === 'skill' && selectedSkill && autoSuccesses > 0) {
                const newSkills = character.skills.map(s =>
                    (s.name === selectedSkill.name && s.specialization === selectedSkill.specialization)
                        ? { ...s, currentPoints: Math.max(0, s.currentPoints - autoSuccesses) }
                        : s
                );
                onUpdate({ ...character, skills: newSkills });
                setSelectedSkill(prev => prev
                    ? { ...prev, currentPoints: Math.max(0, prev.currentPoints - autoSuccesses) }
                    : prev
                );
            }

            // ── Héroïque / Épique ─────────────────────────────────────────────
            // Si le joueur a déclaré un mode Saga ET atteint 3 succès → phase 2
            if ((sagaMode === 'heroic' || sagaMode === 'epic')
                && character.sagaActuelle >= 1
                && engineResult.result.successes >= 3) {

                const finalTarget = sagaMode === 'heroic' ? 4 : 5;
                triggerAnimation(engineResult, {
                    isSagaPending: true,
                    finalTarget,
                    sagaMode,
                });
                return;
            }

            // Jet normal sans saga
            triggerAnimation(engineResult);

        } catch (err) {
            if (err instanceof RollError) {
                setDiceResults({ error: true, message: err.message });
            } else {
                console.error('[DiceModal] handleRoll error:', err);
                setDiceResults({ error: true, message: 'Erreur inattendue lors du jet.' });
            }
            setRolling(false);
        }
    };

    // ── Confirmation jet SAGA ─────────────────────────────────────────────────
    const confirmSagaRoll = () => {
        if (!showSagaConfirm) return;

        const { engineResult: baseEngineResult, finalTarget, sagaMode: mode } = showSagaConfirm;
        setShowSagaConfirm(null);
        setRolling(true);

        try {
            // Construire le contexte pour le jet bonus
            const bonusCtx = {
                ...baseEngineResult.result,
                systemData: { sagaMode: mode },
            };

            const bonusEngineResult = rollSagaBonus(
                baseEngineResult.result,
                bonusCtx,
                vikingsConfig.dice,
                finalTarget
            );

            // Consommer ou récupérer Saga selon résultat
            const sagaMeta = bonusEngineResult.result.meta;
            if (sagaMeta.sagaSuccess) {
                // Saga récupérée
                onUpdate({ ...character, sagaActuelle: character.sagaActuelle });
            } else {
                // Saga perdue
                onUpdate({ ...character, sagaActuelle: character.sagaActuelle - 1, sagaTotale: character.sagaTotale + 1 });
            }

            triggerAnimation(bonusEngineResult);

        } catch (err) {
            console.error('[DiceModal] confirmSagaRoll error:', err);
            setRolling(false);
        }
    };

    const cancelSagaRoll = () => {
        if (!showSagaConfirm) return;
        setDiceResults(showSagaConfirm.engineResult.result);
        setShowSagaConfirm(null);
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    const caracOptions = ['force', 'agilite', 'perception', 'intelligence', 'charisme', 'chance'];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-2xl w-full border-4 border-viking-bronze max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b-2 border-viking-bronze flex justify-between items-center sticky top-0 bg-white dark:bg-viking-brown z-10">
                    <h3 className="text-lg font-viking font-bold text-viking-brown dark:text-viking-parchment">🎲 Lanceur de dés</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>

                <div className="p-4 space-y-4">

                    {/* Type de jet */}
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Type</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRollType('carac')}
                                className={`flex-1 px-4 py-2 rounded text-sm font-semibold ${rollType === 'carac' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}
                            >Caractéristique</button>
                            <button
                                onClick={() => setRollType('skill')}
                                className={`flex-1 px-4 py-2 rounded text-sm font-semibold ${rollType === 'skill' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}
                            >Compétence</button>
                        </div>
                    </div>

                    {/* Sélection caractéristique */}
                    {rollType === 'carac' && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Caractéristique</label>
                            <div className="grid grid-cols-3 gap-2">
                                {caracOptions.map(carac => {
                                    const level     = character[carac] || 2;
                                    const explThres = getExplosionThreshold(level);
                                    return (
                                        <button
                                            key={carac}
                                            onClick={() => setSelectedCarac(carac)}
                                            className={`px-2 py-2 rounded text-xs font-semibold ${selectedCarac === carac ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}
                                        >
                                            <div>{CARACNAMES[carac]}</div>
                                            <div className="text-xs opacity-75">Niv.{level} — Exp:{explThres.join(',')}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Sélection compétence */}
                    {rollType === 'skill' && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Compétence</label>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {(character.skills || []).map((skill, idx) => {
                                    const bestCarac = getBestCharacteristic(character, skill);
                                    const threshold = getSuccessThreshold(skill.level);
                                    const isSelected = selectedSkill?.name === skill.name
                                        && selectedSkill?.specialization === skill.specialization;
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedSkill(skill)}
                                            className={`w-full px-3 py-2 rounded text-xs text-left ${isSelected ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}
                                        >
                                            <span className="font-semibold">{formatSkillName(skill)}</span>
                                            <span className="ml-2 opacity-75">Niv.{skill.level} — Seuil:{threshold}+ — {bestCarac.name}</span>
                                            {skill.currentPoints > 0 && (
                                                <span className="ml-2 text-viking-bronze">({skill.currentPoints} pts)</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Succès automatiques (compétence comme ressource) */}
                    {rollType === 'skill' && selectedSkill && selectedSkill.currentPoints > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                                Succès automatiques (max {selectedSkill.currentPoints} pts)
                            </label>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setAutoSuccesses(Math.max(0, autoSuccesses - 1))} className="px-3 py-1 bg-viking-leather text-white rounded">−</button>
                                <span className="font-bold text-viking-brown dark:text-viking-parchment">{autoSuccesses}</span>
                                <button onClick={() => setAutoSuccesses(Math.min(selectedSkill.currentPoints, autoSuccesses + 1))} className="px-3 py-1 bg-viking-leather text-white rounded">+</button>
                            </div>
                        </div>
                    )}

                    {/* Bonus conditionnels traits */}
                    {conditionalBonuses.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Bonus situationnels (traits)</label>
                            <div className="space-y-1">
                                {conditionalBonuses.map(cond => {
                                    const isActive = activeConditionalBonuses.some(
                                        b => b.name === cond.name && b.condition === cond.condition
                                    );
                                    return (
                                        <button
                                            key={`${cond.name}-${cond.condition}`}
                                            onClick={() => {
                                                if (isActive) setActiveConditionalBonuses(prev => prev.filter(b => !(b.name === cond.name && b.condition === cond.condition)));
                                                else setActiveConditionalBonuses(prev => [...prev, cond]);
                                            }}
                                            className={`w-full px-3 py-2 rounded text-sm text-left border-2 ${isActive ? 'bg-viking-bronze text-viking-brown border-viking-leather' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment border-viking-leather/30 dark:border-viking-bronze/30 hover:border-viking-bronze'}`}
                                        >
                                            <div className="font-semibold flex justify-between">
                                                <span>{cond.name}</span>
                                                <span className={isActive ? 'text-viking-leather' : 'text-viking-bronze'}>{cond.bonus > 0 ? '+' : ''}{cond.bonus}</span>
                                            </div>
                                            <div className="text-xs opacity-75 mt-1">{cond.condition}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Modes SAGA */}
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                            Modes SAGA (SAGA: {character.sagaActuelle})
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: null,        label: 'Normal',          icon: '' },
                                { value: 'heroic',    label: '🔥 Héroïque (4)', icon: '' },
                                { value: 'epic',      label: '⚡ Épique (5)',    icon: '' },
                                { value: 'insurance', label: '🛡️ Assurance',   icon: '' },
                            ].map(({ value, label }) => (
                                <button
                                    key={String(value)}
                                    onClick={() => setSagaMode(value)}
                                    disabled={value !== null && character.sagaActuelle < 1}
                                    className={`px-3 py-2 rounded text-xs font-semibold disabled:opacity-30 ${sagaMode === value ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {sagaMode && (
                            <div className="text-xs text-viking-leather dark:text-viking-bronze mt-2">
                                {sagaMode === 'heroic'    && '3+ succès → dépense 1 SAGA → 3d10 bonus (seuil 7+). Si total ≥4 : SAGA revient.'}
                                {sagaMode === 'epic'      && '3+ succès → dépense 1 SAGA → 3d10 bonus (seuil 7+). Si total ≥5 : SAGA revient.'}
                                {sagaMode === 'insurance' && '1 SAGA perdue avant → 2 lancers, garde le meilleur.'}
                            </div>
                        )}
                    </div>

                    {/* Bouton lancer */}
                    <div className="pt-2">
                        {diceResults?.error && (
                            <div className="mb-3 p-3 bg-viking-danger/20 border border-viking-danger rounded text-sm text-viking-danger font-semibold">
                                {diceResults.message}
                            </div>
                        )}
                        <button
                            onClick={handleRoll}
                            disabled={rolling || (rollType === 'skill' && !selectedSkill)}
                            className={`w-full py-3 rounded-lg font-bold text-lg ${rolling || (rollType === 'skill' && !selectedSkill) ? 'bg-gray-400 cursor-not-allowed' : 'bg-viking-bronze hover:bg-viking-leather text-viking-brown'}`}
                        >
                            {rolling ? '🎲 Lancer...' : '🎲 Lancer !'}
                        </button>
                    </div>

                    {/* Résultats */}
                    {diceResults && !diceResults.error && (
                        <DiceResults results={diceResults} />
                    )}
                </div>

                {/* Modal confirmation SAGA */}
                {showSagaConfirm && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={cancelSagaRoll}>
                        <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze p-6 m-4" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment mb-4">
                                {showSagaConfirm.sagaMode === 'heroic' ? '🔥 Jet Héroïque' : '⚡ Jet Épique'}
                            </h3>
                            <div className="space-y-3 text-sm text-viking-text dark:text-viking-parchment">
                                <p>Vous avez obtenu <span className="font-bold text-viking-bronze">{showSagaConfirm.engineResult.result.successes} succès</span>.</p>
                                <p>Voulez-vous dépenser <span className="font-bold text-viking-bronze">1 point de SAGA</span> pour lancer 3d10 bonus (seuil 7+) ?</p>
                                <p className="text-xs text-viking-leather dark:text-viking-bronze">Objectif : {showSagaConfirm.finalTarget} succès total. Si réussi, SAGA revient.</p>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={cancelSagaRoll} className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold">Non</button>
                                <button onClick={confirmSagaRoll} className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather">Oui, dépenser SAGA</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Overlay animation 3D */}
                {animationData && (
                    <DiceAnimationOverlay
                        animationSequence={animationData.animationSequence}
                        onComplete={handleAnimationComplete}
                        onSkip={handleAnimationComplete}
                    />
                )}
            </div>
        </div>
    );
};

// ─── Sous-composant : affichage des résultats ─────────────────────────────────

const DiceResults = ({ results }) => {
    const { detail, successes, meta, flags } = results;
    if (!detail) return null;

    const isInsurance = !!meta?.keptRoll;
    const hasSagaBonus = meta?.bonusRoll != null;

    return (
        <div className="p-4 bg-viking-parchment dark:bg-gray-800 rounded-lg border-2 border-viking-bronze space-y-3">

            {/* Assurance : affiche les 2 pools */}
            {isInsurance && meta.secondRoll ? (
                <>
                    <div className="text-xs font-semibold mb-2 text-viking-brown dark:text-viking-parchment">🛡️ Assurance : 2 lancers</div>
                    {(() => {
                        // results = kept, meta.secondRoll = discarded
                        // On remet dans l'ordre chronologique : jet1 et jet2
                        const jet1 = meta.keptRoll === 1 ? results : meta.secondRoll;
                        const jet2 = meta.keptRoll === 2 ? results : meta.secondRoll;
                        return [jet1, jet2].map((r, i) => {
                            const isKept = meta.keptRoll === (i + 1);
                            return (
                                <div key={i} className={`p-2 rounded ${isKept ? 'bg-viking-success/20 border-2 border-viking-success' : 'opacity-50'}`}>
                                    <div className="text-xs font-semibold mb-1 text-viking-brown dark:text-viking-parchment">
                                        Jet {i + 1} : {r.successes} succès {isKept && '✅ GARDÉ'}
                                    </div>
                                    <DiceRow dice={r.allDice || []} threshold={detail.threshold} explosionThresholds={detail.explosionThresholds} />
                                </div>
                            );
                        });
                    })()}
                </>
            ) : (
                <>
                    <div className="text-xs font-semibold mb-2 text-viking-brown dark:text-viking-parchment">Dés lancés :</div>
                    <DiceRow dice={results.allDice} threshold={detail.threshold} explosionThresholds={detail.explosionThresholds} />
                </>
            )}

            {/* Jet bonus SAGA */}
            {hasSagaBonus && meta.bonusRoll && (
                <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded border border-amber-400">
                    <div className="text-xs font-semibold mb-1 text-amber-700 dark:text-amber-300">
                        ✨ Jet SAGA bonus : {meta.bonusSuccesses} succès
                    </div>
                    <DiceRow dice={meta.bonusRoll.allDice || []} threshold={7} explosionThresholds={[10]} />
                    {meta.failReason && (
                        <div className="text-xs text-viking-danger mt-1">{meta.failReason}</div>
                    )}
                </div>
            )}

            {/* Total succès */}
            <div className="text-center pt-2 border-t border-viking-bronze/30">
                <div className="text-2xl font-bold text-viking-brown dark:text-viking-parchment">
                    {successes} succès
                </div>
                {detail && (
                    <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1 space-y-0.5">
                        <div>Base : {detail.baseSuccesses} | Auto : {detail.autoSuccesses} | Traits : {detail.traitBonus > 0 ? '+' : ''}{detail.traitBonus}</div>
                        {detail.fatigueMalus > 0 && <div>Malus fatigue : −{detail.fatigueMalus}</div>}
                        {detail.blessureMalus > 0 && <div>Malus blessure : −{detail.blessureMalus} dés</div>}
                        <div>Seuil : {detail.threshold}+ | Pool : {detail.pool}d10</div>
                        {detail.rollTarget && <div>Cible : {detail.rollTarget}</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

const DiceRow = ({ dice, threshold, explosionThresholds }) => (
    <div className="flex flex-wrap gap-2 justify-center">
        {(dice || []).map((die, idx) => {
            const isSuccess   = die >= threshold;
            const isExplosion = (explosionThresholds || []).includes(die);
            return (
                <div
                    key={idx}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border-2 ${
                        isExplosion
                            ? 'bg-viking-bronze border-viking-bronze text-viking-brown'
                            : isSuccess
                                ? 'bg-viking-success border-viking-success text-white'
                                : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-viking-text dark:text-viking-parchment'
                    }`}
                >
                    {die}
                </div>
            );
        })}
    </div>
);

export default DiceModal;