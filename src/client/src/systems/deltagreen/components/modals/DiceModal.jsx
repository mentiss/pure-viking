// src/client/src/systems/deltagreen/components/modals/DiceModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Modale générique Delta Green pour les jets de compétence, de caractéristique
// et de dommages lancés depuis la fiche.
//
// Props :
//   ctx          — { diceType, targetScore, rollLabel, skillId?, languageId? }
//   character    — personnage courant
//   sessionId    — session active (ou null)
//   onClose      — fermer la modale
//   onSkillFailed — (skillId, languageId) → coche la case d'échec
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { roll, RollError }            from '../../../../tools/diceEngine.js';
import { useSystem }                  from '../../../../hooks/useSystem.js';
import deltgreenConfig                from '../../config.jsx';
import {useFetch} from "../../../../hooks/useFetch.js";

const DiceModal = ({ ctx, character, sessionId, onClose, onSkillFailed }) => {
    const { apiBase }   = useSystem();
    const fetchWithAuth = useFetch();

    const [result,  setResult]  = useState(null);
    const [rolling, setRolling] = useState(false);
    const [error,   setError]   = useState('');

    const isD100   = ctx.diceType === 'd100';
    const hasFail  = isD100 && (ctx.skillId || ctx.languageId);

    // Lance automatiquement le jet à l'ouverture
    useEffect(() => {
        handleRoll();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleRoll = async () => {
        setRolling(true);
        setError('');
        setResult(null);
        try {
            const notation = deltgreenConfig.dice.buildNotation({
                systemData: { diceType: ctx.diceType, targetScore: ctx.targetScore, rollLabel: ctx.rollLabel },
            });
            const rollCtx = {
                apiBase,
                fetchFn:       fetchWithAuth,
                characterId:   character.id,
                characterName: character.nom ?? 'Agent',
                sessionId,
                label:         ctx.rollLabel ?? '',        // ← manquait
                rollType:      ctx.diceType === 'd100'     // ← manquait
                    ? (ctx.skillId    ? 'dg_skill'
                        : ctx.languageId ? 'dg_language'
                            : 'dg_carac')
                    : 'dg_damage',
                systemData: {
                    diceType:    ctx.diceType,
                    targetScore: ctx.targetScore,
                    rollLabel:   ctx.rollLabel,
                },
            };
            const res = await roll(notation, rollCtx, deltgreenConfig.dice);
            setResult(res);

            // Coche automatiquement la case d'échec pour les compétences
            if (isD100 && !res.success && hasFail) {
                onSkillFailed?.(ctx.skillId ?? null, ctx.languageId ?? null);
            }
        } catch (err) {
            setError(err instanceof RollError ? err.message : 'Erreur de jet.');
        } finally {
            setRolling(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-default border border-default shadow-xl max-w-sm w-full"
                 style={{ fontFamily: 'var(--dg-font-body)' }}>

                {/* En-tête */}
                <div className="dg-header px-4 py-3 flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-widest text-white truncate">
                        {ctx.rollLabel ?? 'Jet de dés'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white flex-shrink-0 ml-2">✕</button>
                </div>

                <div className="p-6 text-center space-y-4">
                    {/* Cible */}
                    {isD100 && ctx.targetScore != null && (
                        <p className="text-xs text-muted font-mono">
                            Cible : <span className="font-bold text-default">{ctx.targetScore}%</span>
                        </p>
                    )}

                    {/* État roulement */}
                    {rolling && (
                        <p className="font-mono text-muted animate-pulse">Lancer en cours…</p>
                    )}

                    {/* Résultat */}
                    {result && !rolling && (
                        <>
                            <p className="font-mono text-5xl font-black">{result.value}</p>

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

                            {/* Coche auto case échec */}
                            {isD100 && !result.success && hasFail && (
                                <p className="text-xs text-muted font-mono italic">
                                    ✓ Case d'échec cochée automatiquement.
                                </p>
                            )}
                        </>
                    )}

                    {error && <p className="text-danger text-xs font-mono">{error}</p>}
                </div>

                <div className="border-t border-default p-3 flex gap-2 justify-center">
                    <button onClick={handleRoll} disabled={rolling}
                            className="px-4 py-2 border border-default text-xs font-mono uppercase tracking-wider hover:border-accent hover:text-accent disabled:opacity-40 transition-colors">
                        Relancer
                    </button>
                    <button onClick={onClose}
                            className="px-4 py-2 bg-surface border border-default text-xs font-mono uppercase tracking-wider hover:border-accent transition-colors">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiceModal;