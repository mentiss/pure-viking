// DiceModal.js - Modale lanceur de dés avec JETS SAGA
import React, { useState, useEffect } from "react";
import {
    countSuccesses, formatSkillName,
    getBestCharacteristic, getBlessureMalus,
    getExplosionThreshold, getFatigueMalus,
    getSuccessThreshold,
    rollDice
} from "../tools/utils.js";
import getTraitBonuses from "../tools/traitBonuses.js";
import {CARACNAMES} from "../tools/data.js";

const DiceModal = ({ character, isBerserk, context, onClose, onUpdate, sessionId = null }) => {
    const { useState, useEffect } = React;
    
    const [rollType, setRollType] = useState('carac');
    const [selectedCarac, setSelectedCarac] = useState('force');
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [autoSuccesses, setAutoSuccesses] = useState(0);
    const [sagaMode, setSagaMode] = useState(null); // null, 'heroic', 'epic', 'insurance'
    const [diceResults, setDiceResults] = useState(null);
    const [rolling, setRolling] = useState(false);
    const [showSagaConfirm, setShowSagaConfirm] = useState(null);
    
    // Bonus traits
    const [traitAutoBonus, setTraitAutoBonus] = useState(0);
    const [conditionalBonuses, setConditionalBonuses] = useState([]);
    const [activeConditionalBonuses, setActiveConditionalBonuses] = useState([]);
    
    // Fonction envoi API
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

    useEffect(() => {
        if (context?.type === 'carac') {
            setRollType('carac');
            setSelectedCarac(context.data);
        } else if (context?.type === 'skill') {
            setRollType('skill');
            setSelectedSkill(context.data);
        }
    }, [context]);
    
    // Calculer bonus traits quand carac/skill change
    useEffect(() => {
        const rollTarget = rollType === 'skill' ? selectedSkill?.name : null;
        const caracUsed = rollType === 'carac' ? selectedCarac : (selectedSkill ? getBestCharacteristic(character, selectedSkill).name : null);
        
        const bonuses = getTraitBonuses(character, caracUsed, rollTarget);
        
        setTraitAutoBonus(bonuses.auto);
        
        // Filtrer conditionnels applicables
        const applicable = bonuses.conditional.filter(c => c.applies);
        setConditionalBonuses(applicable);
        
        // Reset active conditionals quand on change de jet
        setActiveConditionalBonuses([]);
    }, [rollType, selectedCarac, selectedSkill]);

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

        // ASSURANCE : lancer 2 fois, garder meilleur
        if (sagaMode === 'insurance' && character.sagaActuelle >= 1) {
            const roll1 = rollDice(pool, explosionThresholds);
            const roll2 = rollDice(pool, explosionThresholds);
            const succ1 = countSuccesses(roll1, threshold);
            const succ2 = countSuccesses(roll2, threshold);
            
            const bestRoll = succ1 >= succ2 ? roll1 : roll2;
            const baseSuccesses = Math.max(succ1, succ2);
            if(character.traits.some(trait => trait.name === 'Infatigable')) {
                const fatigueMalus = 0;
            } else {
                const fatigueMalus = getFatigueMalus(character.tokensFatigue);
            }
            
            // Calculer bonus traits total
            const activeCondBonus = activeConditionalBonuses.reduce((sum, b) => sum + b.bonus, 0);
            const totalTraitBonus = traitAutoBonus + activeCondBonus;
            
            const totalSuccesses = Math.max(0, baseSuccesses + autoSuccesses + totalTraitBonus - fatigueMalus);
            
            // Dépenser SAGA (perdu définitivement)
            onUpdate({
                ...character,
                sagaActuelle: character.sagaActuelle - 1,
                sagaTotale: character.sagaTotale + 1
            });
            
            setDiceResults({
                rolls: bestRoll,
                roll1: roll1,
                roll2: roll2,
                succ1: succ1,
                succ2: succ2,
                keptRoll: succ1 >= succ2 ? 1 : 2,
                threshold,
                explosionThresholds,
                baseSuccesses,
                autoSuccesses,
                traitBonus: totalTraitBonus,
                fatigueMalus,
                totalSuccesses,
                pool,
                blessureMalus,
                caracUsed,
                skillUsed: rollType === 'skill' ? selectedSkill : null,
                sagaMode: 'insurance',
                sagaSpent: 1,
                sagaRecovered: 0,
                discardedRoll: succ1 >= succ2 ? roll2 : roll1,
                roll_target: rollType === 'carac' ? CARACNAMES[selectedCarac] : selectedSkill?.name
            });
            
            // Envoyer à l'API
            sendRollToAPI({
                rolls: bestRoll,
                threshold,
                totalSuccesses,
                pool,
                sagaSpent: 1,
                sagaRecovered: 0,
                roll_target: rollType === 'carac' ? CARACNAMES[selectedCarac] : selectedSkill?.name
            });
            
            setRolling(false);
            return;
        }

        // JET NORMAL
        const results = rollDice(pool, explosionThresholds);
        const baseSuccesses = countSuccesses(results, threshold);
        const fatigueMalus = getFatigueMalus(character.tokensFatigue);
        
        // Calculer bonus traits total
        const activeCondBonus = activeConditionalBonuses.reduce((sum, b) => sum + b.bonus, 0);
        const totalTraitBonus = isBerserk ? traitAutoBonus + activeCondBonus + 2 : traitAutoBonus + activeCondBonus;
        
        let totalSuccesses = Math.max(0, baseSuccesses + autoSuccesses + totalTraitBonus - fatigueMalus);
        
        // Dépenser points compétence si succès auto
        if (rollType === 'skill' && selectedSkill && autoSuccesses > 0) {
            const newSkills = character.skills.map(s => 
                (s.name === selectedSkill.name && s.specialization === selectedSkill.specialization)
                    ? {...s, currentPoints: Math.max(0, s.currentPoints - autoSuccesses)} 
                    : s
            );
            onUpdate({...character, skills: newSkills});
            setSelectedSkill({...selectedSkill, currentPoints: Math.max(0, selectedSkill.currentPoints - autoSuccesses)});
        }

        const baseResult = {
            rolls: results,
            threshold,
            explosionThresholds,
            baseSuccesses,
            autoSuccesses,
            traitBonus: totalTraitBonus,
            fatigueMalus,
            totalSuccesses,
            pool,
            blessureMalus,
            caracUsed,
            skillUsed: rollType === 'skill' ? selectedSkill : null,
            roll_target: rollType === 'carac' ? CARACNAMES[selectedCarac] : selectedSkill?.name
        };

        // HÉROÏQUE ou ÉPIQUE
        if ((sagaMode === 'heroic' || sagaMode === 'epic') && character.sagaActuelle >= 1) {
            const requiredBase = sagaMode === 'heroic' ? 3 : 3; // Les deux nécessitent 3 succès de base
            const finalTarget = sagaMode === 'heroic' ? 4 : 5;
            
            if (totalSuccesses >= requiredBase) {
                // Afficher confirmation
                setShowSagaConfirm({
                    ...baseResult,
                    sagaMode,
                    finalTarget,
                    pending: true
                });
                setRolling(false);
                return;
            }
        }

        // Envoyer à l'API
        sendRollToAPI(baseResult);
        
        setDiceResults(baseResult);
        setRolling(false);
        
        // Callback si contexte (ex: posture défensive, attaque)
        if (context?.onRollComplete) {
            context.onRollComplete(baseResult);
        }
    };

    const confirmSagaRoll = () => {
        if (!showSagaConfirm) return;
        
        // Lancer 3d10 bonus (seuil 7+, explosion 10)
        const bonusRoll = rollDice(3, [10]);
        const bonusSuccesses = countSuccesses(bonusRoll, 7);
        const totalWithBonus = showSagaConfirm.totalSuccesses + bonusSuccesses;
        
        // RÈGLE SAGA : Il faut MINIMUM 1 succès sur le jet bonus, sinon SAGA perdu
        // même si le total atteint déjà l'objectif
        const hasMinBonusSuccess = bonusSuccesses >= 1;
        const meetsTarget = totalWithBonus >= showSagaConfirm.finalTarget;
        const success = hasMinBonusSuccess && meetsTarget;
        
        // Si succès : SAGA revient, sinon perdu
        if (!success) {
            onUpdate({
                ...character,
                sagaActuelle: character.sagaActuelle - 1,
                sagaTotale: character.sagaTotale + 1
            });
        }
        
        setDiceResults({
            ...showSagaConfirm,
            bonusRoll,
            bonusSuccesses,
            totalSuccesses: totalWithBonus,
            sagaSpent: 1,
            sagaRecovered: success ? 1 : 0,
            failReason: !hasMinBonusSuccess ? 'Aucun succès sur jet SAGA' : !meetsTarget ? 'Total insuffisant' : null,
            pending: false
        });
        
        // Envoyer à l'API
        sendRollToAPI({
            rolls: showSagaConfirm.rolls,
            threshold: showSagaConfirm.threshold,
            totalSuccesses: totalWithBonus,
            pool: showSagaConfirm.pool,
            sagaSpent: 1,
            sagaRecovered: success ? 1 : 0,
            roll_target: showSagaConfirm.roll_target
        });
        
        setShowSagaConfirm(null);
    };

    const cancelSagaRoll = () => {
        setDiceResults({
            ...showSagaConfirm,
            pending: false
        });
        setShowSagaConfirm(null);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-2xl w-full border-4 border-viking-bronze max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b-2 border-viking-bronze flex justify-between items-center sticky top-0 bg-white dark:bg-viking-brown z-10">
                    <h3 className="text-lg font-viking font-bold text-viking-brown dark:text-viking-parchment">🎲 Lanceur de dés</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>
                
                <div className="p-4 space-y-4">
                    {/* Type */}
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Type</label>
                        <div className="flex gap-2">
                            <button onClick={() => setRollType('carac')} className={`flex-1 px-4 py-2 rounded text-sm font-semibold ${rollType === 'carac' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>Caractéristique</button>
                            <button onClick={() => setRollType('skill')} className={`flex-1 px-4 py-2 rounded text-sm font-semibold ${rollType === 'skill' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>Compétence</button>
                        </div>
                    </div>

                    {/* Sélection Carac */}
                    {rollType === 'carac' && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Caractéristique</label>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(CARACNAMES).map(([key, label]) => (
                                    <button key={key} onClick={() => setSelectedCarac(key)} className={`px-3 py-2 rounded text-xs font-semibold ${selectedCarac === key ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>
                                        {label} ({character[key]})
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sélection Compétence */}
                    {rollType === 'skill' && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Compétence</label>
                            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                                {character.skills.map(skill => (
                                    <button 
                                        key={`${skill.name}-${skill.specialization || 'default'}`}
                                        onClick={() => setSelectedSkill(skill)} 
                                        className={`px-3 py-2 rounded text-xs font-semibold text-left ${
                                            selectedSkill?.name === skill.name && selectedSkill?.specialization === skill.specialization 
                                                ? 'bg-viking-bronze text-viking-brown' 
                                                : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'
                                        }`}
                                    >
                                        <div>{formatSkillName(skill)}</div>
                                        <div className="text-xs opacity-75">Niv {skill.level}, {skill.currentPoints} pts</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Succès auto */}
                    {rollType === 'skill' && selectedSkill && selectedSkill.currentPoints > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Succès auto (pts: {selectedSkill.currentPoints})</label>
                            <div className="flex gap-2">
                                {[0,1,2,3].map(n => (
                                    <button key={n} onClick={() => setAutoSuccesses(n)} disabled={n > selectedSkill.currentPoints} className={`flex-1 px-3 py-2 rounded text-sm font-semibold disabled:opacity-30 ${autoSuccesses === n ? 'bg-viking-success text-white' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Bonus Traits Auto */}
                    {traitAutoBonus !== 0 && (
                        <div className={`p-3 rounded border-2 ${
                            traitAutoBonus > 0 
                                ? 'bg-viking-success/10 border-viking-success' 
                                : 'bg-viking-danger/10 border-viking-danger'
                        }`}>
                            <div className={`text-sm font-semibold ${
                                traitAutoBonus > 0 ? 'text-viking-success' : 'text-viking-danger'
                            }`}>
                                {traitAutoBonus > 0 ? '✓' : '✕'} Bonus traits : {traitAutoBonus > 0 ? '+' : ''}{traitAutoBonus} succès
                            </div>
                            <div className="text-xs text-viking-text dark:text-viking-parchment opacity-75 mt-1">
                                Appliqué automatiquement selon vos traits/backgrounds
                            </div>
                        </div>
                    )}
                    
                    {/* Bonus Conditionnels (Cliquables) */}
                    {conditionalBonuses.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                                Bonus conditionnels (cliquer pour activer)
                            </label>
                            <div className="space-y-2">
                                {conditionalBonuses.map((cond, idx) => {
                                    const isActive = activeConditionalBonuses.some(b => b.name === cond.name && b.condition === cond.condition);
                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                if (isActive) {
                                                    setActiveConditionalBonuses(activeConditionalBonuses.filter(b => !(b.name === cond.name && b.condition === cond.condition)));
                                                } else {
                                                    setActiveConditionalBonuses([...activeConditionalBonuses, cond]);
                                                }
                                            }}
                                            className={`w-full px-3 py-2 rounded text-sm text-left transition-all border-2 ${
                                                isActive
                                                    ? 'bg-viking-bronze text-viking-brown border-viking-leather'
                                                    : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment border-viking-leather/30 dark:border-viking-bronze/30 hover:border-viking-bronze'
                                            }`}
                                        >
                                            <div className="font-semibold flex justify-between items-center">
                                                <span>{cond.name}</span>
                                                <span className={isActive ? 'text-viking-leather' : 'text-viking-bronze'}>
                                                    {cond.bonus > 0 ? '+' : ''}{cond.bonus}
                                                </span>
                                            </div>
                                            <div className="text-xs opacity-75 mt-1">{cond.condition}</div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* SAGA Modes */}
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Modes SAGA (SAGA: {character.sagaActuelle})</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setSagaMode(null)} className={`px-3 py-2 rounded text-xs font-semibold ${sagaMode === null ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>
                                Normal
                            </button>
                            <button onClick={() => setSagaMode('heroic')} disabled={character.sagaActuelle < 1} className={`px-3 py-2 rounded text-xs font-semibold disabled:opacity-30 ${sagaMode === 'heroic' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>
                                🔥 Héroïque (4)
                            </button>
                            <button onClick={() => setSagaMode('epic')} disabled={character.sagaActuelle < 1} className={`px-3 py-2 rounded text-xs font-semibold disabled:opacity-30 ${sagaMode === 'epic' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>
                                ⚡ Épique (5)
                            </button>
                            <button onClick={() => setSagaMode('insurance')} disabled={character.sagaActuelle < 1} className={`px-3 py-2 rounded text-xs font-semibold disabled:opacity-30 ${sagaMode === 'insurance' ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}>
                                🛡️ Assurance
                            </button>
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
                            {/* Dés */}
                            <div className="p-4 bg-viking-parchment dark:bg-gray-800 rounded-lg border-2 border-viking-bronze">
                                {diceResults.sagaMode === 'insurance' && diceResults.roll1 && diceResults.roll2 ? (
                                    <>
                                        <div className="text-xs font-semibold mb-3 text-viking-brown dark:text-viking-parchment">🛡️ Assurance : 2 lancers</div>
                                        
                                        {/* Jet 1 */}
                                        <div className={`mb-3 p-2 rounded ${diceResults.keptRoll === 1 ? 'bg-viking-success/20 border-2 border-viking-success' : 'opacity-50'}`}>
                                            <div className="text-xs font-semibold mb-1 text-viking-brown dark:text-viking-parchment">
                                                Jet 1 : {diceResults.succ1} succès {diceResults.keptRoll === 1 && '✅ GARDÉ'}
                                            </div>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {diceResults.roll1.map((die, idx) => {
                                                    const isSuccess = die >= diceResults.threshold;
                                                    const isExplosion = diceResults.explosionThresholds.includes(die);
                                                    return (
                                                        <div key={idx} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border-2 ${isExplosion ? 'bg-viking-bronze border-viking-bronze text-viking-brown' : isSuccess ? 'bg-viking-success border-viking-success text-white' : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-viking-text dark:text-viking-parchment'}`}>
                                                            {die}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        
                                        {/* Jet 2 */}
                                        <div className={`p-2 rounded ${diceResults.keptRoll === 2 ? 'bg-viking-success/20 border-2 border-viking-success' : 'opacity-50'}`}>
                                            <div className="text-xs font-semibold mb-1 text-viking-brown dark:text-viking-parchment">
                                                Jet 2 : {diceResults.succ2} succès {diceResults.keptRoll === 2 && '✅ GARDÉ'}
                                            </div>
                                            <div className="flex flex-wrap gap-2 justify-center">
                                                {diceResults.roll2.map((die, idx) => {
                                                    const isSuccess = die >= diceResults.threshold;
                                                    const isExplosion = diceResults.explosionThresholds.includes(die);
                                                    return (
                                                        <div key={idx} className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm border-2 ${isExplosion ? 'bg-viking-bronze border-viking-bronze text-viking-brown' : isSuccess ? 'bg-viking-success border-viking-success text-white' : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-viking-text dark:text-viking-parchment'}`}>
                                                            {die}
                                                        </div>
                                                    );
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
                                                return (
                                                    <div key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border-2 ${isExplosion ? 'bg-viking-bronze border-viking-bronze text-viking-brown' : isSuccess ? 'bg-viking-success border-viking-success text-white' : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-viking-text dark:text-viking-parchment'}`}>
                                                        {die}
                                                    </div>
                                                );
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
                                                return (
                                                    <div key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border-2 ${isExplosion ? 'bg-viking-bronze border-viking-bronze text-viking-brown' : isSuccess ? 'bg-viking-success border-viking-success text-white' : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-viking-text dark:text-viking-parchment'}`}>
                                                        {die}
                                                    </div>
                                                );
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
                                        {diceResults.sagaRecovered > 0 ? (
                                            <div className="text-viking-success">✅ SAGA récupéré !</div>
                                        ) : diceResults.sagaSpent > 0 ? (
                                            <>
                                                <div className="text-viking-danger">❌ SAGA perdu</div>
                                                {diceResults.failReason && (
                                                    <div className="text-viking-leather dark:text-viking-bronze mt-1">
                                                        ({diceResults.failReason})
                                                    </div>
                                                )}
                                            </>
                                        ) : ''}
                                    </div>
                                )}
                            </div>

                            {/* Détails */}
                            <div className="p-4 bg-white dark:bg-viking-brown rounded-lg border-2 border-viking-leather dark:border-viking-bronze">
                                <div className="text-xs space-y-2 text-viking-text dark:text-viking-parchment">
                                    <div className="flex justify-between"><span>Pool:</span><span className="font-bold">{diceResults.pool}d10</span></div>
                                    <div className="flex justify-between"><span>Seuil:</span><span className="font-bold">{diceResults.threshold}+</span></div>
                                    <div className="flex justify-between border-t pt-2"><span>Succès base:</span><span className="font-bold">{diceResults.baseSuccesses}</span></div>
                                    {diceResults.bonusSuccesses !== undefined && <div className="flex justify-between text-viking-bronze"><span>Succès SAGA:</span><span className="font-bold">+{diceResults.bonusSuccesses}</span></div>}
                                    {diceResults.autoSuccesses > 0 && <div className="flex justify-between text-viking-success"><span>Succès auto:</span><span className="font-bold">+{diceResults.autoSuccesses}</span></div>}
                                    {diceResults.traitBonus !== undefined && diceResults.traitBonus !== 0 && (
                                        <div className={`flex justify-between ${diceResults.traitBonus > 0 ? 'text-viking-success' : 'text-viking-danger'}`}>
                                            <span>Bonus traits:</span>
                                            <span className="font-bold">{diceResults.traitBonus > 0 ? '+' : ''}{diceResults.traitBonus}</span>
                                        </div>
                                    )}
                                    {diceResults.fatigueMalus > 0 && <div className="flex justify-between text-viking-leather"><span>Malus fatigue:</span><span className="font-bold">-{diceResults.fatigueMalus}</span></div>}
                                </div>
                            </div>
                        </>
                    )}

                    {diceResults?.error && (
                        <div className="p-4 bg-red-100 dark:bg-red-900/30 border-2 border-red-500 rounded-lg text-center text-red-600 dark:text-red-400 font-bold">
                            {diceResults.message}
                        </div>
                    )}

                    {/* Bouton */}
                    <button onClick={handleRoll} disabled={rolling || (rollType === 'skill' && !selectedSkill)} className={`w-full px-6 py-3 rounded-lg font-bold text-lg ${rolling ? 'bg-gray-400 cursor-not-allowed' : 'bg-viking-bronze hover:bg-viking-leather text-viking-brown'}`}>
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
                            <p className="text-xs text-viking-leather dark:text-viking-bronze">
                                Objectif: {showSagaConfirm.finalTarget} succès total.
                                {showSagaConfirm.finalTarget === 4 ? ' Si réussi, SAGA revient.' : ' Si réussi, SAGA revient.'}
                            </p>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={cancelSagaRoll} className="flex-1 px-4 py-2 bg-gray-500 text-white rounded font-semibold">
                                Non
                            </button>
                            <button onClick={confirmSagaRoll} className="flex-1 px-4 py-2 bg-viking-bronze text-viking-brown rounded font-semibold hover:bg-viking-leather">
                                Oui, dépenser SAGA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DiceModal;
