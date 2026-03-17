// src/client/src/systems/tecumah/gm/modals/GMDiceModal.jsx
// Modale de jet libre GM — D6 System + Wild Die.
// Pool entier direct + bonus/malus dés + bonus/malus résultat + difficulté.
// Pas de Wild Die séparé visuellement dans l'UI (géré côté animation).
// Jet public (visible dans l'historique) ou privé.

import React, { useState, useCallback } from 'react';
import {roll, RollError} from "../../../../../tools/diceEngine.js";
import tecumahConfig, {DIFFICULTY_LEVELS} from "../../../config.jsx";
import {useFetch} from "../../../../../hooks/useFetch.js";
import useSystem from "../../../../../hooks/useSystem.js";

// Hooks GM inline — pool direct, Wild Die activé, pas de ressource dépensée
const GM_HOOKS = {
    buildNotation: (ctx) => {
        const { poolFinal } = ctx.systemData;
        if (!poolFinal || poolFinal < 1)
            throw new RollError('NO_DICE', 'Pool insuffisant');
        if (poolFinal === 1) return '1d6!';
        return [`${poolFinal - 1}d6`, '1d6!'];
    },
    beforeRoll:  tecumahConfig.dice.beforeRoll,
    afterRoll:   tecumahConfig.dice.afterRoll,
    buildAnimationSequence: tecumahConfig.dice.buildAnimationSequence,
};

const GMDiceModal = ({ onClose, sessionId = null }) => {
    const fetchWithAuth = useFetch();
    const { apiBase }   = useSystem();

    const [pool,          setPool]          = useState(3);
    const [bonusDice,     setBonusDice]     = useState(0);
    const [bonusResultat, setBonusResultat] = useState(0);
    const [difficulte,    setDifficulte]    = useState(null);
    const [public_,       setPublic]        = useState(true);
    const [rolling,       setRolling]       = useState(false);
    const [result,        setResult]        = useState(null);

    const poolFinal = Math.max(1, pool + bonusDice);

    const handleRoll = useCallback(async () => {
        if (rolling) return;
        setRolling(true);

        const ctx = {
            apiBase,
            fetchFn:        fetchWithAuth,
            characterId:    -1,
            characterName:  'GM',
            sessionId,
            rollType:       'tecumah_gm_free',
            label:          `Jet MJ — ${poolFinal}D`,
            persistHistory: public_,
            systemData: {
                attrPips:     poolFinal * 3,
                compPips:     0,
                bonusDice:    0,
                malusBlessure: 0,
                bonusResultat,
                depense:      null,
                ppCount:      0,
                difficulte,
            },
        };

        try {
            const notation = GM_HOOKS.buildNotation(GM_HOOKS.beforeRoll(ctx));
            const res      = await roll(notation, ctx, GM_HOOKS);
            setResult(res);
        } catch (err) {
            console.error('[GMDiceModal/tecumah]', err);
        } finally {
            setRolling(false);
        }
    }, [rolling, pool, bonusDice, bonusResultat, difficulte, public_, poolFinal, apiBase, fetchWithAuth, sessionId]);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={e => { if (e.target === e.currentTarget && !rolling) onClose(); }}
        >
            <div
                className="rounded-xl shadow-2xl w-full max-w-sm"
                style={{ background: 'var(--color-bg)', border: '2px solid var(--color-border)' }}
            >
                <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                    <h2 style={{ fontWeight: 700, color: 'var(--color-primary)' }}>🎲 Jet MJ</h2>
                    <button onClick={onClose} style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>✕</button>
                </div>

                {!result ? (
                    <div className="p-5 flex flex-col gap-4">
                        {/* Pool */}
                        <Row label="Pool de dés">
                            <SpinBox value={pool} min={1} onChange={setPool} />
                        </Row>

                        {/* Bonus/Malus dés */}
                        <Row label="Bonus/Malus dés">
                            <SpinBox value={bonusDice} min={-(pool - 1)} onChange={setBonusDice} signed />
                        </Row>

                        {/* Pool final */}
                        <div className="text-center rounded-lg py-2" style={{ background: 'var(--color-surface-alt)' }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pool final</p>
                            <p style={{ fontWeight: 800, fontSize: '1.4rem', color: 'var(--color-primary)' }}>{poolFinal}D</p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                {poolFinal === 1 ? 'Wild Die seul' : `${poolFinal - 1}D normaux + Wild Die`}
                            </p>
                        </div>

                        {/* Bonus résultat */}
                        <Row label="Bonus/Malus résultat">
                            <SpinBox value={bonusResultat} onChange={setBonusResultat} signed />
                        </Row>

                        {/* Difficulté */}
                        <div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Difficulté</p>
                            <div className="flex flex-wrap gap-1 mb-2">
                                {DIFFICULTY_LEVELS.map(d => (
                                    <button
                                        key={d.value}
                                        onClick={() => setDifficulte(difficulte === d.value ? null : d.value)}
                                        className="px-2 py-0.5 rounded text-xs"
                                        style={{
                                            background: difficulte === d.value ? 'var(--color-accent)' : 'var(--color-surface)',
                                            color:      difficulte === d.value ? 'var(--color-bg)' : 'var(--color-text-muted)',
                                            border:     '1px solid var(--color-border)',
                                        }}
                                    >
                                        {d.label} ({d.value})
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number" min={1}
                                value={difficulte ?? ''}
                                onChange={e => setDifficulte(e.target.value ? Number(e.target.value) : null)}
                                placeholder="Valeur libre…"
                                className="w-full rounded px-2 py-1 text-sm"
                                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                            />
                        </div>

                        {/* Visibilité */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={public_} onChange={e => setPublic(e.target.checked)} />
                            <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
                                {public_ ? '👁️ Visible dans l\'historique' : '🔒 Jet secret'}
                            </span>
                        </label>

                        <button
                            onClick={handleRoll}
                            disabled={rolling}
                            className="w-full py-3 rounded font-semibold text-sm"
                            style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
                        >
                            {rolling ? 'Lancer…' : '🎲 Lancer'}
                        </button>
                    </div>
                ) : (
                    <div className="p-5 flex flex-col gap-4">
                        {/* Résultat — même affichage que TecumahDiceModal StepResult */}
                        {result.isComplication && (
                            <div className="text-center rounded-lg px-3 py-2" style={{ background: 'rgba(139,0,0,0.15)', border: '1px solid var(--color-danger)' }}>
                                <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>⚡ Complication (Wild Die = 1)</span>
                            </div>
                        )}

                        {result.normalValues?.length > 0 && (
                            <div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Dés normaux</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.normalValues.map((v, i) => <Die key={i} value={v} />)}
                                    <span style={{ alignSelf: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>= {result.normalSum}</span>
                                </div>
                            </div>
                        )}

                        <div>
                            <p style={{ fontSize: '0.75rem', color: '#B8860B', marginBottom: 4, fontWeight: 600 }}>
                                Wild Die {result.wildExploded ? '💥' : ''}
                            </p>
                            <div className="flex flex-wrap gap-2 items-center">
                                {(result.wildValues ?? []).map((v, i) => <Die key={i} value={v} gold />)}
                                <span style={{ color: '#B8860B', fontSize: '0.85rem', fontWeight: 600 }}>= {result.wildSum}</span>
                            </div>
                        </div>

                        <div
                            className="rounded-xl py-4 text-center"
                            style={{
                                background: result.reussite === true ? 'rgba(107,142,35,0.15)' : result.reussite === false ? 'rgba(139,0,0,0.1)' : 'var(--color-surface-alt)',
                                border: `2px solid ${result.reussite === true ? 'var(--color-success)' : result.reussite === false ? 'var(--color-danger)' : 'var(--color-border)'}`,
                            }}
                        >
                            <p style={{ fontWeight: 900, fontSize: '2.5rem', lineHeight: 1, color: result.reussite === true ? 'var(--color-success)' : result.reussite === false ? 'var(--color-danger)' : 'var(--color-text)' }}>
                                {result.total}
                            </p>
                            {result.difficulte != null && (
                                <p style={{ fontWeight: 700, marginTop: 4, color: result.reussite ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                    {result.reussite ? '✓ Succès' : '✗ Échec'} vs ND {result.difficulte}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => setResult(null)} className="flex-1 py-2 rounded text-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                                Relancer
                            </button>
                            <button onClick={onClose} className="flex-1 py-2 rounded text-sm font-semibold" style={{ background: 'var(--color-primary)', color: '#fff' }}>
                                Fermer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const Row = ({ label, children }) => (
    <div className="flex items-center justify-between gap-3">
        <span style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>{label}</span>
        {children}
    </div>
);

const SpinBox = ({ value, onChange, min = -99, signed = false }) => (
    <div className="flex items-center gap-2">
        <button onClick={() => onChange(Math.max(min, value - 1))} className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>−</button>
        <span style={{ fontWeight: 700, minWidth: 28, textAlign: 'center' }}>{signed && value > 0 ? `+${value}` : value}</span>
        <button onClick={() => onChange(value + 1)} className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>+</button>
    </div>
);

const Die = ({ value, gold }) => (
    <div
        className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm"
        style={{
            background:  gold ? '#B8860B' : 'var(--color-surface-alt)',
            border:      `2px solid ${gold ? (value === 1 ? 'var(--color-danger)' : '#DAA520') : 'var(--color-border)'}`,
            color:       gold ? '#fff' : 'var(--color-text)',
        }}
    >
        {value}
    </div>
);

export default GMDiceModal;