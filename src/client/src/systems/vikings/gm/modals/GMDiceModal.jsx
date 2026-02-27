// src/client/src/systems/vikings/gm/modals/GMDiceModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Lanceur de dés MJ — délègue le calcul à diceEngine + vikingsConfig.dice.
// L'UX est simplifiée : pas de mode saga, pas de compétences.
// Le MJ choisit manuellement le pool, le seuil et le seuil d'explosion.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useCallback } from 'react';
import { roll }                from '../../../../tools/diceEngine.js';
import DiceAnimationOverlay    from '../../../../components/shared/DiceAnimationOverlay.jsx';
import { readDiceConfig }      from '../../../../components/modals/DiceConfigModal.jsx';
import { useFetch }            from '../../../../hooks/useFetch.js';

// Hooks MJ : minimalistes, le MJ configure directement notation
const GM_DICE_HOOKS = {
    buildNotation: (ctx) => {
        const { pool, threshold, explosionMin } = ctx.systemData;
        return `${pool}d10!>=${explosionMin}>=${threshold}`;
    },
    beforeRoll: (ctx) => ctx,
    afterRoll: (raw, ctx) => ({
        notation:  ctx._notation || '',
        allDice:   raw.allDice,
        successes: raw.successes ?? 0,
        total:     null,
        outcome:   null,
        flags:     raw.flags,
        detail: {
            pool:               ctx.systemData.pool,
            threshold:          ctx.systemData.threshold,
            explosionThresholds: [ctx.systemData.explosionMin, ...(ctx.systemData.explosionMin < 10 ? [10] : [])],
            baseSuccesses:      raw.successes ?? 0,
            rollTarget:         'Jet MJ',
        },
        meta: { autoSuccesses: 0, resourceSpent: 0, resourceGained: 0, secondRoll: null, keptRoll: null },
    }),
    buildAnimationSequence: (raw, _ctx) => ({
        mode: 'single',
        groups: [{ id: 'main', diceType: 'd10', color: 'default', label: 'Jet MJ', waves: raw.waves }],
        insuranceData: null,
    }),
};

const GMDiceModal = ({ onClose, darkMode, sessionId = null }) => {

    const [pool,      setPool]      = useState(3);
    const [threshold, setThreshold] = useState(7);
    const [explosion, setExplosion] = useState(10); // valeur minimale d'explosion
    const [rolling,   setRolling]   = useState(false);
    const [result,    setResult]    = useState(null);
    const [broadcast, setBroadcast] = useState(false);
    const [animationData, setAnimationData] = useState(null);

    const fetchWithAuth    = useFetch();
    const pendingResultRef = useRef(null);
    const broadcastRef     = useRef(broadcast);
    broadcastRef.current   = broadcast;

    const reset = () => {
        setResult(null);
        setAnimationData(null);
        pendingResultRef.current = null;
    };

    // ── Fin d'animation ───────────────────────────────────────────────────────
    const handleAnimationComplete = useCallback(() => {
        const pending = pendingResultRef.current;
        if (!pending) return;

        setResult(pending.engineResult.result);

        if (broadcastRef.current) {
            fetchWithAuth('/api/dice/roll', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    character_id:   -1,
                    character_name: 'MJ',
                    session_id:     sessionId,
                    notation:       pending.engineResult.notation,
                    roll_result:    pending.engineResult.result,
                    // Legacy
                    roll_type:      'carac',
                    roll_target:    'Jet MJ',
                    pool:           pending.engineResult.result.detail?.pool,
                    threshold:      pending.engineResult.result.detail?.threshold,
                    results:        pending.engineResult.result.allDice,
                    successes:      pending.engineResult.result.successes,
                    saga_spent:     0,
                    saga_recovered: 0,
                })
            }).catch(err => console.error('[GMDiceModal] broadcast error:', err));
        }

        pendingResultRef.current = null;
        setAnimationData(null);
        setRolling(false);
    }, [fetchWithAuth, sessionId]);

    // ── Lancer ────────────────────────────────────────────────────────────────
    const handleRoll = () => {
        setRolling(true);
        setResult(null);

        const ctx = {
            characterId:   -1,
            characterName: 'MJ',
            sessionId,
            systemSlug:    'vikings',
            label:         'Jet MJ',
            rollType:      'carac',
            declaredMode:  null,
            systemData: { pool, threshold, explosionMin: explosion },
        };

        try {
            const engineResult = roll(ctx, GM_DICE_HOOKS);
            const { animationEnabled } = readDiceConfig();

            if (animationEnabled !== false) {
                pendingResultRef.current = { engineResult };
                setAnimationData({ animationSequence: engineResult.animationSequence });
            } else {
                setResult(engineResult.result);
                if (broadcastRef.current) {
                    fetchWithAuth('/api/dice/roll', {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            character_id: -1, character_name: 'MJ', session_id: sessionId,
                            notation: engineResult.notation, roll_result: engineResult.result,
                            roll_type: 'carac', roll_target: 'Jet MJ',
                            pool, threshold, results: engineResult.result.allDice,
                            successes: engineResult.result.successes, saga_spent: 0, saga_recovered: 0,
                        })
                    }).catch(err => console.error('[GMDiceModal] broadcast error:', err));
                }
                setRolling(false);
            }
        } catch (err) {
            console.error('[GMDiceModal] handleRoll error:', err);
            setRolling(false);
        }
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b-2 border-viking-bronze flex justify-between items-center">
                    <h3 className="text-lg font-viking font-bold text-viking-brown dark:text-viking-parchment">🎲 Jet MJ</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze hover:text-viking-danger">✕</button>
                </div>

                <div className="p-4 space-y-4">

                    {/* Pool */}
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Pool : {pool}d10</label>
                        <input type="range" min={1} max={10} value={pool} onChange={e => setPool(Number(e.target.value))} className="w-full" />
                    </div>

                    {/* Seuil de succès */}
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Seuil de succès : {threshold}+</label>
                        <input type="range" min={1} max={10} value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-full" />
                    </div>

                    {/* Seuil d'explosion */}
                    <div>
                        <label className="block text-sm font-semibold text-viking-brown dark:text-viking-parchment mb-2">Explosion à partir de : {explosion}+</label>
                        <input type="range" min={1} max={10} value={explosion} onChange={e => setExplosion(Number(e.target.value))} className="w-full" />
                    </div>

                    {/* Broadcast */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={broadcast} onChange={e => setBroadcast(e.target.checked)} className="w-4 h-4" />
                        <span className="text-sm text-viking-brown dark:text-viking-parchment">Diffuser aux joueurs</span>
                    </label>

                    {/* Bouton */}
                    <button
                        onClick={handleRoll}
                        disabled={rolling}
                        className={`w-full py-3 rounded-lg font-bold text-lg ${rolling ? 'bg-gray-400 cursor-not-allowed' : 'bg-viking-bronze hover:bg-viking-leather text-viking-brown'}`}
                    >
                        {rolling ? '🎲 Lancer...' : '🎲 Lancer !'}
                    </button>

                    {/* Résultat */}
                    {result && (
                        <div className="p-4 bg-viking-parchment dark:bg-gray-800 rounded-lg border-2 border-viking-bronze text-center">
                            <div className="text-2xl font-bold text-viking-brown dark:text-viking-parchment mb-2">
                                {result.successes} succès
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center mb-2">
                                {(result.allDice || []).map((die, idx) => {
                                    const isSuccess   = die >= threshold;
                                    const isExplosion = die >= explosion;
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
                            <div className="text-xs text-viking-leather dark:text-viking-bronze">
                                {pool}d10 — Seuil {threshold}+ — Explosion {explosion}+
                            </div>
                            <button onClick={reset} className="mt-3 text-xs text-viking-leather dark:text-viking-bronze underline">Réinitialiser</button>
                        </div>
                    )}
                </div>

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

export default GMDiceModal;