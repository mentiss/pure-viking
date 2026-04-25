// src/client/src/systems/deltagreen/components/modals/DiceModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modale Delta Green — jets de compétence, caractéristique, dommages.
//
// Flux pour les jets D100 :
//   Étape 1 (prepare) → saisie du modificateur → Étape 2 (result)
// Les jets de dommages passent directement en résultat (pas de targetScore).
//
// Props :
//   ctx           — { diceType, targetScore, rollLabel, skillId?, languageId? }
//   character     — personnage courant
//   sessionId     — session active (ou null)
//   onClose       — fermer la modale
//   onSkillFailed — (skillId, languageId) → coche la case d'échec
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { roll, RollError } from '../../../../tools/diceEngine.js';
import { useSystem }       from '../../../../hooks/useSystem.js';
import { useFetch }        from '../../../../hooks/useFetch.js';
import deltgreenConfig     from '../../config.jsx';

// Borne le score effectif entre 1 et 99
const clampScore = (score) => Math.min(99, Math.max(1, score));

const DiceModal = ({ ctx, character, sessionId, onClose, onSkillFailed }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();

    const isD100  = ctx.diceType === 'd100';
    const hasFail = isD100 && (ctx.skillId || ctx.languageId);

    // ── État ──────────────────────────────────────────────────────────────────
    // 'prepare' → étape 1 saisie modificateur (uniquement D100)
    // 'result'  → étape 2 affichage résultat
    const [step,     setStep]     = useState(isD100 ? 'prepare' : 'rolling');
    const [modifier, setModifier] = useState(0);
    const [result,   setResult]   = useState(null);
    const [rolling,  setRolling]  = useState(false);
    const [error,    setError]    = useState('');

    // Score effectif affiché en temps réel à l'étape 1
    const effectiveScore = isD100
        ? clampScore((ctx.targetScore ?? 0) + modifier)
        : null;

    // ── Handlers modificateur ─────────────────────────────────────────────────
    const adjustModifier = (delta) =>
        setModifier(prev => {
            // On empêche d'amener le score effectif hors [1, 99]
            const next = prev + delta;
            const nextScore = clampScore((ctx.targetScore ?? 0) + next);
            // Si le score est déjà à la borne, on ne bouge plus dans cette direction
            if (delta > 0 && nextScore === 99) return prev;
            if (delta < 0 && nextScore === 1)  return prev;
            return next;
        });

    // ── Lancement du jet ──────────────────────────────────────────────────────
    const handleRoll = async () => {
        if (rolling) return;
        setRolling(true);
        setError('');

        // Pour D100 : on utilise le score effectif (après modificateur)
        const targetScore = isD100 ? effectiveScore : ctx.targetScore;

        try {
            const notation = deltgreenConfig.dice.buildNotation({
                systemData: { diceType: ctx.diceType, targetScore, rollLabel: ctx.rollLabel },
            });

            const rollCtx = {
                apiBase,
                fetchFn:       fetchWithAuth,
                characterId:   character.id,
                characterName: character.nom ?? 'Agent',
                sessionId,
                label:         ctx.rollLabel ?? '',
                rollType:      isD100
                    ? (ctx.skillId    ? 'dg_skill'
                        : ctx.languageId ? 'dg_language'
                            :                  'dg_carac')
                    : 'dg_damage',
                systemData: {
                    diceType:    ctx.diceType,
                    targetScore,             // score effectif persisté
                    modifier:    modifier,   // conservé pour l'historique
                    rollLabel:   ctx.rollLabel,
                },
            };

            const res = await roll(notation, rollCtx, deltgreenConfig.dice);
            setResult(res);
            setStep('result');

            // Coche automatiquement la case d'échec
            if (isD100 && !res.success && hasFail) {
                onSkillFailed?.(ctx.skillId ?? null, ctx.languageId ?? null);
            }
        } catch (err) {
            setError(err instanceof RollError ? err.message : 'Erreur de jet.');
            setStep('result'); // on passe quand même à l'étape résultat pour afficher l'erreur
        } finally {
            setRolling(false);
        }
    };

    // Déclenche le jet immédiatement si dommages (pas d'étape prepare)
    React.useEffect(() => {
        if (step === 'rolling') handleRoll();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Rendu ─────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div
                className="bg-default border border-default shadow-xl max-w-sm w-full"
                style={{ fontFamily: 'var(--dg-font-body)' }}
                onClick={e => e.stopPropagation()}
            >
                {/* En-tête */}
                <div className="dg-header px-4 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-widest text-white truncate">
                        {ctx.rollLabel ?? 'Jet de dés'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white shrink-0 ml-2"
                    >✕</button>
                </div>

                {/* ── Étape 1 : modificateur (D100 uniquement) ─────────────── */}
                {step === 'prepare' && (
                    <div className="p-6 space-y-5">

                        {/* Score de base */}
                        <div className="text-center">
                            <p className="text-xs font-mono text-muted uppercase tracking-widest mb-1">
                                Score de base
                            </p>
                            <p className="text-3xl font-black font-mono text-default">
                                {ctx.targetScore}%
                            </p>
                        </div>

                        {/* Modificateur */}
                        <div>
                            <p className="text-xs font-mono text-muted uppercase tracking-widest text-center mb-2">
                                Modificateur
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <button
                                    onClick={() => adjustModifier(-20)}
                                    className="w-9 h-9 border border-default font-mono font-bold text-default hover:bg-danger/10 hover:border-danger hover:text-danger transition-colors"
                                >−20</button>
                                <button
                                    onClick={() => adjustModifier(-10)}
                                    className="w-9 h-9 border border-default font-mono font-bold text-default hover:bg-danger/10 hover:border-danger hover:text-danger transition-colors"
                                >−10</button>

                                <input
                                    type="number"
                                    value={modifier}
                                    onChange={e => setModifier(Number(e.target.value))}
                                    className="dg-field-input w-16 text-center font-mono font-bold text-base"
                                />

                                <button
                                    onClick={() => adjustModifier(+10)}
                                    className="w-9 h-9 border border-default font-mono font-bold text-default hover:bg-success/10 hover:border-success hover:text-success transition-colors"
                                >+10</button>
                                <button
                                    onClick={() => adjustModifier(+20)}
                                    className="w-9 h-9 border border-default font-mono font-bold text-default hover:bg-success/10 hover:border-success hover:text-success transition-colors"
                                >+20</button>
                            </div>
                        </div>

                        {/* Score effectif */}
                        <div className="text-center border-t border-default pt-4">
                            <p className="text-xs font-mono text-muted uppercase tracking-widest mb-1">
                                Score effectif
                            </p>
                            <p className={[
                                'text-4xl font-black font-mono',
                                modifier > 0 ? 'text-success' : modifier < 0 ? 'text-danger' : 'text-default',
                            ].join(' ')}>
                                {effectiveScore}%
                            </p>
                            {modifier !== 0 && (
                                <p className="text-xs font-mono text-muted mt-1">
                                    {ctx.targetScore}% {modifier > 0 ? '+' : ''}{modifier}
                                </p>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 border border-default text-muted font-mono text-sm hover:bg-surface-alt transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleRoll}
                                className="flex-1 py-2.5 dg-header text-white font-mono font-black text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
                            >
                                Lancer
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Étape intermédiaire : animation en cours (dommages) ───── */}
                {(step === 'rolling' && !result) && (
                    <div className="p-8 text-center">
                        <p className="font-mono text-muted animate-pulse">Lancer en cours…</p>
                    </div>
                )}

                {/* ── Étape 2 : résultat ────────────────────────────────────── */}
                {step === 'result' && (
                    <div className="p-6 text-center space-y-4">

                        {/* Erreur */}
                        {error && (
                            <p className="text-sm font-mono text-danger border border-danger/30 bg-danger/10 px-3 py-2">
                                ⚠ {error}
                            </p>
                        )}

                        {rolling && (
                            <p className="font-mono text-muted animate-pulse">Lancer en cours…</p>
                        )}

                        {result && !rolling && (
                            <>
                                {/* Score effectif rappelé */}
                                {isD100 && (
                                    <p className="text-xs text-muted font-mono">
                                        Cible :&nbsp;
                                        <span className="font-bold text-default">{result.targetScore}%</span>
                                        {result.modifier !== 0 && (
                                            <span className={result.modifier > 0 ? 'text-success' : 'text-danger'}>
                                                &nbsp;({result.modifier > 0 ? '+' : ''}{result.modifier})
                                            </span>
                                        )}
                                    </p>
                                )}

                                {/* Valeur du dé */}
                                <p className="font-mono text-5xl font-black">{result.value}</p>

                                {/* Verdict D100 */}
                                {isD100 && (
                                    <div className={[
                                        'inline-block px-4 py-1 text-sm font-mono font-black uppercase tracking-widest border',
                                        result.success
                                            ? 'border-success text-success bg-success/10'
                                            : 'border-danger text-danger bg-danger/10',
                                    ].join(' ')}>
                                        {result.critical && result.success && 'CRITIQUE — '}
                                        {result.fumble && 'FUMBLE — '}
                                        {result.success ? 'SUCCÈS' : 'ÉCHEC'}
                                    </div>
                                )}

                                {/* Coche auto */}
                                {isD100 && !result.success && hasFail && (
                                    <p className="text-xs text-muted font-mono italic">
                                        ✓ Case d'échec cochée automatiquement.
                                    </p>
                                )}
                            </>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            {!rolling && result && isD100 && (
                                <button
                                    onClick={() => {
                                        // Retour à l'étape 1 pour modifier et relancer
                                        setResult(null);
                                        setError('');
                                        setStep(isD100 ? 'prepare' : 'rolling');
                                    }}
                                    className="flex-1 py-2.5 border border-default text-muted font-mono text-sm hover:bg-surface-alt transition-colors"
                                >
                                    Relancer
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="flex-1 py-2.5 dg-header text-white font-mono font-black text-sm uppercase tracking-wider hover:opacity-90 transition-opacity"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiceModal;