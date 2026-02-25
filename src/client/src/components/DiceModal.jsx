// DiceModal.jsx - Modale lanceur de dés avec JETS SAGA + Animation 3D
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    countSuccesses, formatSkillName,
    getBestCharacteristic, getBlessureMalus,
    getExplosionThreshold, getFatigueMalus,
    getSuccessThreshold,
    rollDiceWithSequence,
} from "../tools/utils.js";
import getTraitBonuses from "../tools/traitBonuses.js";
import { CARACNAMES } from "../tools/data.js";
import DiceAnimationOverlay from "./shared/DiceAnimationOverlay.jsx";
import { readDiceConfig } from "./shared/DiceConfigModal.jsx";

const DiceModal = ({ character, isBerserk, context, onClose, onUpdate, sessionId = null }) => {

    const [rollType, setRollType] = useState('carac');
    const [selectedCarac, setSelectedCarac] = useState('force');
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [autoSuccesses, setAutoSuccesses] = useState(0);
    const [sagaMode, setSagaMode] = useState(null);
    const [diceResults, setDiceResults] = useState(null);
    const [rolling, setRolling] = useState(false);
    const [showSagaConfirm, setShowSagaConfirm] = useState(null);
    const [animationData, setAnimationData] = useState(null);

    // Bonus traits
    const [traitAutoBonus, setTraitAutoBonus] = useState(0);
    const [conditionalBonuses, setConditionalBonuses] = useState([]);
    const [activeConditionalBonuses, setActiveConditionalBonuses] = useState([]);

    // Ref pour éviter le stale closure dans handleAnimationComplete
    const pendingResultRef = useRef(null);
    // Ref pour le context.onRollComplete (stable)
    const contextRef = useRef(context);
    useEffect(() => { contextRef.current = context; }, [context]);

    // ─── Envoi API ───────────────────────────────────────────────────────────
    const sendRollToAPI = async (rollData) => {
        try {
            const characterName = `${character.prenom}${character.surnom ? ' "' + character.surnom + '"' : ''}`;
            await fetch('/api/dice/roll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id: character.id,
                    character_name: characterName,
                    session_id: sessionId,
                    roll_type: rollType,
                    roll_target: rollData.roll_target,
                    pool: rollData.pool,
                    threshold: rollData.threshold,
                    results: rollData.rolls,
                    successes: rollData.totalSuccesses,
                    saga_spent: rollData.sagaSpent || 0,
                    saga_recovered: rollData.sagaRecovered || 0
                })
            });
        } catch (error) {
            console.error('Error sending roll to API:', error);
        }
    };

    // ─── Fin d'animation : lit depuis la ref, pas depuis un state ────────────
    const handleAnimationComplete = useCallback(() => {
        const pending = pendingResultRef.current;
        if (!pending) return;

        if (pending.isSagaPending) {
            // Jet initial terminé → afficher résultat + ouvrir confirmation SAGA
            setDiceResults(pending.diceResults);
            setShowSagaConfirm(pending.sagaData);
        } else {
            // Jet normal ou bonus SAGA : afficher résultat + envoyer API
            setDiceResults(pending.diceResults);
            if (pending.apiPayload) {
                sendRollToAPI(pending.apiPayload);
            }
            if (contextRef.current?.onRollComplete) {
                contextRef.current.onRollComplete(pending.diceResults);
            }
        }

        pendingResultRef.current = null;
        setAnimationData(null);
        setRolling(false);
    }, []); // Pas de dépendances — on lit tout depuis les refs

    // ─── Contexte ────────────────────────────────────────────────────────────
    useEffect(() => {
        if (context?.type === 'carac') {
            setRollType('carac');
            setSelectedCarac(context.data);
        } else if (context?.type === 'skill') {
            setRollType('skill');
            setSelectedSkill(context.data);
        }
    }, [context]);

    // ─── Bonus traits ─────────────────────────────────────────────────────────
    useEffect(() => {
        const rollTarget = rollType === 'skill' ? selectedSkill?.name : null;
        const caracUsed = rollType === 'carac' ? selectedCarac : (selectedSkill ? getBestCharacteristic(character, selectedSkill).name : null);
        const bonuses = getTraitBonuses(character, caracUsed, rollTarget);
        setTraitAutoBonus(bonuses.auto);
        const applicable = bonuses.conditional.filter(c => c.applies);
        setConditionalBonuses(applicable);
        setActiveConditionalBonuses([]);
    }, [rollType, selectedCarac, selectedSkill]);

    // ─── Helper : lance l'animation (ou court-circuite si désactivée) ────────
    const triggerAnimation = (sequences, pending) => {
        const { animationEnabled } = readDiceConfig();

        if (animationEnabled !== false) {
            // Animation 3D normale
            pendingResultRef.current = pending;
            setAnimationData({ sequences });
            // rolling reste à true jusqu'à handleAnimationComplete
        } else {
            // Résultat instantané — simuler la fin d'animation
            if (pending.isSagaPending) {
                setDiceResults(pending.diceResults);
                setShowSagaConfirm(pending.sagaData);
            } else {
                setDiceResults(pending.diceResults);
                if (pending.apiPayload) sendRollToAPI(pending.apiPayload);
                if (contextRef.current?.onRollComplete) {
                    contextRef.current.onRollComplete(pending.diceResults);
                }
            }
            setRolling(false);
        }
    };

    // ─── Lancer les dés ──────────────────────────────────────────────────────
    const handleRoll = async () => {
        setRolling(true);

        let pool = 3;
        let threshold = 7;
        let explosionThresholds = [10];
        let caracUsed = null;

        if (rollType === 'carac') {
            const level = character[selectedCarac] || 2;
            explosionThresholds = getExplosionThreshold(level);
            caracUsed = { name: selectedCarac, level };
        } else if (selectedSkill) {
            const bestCarac = getBestCharacteristic(character, selectedSkill);
            threshold = getSuccessThreshold(selectedSkill.level);
            explosionThresholds = getExplosionThreshold(bestCarac.level);
            caracUsed = bestCarac;
        }

        const blessureMalus = isBerserk ? 0 : getBlessureMalus(character.tokensBlessure);
        if (character.tokensBlessure === 5) {
            setDiceResults({ error: true, message: 'Impossible : KO / Mourant !' });
            setRolling(false);
            return;
        }
        pool = Math.max(1, pool - blessureMalus);

        // ── ASSURANCE ────────────────────────────────────────────────────────
        if (sagaMode === 'insurance' && character.sagaActuelle >= 1) {
            const { rolls: roll1, sequence: seq1 } = rollDiceWithSequence(pool, explosionThresholds);
            const { rolls: roll2, sequence: seq2 } = rollDiceWithSequence(pool, explosionThresholds);
            const succ1 = countSuccesses(roll1, threshold);
            const succ2 = countSuccesses(roll2, threshold);
            const bestRoll = succ1 >= succ2 ? roll1 : roll2;
            const baseSuccesses = Math.max(succ1, succ2);
            const fatigueMalus = character.traits.some(t => t.name === 'Infatigable') ? 0 : getFatigueMalus(character.tokensFatigue);
            const activeCondBonus = activeConditionalBonuses.reduce((sum, b) => sum + b.bonus, 0);
            const totalTraitBonus = traitAutoBonus + activeCondBonus;
            const totalSuccesses = Math.max(0, baseSuccesses + autoSuccesses + totalTraitBonus - fatigueMalus);
            const roll_target = rollType === 'carac' ? CARACNAMES[selectedCarac] : selectedSkill?.name;

            // Dépenser SAGA avant l'animation
            onUpdate({ ...character, sagaActuelle: character.sagaActuelle - 1, sagaTotale: character.sagaTotale + 1 });

            triggerAnimation(
                { type: 'insurance', seq1, seq2, keptRoll: succ1 >= succ2 ? 1 : 2 },
                {
                    diceResults: {
                        rolls: bestRoll, roll1, roll2, succ1, succ2,
                        keptRoll: succ1 >= succ2 ? 1 : 2,
                        threshold, explosionThresholds,
                        baseSuccesses, autoSuccesses,
                        traitBonus: totalTraitBonus, fatigueMalus, totalSuccesses,
                        pool, blessureMalus, caracUsed,
                        skillUsed: rollType === 'skill' ? selectedSkill : null,
                        sagaMode: 'insurance', sagaSpent: 1, sagaRecovered: 0,
                        discardedRoll: succ1 >= succ2 ? roll2 : roll1,
                        roll_target
                    },
                    apiPayload: { rolls: bestRoll, threshold, totalSuccesses, pool, sagaSpent: 1, sagaRecovered: 0, roll_target }
                }
            );
            return;
        }

        // ── JET NORMAL ───────────────────────────────────────────────────────
        const { rolls: results, sequence } = rollDiceWithSequence(pool, explosionThresholds);
        const baseSuccesses = countSuccesses(results, threshold);
        const fatigueMalus = getFatigueMalus(character.tokensFatigue);
        const activeCondBonus = activeConditionalBonuses.reduce((sum, b) => sum + b.bonus, 0);
        const totalTraitBonus = isBerserk ? traitAutoBonus + activeCondBonus + 2 : traitAutoBonus + activeCondBonus;
        let totalSuccesses = Math.max(0, baseSuccesses + autoSuccesses + totalTraitBonus - fatigueMalus);
        const roll_target = rollType === 'carac' ? CARACNAMES[selectedCarac] : selectedSkill?.name;

        // Dépenser points compétence si succès auto
        if (rollType === 'skill' && selectedSkill && autoSuccesses > 0) {
            const newSkills = character.skills.map(s =>
                (s.name === selectedSkill.name && s.specialization === selectedSkill.specialization)
                    ? { ...s, currentPoints: Math.max(0, s.currentPoints - autoSuccesses) }
                    : s
            );
            onUpdate({ ...character, skills: newSkills });
            setSelectedSkill({ ...selectedSkill, currentPoints: Math.max(0, selectedSkill.currentPoints - autoSuccesses) });
        }

        const baseResult = {
            rolls: results, threshold, explosionThresholds,
            baseSuccesses, autoSuccesses,
            traitBonus: totalTraitBonus, fatigueMalus, totalSuccesses,
            pool, blessureMalus, caracUsed,
            skillUsed: rollType === 'skill' ? selectedSkill : null,
            roll_target
        };

        // ── HÉROÏQUE ou ÉPIQUE ───────────────────────────────────────────────
        if ((sagaMode === 'heroic' || sagaMode === 'epic') && character.sagaActuelle >= 1 && totalSuccesses >= 3) {
            const finalTarget = sagaMode === 'heroic' ? 4 : 5;
            triggerAnimation(sequence, {
                diceResults: baseResult,
                apiPayload: null, // Pas d'envoi avant confirmation SAGA
                isSagaPending: true,
                sagaData: { ...baseResult, sagaMode, finalTarget, pending: true }
            });
            return;
        }

        // Jet normal sans SAGA
        triggerAnimation(sequence, {
            diceResults: baseResult,
            apiPayload: { rolls: results, threshold, totalSuccesses, pool, sagaSpent: 0, sagaRecovered: 0, roll_target }
        });
    };

    // ─── Confirmation jet SAGA ────────────────────────────────────────────────
    const confirmSagaRoll = () => {
        if (!showSagaConfirm) return;

        const { rolls: bonusRoll, sequence: bonusSeq } = rollDiceWithSequence(3, [10]);
        const bonusSuccesses = countSuccesses(bonusRoll, 7);
        const totalWithBonus = showSagaConfirm.totalSuccesses + bonusSuccesses;
        const hasMinBonusSuccess = bonusSuccesses >= 1;
        const meetsTarget = totalWithBonus >= showSagaConfirm.finalTarget;
        const success = hasMinBonusSuccess && meetsTarget;

        if (!success) {
            onUpdate({ ...character, sagaActuelle: character.sagaActuelle - 1, sagaTotale: character.sagaTotale + 1 });
        }

        const sagaResult = {
            ...showSagaConfirm,
            bonusRoll, bonusSuccesses,
            totalSuccesses: totalWithBonus,
            sagaSpent: 1,
            sagaRecovered: success ? 1 : 0,
            failReason: !hasMinBonusSuccess ? 'Aucun succès sur jet SAGA' : !meetsTarget ? 'Total insuffisant' : null,
            pending: false
        };

        setShowSagaConfirm(null);
        setRolling(true);

        triggerAnimation(bonusSeq, {
            diceResults: sagaResult,
            apiPayload: {
                rolls: showSagaConfirm.rolls,
                threshold: showSagaConfirm.threshold,
                totalSuccesses: totalWithBonus,
                pool: showSagaConfirm.pool,
                sagaSpent: 1,
                sagaRecovered: success ? 1 : 0,
                roll_target: showSagaConfirm.roll_target
            }
        });
    };

    const cancelSagaRoll = () => {
        setDiceResults({ ...showSagaConfirm, pending: false });
        setShowSagaConfirm(null);
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-2xl w-full border-4 border-viking-bronze max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b-2 border-viking-bronze flex justify-between items-center sticky top-0 bg-white dark:bg-viking-brown z-10">
                    <h3 className="text-lg font-viking font-bold text-viking-brown dark:text-viking-parchment">🎲 Lanceur de dés</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Type de jet */}
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Type</label>
                        <div className="flex gap-2">
                            <button onClick={() => setRollType('carac')} className={`flex-1 px-4 py-2 rounded text-sm font-semibold ${rollType === 'carac' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>Caractéristique</button>
                            <button onClick={() => setRollType('skill')} className={`flex-1 px-4 py-2 rounded text-sm font-semibold ${rollType === 'skill' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>Compétence</button>
                        </div>
                    </div>

                    {/* Sélection carac */}
                    {rollType === 'carac' && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Caractéristique</label>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(CARACNAMES).map(([key, name]) => (
                                    <button key={key} onClick={() => setSelectedCarac(key)}
                                            className={`px-3 py-2 rounded text-xs font-semibold ${selectedCarac === key ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>
                                        {name} ({character[key] || 2})
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sélection compétence */}
                    {rollType === 'skill' && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Compétence</label>
                            <div className="max-h-40 overflow-y-auto space-y-1">
                                {character.skills?.map((skill, idx) => (
                                    <button key={idx} onClick={() => setSelectedSkill(skill)}
                                            className={`w-full px-3 py-2 rounded text-xs text-left font-semibold ${selectedSkill?.name === skill.name && selectedSkill?.specialization === skill.specialization ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>
                                        {formatSkillName(skill)} (niv. {skill.level})
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Succès auto */}
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                            Succès auto
                            {rollType === 'skill' && selectedSkill && (
                                <span className="ml-2 text-xs font-normal text-viking-leather dark:text-viking-bronze">
                                    (Points dispo: {selectedSkill.currentPoints || 0})
                                </span>
                            )}
                        </label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setAutoSuccesses(Math.max(0, autoSuccesses - 1))} className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold">-</button>
                            <span className="text-lg font-bold text-viking-bronze w-6 text-center">{autoSuccesses}</span>
                            <button onClick={() => setAutoSuccesses(autoSuccesses + 1)}
                                    disabled={rollType === 'skill' && selectedSkill && autoSuccesses >= (selectedSkill.currentPoints || 0)}
                                    className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold disabled:opacity-30">+</button>
                        </div>
                    </div>

                    {/* Bonus conditionnels */}
                    {conditionalBonuses.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Bonus conditionnels</label>
                            <div className="space-y-1">
                                {conditionalBonuses.map((cond, idx) => {
                                    const isActive = activeConditionalBonuses.some(b => b.name === cond.name && b.condition === cond.condition);
                                    return (
                                        <button key={idx}
                                                onClick={() => {
                                                    if (isActive) setActiveConditionalBonuses(activeConditionalBonuses.filter(b => !(b.name === cond.name && b.condition === cond.condition)));
                                                    else setActiveConditionalBonuses([...activeConditionalBonuses, cond]);
                                                }}
                                                className={`w-full px-3 py-2 rounded text-sm text-left transition-all border-2 ${isActive ? 'bg-viking-bronze text-viking-brown border-viking-leather' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment border-viking-leather/30 dark:border-viking-bronze/30 hover:border-viking-bronze'}`}>
                                            <div className="font-semibold flex justify-between items-center">
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
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Modes SAGA (SAGA: {character.sagaActuelle})</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setSagaMode(null)} className={`px-3 py-2 rounded text-xs font-semibold ${sagaMode === null ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>Normal</button>
                            <button onClick={() => setSagaMode('heroic')} disabled={character.sagaActuelle < 1} className={`px-3 py-2 rounded text-xs font-semibold disabled:opacity-30 ${sagaMode === 'heroic' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>🔥 Héroïque (4)</button>
                            <button onClick={() => setSagaMode('epic')} disabled={character.sagaActuelle < 1} className={`px-3 py-2 rounded text-xs font-semibold disabled:opacity-30 ${sagaMode === 'epic' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>⚡ Épique (5)</button>
                            <button onClick={() => setSagaMode('insurance')} disabled={character.sagaActuelle < 1} className={`px-3 py-2 rounded text-xs font-semibold disabled:opacity-30 ${sagaMode === 'insurance' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>🛡️ Assurance</button>
                        </div>
                        {sagaMode && (
                            <div className="text-xs text-viking-leather dark:text-viking-bronze mt-2">
                                {sagaMode === 'heroic' && '3+ succès → dépense 1 SAGA → 3d10 bonus (seuil 7+). Si total ≥4: SAGA revient.'}
                                {sagaMode === 'epic' && '3+ succès → dépense 1 SAGA → 3d10 bonus (seuil 7+). Si total ≥5: SAGA revient.'}
                                {sagaMode === 'insurance' && '1 SAGA perdu → 2 lancers, garde le meilleur.'}
                            </div>
                        )}
                    </div>

                    {/* Résultats */}
                    {diceResults && !diceResults.error && (
                        <>
                            <div className="p-4 bg-viking-parchment dark:bg-gray-800 rounded-lg border-2 border-viking-bronze">
                                {diceResults.sagaMode === 'insurance' && diceResults.roll1 && diceResults.roll2 ? (
                                    <>
                                        <div className="text-xs font-semibold mb-3 text-viking-brown dark:text-viking-parchment">🛡️ Assurance : 2 lancers</div>
                                        <div className={`mb-3 p-2 rounded ${diceResults.keptRoll === 1 ? 'bg-viking-success/20 border-2 border-viking-success' : 'opacity-50'}`}>
                                            <div className="text-xs font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Jet 1 : {diceResults.succ1} succès {diceResults.keptRoll === 1 && '✅ GARDÉ'}</div>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {diceResults.roll1.map((die, idx) => {
                                                    const isSuccess = die >= diceResults.threshold;
                                                    const isExplosion = diceResults.explosionThresholds.includes(die);
                                                    return <div key={idx} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border-2 ${isExplosion ? 'bg-viking-bronze border-viking-bronze text-viking-brown' : isSuccess ? 'bg-viking-success border-viking-success text-white' : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-viking-text dark:text-viking-parchment'}`}>{die}</div>;
                                                })}
                                            </div>
                                        </div>
                                        <div className={`p-2 rounded ${diceResults.keptRoll === 2 ? 'bg-viking-success/20 border-2 border-viking-success' : 'opacity-50'}`}>
                                            <div className="text-xs font-semibold mb-1 text-viking-brown dark:text-viking-parchment">Jet 2 : {diceResults.succ2} succès {diceResults.keptRoll === 2 && '✅ GARDÉ'}</div>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {diceResults.roll2.map((die, idx) => {
                                                    const isSuccess = die >= diceResults.threshold;
                                                    const isExplosion = diceResults.explosionThresholds.includes(die);
                                                    return <div key={idx} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border-2 ${isExplosion ? 'bg-viking-bronze border-viking-bronze text-viking-brown' : isSuccess ? 'bg-viking-success border-viking-success text-white' : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-viking-text dark:text-viking-parchment'}`}>{die}</div>;
                                                })}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-xs font-semibold mb-2 text-viking-brown dark:text-viking-parchment">Dés lancés:</div>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {diceResults.rolls.map((die, idx) => {
                                                const isSuccess = die >= diceResults.threshold;
                                                const isExplosion = diceResults.explosionThresholds.includes(die);
                                                return <div key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border-2 ${isExplosion ? 'bg-viking-bronze border-viking-bronze text-viking-brown' : isSuccess ? 'bg-viking-success border-viking-success text-white' : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-viking-text dark:text-viking-parchment'}`}>{die}</div>;
                                            })}
                                        </div>
                                    </>
                                )}
                                {diceResults.bonusRoll && (
                                    <div className="mt-3 pt-3 border-t border-viking-bronze">
                                        <div className="text-xs font-semibold mb-2 text-viking-brown dark:text-viking-parchment">Dés SAGA bonus:</div>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {diceResults.bonusRoll.map((die, idx) => {
                                                const isSuccess = die >= 7;
                                                const isExplosion = die === 10;
                                                return <div key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border-2 ${isExplosion ? 'bg-viking-bronze border-viking-bronze text-viking-brown' : isSuccess ? 'bg-viking-success border-viking-success text-white' : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-viking-text dark:text-viking-parchment'}`}>{die}</div>;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Total */}
                            <div className="p-6 bg-viking-bronze/20 dark:bg-viking-leather/20 rounded-lg border-2 border-viking-bronze text-center">
                                <div className="text-5xl font-bold text-viking-bronze mb-2">{diceResults.totalSuccesses}</div>
                                <div className="text-sm text-viking-text dark:text-viking-parchment">succès total</div>
                                {diceResults.sagaMode && (
                                    <div className="text-xs mt-2">
                                        {diceResults.sagaRecovered > 0 ? <div className="text-viking-success">✅ SAGA récupéré !</div>
                                            : diceResults.sagaSpent > 0 ? <div className="text-viking-danger">❌ SAGA dépensé{diceResults.failReason && ` (${diceResults.failReason})`}</div>
                                                : null}
                                    </div>
                                )}
                            </div>

                            {/* Détail calcul */}
                            <div className="p-3 bg-viking-parchment/50 dark:bg-gray-900/50 rounded text-xs space-y-1">
                                <div className="flex justify-between text-viking-text dark:text-viking-parchment"><span>Succès de base:</span><span className="font-bold">{diceResults.baseSuccesses}</span></div>
                                {diceResults.autoSuccesses > 0 && <div className="flex justify-between text-viking-bronze"><span>Succès auto:</span><span className="font-bold">+{diceResults.autoSuccesses}</span></div>}
                                {diceResults.traitBonus !== 0 && <div className={`flex justify-between ${diceResults.traitBonus > 0 ? 'text-viking-success' : 'text-viking-danger'}`}><span>Bonus traits:</span><span className="font-bold">{diceResults.traitBonus > 0 ? '+' : ''}{diceResults.traitBonus}</span></div>}
                                {diceResults.fatigueMalus > 0 && <div className="flex justify-between text-viking-leather"><span>Malus fatigue:</span><span className="font-bold">-{diceResults.fatigueMalus}</span></div>}
                            </div>
                        </>
                    )}

                    {diceResults?.error && (
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-lg text-center text-red-600 dark:text-red-400 font-bold">
                            {diceResults.message}
                        </div>
                    )}

                    {/* Bouton lancer */}
                    <button onClick={handleRoll} disabled={rolling || (rollType === 'skill' && !selectedSkill)}
                            className={`w-full px-6 py-3 rounded-lg font-bold text-lg ${rolling ? 'bg-gray-400 cursor-not-allowed' : 'bg-viking-bronze hover:bg-viking-leather text-viking-brown'}`}>
                        {rolling ? '🎲 Lancer...' : '🎲 Lancer !'}
                    </button>
                </div>
            </div>

            {/* Modale Confirmation SAGA */}
            {showSagaConfirm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={cancelSagaRoll}>
                    <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze p-6 m-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment mb-4">
                            {showSagaConfirm.sagaMode === 'heroic' ? '🔥 Jet Héroïque' : '⚡ Jet Épique'}
                        </h3>
                        <div className="space-y-3 text-sm text-viking-text dark:text-viking-parchment">
                            <p>Vous avez obtenu <span className="font-bold text-viking-bronze">{showSagaConfirm.totalSuccesses} succès</span>.</p>
                            <p>Voulez-vous dépenser <span className="font-bold text-viking-bronze">1 point de SAGA</span> pour lancer 3d10 bonus (seuil 7+) ?</p>
                            <p className="text-xs text-viking-leather dark:text-viking-bronze">Objectif: {showSagaConfirm.finalTarget} succès total. Si réussi, SAGA revient.</p>
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
                    sequences={animationData.sequences}
                    diceType="d10"
                    onComplete={handleAnimationComplete}
                    onSkip={handleAnimationComplete}
                />
            )}
        </div>
    );
};

export default DiceModal;