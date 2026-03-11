// src/client/src/systems/dune/gm/modals/GMDiceModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modale de jet de dés MJ Dune — VERSION v2 (diceEngine async).
//
// Suppressions par rapport à v1 :
//   - Plus d'import DiceRoll direct
//   - Plus de DiceAnimationOverlay local (singleton dans GMPage)
//   - Plus de animSequence / pendingResult
//   - roll() est async (animation + persist inclus)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { roll, RollError } from '../../../../tools/diceEngine.js';
import { useSocket }       from '../../../../context/SocketContext.jsx';
import { useFetch }        from '../../../../hooks/useFetch.js';
import { useSystem }       from '../../../../hooks/useSystem.js';
import duneConfig          from '../../config.jsx';

const { countSuccesses } = duneConfig;
const MAX_DES = 5;

const DieResult = ({ value, rang }) => {
    let bg;
    if (value === 20)       bg = 'var(--dune-red)';
    else if (value <= rang) bg = 'var(--dune-success)';
    else                    bg = 'var(--dune-surface-alt)';

    return (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border-2"
             style={{ background: bg, borderColor: bg,
                 color: value === 20 ? 'white' : value <= rang ? 'var(--dune-dark)' : 'var(--dune-text-muted)' }}>
            {value}
        </div>
    );
};

// Hooks MJ inline — pas de logique Dune avancée (pas de spécialisation, pas de détermination)
const GM_DICE_HOOKS = {
    buildNotation: (ctx) => `${ctx.systemData.nbDes}d20`,

    beforeRoll: (ctx) => {
        if (ctx.systemData.nbDes < 1) throw new RollError('NO_DICE', 'Aucun dé à lancer');
        return ctx;
    },

    afterRoll: (raw, ctx) => {
        const { rang, difficulte } = ctx.systemData;
        const results = raw.groups[0].values;
        let succesTotal = 0, complications = 0;
        for (const v of results) {
            if (v === 20) { complications++; continue; }
            if (v <= rang) succesTotal++;
        }
        const reussite = succesTotal >= difficulte;
        const excedent = Math.max(0, succesTotal - difficulte);
        return { results, rang, succes: succesTotal, complications, difficulte, reussite, excedent, successes: succesTotal };
    },

    buildAnimationSequence: (raw, ctx, result) => ({
        mode: 'single',
        groups: [{
            id:       'gm-roll',
            diceType: 'd20',
            color:    result.reussite ? 'fortune' : 'default',
            label:    `MJ — ${ctx.systemData.nbDes}d20`,
            waves:    raw.groups[0].waves,
        }],
    }),
};

const GMDiceModal = ({ onClose, sessionId = null }) => {
    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();
    const socket        = useSocket();

    const [rang,       setRang]       = useState(3);
    const [difficulte, setDifficulte] = useState(1);
    const [nbDes,      setNbDes]      = useState(2);
    const [menaceDepensee, setMenaceDepensee] = useState(0);
    const [rolling,    setRolling]    = useState(false);
    const [result,     setResult]     = useState(null);
    const [broadcast,  setBroadcast]  = useState(false);

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
                rollType:       'dune_gm_2d20',
                label:          `MJ — ${nbDes}d20`,
                persistHistory: broadcast,
                systemData: {
                    nbDes,
                    rang,
                    difficulte,
                    hasSpec:              false,
                    competenceRang:       0,
                    impulsionsDepensees:  0,
                    menaceGeneree:        menaceDepensee,
                    useDetermination:     false,
                },
            };

            const notation = GM_DICE_HOOKS.buildNotation(ctx);
            const res      = await roll(notation, ctx, GM_DICE_HOOKS);
            setResult(res);

            // Mise à jour ressources session
            if (socket && sessionId && menaceDepensee > 0) {
                socket.emit('update-session-resources', {
                    sessionId,
                    menaceSpent:   menaceDepensee,
                    complications: res.complications,
                });
            }

        } catch (err) {
            console.error('[DuneGMDiceModal] handleRoll error:', err);
        } finally {
            setRolling(false);
        }
    }, [rolling, rang, difficulte, nbDes, menaceDepensee, broadcast, sessionId, apiBase, fetchWithAuth, socket]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-xl shadow-2xl overflow-hidden"
                 style={{ background: 'var(--dune-surface)', border: '2px solid var(--dune-ochre)' }}>

                {/* En-tête */}
                <div className="flex items-center justify-between px-4 py-3"
                     style={{ background: 'var(--dune-dark)', borderBottom: '1px solid var(--dune-ochre)' }}>
                    <div className="text-sm font-bold" style={{ color: 'var(--dune-gold)' }}>
                        Jet MJ — {nbDes}d20
                    </div>
                    <button onClick={onClose} style={{ color: 'var(--dune-sand)' }}>✕</button>
                </div>

                <div className="p-4 space-y-4">
                    {!result ? (
                        <>
                            {/* Rang */}
                            <div>
                                <div className="dune-label mb-2">Rang cible</div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setRang(r => Math.max(1, r - 1))} className="dune-btn-secondary px-3">-</button>
                                    <span className="text-lg font-bold w-8 text-center" style={{ color: 'var(--dune-gold)' }}>{rang}</span>
                                    <button onClick={() => setRang(r => Math.min(20, r + 1))} className="dune-btn-secondary px-3">+</button>
                                </div>
                            </div>

                            {/* Difficulté */}
                            <div>
                                <div className="dune-label mb-2">Difficulté</div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setDifficulte(d => Math.max(1, d - 1))} className="dune-btn-secondary px-3">-</button>
                                    <span className="text-lg font-bold w-8 text-center" style={{ color: 'var(--dune-gold)' }}>{difficulte}</span>
                                    <button onClick={() => setDifficulte(d => Math.min(5, d + 1))} className="dune-btn-secondary px-3">+</button>
                                </div>
                            </div>

                            {/* Dés */}
                            <div>
                                <div className="dune-label mb-2">Nombre de dés</div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setNbDes(n => Math.max(2, n - 1))} className="dune-btn-secondary px-3">-</button>
                                    <span className="text-lg font-bold w-8 text-center" style={{ color: 'var(--dune-gold)' }}>{nbDes}</span>
                                    <button onClick={() => setNbDes(n => Math.min(MAX_DES, n + 1))} className="dune-btn-secondary px-3">+</button>
                                </div>
                            </div>

                            {/* Broadcast */}
                            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--dune-text-muted)' }}>
                                <input type="checkbox" checked={broadcast}
                                       onChange={e => setBroadcast(e.target.checked)}
                                       className="accent-amber-500" />
                                Visible dans l'historique
                            </label>

                            <button
                                onClick={handleRoll}
                                disabled={rolling}
                                className="dune-btn-primary w-full disabled:opacity-50"
                            >
                                {rolling ? '⏳ Lancement…' : `🎲 Lancer ${nbDes}d20`}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Résultats */}
                            <div className="text-center">
                                <div className="text-2xl font-bold mb-1"
                                     style={{ color: result.reussite ? 'var(--dune-success)' : 'var(--dune-red)' }}>
                                    {result.reussite ? '✅ Réussite' : '❌ Échec'}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--dune-text-muted)' }}>
                                    {result.succes} succès / {result.difficulte} requis
                                    {result.complications > 0 && ` · ⚠️ ${result.complications} complication(s)`}
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap justify-center">
                                {(result.results ?? []).map((v, i) => (
                                    <DieResult key={i} value={v} rang={rang} />
                                ))}
                            </div>
                            <button onClick={() => setResult(null)} className="dune-btn-secondary w-full text-xs">Nouveau jet</button>
                            <button onClick={onClose} className="dune-btn-primary w-full">Fermer</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GMDiceModal;