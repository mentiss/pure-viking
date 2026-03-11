// src/client/src/systems/vikings/components/modals/DiceModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modale lanceur de dés Vikings — VERSION v2 (diceEngine async).
//
// Responsabilité : UX/UI uniquement.
//   - Construit le ctx depuis les choix du joueur
//   - Appelle vikingsConfig.dice.buildNotation(ctx) puis await roll(notation, ctx, hooks)
//   - Affiche le résultat rendu par roll() (animation + persist inclus dans roll())
//
// Suppressions par rapport à v1 :
//   - Plus d'état animationData / DiceAnimationOverlay local (singleton dans PlayerPage)
//   - Plus de showSagaConfirm / phase de confirmation entre jet principal et jet SAGA
//   - Plus de sendRollToAPI (maintenant dans diceEngine)
//   - Plus d'imports rollWithInsurance / rollSagaBonus
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    formatSkillName,
    getBestCharacteristic, getBlessureMalus,
    getExplosionThreshold, getFatigueMalus,
    getSuccessThreshold,
} from '../../../../tools/utils.js';
import getTraitBonuses from '../../../../tools/traitBonuses.js';
import { CARACNAMES }  from '../../../../tools/data.js';
import { roll, RollError } from '../../../../tools/diceEngine.js';
import vikingsConfig   from '../../config.jsx';
import { useFetch }    from '../../../../hooks/useFetch.js';
import { useParams }   from 'react-router-dom';
import { useSystem }   from '../../../../hooks/useSystem.js';

const DiceModal = ({ character, isBerserk, context, onClose, onUpdate, sessionId = null }) => {

    // ── État UI ───────────────────────────────────────────────────────────────
    const [rollType,      setRollType]      = useState('carac');
    const [selectedCarac, setSelectedCarac] = useState('force');
    const [selectedSkill, setSelectedSkill] = useState(null);
    const [autoSuccesses, setAutoSuccesses] = useState(0);
    const [sagaMode,      setSagaMode]      = useState(null); // null | 'insurance' | 'heroic' | 'epic'
    const [diceResults,   setDiceResults]   = useState(null);
    const [rolling,       setRolling]       = useState(false);
    const [error,         setError]         = useState(null);

    // Bonus traits
    const [traitAutoBonus,           setTraitAutoBonus]           = useState(0);
    const [conditionalBonuses,       setConditionalBonuses]       = useState([]);
    const [activeConditionalBonuses, setActiveConditionalBonuses] = useState([]);

    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();

    const contextRef = useRef(context);
    useEffect(() => { contextRef.current = context; }, [context]);

    // ── Contexte pré-rempli depuis la fiche ──────────────────────────────────
    useEffect(() => {
        if (context?.type === 'carac') {
            setRollType('carac');
            setSelectedCarac(context.data);
        } else if (context?.type === 'skill') {
            setRollType('skill');
            setSelectedSkill(context.data);
        }
    }, [context]);

    // ── Recalcul des bonus traits ─────────────────────────────────────────────
    useEffect(() => {
        const rollTarget = rollType === 'skill' ? selectedSkill?.name : null;
        const caracUsedName = rollType === 'carac'
            ? selectedCarac
            : (selectedSkill ? getBestCharacteristic(character, selectedSkill).name : null);

        const traitBonuses = getTraitBonuses(character, caracUsedName, rollTarget);
        setTraitAutoBonus(traitBonuses.auto);
        setConditionalBonuses(traitBonuses.conditional.filter(c => c.applies !== false));
        setActiveConditionalBonuses([]);
    }, [rollType, selectedCarac, selectedSkill, character]);

    // ── Construire le ctx de base ─────────────────────────────────────────────
    const buildCtx = useCallback(() => {
        const caracLevel = rollType === 'carac'
            ? (character[selectedCarac] || 2)
            : (selectedSkill ? getBestCharacteristic(character, selectedSkill).level : 2);

        const threshold = rollType === 'skill' && selectedSkill
            ? getSuccessThreshold(selectedSkill.level)
            : 7;

        const blessureMalus = isBerserk ? 0 : getBlessureMalus(character.tokensBlessure);
        const pool = Math.max(1, 3 - blessureMalus);

        return {
            // Accès réseau (pour persist dans diceEngine)
            apiBase,
            fetchFn:       fetchWithAuth,
            // Métadonnées historique
            characterId:   character.id,
            characterName: `${character.prenom}${character.surnom ? ` "${character.surnom}"` : ''}`,
            sessionId,
            rollType:      'vikings_skill', // identifiant libre pour l'historique
            // Affichage
            label: rollType === 'skill' && selectedSkill
                ? formatSkillName(selectedSkill)
                : CARACNAMES[selectedCarac] || selectedCarac,
            // Données système opaques
            character, // objet complet pour getTraitBonuses dans beforeRoll
            systemData: {
                pool,
                rollType,
                selectedCarac,
                selectedSkill,
                autoSuccesses,
                activeConditionalBonuses,
                traitAutoBonus,
                caracLevel,
                threshold,
                skillLevel:     selectedSkill?.level || 0,
                tokensBlessure: character.tokensBlessure,
                tokensFatigue:  character.tokensFatigue,
                isBerserk,
                sagaActuelle:   character.sagaActuelle,
                declaredMode:   sagaMode,
            },
        };
    }, [
        character, isBerserk, rollType, selectedCarac, selectedSkill,
        autoSuccesses, activeConditionalBonuses, traitAutoBonus,
        sagaMode, sessionId, apiBase, fetchWithAuth,
    ]);

    // ── Lancer les dés ────────────────────────────────────────────────────────
    const handleRoll = useCallback(async () => {
        if (rolling) return;
        setRolling(true);
        setDiceResults(null);
        setError(null);

        try {
            const ctx      = buildCtx();
            const notation = vikingsConfig.dice.buildNotation(ctx);

            // Dépenser les ressources AVANT roll() (UI optimiste)
            if (sagaMode === 'insurance' || sagaMode === 'heroic' || sagaMode === 'epic') {
                // Décrémente sagaActuelle immédiatement
                onUpdate({ ...character, sagaActuelle: Math.max(0, character.sagaActuelle - 1) });
            }
            if (rollType === 'skill' && selectedSkill && autoSuccesses > 0) {
                // Dépense les points de compétence auto
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

            // roll() est async : gère animation + persist en interne
            const result = await roll(notation, ctx, vikingsConfig.dice);

            // SAGA : restituer 1 point si sagaSuccess
            if (result.meta?.sagaSuccess) {
                onUpdate({ ...character, sagaActuelle: character.sagaActuelle }); // déjà décrémenté + restitué = inchangé
            }

            setDiceResults(result);
            context?.onRollComplete?.(result);

        } catch (err) {
            if (err instanceof RollError) {
                setError(err.message);
                // Annuler la dépense si validation échouée
                onUpdate({ ...character }); // re-passer le character original annule l'optimiste
            } else {
                console.error('[DiceModal]', err);
                setError('Erreur inattendue lors du jet.');
            }
        } finally {
            setRolling(false);
        }
    }, [
        rolling, buildCtx, sagaMode, rollType, selectedSkill, autoSuccesses,
        character, onUpdate, context,
    ]);

    // ── Rendu : résultats ────────────────────────────────────────────────────
    if (diceResults) {
        return <DiceResultsView
            results={diceResults}
            character={character}
            onClose={onClose}
            onRollAgain={() => { setDiceResults(null); setSagaMode(null); }}
        />;
    }

    // ── Rendu : formulaire ────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2"
             onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-lg w-full border-4 border-viking-bronze overflow-y-auto max-h-[90vh]"
                 onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b-2 border-viking-bronze">
                    <h2 className="text-xl font-bold text-viking-brown dark:text-viking-parchment">🎲 Lancer les dés</h2>
                    <button onClick={onClose} className="text-viking-leather dark:text-viking-bronze hover:text-viking-brown text-xl">✕</button>
                </div>

                <div className="p-4 space-y-4">

                    {/* Erreur */}
                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 rounded text-red-700 dark:text-red-300 text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    {/* Type de jet */}
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Type de jet</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { value: 'carac', label: 'Caractéristique' },
                                { value: 'skill', label: 'Compétence' },
                            ].map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setRollType(value)}
                                    className={`px-3 py-2 rounded text-sm font-semibold ${rollType === value ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sélection carac */}
                    {rollType === 'carac' && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Caractéristique</label>
                            <div className="grid grid-cols-3 gap-2">
                                {Object.entries(CARACNAMES).map(([key, name]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedCarac(key)}
                                        className={`px-2 py-1.5 rounded text-xs font-semibold ${selectedCarac === key ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}
                                    >
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
                            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto">
                                {(character.skills || [])
                                    .filter(s => s.level > 0)
                                    .sort((a, b) => b.level - a.level)
                                    .map((skill, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedSkill(skill)}
                                            className={`px-3 py-1.5 rounded text-xs font-semibold text-left ${
                                                selectedSkill?.name === skill.name && selectedSkill?.specialization === skill.specialization
                                                    ? 'bg-viking-bronze text-viking-brown'
                                                    : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'
                                            }`}
                                        >
                                            {formatSkillName(skill)} — seuil {getSuccessThreshold(skill.level)}+ / pts: {skill.currentPoints}/{skill.level}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Résumé jet */}
                    <RollSummary
                        character={character}
                        rollType={rollType}
                        selectedCarac={selectedCarac}
                        selectedSkill={selectedSkill}
                        traitAutoBonus={traitAutoBonus}
                        activeConditionalBonuses={activeConditionalBonuses}
                        autoSuccesses={autoSuccesses}
                        isBerserk={isBerserk}
                        sagaMode={sagaMode}
                    />

                    {/* Succès auto */}
                    {rollType === 'skill' && selectedSkill && selectedSkill.currentPoints > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">
                                Succès automatiques ({selectedSkill.currentPoints} pts disponibles)
                            </label>
                            <div className="flex gap-2">
                                {[0, 1, 2, 3].filter(n => n <= selectedSkill.currentPoints).map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setAutoSuccesses(n)}
                                        className={`px-3 py-1.5 rounded text-sm font-semibold ${autoSuccesses === n ? 'bg-viking-bronze text-viking-brown' : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment'}`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Bonus traits conditionnels */}
                    {conditionalBonuses.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Traits conditionnels</label>
                            <div className="space-y-1">
                                {conditionalBonuses.map((cond, i) => {
                                    const isActive = activeConditionalBonuses.some(b => b.name === cond.name);
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setActiveConditionalBonuses(prev =>
                                                isActive
                                                    ? prev.filter(b => b.name !== cond.name)
                                                    : [...prev, cond]
                                            )}
                                            className={`w-full px-3 py-1.5 rounded text-xs text-left border-2 ${
                                                isActive
                                                    ? 'bg-viking-bronze text-viking-brown border-viking-leather'
                                                    : 'bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment border-viking-leather/30 dark:border-viking-bronze/30 hover:border-viking-bronze'
                                            }`}
                                        >
                                            <div className="font-semibold flex justify-between">
                                                <span>{cond.name}</span>
                                                <span className={isActive ? 'text-viking-leather' : 'text-viking-bronze'}>{cond.bonus > 0 ? '+' : ''}{cond.bonus}</span>
                                            </div>
                                            <div className="text-xs opacity-75 mt-0.5">{cond.condition}</div>
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
                                { value: null,        label: 'Normal' },
                                { value: 'heroic',    label: '🔥 Héroïque (4)' },
                                { value: 'epic',      label: '⚡ Épique (5)' },
                                { value: 'insurance', label: '🛡️ Assurance' },
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
                                {sagaMode === 'insurance' && 'Deux jets → garde le meilleur. Dépense 1 SAGA.'}
                            </div>
                        )}
                    </div>

                    {/* Bouton lancer */}
                    <button
                        onClick={handleRoll}
                        disabled={rolling || (rollType === 'skill' && !selectedSkill)}
                        className="w-full py-3 rounded-lg font-bold text-base bg-viking-bronze text-viking-brown hover:bg-viking-leather hover:text-viking-parchment disabled:opacity-50 transition-all"
                    >
                        {rolling ? '⏳ Lancer…' : '🎲 Lancer les dés'}
                    </button>

                </div>
            </div>
        </div>
    );
};

// ─── Résumé pré-jet ───────────────────────────────────────────────────────────
const RollSummary = ({
                         character, rollType, selectedCarac, selectedSkill,
                         traitAutoBonus, activeConditionalBonuses, autoSuccesses, isBerserk, sagaMode,
                     }) => {

    const caracLevel = rollType === 'carac'
        ? (character[selectedCarac] || 2)
        : (selectedSkill ? getBestCharacteristic(character, selectedSkill).level : 2);

    const blessureMalus  = isBerserk ? 0 : getBlessureMalus(character.tokensBlessure);
    const fatigueMalus   = character.traits?.some(t => t.name === 'Infatigable')
        ? 0 : getFatigueMalus(character.tokensFatigue);
    const pool           = Math.max(1, 3 - blessureMalus);
    const threshold      = rollType === 'skill' && selectedSkill
        ? getSuccessThreshold(selectedSkill.level) : 7;
    const explodeMin     = getExplosionThreshold(caracLevel)[0];
    const activeCondSum  = activeConditionalBonuses.reduce((s, b) => s + b.bonus, 0);
    const bonusTotal     = traitAutoBonus + activeCondSum + (isBerserk ? 2 : 0);

    return (
        <div className="bg-viking-parchment/50 dark:bg-gray-800/50 rounded p-3 text-xs text-viking-leather dark:text-viking-bronze space-y-1">
            <div>Dés : <strong>{pool}d10</strong> — explosion {explodeMin}+ — succès {threshold}+</div>
            {bonusTotal !== 0 && <div>Bonus traits : <strong>{bonusTotal > 0 ? '+' : ''}{bonusTotal}</strong></div>}
            {autoSuccesses > 0 && <div>Succès auto : <strong>+{autoSuccesses}</strong></div>}
            {fatigueMalus > 0  && <div>Malus fatigue : <strong>-{fatigueMalus}</strong></div>}
            {blessureMalus > 0 && <div>Malus blessure : <strong>-{blessureMalus} dé(s)</strong></div>}
            {sagaMode          && <div>Mode : <strong>{sagaMode == 'insurance' ? 'Assurance' : (sagaMode == 'epic' ? 'Épique' : (sagaMode == 'heroic' ? 'Héroïque' : sagaMode))}</strong> — 1 point SAGA dépensé</div>}
        </div>
    );
};

// ─── Vue résultats ────────────────────────────────────────────────────────────
const DiceResultsView = ({ results, character, onClose, onRollAgain }) => {
    const { detail, meta, successes, allDice, flags } = results;
    const threshold = detail?.threshold ?? 7;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2"
             onClick={onClose}>
            <div className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-sm w-full border-4 border-viking-bronze p-4"
                 onClick={e => e.stopPropagation()}>

                <h3 className="text-lg font-bold text-viking-brown dark:text-viking-parchment mb-3">
                    🎲 Résultat
                </h3>


                <div className="p-4 bg-viking-parchment dark:bg-gray-800 rounded-lg border-2 border-viking-bronze space-y-3">
                    {meta?.keptGroup != null ? (
                        // ── Assurance : deux jets séparés ────────────────────────────
                        [allDice.slice(0, detail.pool), meta.secondaryValues ?? []].map((groupValues, gi) => {
                            const isKept = meta.keptGroup === gi;
                            return (
                                <div key={gi} className={`p-2 rounded ${isKept ? 'bg-viking-success/20 border-2 border-viking-success' : 'opacity-50'}`}>
                                    <div className="text-xs font-semibold mb-1 text-viking-brown dark:text-viking-parchment">
                                        Jet {gi + 1} : {groupValues.filter(v => v >= detail.threshold).length} succès {isKept && '✅ GARDÉ'}
                                    </div>
                                    <DiceRow dice={groupValues} threshold={detail.threshold} explosionThresholds={detail.explosionThresholds} />
                                </div>
                            );
                        })
                    ) : meta?.sagaValues?.length > 0 && !meta?.sagaFailed ? (
                        // ── SAGA : jet principal + jet bonus séparés ─────────────────
                        <>
                            <div className="text-xs font-semibold mb-2 text-viking-brown dark:text-viking-parchment">Jet principal</div>
                            <DiceRow dice={allDice.slice(0, detail.pool + (flags?.exploded?.length ?? 0))} threshold={threshold} explosionThresholds={detail.explosionThresholds} />

                            <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-900/30 rounded border border-amber-400">
                                <div className="text-xs font-semibold mb-1 text-amber-700 dark:text-amber-300">
                                    Jet SAGA {meta.finalTarget === 5 ? 'Épique' : 'Héroïque'} : {meta.bonusSuccesses} succès
                                </div>
                                <DiceRow dice={meta.sagaValues} threshold={7} explosionThresholds={[10]} />
                                {meta.failReason && (
                                    <div className="text-xs text-viking-danger mt-1">{meta.failReason}</div>
                                )}
                            </div>
                        </>

                    ) : (
                        // ── Jet normal : flat ─────────────────────────────────────────
                        <>
                            <DiceRow dice={allDice} threshold={threshold} explosionThresholds={detail.explosionThresholds} />
                        </>
                    )}
                </div>

                <div className="text-center pt-2 border-t border-viking-bronze/30">
                    <div className="text-2xl font-bold text-viking-brown dark:text-viking-parchment">
                        {successes} succès
                    </div>
                    {detail && (
                        <div className="text-xs text-viking-leather dark:text-viking-bronze mt-1 space-y-0.5">
                            <div>Base : {detail.baseSuccesses} | Auto : {detail.autoSuccesses} | Traits : {detail.traitBonus > 0 ? '+' : ''}{detail.traitBonus}</div>
                            {detail.fatigueMalus > 0 && <div>Malus fatigue : −{detail.fatigueMalus}</div>}
                            {detail.blessureMalus > 0 && <div>Malus blessure : −{detail.blessureMalus} dés</div>}
                            <div>Seuil : {detail.threshold}+ | Explosion: {detail.explosionThresholds[0]}+ | Pool : {detail.pool}d10</div>
                            {detail.rollTarget && <div>Cible : {detail.rollTarget}</div>}
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    <button onClick={onRollAgain} className="flex-1 py-2 rounded bg-viking-bronze text-viking-brown font-semibold text-sm hover:bg-viking-leather hover:text-viking-parchment">
                        Relancer
                    </button>
                    <button onClick={onClose} className="flex-1 py-2 rounded bg-gray-200 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment font-semibold text-sm">
                        Fermer
                    </button>
                </div>
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