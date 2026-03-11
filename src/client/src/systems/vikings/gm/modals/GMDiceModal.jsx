// src/client/src/systems/vikings/gm/modals/GMDiceModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modale de jet de dés MJ Vikings — VERSION v2 (diceEngine async).
//
// Suppressions par rapport à v1 :
//   - Plus de DiceAnimationOverlay local (singleton dans GMPage)
//   - Plus de pendingResultRef / animationData
//   - Plus de hooks GM_DICE_HOOKS locaux (inline dans le roll())
//   - roll() est async (animation + persist inclus)
//
// Broadcast : le MJ peut choisir de rendre le jet visible dans l'historique
// (ctx.persistHistory = broadcast → true par défaut, false = jet secret)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { roll, RollError } from '../../../../tools/diceEngine.js';
import { useFetch }        from '../../../../hooks/useFetch.js';
import { useSystem }       from '../../../../hooks/useSystem.js';

// Hooks MJ inline — minimalistes, pas de logique Vikings
const GM_DICE_HOOKS = {
    buildNotation: (ctx) => {
        const { pool, explosionMin, threshold } = ctx.systemData;
        return `${pool}d10!>=${explosionMin}>=${threshold}`;
    },
    afterRoll: (raw, ctx) => ({
        allDice:   raw.allDice,
        successes: raw.groups[0].values.filter(v => v >= ctx.systemData.threshold).length,
        total:     null,
        flags:     raw.flags,
        detail: {
            pool:      ctx.systemData.pool,
            threshold: ctx.systemData.threshold,
            explosionMin: ctx.systemData.explosionMin,
        },
        meta: {},
    }),
    buildAnimationSequence: (raw, ctx) => ({
        mode: 'single',
        groups: [{ id: 'main', diceType: 'd10', color: 'default', label: 'Jet MJ', waves: raw.groups[0].waves }],
    }),
};

const GMDiceModal = ({ onClose, darkMode, sessionId = null }) => {
    const [pool,      setPool]      = useState(3);
    const [threshold, setThreshold] = useState(7);
    const [explosion, setExplosion] = useState(10);
    const [rolling,   setRolling]   = useState(false);
    const [result,    setResult]    = useState(null);
    const [broadcast, setBroadcast] = useState(false);

    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();

    const reset = () => setResult(null);

    const handleRoll = useCallback(async () => {
        if (rolling) return;
        setRolling(true);
        setResult(null);

        try {
            const ctx = {
                apiBase,
                fetchFn:        fetchWithAuth,
                characterId:    null,
                characterName:  'MJ',
                sessionId,
                rollType:       'vikings_gm',
                label:          'Jet MJ',
                // broadcast = false → jet secret, true → historisé
                persistHistory: broadcast,
                systemData: {
                    pool,
                    threshold,
                    explosionMin: explosion,
                },
            };

            // buildNotation est dans GM_DICE_HOOKS ici
            const notation = GM_DICE_HOOKS.buildNotation(ctx);
            const res      = await roll(notation, ctx, GM_DICE_HOOKS);
            setResult(res);

        } catch (err) {
            console.error('[GMDiceModal] handleRoll error:', err);
        } finally {
            setRolling(false);
        }
    }, [rolling, pool, threshold, explosion, broadcast, sessionId, apiBase, fetchWithAuth]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-viking-brown rounded-lg shadow-2xl max-w-md w-full border-4 border-viking-bronze p-6"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-viking-brown dark:text-viking-parchment">🎲 Jet MJ</h3>
                    <button onClick={onClose} className="text-2xl text-viking-leather dark:text-viking-bronze">✕</button>
                </div>

                <div className="space-y-4 mb-4">
                    {/* Pool */}
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment w-24">Pool d10</label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPool(p => Math.max(1, p - 1))} className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold">-</button>
                            <span className="text-lg font-bold text-viking-bronze w-8 text-center">{pool}</span>
                            <button onClick={() => setPool(p => Math.min(10, p + 1))} className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold">+</button>
                        </div>
                    </div>

                    {/* Seuil succès */}
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment w-24">Seuil succès</label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setThreshold(t => Math.max(1, t - 1))} className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold">-</button>
                            <span className="text-lg font-bold text-viking-bronze w-8 text-center">{threshold}+</span>
                            <button onClick={() => setThreshold(t => Math.min(10, t + 1))} className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold">+</button>
                        </div>
                    </div>

                    {/* Seuil explosion */}
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-semibold text-viking-brown dark:text-viking-parchment w-24">Explosion</label>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setExplosion(e => Math.max(threshold + 1, e - 1))} className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold">-</button>
                            <span className="text-lg font-bold text-viking-bronze w-8 text-center">{explosion}+</span>
                            <button onClick={() => setExplosion(e => Math.min(10, e + 1))} className="w-8 h-8 rounded bg-viking-parchment dark:bg-gray-800 text-viking-text dark:text-viking-parchment font-bold">+</button>
                        </div>
                    </div>

                    {/* Broadcast */}
                    <label className="flex items-center gap-2 text-sm text-viking-leather dark:text-viking-bronze cursor-pointer">
                        <input
                            type="checkbox"
                            checked={broadcast}
                            onChange={e => setBroadcast(e.target.checked)}
                            className="accent-viking-bronze"
                        />
                        Visible dans l'historique
                    </label>
                </div>

                {/* Résultat */}
                {result && (
                    <div className="p-4 bg-viking-parchment dark:bg-gray-800 rounded-lg border-2 border-viking-bronze text-center mb-4">
                        <div className="text-2xl font-bold text-viking-brown dark:text-viking-parchment mb-2">
                            {result.successes} succès
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center mb-2">
                            {(result.allDice || []).map((die, idx) => {
                                const isSuccess   = die >= threshold;
                                const isExplosion = die >= explosion;
                                return (
                                    <div key={idx} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold border-2 ${
                                        isExplosion
                                            ? 'bg-viking-bronze border-viking-leather text-viking-brown'
                                            : isSuccess
                                                ? 'bg-green-600 border-green-800 text-white'
                                                : 'bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600 text-viking-text dark:text-viking-parchment'
                                    }`}>
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

                <button
                    onClick={handleRoll}
                    disabled={rolling}
                    className={`w-full py-3 rounded-lg font-bold ${rolling ? 'bg-gray-400 cursor-not-allowed text-white' : 'bg-viking-bronze hover:bg-viking-leather text-viking-brown'}`}
                >
                    {rolling ? '⏳ Jet en cours…' : '🎲 Lancer !'}
                </button>
            </div>
        </div>
    );
};

export default GMDiceModal;