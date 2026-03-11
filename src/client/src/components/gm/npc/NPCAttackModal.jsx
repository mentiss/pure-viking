// src/client/src/components/gm/npc/NPCAttackModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modal d'attaque NPC — entièrement générique via combatConfig.
// VERSION v2 (diceEngine async).
//
// Machine à états : select → roll → rolled → target
//
// Suppressions par rapport à v1 :
//   - Plus de DiceAnimationOverlay local (singleton dans GMPage)
//   - Plus de pendingResultRef / animationData
//   - Plus de sendToHistory séparé (géré par roll() via ctx.persistHistory)
//   - roll() est async (animation + persist inclus)
//
// Changements getNPCRollContext :
//   - Nouvelle signature : (npc, attack, { apiBase, fetchFn, sessionId })
//   - Le slug reçoit les infos réseau pour que le ctx soit complet
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { roll }             from '../../../tools/diceEngine.js';
import TargetSelectionModal from '../../combat/TargetSelectionModal.jsx';
import { useFetch }         from '../../../hooks/useFetch.js';
import { useSystem }        from '../../../hooks/useSystem.js';

const NPCAttackModal = ({ npc, combatState, combatConfig, onClose, onAttackSubmitted }) => {
    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();
    const sessionId     = combatState?.sessionId ?? null;

    // ── Attaque sélectionnée ──────────────────────────────────────────────────
    const attaques          = npc.attaques ?? [];
    const hasMultipleAttacks = attaques.length > 1;

    const [selectedAttack, setSelectedAttack] = useState(
        hasMultipleAttacks ? null : (attaques[0] ?? null)
    );

    // ── Machine à états ───────────────────────────────────────────────────────
    const [step,       setStep]       = useState(hasMultipleAttacks ? 'select' : 'roll');
    const [rolling,    setRolling]    = useState(false);
    const [rollResult, setRollResult] = useState(null);
    const [broadcast,  setBroadcast]  = useState(true);

    // ── Lancer le dé ─────────────────────────────────────────────────────────
    const handleRoll = useCallback(async () => {
        if (!selectedAttack || !combatConfig?.attack?.getNPCRollContext) return;
        setRolling(true);
        setRollResult(null);

        try {
            // Nouvelle signature : passe { apiBase, fetchFn, sessionId } au slug
            const ctx = combatConfig.attack.getNPCRollContext(
                npc,
                selectedAttack,
                { apiBase, fetchFn: fetchWithAuth, sessionId }
            );

            // broadcast = false → jet secret (pas d'historique)
            const ctxWithBroadcast = { ...ctx, persistHistory: broadcast };

            const notation = combatConfig.dice.buildNotation(ctxWithBroadcast);
            // await : animation + persist inclus dans roll()
            const result   = await roll(notation, ctxWithBroadcast, combatConfig.dice);

            setRollResult(result);
            setStep('rolled');

        } catch (err) {
            console.error('[NPCAttackModal] roll error:', err);
        } finally {
            setRolling(false);
        }
    }, [selectedAttack, combatConfig, npc, apiBase, fetchWithAuth, sessionId, broadcast]);

    // ── Confirmation cible ────────────────────────────────────────────────────
    const handleTargetConfirm = (target, finalDamage) => {
        onAttackSubmitted({
            attackerId:   npc.id,
            attackerName: npc.name,
            targetId:     target.id,
            targetName:   target.name,
            weapon: {
                nom:    selectedAttack?.name  ?? 'Attaque',
                degats: selectedAttack?.degats ?? 0,
            },
            damage:     finalDamage,
            rollResult,
        });
        onClose();
    };

    const availableTargets = (combatState?.combatants ?? []).filter(c => c.id !== npc.id);
    const successes         = rollResult?.successes ?? 0;

    // ── Modal cible ───────────────────────────────────────────────────────────
    if (step === 'target' && rollResult) {
        return (
            <TargetSelectionModal
                combatState={combatState}
                attacker={npc}
                selectedWeapon={{
                    nom:    selectedAttack?.name  ?? 'Attaque',
                    degats: selectedAttack?.degats ?? 0,
                }}
                rollResult={rollResult}
                availableTargets={availableTargets}
                combatConfig={combatConfig}
                onConfirm={handleTargetConfirm}
                onCancel={() => setStep('rolled')}
            />
        );
    }

    // ── Modal principale ──────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-viking-bronze">
                    <h3 className="font-bold text-viking-brown dark:text-viking-parchment">⚔️ {npc.name}</h3>
                    <button onClick={onClose} className="text-viking-leather dark:text-viking-bronze text-xl">✕</button>
                </div>

                <div className="p-4">

                    {/* ── STEP : select ──────────────────────────────────────── */}
                    {step === 'select' && (
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-3">
                                Choisir une attaque :
                            </p>
                            {attaques.map((atk, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setSelectedAttack(atk); setStep('roll'); }}
                                    className="w-full px-4 py-3 rounded-lg border-2 border-viking-leather dark:border-viking-bronze text-left hover:border-viking-bronze dark:hover:border-viking-bronze hover:bg-viking-parchment/50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    <div className="font-semibold text-viking-brown dark:text-viking-parchment">{atk.name}</div>
                                    <div className="text-xs text-viking-leather dark:text-viking-bronze mt-0.5">
                                        Seuil {atk.succes}+ | Explosion {atk.explosion}+ | {atk.degats} dégâts
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* ── STEP : roll ────────────────────────────────────────── */}
                    {step === 'roll' && selectedAttack && (
                        <div className="space-y-4">
                            <div className="p-3 bg-viking-parchment/50 dark:bg-gray-800/50 rounded">
                                <div className="font-semibold text-viking-brown dark:text-viking-parchment">{selectedAttack.name}</div>
                                <div className="text-xs text-viking-leather dark:text-viking-bronze mt-0.5">
                                    Seuil {selectedAttack.succes}+ | Explosion {selectedAttack.explosion}+ | {selectedAttack.degats} dégâts
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-sm text-viking-leather dark:text-viking-bronze cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={broadcast}
                                    onChange={e => setBroadcast(e.target.checked)}
                                    className="accent-viking-bronze"
                                />
                                Visible dans l'historique
                            </label>

                            <div className="flex gap-2">
                                {hasMultipleAttacks && (
                                    <button
                                        onClick={() => setStep('select')}
                                        className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment font-semibold text-sm"
                                    >← Retour</button>
                                )}
                                <button
                                    onClick={handleRoll}
                                    disabled={rolling}
                                    className="flex-1 py-2 rounded bg-viking-bronze text-viking-brown font-semibold text-sm hover:bg-viking-leather hover:text-viking-parchment disabled:opacity-50"
                                >
                                    {rolling ? '⏳ Jet en cours…' : '🎲 Lancer'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP : rolled ──────────────────────────────────────── */}
                    {step === 'rolled' && rollResult && (
                        <div className="space-y-4">
                            <div className="p-4 bg-viking-parchment/50 dark:bg-gray-800/50 rounded border-2 border-viking-bronze text-center">
                                <div className="text-3xl font-bold text-viking-brown dark:text-viking-parchment mb-1">
                                    {successes}
                                </div>
                                <div className="text-sm text-viking-leather dark:text-viking-bronze mb-2">succès</div>

                                {rollResult.allDice?.length > 0 && (
                                    <div className="flex justify-center gap-1 flex-wrap">
                                        {rollResult.allDice.map((d, i) => (
                                            <span key={i} className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold border-2 ${
                                                d >= (selectedAttack?.explosion ?? 10)
                                                    ? 'border-yellow-400 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                                    : d >= (selectedAttack?.succes ?? 6)
                                                        ? 'border-green-400 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                                        : 'border-gray-400 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}>
                                                {d}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => { setRollResult(null); setStep('roll'); }}
                                    className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 text-viking-brown dark:text-viking-parchment font-semibold text-sm"
                                >Relancer</button>
                                <button
                                    onClick={() => setStep('target')}
                                    className="flex-1 py-2 rounded bg-viking-bronze text-viking-brown font-semibold text-sm hover:bg-viking-leather"
                                >Choisir la cible →</button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default NPCAttackModal;