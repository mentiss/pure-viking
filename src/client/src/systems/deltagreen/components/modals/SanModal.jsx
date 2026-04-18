// src/client/src/systems/deltagreen/components/modals/SanModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Flux SAN :
//   1. Joueur sélectionne une situation (liste fixe avec catégories)
//   2. Voit le format succès/échec
//   3. Lance D100 → animation → résultat (succès ou échec)
//   4. Clique "Appliquer" → jet de perte animé
//   5. Perte appliquée + log inséré automatiquement
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import { roll, RollError }              from '../../../../tools/diceEngine.js';
import { useSystem }                    from '../../../../hooks/useSystem.js';
import {useFetch}                         from '../../../../hooks/useFetch.js';
import deltgreenConfig, { SAN_SITUATIONS, SAN_CATEGORIES } from '../../config.jsx';

const STEPS = { SELECT: 'select', ROLLING_D100: 'rolling_d100', RESULT: 'result', ROLLING_LOSS: 'rolling_loss', DONE: 'done' };

const SanModal = ({ character, sessionId, onApply, onClose }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();

    const [step,        setStep]        = useState(STEPS.SELECT);
    const [situation,   setSituation]   = useState(null);
    const [d100Result,  setD100Result]  = useState(null); // { value, success, critical, fumble }
    const [lossResult,  setLossResult]  = useState(null); // valeur entière de la perte
    const [error,       setError]       = useState('');

    // ── Étape 1 → 2 : lancer D100 ────────────────────────────────────────────

    const handleRollD100 = useCallback(async () => {
        if (!situation) return;
        setStep(STEPS.ROLLING_D100);
        setError('');
        try {
            const notation = deltgreenConfig.dice.buildNotation({
                systemData: { diceType: 'd100', targetScore: character.sanCurrent, rollLabel: 'Jet de SAN' },
            });
            const ctx = {
                apiBase,
                fetchFn:       fetchWithAuth,
                characterId:   character.id,
                characterName: character.nom ?? 'Agent',
                sessionId,
                label:         `SAN — ${situation.label}`,  // ← manquait
                rollType:      'dg_san',                    // ← manquait
                systemData: { diceType: 'd100', targetScore: character.sanCurrent, rollLabel: `SAN — ${situation.label}` },
            };
            const result = await roll(notation, ctx, deltgreenConfig.dice);
            setD100Result(result);
            setStep(STEPS.RESULT);
        } catch (err) {
            setError(err instanceof RollError ? err.message : 'Erreur lors du jet.');
            setStep(STEPS.SELECT);
        }
    }, [situation, character, apiBase, fetchWithAuth, sessionId]);

    // ── Étape 3 → 4 : lancer la perte ────────────────────────────────────────

    const handleRollLoss = useCallback(async () => {
        if (!d100Result || !situation) return;
        setStep(STEPS.ROLLING_LOSS);
        setError('');

        const lossNotation = d100Result.success ? situation.success : situation.failure;
        if (lossNotation === '0') {
            // Perte nulle — on applique directement 0
            setLossResult(0);
            setStep(STEPS.DONE);
            onApply({ situationLabel: situation.label, lossSuccess: situation.success, lossFailure: situation.failure, lossApplied: 0, sessionId });
            return;
        }

        try {
            // Parse la notation : '1', '1D4', '1D6', '1D8', '1D10'
            const isFlat = /^\d+$/.test(lossNotation);
            const diceType = isFlat ? null : lossNotation.replace(/^\d+/, '').toLowerCase();
            const flatVal  = isFlat ? parseInt(lossNotation, 10) : null;

            let loss = flatVal ?? 0;

            if (diceType) {
                const notation = `1${diceType}`;
                const ctx = {
                    apiBase,
                    fetchFn:       fetchWithAuth,
                    characterId:   character.id,
                    characterName: character.nom ?? 'Agent',
                    sessionId,
                    label:         `Perte SAN — ${situation.label}`,  // ← manquait
                    rollType:      'dg_san_loss',                      // ← manquait
                    systemData: { diceType, rollLabel: `Perte SAN — ${situation.label}` },
                };
                const lossRes = await roll(notation, ctx, deltgreenConfig.dice);
                loss = lossRes.value ?? 0;
            }

            setLossResult(loss);
            setStep(STEPS.DONE);
            onApply({
                situationLabel: situation.label,
                lossSuccess:    situation.success,
                lossFailure:    situation.failure,
                lossApplied:    loss,
                sessionId,
            });
        } catch (err) {
            setError(err instanceof RollError ? err.message : 'Erreur lors du jet de perte.');
            setStep(STEPS.RESULT);
        }
    }, [d100Result, situation, character, sessionId, onApply]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-default border border-default shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col"
                 style={{ fontFamily: 'var(--dg-font-body)' }}>

                {/* En-tête */}
                <div className="dg-header px-4 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-widest text-white">
                        JET DE SANTÉ MENTALE
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* SAN actuelle */}
                    <div className="flex items-center gap-4 border border-default p-3 bg-surface">
                        <div className="text-center">
                            <p className="dg-section-label">SAN actuelle</p>
                            <p className="font-mono text-2xl font-bold">{character.sanCurrent}</p>
                        </div>
                        <div className="text-center">
                            <p className="dg-section-label">Seuil de rupture</p>
                            <p className="font-mono text-lg">{character.sr}</p>
                        </div>
                    </div>

                    {/* Étape 1 — Sélection situation */}
                    {(step === STEPS.SELECT) && (
                        <div className="space-y-2">
                            <p className="dg-section-label mb-2">Sélectionnez la situation</p>
                            {Object.entries(SAN_CATEGORIES).map(([catKey, catLabel]) => {
                                const items = SAN_SITUATIONS.filter(s => s.category === catKey);
                                return (
                                    <div key={catKey}>
                                        <p className="text-xs font-mono text-muted uppercase tracking-wider mb-1 mt-2">{catLabel}</p>
                                        {items.map((s, i) => (
                                            <button key={i}
                                                    onClick={() => setSituation(s)}
                                                    className={[
                                                        'w-full text-left text-xs font-mono px-2 py-1.5 border mb-0.5 transition-colors',
                                                        situation?.label === s.label
                                                            ? 'border-accent bg-accent/10 text-default'
                                                            : 'border-default/40 hover:border-accent/50 hover:bg-surface text-default',
                                                    ].join(' ')}>
                                                <span className="flex-1">{s.label}</span>
                                                <span className="ml-2 text-muted">
                                                    {s.success}/{s.failure}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Situation sélectionnée — résumé */}
                    {situation && step !== STEPS.SELECT && (
                        <div className="border border-default/40 p-3 bg-surface text-xs font-mono space-y-1">
                            <p className="font-bold">{situation.label}</p>
                            <p>Succès : <span className="text-success">{situation.success === '0' ? 'Aucune perte' : `−${situation.success}`}</span></p>
                            <p>Échec : <span className="text-danger">−{situation.failure}</span></p>
                        </div>
                    )}

                    {/* Résultat D100 */}
                    {(step === STEPS.RESULT || step === STEPS.ROLLING_LOSS || step === STEPS.DONE) && d100Result && (
                        <div className={[
                            'border p-4 text-center',
                            d100Result.success ? 'border-success/50 bg-success/10' : 'border-danger/50 bg-danger/10',
                        ].join(' ')}>
                            <p className="font-mono text-3xl font-black">{d100Result.value}</p>
                            <p className="text-sm font-mono mt-1">
                                vs <span className="font-bold">{character.sanCurrent}</span>
                                {' — '}
                                <span className={d100Result.success ? 'text-success font-bold' : 'text-danger font-bold'}>
                                    {d100Result.success ? 'SUCCÈS' : 'ÉCHEC'}
                                </span>
                                {d100Result.critical && <span className="text-success"> (CRITIQUE)</span>}
                                {d100Result.fumble   && <span className="text-danger"> (FUMBLE)</span>}
                            </p>
                            <p className="text-xs text-muted mt-1 font-mono">
                                Perte : {d100Result.success ? situation.success : situation.failure}
                            </p>
                        </div>
                    )}

                    {/* Résultat perte */}
                    {step === STEPS.DONE && lossResult !== null && (
                        <div className="border border-danger/50 bg-danger/10 p-4 text-center">
                            <p className="text-xs text-muted font-mono mb-1">Perte de SAN appliquée</p>
                            <p className="font-mono text-3xl font-black text-danger">−{lossResult}</p>
                            <p className="text-xs text-muted font-mono mt-1">
                                SAN : {character.sanCurrent} → {Math.max(0, character.sanCurrent - lossResult)}
                            </p>
                        </div>
                    )}

                    {error && <p className="text-danger text-xs font-mono">{error}</p>}
                </div>

                {/* Pied — actions */}
                <div className="border-t border-default p-3 flex gap-2 justify-end">
                    {step === STEPS.SELECT && (
                        <button
                            onClick={handleRollD100}
                            disabled={!situation}
                            className="px-4 py-2 bg-danger text-white text-xs font-mono uppercase tracking-wider disabled:opacity-40 hover:opacity-90"
                        >
                            Lancer D100
                        </button>
                    )}

                    {step === STEPS.RESULT && (
                        <button
                            onClick={handleRollLoss}
                            className="px-4 py-2 bg-danger text-white text-xs font-mono uppercase tracking-wider hover:opacity-90"
                        >
                            Appliquer la perte
                        </button>
                    )}

                    {(step === STEPS.ROLLING_D100 || step === STEPS.ROLLING_LOSS) && (
                        <span className="text-xs text-muted font-mono animate-pulse py-2">Lancer en cours…</span>
                    )}

                    {step === STEPS.DONE && (
                        <button onClick={onClose}
                                className="px-4 py-2 bg-surface border border-default text-xs font-mono uppercase tracking-wider hover:border-accent">
                            Fermer
                        </button>
                    )}

                    <button onClick={onClose}
                            className="px-4 py-2 border border-default text-muted text-xs font-mono uppercase tracking-wider hover:text-default">
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SanModal;